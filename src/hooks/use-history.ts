import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { useAuth } from '@/context/auth-provider';
import { deleteCheck, getCheck, listChecks, type HistoryPage } from '@/services/checks';
import type { CheckRow } from '@/types/database';

export const checksKeys = {
  all: ['checks'] as const,
  list: (userId: string | undefined) => ['checks', 'list', userId] as const,
  detail: (id: string) => ['checks', 'detail', id] as const,
};

/** History, newest first, loaded a page at a time. */
export function useCheckHistory() {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: checksKeys.list(user?.id),
    queryFn: ({ pageParam }) => listChecks(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: !!user,
  });
}

/** One saved check. Shows the copy already in the history list instantly, then refreshes. */
export function useCheck(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: checksKeys.detail(id),
    queryFn: () => getCheck(id),
    enabled: !!id,
    placeholderData: () => findInLists(queryClient.getQueriesData<InfiniteData<HistoryPage>>({ queryKey: ['checks', 'list'] }), id),
  });
}

export function useDeleteCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCheck,
    onSuccess: (_void, id) => {
      // Remove it from every cached history page straight away…
      queryClient.setQueriesData<InfiniteData<HistoryPage>>({ queryKey: ['checks', 'list'] }, (data) =>
        data
          ? { ...data, pages: data.pages.map((p) => ({ ...p, checks: p.checks.filter((c) => c.id !== id) })) }
          : data
      );
      queryClient.removeQueries({ queryKey: checksKeys.detail(id) });
      // …then refetch in the background so paging stays correct.
      queryClient.invalidateQueries({ queryKey: ['checks', 'list'] });
    },
  });
}

function findInLists(
  lists: [unknown, InfiniteData<HistoryPage> | undefined][],
  id: string
): CheckRow | undefined {
  for (const [, data] of lists) {
    for (const page of data?.pages ?? []) {
      const found = page.checks.find((c) => c.id === id);
      if (found) return found;
    }
  }
  return undefined;
}
