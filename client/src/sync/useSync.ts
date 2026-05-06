// client/src/sync/useSync.ts
import { useState, useEffect } from 'react';
import { onSyncStateChange, syncNow, type SyncState } from './syncManager';

export function useSync() {
  const [state, setState]     = useState<SyncState>('idle');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const unsub = onSyncStateChange((s, p) => { setState(s); setPending(p); });
    return () => { unsub(); };
  }, []);

  return { syncState: state, pendingCount: pending, syncNow };
}
