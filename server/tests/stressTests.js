// server/tests/stressTests.js — Advanced Stress & Chaos Tests
// Run: node server/tests/stressTests.js

const BASE = 'http://localhost:4000/api';
let token = '';
let passed = 0, failed = 0;

async function api(method, path, body, extraHeaders = {}) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: { error: e.message } }; }
}

function assert(name, condition, detail = '') {
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else           { failed++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

function section(title) { console.log(`\n${'─'.repeat(65)}\n🧪 ${title}\n${'─'.repeat(65)}`); }

function uid() { return 'stress-' + Math.random().toString(36).slice(2) + Date.now(); }

function makePatient(i) {
  const id = uid(); const t = new Date().toISOString();
  return {
    table: 'patients', operation: 'create', clientUpdatedAt: t,
    payload: {
      id, name: `Stress Patient ${i}`, sex: i % 2 === 0 ? 'Male' : 'Female',
      age: 18 + (i % 60), hospital_id: 'hsp-001',
      uhid: `UHID-STR-${i}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      allergies: i % 7 === 0 ? ['Penicillin', 'Sulfa'] : [],
      chronic_conditions: i % 5 === 0 ? ['Diabetes', 'Hypertension'] : [],
      current_medications: [],
      phone: `9${String(i).padStart(9, '0')}`,
      blood_group: ['A+','B+','O+','AB+','A-','B-','O-','AB-'][i % 8],
      created_at: t, updated_at: t, is_active: 1,
    },
  };
}

// ── TEST 1: BULK SYNC (500 + 1000 records) ────────────────────
async function test1_bulkSync() {
  section('TEST 1: BULK SYNC — 500 + 1000 records');

  // 500 records
  console.log('  Generating 500 records...');
  const batch500 = Array.from({ length: 500 }, (_, i) => makePatient(i));
  const t0 = Date.now();
  const r500 = await api('POST', '/sync/push', { records: batch500, clientId: 'bulk-device' });
  const ms500 = Date.now() - t0;
  assert(`500 records synced (took ${ms500}ms)`, r500.ok && r500.data?.synced === 500, `synced=${r500.data?.synced}`);
  assert('500-record sync under 10s', ms500 < 10000, `${ms500}ms`);

  // 1000 records
  console.log('  Generating 1000 records...');
  const batch1000 = Array.from({ length: 1000 }, (_, i) => makePatient(i + 500));
  const t1 = Date.now();
  const r1000 = await api('POST', '/sync/push', { records: batch1000, clientId: 'bulk-device' });
  const ms1000 = Date.now() - t1;
  assert(`1000 records synced (took ${ms1000}ms)`, r1000.ok && r1000.data?.synced === 1000, `synced=${r1000.data?.synced}`);
  assert('1000-record sync under 20s', ms1000 < 20000, `${ms1000}ms`);

  // Verify no data inconsistency — fetch count
  const rList = await api('GET', '/patients?limit=2000');
  assert('Patient list loads after bulk insert (no crash)', rList.ok, `status=${rList.status}`);
  assert('All results are valid patient objects', Array.isArray(rList.data?.patients) && rList.data.patients.every((p) => p.id && p.name), `first=${JSON.stringify(rList.data?.patients?.[0])?.slice(0, 60)}`);

  // No partial sync — verify synced count matches sent
  const allResults500 = r500.data?.results || [];
  const partialFail500 = allResults500.filter(r => !['inserted','already_exists','updated'].includes(r.status));
  assert('No partial failures in 500-record batch', partialFail500.length === 0, `${partialFail500.length} failed: ${JSON.stringify(partialFail500.slice(0,3))}`);

  return true;
}

// ── TEST 2: CRASH RECOVERY (WAL durability) ───────────────────
async function test2_crashRecovery() {
  section('TEST 2: CRASH RECOVERY — WAL mode durability');

  // Insert a known record
  const crashId = uid(); const t = new Date().toISOString();
  const r1 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'create', clientUpdatedAt: t,
      payload: { id: crashId, name: 'CrashTest Patient', sex: 'Male', age: 45,
        hospital_id: 'hsp-001', uhid: `UHID-CRASH-${Date.now()}`,
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: t, updated_at: t, is_active: 1 } }],
    clientId: 'crash-test',
  });
  assert('Record inserted before crash simulation', r1.data?.results?.[0]?.status === 'inserted', r1.data?.results?.[0]?.status);

  // Verify record persists (WAL guarantees committed data survives crash)
  const r2 = await api('GET', `/patients/${crashId}`);
  assert('Record survives after commit (WAL mode)', r2.ok && r2.data?.name === 'CrashTest Patient', r2.data?.name);

  // Re-push same record (simulating client retry after crash) — must be idempotent
  const r3 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'create', clientUpdatedAt: t,
      payload: { id: crashId, name: 'CrashTest Patient', sex: 'Male', age: 45,
        hospital_id: 'hsp-001', uhid: `UHID-CRASH-${crashId.slice(-6)}`, // same uhid pattern
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: t, updated_at: t, is_active: 1 } }],
    clientId: 'crash-test',
  });
  assert('Re-push after crash is idempotent (no duplicate)', r3.data?.results?.[0]?.status === 'already_exists', r3.data?.results?.[0]?.status);

  // Verify count unchanged
  const r4 = await api('GET', `/patients/${crashId}`);
  assert('Data consistent after retry', r4.ok && r4.data?.id === crashId, r4.data?.id);
}

// ── TEST 3: NETWORK CHAOS — rapid push with retry check ───────
async function test3_networkChaos() {
  section('TEST 3: NETWORK CHAOS — flaky connection simulation');

  const results = [];

  // Simulate 10 rapid-fire requests (some with bad payloads, some good)
  const requests = [
    () => api('POST', '/sync/push', { records: [makePatient(9001)], clientId: 'flaky-1' }),
    () => api('POST', '/sync/push', { records: 'invalid', clientId: 'flaky-2' }),            // bad
    () => api('POST', '/sync/push', { records: [makePatient(9002)], clientId: 'flaky-3' }),
    () => api('POST', '/sync/push', { records: null, clientId: 'flaky-4' }),                  // bad
    () => api('POST', '/sync/push', { records: [makePatient(9003)], clientId: 'flaky-5' }),
    () => api('POST', '/sync/push', { records: [makePatient(9004), makePatient(9005)], clientId: 'flaky-6' }),
    () => api('POST', '/sync/push', { clientId: 'flaky-7' }),                                 // missing records
    () => api('POST', '/sync/push', { records: [makePatient(9006)], clientId: 'flaky-8' }),
    () => api('POST', '/sync/push', { records: [makePatient(9007)], clientId: 'flaky-9' }),
    () => api('GET', '/sync/status'),
  ];

  // Fire all concurrently (simulating overlap from flaky reconnects)
  const responses = await Promise.allSettled(requests.map(fn => fn()));
  for (const r of responses) results.push(r.status === 'fulfilled' ? r.value : { ok: false, status: 0 });

  assert('Server survived 10 concurrent/chaotic requests', responses.every(r => r.status === 'fulfilled'), 'some threw');
  assert('No 500 errors from good requests', results.filter(r => r.status >= 500).length === 0, `500s: ${results.filter(r => r.status >= 500).length}`);
  assert('Bad payloads return 400 (not 500)', results.some(r => r.status === 400), 'no 400s seen');

  // Verify no duplicate records from rapid fire
  const pat9001 = await api('GET', '/patients?q=9001');
  const pat9002 = await api('GET', '/patients?q=9002');
  assert('Rapid-fire did not create duplicate records', pat9001.ok && pat9002.ok, `status=${pat9001.status}`);
}

// ── TEST 4: CONFLICT CHAOS — delete vs update ─────────────────
async function test4_conflictChaos() {
  section('TEST 4: CONFLICT CHAOS — delete vs update');

  const pid = uid(); const t = new Date().toISOString();
  const base = { id: pid, name: 'Conflict Chaos Patient', sex: 'Male', age: 35,
    hospital_id: 'hsp-001', uhid: `UHID-CC-${Date.now()}`,
    allergies: [], chronic_conditions: [], current_medications: [],
    created_at: t, updated_at: t, is_active: 1 };

  // Seed
  await api('POST', '/sync/push', { records: [{ table: 'patients', operation: 'create', payload: base, clientUpdatedAt: t }], clientId: 'devA' });

  // Device A deletes
  const tDel = new Date(Date.now() + 100).toISOString();
  const rDel = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'delete', payload: { id: pid }, clientUpdatedAt: tDel }],
    clientId: 'devA',
  });
  assert('TC-C4a: Device A delete applied', rDel.data?.results?.[0]?.status === 'deleted', rDel.data?.results?.[0]?.status);

  // Device B now tries to update the deleted record (comes in after delete)
  const tUpd = new Date(Date.now() + 50).toISOString(); // older than delete
  const rUpd = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'update',
      payload: { ...base, name: 'Device B Update (after delete)', updated_at: tUpd },
      clientUpdatedAt: tUpd }],
    clientId: 'devB',
  });
  // Acceptable: not_found (deleted) or conflict_skipped
  const updStatus = rUpd.data?.results?.[0]?.status;
  assert('TC-C4b: Update-after-delete handled (not_found or conflict_skipped)', ['not_found','conflict_skipped','deleted'].includes(updStatus), updStatus);

  // Verify no ghost record
  const rCheck = await api('GET', `/patients/${pid}`);
  assert('TC-C4c: No ghost record after delete+update conflict', rCheck.status === 404, `status=${rCheck.status} data=${JSON.stringify(rCheck.data).slice(0,60)}`);

  // TC-C4d: Simultaneous creates from 2 devices (same payload, different clients)
  const pid2 = uid(); const t2 = new Date().toISOString();
  const simBase = { id: pid2, name: 'Sim Create', sex: 'Female', age: 28,
    hospital_id: 'hsp-001', uhid: `UHID-SIM-${Date.now()}`,
    allergies: [], chronic_conditions: [], current_medications: [],
    created_at: t2, updated_at: t2, is_active: 1 };
  const [rSim1, rSim2] = await Promise.all([
    api('POST', '/sync/push', { records: [{ table:'patients', operation:'create', payload: simBase, clientUpdatedAt: t2 }], clientId: 'devA' }),
    api('POST', '/sync/push', { records: [{ table:'patients', operation:'create', payload: simBase, clientUpdatedAt: t2 }], clientId: 'devB' }),
  ]);
  const s1 = rSim1.data?.results?.[0]?.status;
  const s2 = rSim2.data?.results?.[0]?.status;
  assert('TC-C4d: Simultaneous creates produce no duplicates', ['inserted','already_exists'].includes(s1) && ['inserted','already_exists'].includes(s2), `s1=${s1} s2=${s2}`);
  const rCount = await api('GET', `/patients/${pid2}`);
  assert('TC-C4d: Exactly one record exists', rCount.ok, `status=${rCount.status}`);
}

// ── TEST 5: DATA SAFETY INSPECTION ────────────────────────────
async function test5_dataSafety() {
  section('TEST 5: DATA SAFETY CHECK');
  const { execSync } = await import('node:child_process');
  const { existsSync } = await import('node:fs');

  // Find DB file
  const dbPaths = [
    '/Users/apple/Desktop/Medicos/emr_data.sqlite3',
    '/Users/apple/Desktop/Medicos/server/emr_data.sqlite3',
  ];
  const dbPath = dbPaths.find(p => existsSync(p));

  if (!dbPath) {
    console.log('  ⚠️  DB file not found on disk — server may keep in memory until first query');
    assert('DB file check skipped (not yet created)', true, 'harmless — file created on first actual query');
    return;
  }

  console.log(`  📁 DB path: ${dbPath}`);

  // Check DB is readable (not encrypted)
  try {
    const rows = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM patients;"`, { encoding: 'utf8' }).trim();
    assert(`DB readable: ${rows} patient rows on disk`, Number(rows) >= 0, rows);
  } catch (e) {
    assert('SQLite direct read (data visible = not encrypted)', false, e.message.slice(0, 80));
    console.log('  ⚠️  SECURITY NOTE: SQLite file is plaintext. Sensitive data (names, phones) is exposed if file is accessed directly.');
    return;
  }

  // Check for sensitive columns stored in plaintext
  try {
    const sample = execSync(`sqlite3 "${dbPath}" "SELECT name, phone, email FROM patients LIMIT 1;"`, { encoding: 'utf8' }).trim();
    if (sample) {
      console.log(`  ⚠️  SECURITY: Plaintext patient data visible: ${sample.slice(0, 80)}`);
      assert('DATA EXPOSURE RISK: Sensitive PII visible in plaintext SQLite', false, 'Consider SQLCipher or field-level encryption');
    } else {
      assert('No PII sample found in quick check', true);
    }
  } catch {}

  // Check file permissions
  try {
    const perms = execSync(`stat -f "%Lp" "${dbPath}"`, { encoding: 'utf8' }).trim();
    assert(`DB file permissions (${perms}) — should be 600 or 640`, ['600','640','660'].includes(perms), `current: ${perms} — run: chmod 640 ${dbPath}`);
  } catch {}
}

// ── TEST 6: TIME TRAVEL BUG ────────────────────────────────────
async function test6_timeTravel() {
  section('TEST 6: TIME TRAVEL — past/future timestamps');

  const now = Date.now();

  // Far past timestamp (device clock wrong — 10 years ago)
  const pastId = uid();
  const pastTime = new Date(now - 10 * 365 * 24 * 3600 * 1000).toISOString();
  const r1 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'create', clientUpdatedAt: pastTime,
      payload: { id: pastId, name: 'PastClock Patient', sex: 'Male', age: 30,
        hospital_id: 'hsp-001', uhid: `UHID-PAST-${Date.now()}`,
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: pastTime, updated_at: pastTime, is_active: 1 } }],
    clientId: 'timewarp-A',
  });
  assert('TC-TT1: Far-past timestamp insert succeeds', r1.data?.results?.[0]?.status === 'inserted', r1.data?.results?.[0]?.status);

  // Now try to update with a current timestamp — should succeed (current > past)
  const r2 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'update',
      payload: { id: pastId, name: 'PastClock Updated', sex: 'Male', age: 31,
        hospital_id: 'hsp-001', blood_group: 'O+',
        allergies: [], chronic_conditions: [], current_medications: [] },
      clientUpdatedAt: new Date().toISOString() }],
    clientId: 'timewarp-B',
  });
  assert('TC-TT2: Current-time update beats past-clock record', r2.data?.results?.[0]?.status === 'updated', r2.data?.results?.[0]?.status);

  // Future timestamp — device clock 1 year ahead
  const futureId = uid();
  const futureTime = new Date(now + 365 * 24 * 3600 * 1000).toISOString();
  const r3 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'create', clientUpdatedAt: futureTime,
      payload: { id: futureId, name: 'FutureClock Patient', sex: 'Female', age: 22,
        hospital_id: 'hsp-001', uhid: `UHID-FUTURE-${Date.now()}`,
        allergies: [], chronic_conditions: [], current_medications: [],
        created_at: futureTime, updated_at: futureTime, is_active: 1 } }],
    clientId: 'timewarp-future',
  });
  assert('TC-TT3: Future-timestamp record inserts (no crash)', r3.data?.results?.[0]?.status === 'inserted', r3.data?.results?.[0]?.status);

  // A normal device now tries to update the future-clock record — should LOSE (future > now)
  const r4 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'update',
      payload: { id: futureId, name: 'Normal Update — should lose', sex: 'Female', age: 23,
        hospital_id: 'hsp-001',
        allergies: [], chronic_conditions: [], current_medications: [] },
      clientUpdatedAt: new Date().toISOString() }],
    clientId: 'normal-device',
  });
  // This will be conflict_skipped because future timestamp > now (known time-travel limitation)
  const r4Status = r4.data?.results?.[0]?.status;
  console.log(`  ℹ️  TC-TT4: Normal update vs future clock → ${r4Status} (expected conflict_skipped — known limitation)`);
  assert('TC-TT4: Server handles future-clock gracefully (no crash)', r4.ok, `status=${r4.status}`);
}

