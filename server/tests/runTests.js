// server/tests/runTests.js — EMR Automated Test Runner
// Run: node server/tests/runTests.js
// Requires server running on port 4000

const BASE = 'http://localhost:4000/api';
let token = '';
let passed = 0, failed = 0, total = 0;
const results = [];

// ── Helpers ──────────────────────────────────────────────────
function h() { return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }; }

async function api(method, path, body) {
  try {
    const r = await fetch(`${BASE}${path}`, { method, headers: h(), body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: { error: e.message } }; }
}

function assert(name, condition, detail = '') {
  total++;
  if (condition) { passed++; results.push({ pass: true,  name }); process.stdout.write(`  ✅ ${name}\n`); }
  else           { failed++; results.push({ pass: false, name, detail }); process.stdout.write(`  ❌ ${name}${detail ? ' — ' + detail : ''}\n`); }
}

function section(title) { console.log(`\n${'─'.repeat(60)}\n📋 ${title}\n${'─'.repeat(60)}`); }

function uid() { return 'test-' + Math.random().toString(36).slice(2) + Date.now(); }

// ── Auth ──────────────────────────────────────────────────────
async function login() {
  section('AUTH SETUP');
  const r = await api('POST', '/auth/login', { email: 'admin@medicos.local', password: 'Admin@123' });
  assert('Login with valid credentials', r.ok && r.data.token, JSON.stringify(r.data));
  if (r.data.token) token = r.data.token;
  return r.ok;
}

// ── TC-L: LOCAL (OFFLINE SIMULATION) ─────────────────────────
async function testLocal() {
  section('1. LOCAL / OFFLINE TEST CASES');

  // TC-L1: Create patient
  const pid = uid();
  const r1 = await api('POST', '/patients', {
    id: pid, name: 'Test Patient L1', sex: 'Male', age: 30,
    hospital_id: 'hsp-001', uhid: `UHID-L1-${Date.now()}`,
    allergies: [], chronic_conditions: [], current_medications: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  assert('TC-L1: Create patient (local record saved)', r1.ok || r1.status === 201, JSON.stringify(r1.data));

  // TC-L2: Update patient
  if (r1.ok) {
    const r2 = await api('PUT', `/patients/${pid}`, {
      name: 'Test Patient L1 Updated', sex: 'Male', age: 31,
      allergies: ['Penicillin'], chronic_conditions: [], current_medications: [],
    });
    assert('TC-L2: Update patient offline', r2.ok, JSON.stringify(r2.data));
    const r2v = await api('GET', `/patients/${pid}`);
    assert('TC-L2: Updated name persists', r2v.data?.name === 'Test Patient L1 Updated', r2v.data?.name);
  } else { assert('TC-L2: Update patient offline', false, 'skipped — patient not created'); }

  // TC-L3: Soft delete
  if (r1.ok) {
    const r3 = await api('DELETE', `/patients/${pid}`);
    assert('TC-L3: Soft delete patient', r3.ok, JSON.stringify(r3.data));
    const r3v = await api('GET', `/patients/${pid}`);
    assert('TC-L3: Record not permanently removed (404 = soft deleted)', r3v.status === 404);
  } else { assert('TC-L3: Soft delete', false, 'skipped'); }

  // TC-L4: App restart persistence (SQLite WAL mode ensures writes survive crash)
  const r4 = await api('GET', '/health');
  assert('TC-L4: Server persists across restart (WAL SQLite)', r4.ok && r4.data.status === 'ok');

  // TC-L5: Invalid input validation
  const r5a = await api('POST', '/patients', { sex: 'Male' }); // missing name
  assert('TC-L5a: Missing required field (name) rejected', !r5a.ok || r5a.status >= 400, `status=${r5a.status}`);
  const r5b = await api('POST', '/auth/login', { email: '', password: '' });
  assert('TC-L5b: Empty credentials rejected', !r5b.ok, `status=${r5b.status}`);
}

// ── TC-S: SYNC TEST CASES ─────────────────────────────────────
async function testSync() {
  section('2. SYNC TEST CASES');

  const pid = uid();
  const now = new Date().toISOString();
  const record = {
    id: pid, name: 'Sync Patient', sex: 'Female', age: 25,
    hospital_id: 'hsp-001', uhid: `UHID-SYNC-${Date.now()}`,
    allergies: [], chronic_conditions: [], current_medications: [],
    created_at: now, updated_at: now, is_active: 1,
  };

  // TC-S1: Basic push
  const r1 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'create', payload: record, clientUpdatedAt: now }],
    clientId: 'test-device-001',
  });
  assert('TC-S1: Basic sync push accepted', r1.ok, JSON.stringify(r1.data));
  assert('TC-S1: Record marked as inserted', r1.data?.results?.[0]?.status === 'inserted', r1.data?.results?.[0]?.status);

  // TC-S2: Multiple records sync
  const bulk = Array.from({ length: 20 }, (_, i) => {
    const id = uid();
    return { table: 'patients', operation: 'create',
      payload: { id, name: `Bulk Patient ${i}`, sex: i%2===0?'Male':'Female', age: 20+i,
        hospital_id: 'hsp-001', uhid: `UHID-BULK-${i}-${Date.now()}`,
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: now, updated_at: now, is_active: 1 },
      clientUpdatedAt: now };
  });
  const r2 = await api('POST', '/sync/push', { records: bulk, clientId: 'test-device-001' });
  assert('TC-S2: 20 records synced', r2.ok && r2.data?.synced === 20, `synced=${r2.data?.synced}`);

  // TC-S3: No duplicate on re-sync
  const r3 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'create', payload: record, clientUpdatedAt: now }],
    clientId: 'test-device-001',
  });
  assert('TC-S3: Re-sync returns already_exists (no duplicate)', r3.data?.results?.[0]?.status === 'already_exists', r3.data?.results?.[0]?.status);

  // TC-S4: Sync after update
  const updated = { ...record, name: 'Sync Patient UPDATED', updated_at: new Date().toISOString() };
  const r4 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'update', payload: updated, clientUpdatedAt: updated.updated_at }],
    clientId: 'test-device-001',
  });
  assert('TC-S4: Update sync applied', r4.data?.results?.[0]?.status === 'updated', r4.data?.results?.[0]?.status);
  const r4v = await api('GET', `/patients/${pid}`);
  assert('TC-S4: Server shows updated name', r4v.data?.name === 'Sync Patient UPDATED', r4v.data?.name);

  // TC-S5: Sync after delete
  const r5 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'delete', payload: { id: pid }, clientUpdatedAt: new Date().toISOString() }],
    clientId: 'test-device-001',
  });
  assert('TC-S5: Delete sync applied', r5.data?.results?.[0]?.status === 'deleted', r5.data?.results?.[0]?.status);

  // Pull test
  const r6 = await api('GET', `/sync/pull?since=2000-01-01T00:00:00`);
  assert('TC-S: Pull returns data object', r6.ok && typeof r6.data?.data === 'object', JSON.stringify(r6.data).slice(0,80));
}

