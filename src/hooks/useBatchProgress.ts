import { useState, useEffect, useCallback } from 'react';
import { 
  getExecutionProgress, 
  subscribeToExecutionUpdates, 
  ExecutionProgress 
} from '@/services/executionTrackingService';
import { useToast } from './use-toast';

export function useBatchProgress(batchId: string | undefined) {
  const [data, setData] = useState<ExecutionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchProgress = useCallback(async () => {
    if (!batchId) return;
    
    try {
      const progress = await getExecutionProgress(batchId);
      if (progress) {
        setData(progress);
      }
    } catch (err) {
      console.error('Error fetching batch progress:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch progress'));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (!batchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchProgress();

    // Subscribe to real-time updates
    let debounceTimer: NodeJS.Timeout;
    
    const unsubscribe = subscribeToExecutionUpdates(batchId, (payload) => {
      console.log('Real-time update received:', payload);
      
      // Debounce the refresh to prevent flooding on rapid updates
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchProgress();
      }, 500);
      
      // Notify user on specific events (immediate)
      if (payload.new && payload.new.status === 'completed' && payload.old?.status !== 'completed') {
        toast({
          title: "Task Completed",
          description: `A task in batch ${batchId.slice(0, 8)} has finished.`,
        });
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(debounceTimer);
    };
  }, [batchId, fetchProgress, toast]);

  return {
    data,
    loading,
    error,
    refresh: fetchProgress
  };
}
