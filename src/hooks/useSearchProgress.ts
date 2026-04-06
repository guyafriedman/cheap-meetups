'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchProgress } from '@/lib/types';

export function useSearchProgress(tripId: string | null) {
  const [progress, setProgress] = useState<SearchProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'complete' | 'error'>('idle');

  const startPolling = useCallback(() => {
    if (!tripId) return;
    setStatus('searching');
  }, [tripId]);

  useEffect(() => {
    if (status !== 'searching' || !tripId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/search-status?tripId=${tripId}`);
        const data = await res.json();

        setProgress(data.progress);

        if (data.status === 'complete' || data.status === 'error') {
          setStatus(data.status);
          clearInterval(interval);
        }
      } catch {
        // Keep polling on transient errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, tripId]);

  const percentage = progress
    ? Math.round((progress.completed_tasks / Math.max(progress.total_tasks, 1)) * 100)
    : 0;

  return { progress, status, percentage, startPolling };
}