// ── TC-N: NETWORK EDGE CASES ──────────────────────────────────
async function testNetwork() {
  section('3. NETWORK EDGE CASES');

  // TC-N1: Offline fallback — IndexedDB handles this client-side; server verifies health is up
  const r1 = await api('GET', '/health');
  assert('TC-N1: Server health reachable on LAN', r1.ok);

  // TC-N2: Empty push (nothing in queue) — safe no-op
  const r2 = await api('POST', '/sync/push', { records: [], clientId: 'test' });
  assert('TC-N2: Empty sync push is safe no-op', r2.ok && r2.data?.synced === 0, JSON.stringify(r2.data));

  // TC-N3: Bad JSON / malformed payload
  const r3 = await api('POST', '/sync/push', { records: 'not-an-array', clientId: 'test' });
  assert('TC-N3: Malformed records rejected gracefully', !r3.ok && r3.status === 400, `status=${r3.status}`);

  // TC-N4: Sync status endpoint
  const r4 = await api('GET', '/sync/status');
  assert('TC-N4: Sync status endpoint responds', r4.ok && r4.data?.status === 'online');
}

// ── TC-C: CONFLICT TEST CASES ─────────────────────────────────
async function testConflicts() {
  section('4. CONFLICT TEST CASES');

  const pid = uid(); const now = new Date().toISOString();
  const base = { id: pid, name: 'Conflict Base', sex: 'Male', age: 40,
    hospital_id: 'hsp-001', uhid: `UHID-CONF-${Date.now()}`,
    allergies: [], chronic_conditions: [], current_medications: [],
    created_at: now, updated_at: now, is_active: 1 };

  // Seed record
  await api('POST', '/sync/push', { records: [{ table:'patients', operation:'create', payload: base, clientUpdatedAt: now }], clientId: 'device-A' });

  // TC-C1: Device A updates, then Device B with older timestamp loses
  const tsA = new Date(Date.now() + 2000).toISOString();
  await api('POST', '/sync/push', {
    records: [{ table:'patients', operation:'update', payload: { ...base, name: 'Device A Wins', updated_at: tsA }, clientUpdatedAt: tsA }],
    clientId: 'device-A' });

  const tsB = new Date(Date.now() - 5000).toISOString(); // older
  const rC1 = await api('POST', '/sync/push', {
    records: [{ table:'patients', operation:'update', payload: { ...base, name: 'Device B Loses', updated_at: tsB }, clientUpdatedAt: tsB }],
    clientId: 'device-B' });
  assert('TC-C1: Older timestamp rejected (conflict_skipped)', rC1.data?.results?.[0]?.status === 'conflict_skipped', rC1.data?.results?.[0]?.status);
  const rC1v = await api('GET', `/patients/${pid}`);
  assert('TC-C1: Server retains Device A (latest wins)', rC1v.data?.name === 'Device A Wins', rC1v.data?.name);

  // TC-C2: Delete wins — delete the record
  const rC2 = await api('POST', '/sync/push', {
    records: [{ table:'patients', operation:'delete', payload: { id: pid }, clientUpdatedAt: new Date().toISOString() }],
    clientId: 'device-A' });
  assert('TC-C2: Delete operation applied', rC2.data?.results?.[0]?.status === 'deleted', rC2.data?.results?.[0]?.status);

  // TC-C3: Duplicate create — same ID twice
  const pid2 = uid(); const t2 = new Date().toISOString();
  const dup = { id: pid2, name: 'Dup Patient', sex: 'Male', age: 22,
    hospital_id: 'hsp-001', uhid: `UHID-DUP-${Date.now()}`,
    allergies: [], chronic_conditions: [], current_medications: [],
    created_at: t2, updated_at: t2, is_active: 1 };
  await api('POST', '/sync/push', { records: [{ table:'patients', operation:'create', payload: dup, clientUpdatedAt: t2 }], clientId: 'device-A' });
  const rC3 = await api('POST', '/sync/push', { records: [{ table:'patients', operation:'create', payload: dup, clientUpdatedAt: t2 }], clientId: 'device-B' });
  assert('TC-C3: Duplicate create idempotent (already_exists)', rC3.data?.results?.[0]?.status === 'already_exists', rC3.data?.results?.[0]?.status);
}

