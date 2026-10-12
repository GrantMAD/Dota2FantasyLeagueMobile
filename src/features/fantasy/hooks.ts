import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/lib/auth';
import { getFantasyContext } from './api';

export function useFantasyContext(gameweekId?: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['fantasy-context', session?.user.id, gameweekId ?? null],
    queryFn: () => getFantasyContext(gameweekId),
    enabled: Boolean(session?.user.id),
  });
}
