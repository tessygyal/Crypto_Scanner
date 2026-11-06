import { router, useLocalSearchParams } from 'expo-router';

import { AsyncState } from '@/components/async-state';
import { FormMessage } from '@/components/form/form-message';
import { ReportForm } from '@/components/reports/report-form';
import { Screen } from '@/components/screen';
import { useAuth } from '@/context/auth-provider';
import { useReport, useUpdateReport } from '@/hooks/use-reports';

export default function EditReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const report = useReport(id);
  const update = useUpdateReport(id);
  const isMine = !!report.data && report.data.user_id === user?.id;

  return (
    <Screen hasHeader>
      <AsyncState
        isLoading={report.isLoading}
        error={report.error}
        isEmpty={report.isSuccess && !isMine}
        loadingMessage="Loading report…"
        emptyTitle="You can't edit this report"
        emptyMessage="It may have been deleted, or it belongs to someone else."
        onRetry={() => report.refetch()}
        isRetrying={report.isFetching}>
        {report.data && isMine && (
          <>
            {report.data.status !== 'pending' && (
              <FormMessage
                tone="success"
                title="Editing sends it back for review"
                message="After you save, your report is hidden from others until a moderator approves it again."
              />
            )}
            <ReportForm
              defaultValues={{
                schemeType: report.data.scheme_type,
                platform: report.data.platform,
                description: report.data.description,
                location:
                  report.data.latitude !== null && report.data.longitude !== null
                    ? { latitude: report.data.latitude, longitude: report.data.longitude }
                    : null,
              }}
              submitLabel="Save changes"
              onSubmit={(input) => update.mutate(input, { onSuccess: () => router.back() })}
              isPending={update.isPending}
              error={update.error}
            />
          </>
        )}
      </AsyncState>
    </Screen>
  );
}
