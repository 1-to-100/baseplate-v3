import { useQuery } from '@tanstack/react-query';
import { getCanEditSegments } from '../api/segment-lists';

/**
 * System admin and customer success users can view segments but must not create/edit/delete them.
 * This hook returns whether the current user is allowed to create, edit, and remove segments.
 */
export function useCanEditSegments(): {
  canEditSegments: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['strategy-forge', 'can-edit-segments'],
    queryFn: getCanEditSegments,
  });

  return {
    canEditSegments: data?.canEditSegments ?? true,
    isLoading,
    error: error instanceof Error ? error : null,
  };
}