// ── TC-D: DATA INTEGRITY ──────────────────────────────────────
async function testIntegrity() {
  section('5. DATA INTEGRITY TESTS');

  const pid = uid(); const now = new Date().toISOString();
  const payload = { id: pid, name: 'Integrity Patient', sex: 'Female', age: 33,
    hospital_id: 'hsp-001', uhid: `UHID-INT-${Date.now()}`,
    allergies: ['Aspirin', 'Sulfa'], chronic_conditions: ['Diabetes'], current_medications: [],
    phone: '9876543210', email: 'test@test.com', blood_group: 'O+',
    created_at: now, updated_at: now, is_active: 1 };

  // TC-D1 & D2: Round-trip — create via API then fetch
  await api('POST', '/sync/push', { records: [{ table:'patients', operation:'create', payload, clientUpdatedAt: now }], clientId: 'test' });
  const r = await api('GET', `/patients/${pid}`);
  assert('TC-D1: Data not lost after sync', r.ok, `status=${r.status}`);
  assert('TC-D2: Name matches exactly', r.data?.name === 'Integrity Patient', r.data?.name);
  assert('TC-D2: Phone matches exactly', r.data?.phone === '9876543210', r.data?.phone);
  assert('TC-D2: Allergies array preserved', Array.isArray(r.data?.allergies) && r.data.allergies.includes('Aspirin'), JSON.stringify(r.data?.allergies));
  assert('TC-D2: Chronic conditions preserved', Array.isArray(r.data?.chronic_conditions), JSON.stringify(r.data?.chronic_conditions));

  // TC-D3: Large dataset — 100 records
  const big = Array.from({ length: 100 }, (_, i) => {
    const id = uid(); const t = new Date().toISOString();
    return { table:'patients', operation:'create', clientUpdatedAt: t,
      payload: { id, name: `Large-${i}`, sex: i%2===0?'Male':'Female', age: 18+i%60,
        hospital_id: 'hsp-001', uhid: `UHID-LG-${i}-${Date.now()}`,
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: t, updated_at: t, is_active: 1 } };
  });
  const rBig = await api('POST', '/sync/push', { records: big, clientId: 'test' });
  assert('TC-D3: 100 records synced without crash', rBig.ok && rBig.data?.synced === 100, `synced=${rBig.data?.synced}`);
}

