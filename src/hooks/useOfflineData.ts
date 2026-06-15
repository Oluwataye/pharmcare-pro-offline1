import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOffline } from '@/contexts/OfflineContext';
import { useToast } from '@/hooks/use-toast';
import {
  enqueueOperation,
  clearAllOperations,
  type OfflineOperation,
} from '@/lib/offlineQueue';

export function useOfflineData() {
  const queryClient = useQueryClient();
  const { isOnline } = useOffline();
  const { toast } = useToast();

  // Keep a lightweight pending-count in React state so the UI can react.
  // The actual data lives in IndexedDB — React state is NOT the source of truth.
  const [pendingCount, setPendingCount] = useState(0);

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  const updateLocalCache = (operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'synced'>) => {
    switch (operation.type) {
      case 'create': {
        queryClient.setQueryData([operation.resource], (old: any[] = []) => [
          ...old,
          operation.data,
        ]);
        break;
      }
      case 'update': {
        queryClient.setQueryData([operation.resource], (old: any[] = []) =>
          old.map((item) =>
            item.id === operation.recordId ? { ...item, ...operation.data } : item
          )
        );
        break;
      }
      case 'delete': {
        queryClient.setQueryData([operation.resource], (old: any[] = []) =>
          old.filter((item) => item.id !== operation.recordId)
        );
        break;
      }
    }
  };

  const queue = async (
    op: Omit<OfflineOperation, 'id' | 'timestamp' | 'synced'>
  ) => {
    await enqueueOperation(op);
    setPendingCount((c) => c + 1);
    localStorage.setItem('SYNC_PENDING', 'true');

    // Optimistically update the in-memory React Query cache
    updateLocalCache(op);
  };

  // -----------------------------------------------------------------------
  // Public API — same shape as the old hook so all callers compile unchanged
  // -----------------------------------------------------------------------

  const createOfflineItem = async <T>(resource: string, data: T) => {
    if (!isOnline) {
      toast({
        title: 'Offline Mode',
        description: `Your ${resource} has been saved offline and will sync when you're back online.`,
      });
    }
    const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const itemWithId = { ...(data as object), id: tempId } as T & { id: string };

    await queue({ type: 'create', resource, data: itemWithId });
    return itemWithId;
  };

  const updateOfflineItem = async <T>(resource: string, recordId: string, data: Partial<T>) => {
    if (!isOnline) {
      toast({
        title: 'Offline Mode',
        description: `Your changes to this ${resource} have been saved offline and will sync when you're back online.`,
      });
    }
    await queue({ type: 'update', resource, recordId, data });
  };

  const deleteOfflineItem = async (resource: string, recordId: string) => {
    if (!isOnline) {
      toast({
        title: 'Offline Mode',
        description: `This ${resource} has been marked for deletion and will be removed when you're back online.`,
      });
    }
    await queue({ type: 'delete', resource, recordId });
  };

  const clearPendingOperations = async () => {
    await clearAllOperations();
    setPendingCount(0);
    localStorage.setItem('SYNC_PENDING', 'false');
  };

  return {
    /** @deprecated use pendingCount instead */
    pendingOperations: [] as OfflineOperation[],
    pendingCount,
    createOfflineItem,
    updateOfflineItem,
    deleteOfflineItem,
    clearPendingOperations,
  };
}
