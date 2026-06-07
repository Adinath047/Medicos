// client/src/sync/syncManager.ts
// Handles bidirectional sync: pending records → server, server changes → IndexedDB

import { db, getPendingCount, getLastSync, setLastSync } from '../db/localDB';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

type SyncListener = (state: SyncState, pending: number) => void;
const listeners = new Set<SyncListener>();

let currentState: SyncState = 'idle';
let pendingCount = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isOnline = navigator.onLine;

// ── Listener management ───────────────────────────────────────────────
export function onSyncStateChange(fn: SyncListener) {
  listeners.add(fn);
  fn(currentState, pendingCount);  // emit current state immediately
  return () => listeners.delete(fn);
}

function emit(state: SyncState, pending?: number) {
  currentState = state;
  if (pending !== undefined) pendingCount = pending;
  listeners.forEach(fn => fn(state, pendingCount));
}

// ── Online / Offline detection ────────────────────────────────────────
window.addEventListener('online',  () => { isOnline = true;  scheduleSync(1000); });
window.addEventListener('offline', () => { isOnline = false; emit('offline', pendingCount); });

// ── Main sync function ────────────────────────────────────────────────
export async function syncNow(): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return; // Do not sync if not logged in

  if (!isOnline || currentState === 'syncing') return;

  const pending = await getPendingCount();
  if (pending === 0) {
    // Still do a pull to get server changes
    await pullFromServer();
    emit('idle', 0);
    return;
  }

  emit('syncing', pending);

  try {
    await pushToServer();
    await pullFromServer();
    const remaining = await getPendingCount();
    emit('idle', remaining);
  } catch (err) {
    console.error('Sync error:', err);
    emit('error', await getPendingCount());
  }
}

// ── Push pending records to server ───────────────────────────────────
async function pushToServer(): Promise<void> {
  const queue = await db.syncQueue.toArray();
  if (!queue.length) return;

  const clientId = getClientId();
  const res = await apiClient.post('/sync/push', { records: queue, clientId });
  const { results } = res.data;

  // Clear processed items from queue and mark them as synced in tables
  const idsToDelete: number[] = [];
  const successStatus = ['inserted', 'updated', 'deleted', 'already_exists', 'conflict_skipped'];

  results.forEach((result: any, idx: number) => {
    const qItem = queue[idx];
    if (!qItem || qItem.id === undefined) return;

    idsToDelete.push(qItem.id);

    if (result.status === 'inserted' || result.status === 'updated') {
      markSynced(qItem.table, result.id).catch(err =>
        console.error(`Error marking ${qItem.table} ${result.id} as synced:`, err)
      );
    } else if (result.status === 'conflict_skipped') {
      console.warn(`Sync Conflict: Record ${result.id} was modified by another device.`);
      alert(`Sync Conflict: A record you edited was recently updated by another user. Your changes for this record have been overwritten by the newer version to prevent data corruption.`);
    } else if (result.status === 'rejected' || result.status === 'error') {
      console.warn(`Sync rejected for ${qItem.table} ${result.id}: ${result.reason}`);
    }
  });

  if (idsToDelete.length) {
    await db.syncQueue.bulkDelete(idsToDelete);
  }
}

async function markSynced(tableName: string, id: string) {
  const tableMap: Record<string, any> = {
    patients: db.patients, encounters: db.encounters, vitals: db.vitals,
    prescriptions: db.prescriptions, appointments: db.appointments, billing: db.billing,
    medicines: db.medicines,
  };
  const table = tableMap[tableName];
  if (table) await table.update(id, { _syncStatus: 'synced' });
}

// ── Pull server changes → IndexedDB ──────────────────────────────────
async function pullFromServer(): Promise<void> {
  const lastSync = await getLastSync();
  const res = await apiClient.get('/sync/pull', { params: { since: lastSync } });
  const { data, pulledAt } = res.data;

  await db.transaction('rw', [db.patients, db.encounters, db.vitals, db.prescriptions, db.appointments, db.billing, db.medicines], async () => {
    if (data.patients?.length)      await db.patients.bulkPut(data.patients.map((r: any) => ({ ...r, _syncStatus: 'synced', allergies: safeParse(r.allergies), chronic_conditions: safeParse(r.chronic_conditions), current_medications: safeParse(r.current_medications) })));
    if (data.encounters?.length)    await db.encounters.bulkPut(data.encounters.map((r: any) => ({ ...r, _syncStatus: 'synced', diagnosis: safeParse(r.diagnosis) })));
    if (data.vitals?.length)        await db.vitals.bulkPut(data.vitals.map((r: any) => ({ ...r, _syncStatus: 'synced' })));
    if (data.prescriptions?.length) await db.prescriptions.bulkPut(data.prescriptions.map((r: any) => ({ ...r, _syncStatus: 'synced', medicines: safeParse(r.medicines) })));
    if (data.appointments?.length)  await db.appointments.bulkPut(data.appointments.map((r: any) => ({ ...r, _syncStatus: 'synced' })));
    if (data.billing?.length)       await db.billing.bulkPut(data.billing.map((r: any) => ({ ...r, _syncStatus: 'synced', items: safeParse(r.items) })));
    if (data.medicines?.length)     await db.medicines.bulkPut(data.medicines.map((r: any) => ({ ...r, _syncStatus: 'synced', generics: safeParse(r.generics), strengths: safeParse(r.strengths) })));
  });

  await setLastSync(pulledAt);
}

function safeParse(val: any): any {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

// ── Schedule periodic sync ────────────────────────────────────────────
export function scheduleSync(delayMs = 30_000): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncNow(); scheduleSync(); }, delayMs);
}

// ── Client device ID (persisted in localStorage) ──────────────────────
function getClientId(): string {
  const key = 'emr_client_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// ── Init: start sync on load ──────────────────────────────────────────
export async function initSync(): Promise<void> {
  const pending = await getPendingCount();
  emit(isOnline ? 'idle' : 'offline', pending);

  if (isOnline) {
    await syncNow();
    scheduleSync(30_000);  // sync every 30s
  }
}