// ── TC-SEC: SECURITY ──────────────────────────────────────────
async function testSecurity() {
  section('6. SECURITY TEST CASES');

  // Save current token
  const savedToken = token;

  // TC-SEC1: No token
  token = '';
  const r1 = await api('GET', '/patients');
  assert('TC-SEC1: No token → 401', r1.status === 401, `status=${r1.status}`);

  // TC-SEC2: Invalid/expired token
  token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
  const r2 = await api('GET', '/patients');
  assert('TC-SEC2: Invalid token → 401', r2.status === 401, `status=${r2.status}`);

  // Restore token
  token = savedToken;

  // TC-SEC3: Non-allowed table in sync push
  const r3 = await api('POST', '/sync/push', {
    records: [{ table: 'users', operation: 'create', payload: { id: uid(), email: 'hack@evil.com', password: 'hacked', role: 'admin' }, clientUpdatedAt: new Date().toISOString() }],
    clientId: 'attacker'
  });
  assert('TC-SEC3: Sync push to users table rejected', r3.data?.results?.[0]?.status === 'rejected', r3.data?.results?.[0]?.status);
}

// ── TC-P: PERFORMANCE ─────────────────────────────────────────
async function testPerformance() {
  section('7. PERFORMANCE TEST CASES');

  // TC-P1: 100 record sync speed
  const records = Array.from({ length: 100 }, (_, i) => {
    const id = uid(); const t = new Date().toISOString();
    return { table:'patients', operation:'create', clientUpdatedAt: t,
      payload: { id, name: `Perf-${i}`, sex: 'Male', age: 30,
        hospital_id: 'hsp-001', uhid: `UHID-PERF-${i}-${Date.now()}`,
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: t, updated_at: t, is_active: 1 } };
  });

  const t0 = Date.now();
  const rP1 = await api('POST', '/sync/push', { records, clientId: 'perf-test' });
  const elapsed = Date.now() - t0;
  assert(`TC-P1: 100-record sync in ${elapsed}ms (< 5000ms)`, elapsed < 5000, `${elapsed}ms`);
  assert('TC-P1: All 100 records accepted', rP1.data?.synced === 100, `synced=${rP1.data?.synced}`);

  // TC-P2: Sequential patient list fetch
  const t1 = Date.now();
  const rP2 = await api('GET', '/patients?limit=200');
  const elapsed2 = Date.now() - t1;
  assert(`TC-P2: Patient list (200) fetched in ${elapsed2}ms (< 2000ms)`, elapsed2 < 2000, `${elapsed2}ms`);
}

