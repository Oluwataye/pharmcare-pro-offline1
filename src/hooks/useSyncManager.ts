import { useEffect, useRef, useState } from 'react';
import { useOffline } from '@/contexts/OfflineContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api-client';
import {
  getAllOperations,
  removeOperation,
  clearAllOperations,
  hasOperations,
  type OfflineOperation,
} from '@/lib/offlineQueue';

export function useSyncManager() {
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  const performSync = async () => {
    // Prevent double sync execution
    if (syncInProgress.current || !isOnline) return;

    // Quick check — avoid acquiring the lock when there's nothing to do
    const anyPending = await hasOperations();
    if (!anyPending) {
      localStorage.setItem('SYNC_PENDING', 'false');
      return;
    }

    // Read the full queue from IndexedDB (FIFO order via auto-increment key)
    let operations: OfflineOperation[] = [];
    try {
      operations = await getAllOperations();
    } catch (e) {
      console.error('[Sync Manager] Failed to read IndexedDB queue:', e);
      return;
    }

    if (operations.length === 0) {
      localStorage.setItem('SYNC_PENDING', 'false');
      return;
    }

    console.log(`[Sync Manager] Found ${operations.length} pending operations. Starting sync...`);
    syncInProgress.current = true;
    setIsSyncing(true);

    toast({
      title: 'Syncing Data',
      description: `Synchronizing ${operations.length} offline operation(s)...`,
    });

    const API_URL = `${window.location.protocol}//${window.location.hostname}:${window.location.port || '80'}/api`;
    let syncErrorCount = 0;

    for (const op of operations) {
      console.log(`[Sync Manager] Processing [${op.type}] on ${op.resource} (recordId: ${op.recordId || 'new'})`);

      try {
        let response: Response;

        if (op.type === 'create') {
          // Sales use the specialised edge-function endpoint
          if (op.resource === 'sales') {
            response = await apiFetch(`${API_URL}/functions/complete-sale`, {
              method: 'POST',
              body: JSON.stringify(op.data),
            });
          } else {
            response = await apiFetch(`${API_URL}/${op.resource}`, {
              method: 'POST',
              body: JSON.stringify(op.data),
            });
          }
        } else if (op.type === 'update') {
          response = await apiFetch(`${API_URL}/${op.resource}/${op.recordId}`, {
            method: 'PATCH',
            body: JSON.stringify(op.data),
          });
        } else if (op.type === 'delete') {
          response = await apiFetch(`${API_URL}/${op.resource}?id=eq.${op.recordId}`, {
            method: 'DELETE',
          });
        } else {
          throw new Error(`Unknown operation type: ${(op as any).type}`);
        }

        if (response.ok) {
          // Remove this individual operation from IndexedDB on success
          if (op.id !== undefined) await removeOperation(op.id);
          console.log(`[Sync Manager] Successfully synced operation id=${op.id}`);
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn(`[Sync Manager] Failed to sync operation id=${op.id}:`, errData);

          // 4xx = bad payload → discard to unblock the queue
          if (response.status >= 400 && response.status < 500) {
            console.warn(`[Sync Manager] Skipping invalid operation (HTTP ${response.status})`);
            if (op.id !== undefined) await removeOperation(op.id);
          } else {
            // 5xx = server issue → stop here; retry next time
            syncErrorCount++;
            break;
          }
        }
      } catch (err) {
        console.error('[Sync Manager] Network error during sync:', err);
        syncErrorCount++;
        break;
      }
    }

    syncInProgress.current = false;
    setIsSyncing(false);

    const stillPending = await hasOperations();

    if (!stillPending) {
      localStorage.setItem('SYNC_PENDING', 'false');
      toast({
        title: 'Sync Complete',
        description: 'All offline data has been successfully synchronized.',
      });
      // Reload fresh data from the server
      queryClient.invalidateQueries();
    } else {
      localStorage.setItem('SYNC_PENDING', 'true');
      if (syncErrorCount > 0) {
        const remaining = await getAllOperations();
        toast({
          title: 'Sync Suspended',
          description: `Unable to complete sync. ${remaining.length} item(s) remain offline.`,
          variant: 'destructive',
        });
      }
    }
  };

  useEffect(() => {
    if (isOnline) {
      // Small delay to let connectivity settle before hitting the server
      const timeout = setTimeout(performSync, 2000);
      return () => clearTimeout(timeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return { isSyncing, forceSync: performSync };
}