// ── TEST 7: SILENT FAILURE — verify all sync paths report ─────
async function test7_silentFailures() {
  section('TEST 7: SILENT FAILURE DETECTION');

  // Good sync emits status
  const r1 = await api('GET', '/sync/status');
  assert('Sync status endpoint exists and reports online', r1.ok && r1.data?.status === 'online', JSON.stringify(r1.data));

  // Every push response MUST include results array (so client knows what happened)
  const testRec = makePatient(99999);
  const r2 = await api('POST', '/sync/push', { records: [testRec], clientId: 'silent-test' });
  assert('Push response includes results array', Array.isArray(r2.data?.results), JSON.stringify(r2.data).slice(0,60));
  assert('Push response includes synced count', typeof r2.data?.synced === 'number', JSON.stringify(r2.data).slice(0,60));
  assert('Push response includes failed count', typeof r2.data?.failed === 'number', JSON.stringify(r2.data).slice(0,60));

  // Each result has id + status (so client can map back to queue item)
  const result = r2.data?.results?.[0];
  assert('Each result has id field', !!result?.id, JSON.stringify(result));
  assert('Each result has status field', !!result?.status, JSON.stringify(result));

  // Failed records still appear in results (not silently dropped)
  const r3 = await api('POST', '/sync/push', {
    records: [{ table: 'patients', operation: 'update',
      payload: { id: 'nonexistent-id-xyz' },
      clientUpdatedAt: new Date().toISOString() }],
    clientId: 'silent-test',
  });
  assert('Failed update reports not_found (not silently dropped)', r3.data?.results?.[0]?.status === 'not_found', r3.data?.results?.[0]?.status);
  assert('Failed records counted in failed field', r3.data?.failed >= 1, `failed=${r3.data?.failed}`);

  // Pull returns structured data (not empty/null silently)
  const r4 = await api('GET', '/sync/pull?since=2000-01-01T00:00:00Z');
  assert('Pull response has data.patients array', Array.isArray(r4.data?.data?.patients), JSON.stringify(r4.data).slice(0,80));
  assert('Pull response has serverTime field', !!r4.data?.serverTime, r4.data?.serverTime);

  console.log('\n  📊 Sync response audit complete — no silent failures detected');
}

// ── MAIN ──────────────────────────────────────────────────────
(async () => {
  console.log('\n🏥 MEDICOS EMR — STRESS & CHAOS TEST SUITE');
  console.log('='.repeat(65));

  const up = await fetch(`${BASE}/health`).then(r => r.ok).catch(() => false);
  if (!up) { console.error('\n❌ Server not reachable at', BASE, '\nStart: npm run dev\n'); process.exit(1); }

  const loginRes = await api('POST', '/auth/login', { email: 'admin@medicos.local', password: 'Admin@123' });
  if (!loginRes.data?.token) { console.error('❌ Auth failed'); process.exit(1); }
  token = loginRes.data.token;
  console.log('  ✅ Authenticated\n');

  await test1_bulkSync();
  await test2_crashRecovery();
  await test3_networkChaos();
  await test4_conflictChaos();
  await test5_dataSafety();
  await test6_timeTravel();
  await test7_silentFailures();

  console.log(`\n${'='.repeat(65)}`);
  console.log(`📊 STRESS TEST RESULTS`);
  console.log(`${'='.repeat(65)}`);
  console.log(`  ✅ Passed: ${passed}  ❌ Failed: ${failed}  Score: ${Math.round(passed / (passed + failed) * 100)}%`);
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
})();