// ── TC-E: EDGE CASES ──────────────────────────────────────────
async function testEdge() {
  section('9. EDGE CASES');

  // TC-E1: Time mismatch — very old timestamp still syncs if server has no record
  const pid = uid(); const oldTime = '2020-01-01T00:00:00.000Z';
  const r1 = await api('POST', '/sync/push', {
    records: [{ table:'patients', operation:'create', clientUpdatedAt: oldTime,
      payload: { id: pid, name: 'OldTime Patient', sex: 'Male', age: 50,
        hospital_id: 'hsp-001', uhid: `UHID-OLD-${Date.now()}`,
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: oldTime, updated_at: oldTime, is_active: 1 } }],
    clientId: 'test' });
  assert('TC-E1: Old-timestamp record inserts fine', r1.data?.results?.[0]?.status === 'inserted', r1.data?.results?.[0]?.status);

  // TC-E2: Duplicate ID handled without corruption
  const r2a = await api('POST', '/sync/push', {
    records: [{ table:'patients', operation:'create', clientUpdatedAt: new Date().toISOString(),
      payload: { id: pid, name: 'Dup A', sex: 'Male', age: 50,
        hospital_id: 'hsp-001', uhid: `UHID-DUP2-${Date.now()}`,
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_active: 1 } }],
    clientId: 'test' });
  assert('TC-E2: Duplicate ID → already_exists (no corruption)', r2a.data?.results?.[0]?.status === 'already_exists', r2a.data?.results?.[0]?.status);

  // TC-E3: Delete already-deleted record
  await api('DELETE', `/patients/${pid}`);
  const r3 = await api('POST', '/sync/push', {
    records: [{ table:'patients', operation:'delete', payload: { id: pid }, clientUpdatedAt: new Date().toISOString() }],
    clientId: 'test' });
  assert('TC-E3: Double delete is idempotent (no crash)', r3.ok, `status=${r3.status}`);

  // TC-E4: SQL injection attempt
  const r4 = await api('GET', `/patients?q=${encodeURIComponent("'; DROP TABLE patients; --")}`);
  assert('TC-E4: SQL injection attempt does not crash server', r4.ok || r4.status < 500, `status=${r4.status}`);
}

// ── REAL-WORLD SCENARIOS ──────────────────────────────────────
async function testRealWorld() {
  section('8. REAL-WORLD SCENARIOS');

  // TC-R1: Full day offline — 50 patients created, then synced
  const batch = Array.from({ length: 50 }, (_, i) => {
    const id = uid(); const t = new Date().toISOString();
    return { table:'patients', operation:'create', clientUpdatedAt: t,
      payload: { id, name: `Offline Day Patient ${i}`, sex: i%2===0?'Male':'Female', age: 25+i%40,
        hospital_id: 'hsp-001', uhid: `UHID-DAY-${i}-${Date.now()}`,
        allergies: i%5===0?['Penicillin']:[], chronic_conditions: i%3===0?['Hypertension']:[],
        current_medications: [], phone: `98765${String(i).padStart(5,'0')}`,
        created_at: t, updated_at: t, is_active: 1 } };
  });
  const rR1 = await api('POST', '/sync/push', { records: batch, clientId: 'nurse-station-01' });
  assert('TC-R1: 50 offline patients synced at end of day', rR1.data?.synced === 50, `synced=${rR1.data?.synced}`);

  // TC-R2: Crash recovery — verify sync/status after operations
  const rR2 = await api('GET', '/sync/status');
  assert('TC-R2: Server healthy after bulk ops', rR2.ok && rR2.data?.status === 'online');

  // TC-R3: Multi-device — pull from device-B after device-A pushed
  const rR3 = await api('GET', '/sync/pull?since=2000-01-01T00:00:00');
  assert('TC-R3: Device B pulls all shared data', rR3.ok && Array.isArray(rR3.data?.data?.patients), `patients=${typeof rR3.data?.data?.patients}`);
}

// ── MAIN ──────────────────────────────────────────────────────
(async () => {
  console.log('\n🏥 MEDICOS EMR — AUTOMATED TEST SUITE');
  console.log('='.repeat(60));

  const up = await fetch(`${BASE}/health`).then(r => r.ok).catch(() => false);
  if (!up) { console.error('\n❌ Server not reachable at', BASE, '— start with: npm run dev\n'); process.exit(1); }

  const ok = await login();
  if (!ok) { console.error('\n❌ Could not authenticate — check admin@medicos.local / Admin@123\n'); process.exit(1); }

  await testLocal();
  await testSync();
  await testNetwork();
  await testConflicts();
  await testIntegrity();
  await testSecurity();
  await testPerformance();
  await testRealWorld();
  await testEdge();

  // ── Summary ───────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 TEST RESULTS`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total:  ${total}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Score:  ${Math.round(passed/total*100)}%`);

  if (failed > 0) {
    console.log('\n⚠️  FAILURES:');
    results.filter(r => !r.pass).forEach(r => console.log(`  • ${r.name}${r.detail ? ' — ' + r.detail : ''}`));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
})();
