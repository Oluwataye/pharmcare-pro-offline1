import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreateDispensaryQueuePayload, DispensaryQueueEntry } from '../types/dispensary';

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? 'http://localhost:3001'
  : '';

export function useDispensaryQueue() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createQueueEntry = useCallback(
    async (payload: CreateDispensaryQueuePayload): Promise<DispensaryQueueEntry | null> => {
      if (!user) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE}/api/dispensary-queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to create queue entry');
        }

        const data = await res.json();
        return data.entry as DispensaryQueueEntry;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user]
  );

  const cancelQueueEntry = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE}/api/dispensary-queue/${id}/cancel`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to cancel queue entry');
        }
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      }
    },
    []
  );

  return { createQueueEntry, cancelQueueEntry, isSubmitting, error };
}
