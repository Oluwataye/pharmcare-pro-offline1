import { useState, useCallback, useEffect, useRef } from 'react';
import { DispensaryQueueEntry } from '../../dispensary/types/dispensary';

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? 'http://localhost:3001'
  : '';

const POLL_INTERVAL_MS = 30_000; // auto-refresh every 30 seconds

export function usePendingQueue() {
  const [queue, setQueue] = useState<DispensaryQueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`${API_BASE}/api/dispensary-queue?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to fetch queue');
      }

      const data = await res.json();
      setQueue(data.entries || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchQueue(searchTerm);
    intervalRef.current = setInterval(() => fetchQueue(searchTerm), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQueue, searchTerm]);

  const processQueueEntry = useCallback(
    async (id: string, sale_id: string, cashier_name: string): Promise<boolean> => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE}/api/dispensary-queue/${id}/process`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sale_id, cashier_name }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to process ticket');
        }

        // Optimistically remove from local list
        setQueue(prev => prev.filter(e => e.id !== id));
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      }
    },
    []
  );

  return {
    queue,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    refresh: () => fetchQueue(searchTerm),
    processQueueEntry,
  };
}
