import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/lib/auth';
import { getFantasyContext } from './api';

export function useFantasyContext() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['fantasy-context', session?.user.id],
    queryFn: getFantasyContext,
    enabled: Boolean(session?.user.id),
  });
}
