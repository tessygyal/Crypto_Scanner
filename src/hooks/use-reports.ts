import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { useAuth } from '@/context/auth-provider';
import {
  createReport,
  deleteReport,
  getReport,
  listMapReports,
  listReports,
  updateReport,
  type Report,
  type ReportPage,
  type ReportScope,
} from '@/services/reports';
import type { ReportInput } from '@/utils/reports';

export const reportsKeys = {
  all: ['reports'] as const,
  list: (scope: ReportScope, userId: string | undefined) => ['reports', 'list', scope, userId] as const,
  detail: (id: string) => ['reports', 'detail', id] as const,
  // Under 'list' so creating, editing or deleting a report also refreshes the map.
  map: ['reports', 'list', 'map'] as const,
};

/** Approved reports with a location, for the map. */
export function useMapReports() {
  const { user } = useAuth();
  return useQuery({ queryKey: reportsKeys.map, queryFn: listMapReports, enabled: !!user });
}

export function useReports(scope: ReportScope) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: reportsKeys.list(scope, user?.id),
    queryFn: ({ pageParam }) => listReports(scope, user!.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: !!user,
  });
}

export function useReport(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: reportsKeys.detail(id),
    queryFn: () => getReport(id),
    enabled: !!id,
    placeholderData: () => {
      for (const [, data] of queryClient.getQueriesData<InfiniteData<ReportPage>>({ queryKey: ['reports', 'list'] })) {
        for (const page of data?.pages ?? []) {
          const found = page.reports.find((r) => r.id === id);
          if (found) return found;
        }
      }
      return undefined;
    },
  });
}

/** After any change, refetch lists and the changed report. */
function useRefreshReports() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
    if (id) queryClient.invalidateQueries({ queryKey: reportsKeys.detail(id) });
  };
}

export function useCreateReport() {
  const refresh = useRefreshReports();
  return useMutation({
    mutationFn: (input: ReportInput) => createReport(input),
    onSuccess: () => refresh(),
  });
}

export function useUpdateReport(id: string) {
  const refresh = useRefreshReports();
  return useMutation({
    mutationFn: (input: ReportInput) => updateReport(id, input),
    onSuccess: () => refresh(id),
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReport,
    onSuccess: (_void, id) => {
      // Remove it from every cached paged list straight away. (The map's cache
      // lives under the same prefix but is a plain array, so leave it to the refetch.)
      queryClient.setQueriesData<InfiniteData<ReportPage>>({ queryKey: ['reports', 'list'] }, (data) =>
        data && 'pages' in data
          ? { ...data, pages: data.pages.map((p) => ({ ...p, reports: p.reports.filter((r: Report) => r.id !== id) })) }
          : data
      );
      queryClient.removeQueries({ queryKey: reportsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
    },
  });
}
