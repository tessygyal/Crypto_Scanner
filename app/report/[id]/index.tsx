import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { ConfirmDelete } from '@/components/confirm-delete';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { EvidenceSection } from '@/components/reports/evidence-section';
import { ModerationPanel } from '@/components/reports/moderation-panel';
import { StatusPill } from '@/components/reports/status-pill';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-provider';
import { useIsModerator } from '@/hooks/use-moderation';
import { useDeleteReport, useReport } from '@/hooks/use-reports';
import type { Report } from '@/services/reports';
import { formatDateTime } from '@/utils/history';
import { isOfflineWithoutData } from '@/utils/offline';
import { reviewNoteHeading } from '@/utils/moderation';
import { PLATFORM_LABELS, SCHEME_LABELS, STATUS_COPY } from '@/utils/reports';
import { Card } from '@/components/card';

export default function ReportScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const report = useReport(id);

  return (
    <Screen hasHeader>
      {created === '1' && (
        <FormMessage
          tone="success"
          title="Thank you — report submitted"
          message="It will appear for everyone once a moderator approves it. You can add screenshots below to help the moderators."
        />
      )}
      <AsyncState
        isLoading={report.isLoading}
        error={report.error}
        isOffline={isOfflineWithoutData(report)}
        isEmpty={report.isSuccess && !report.data}
        loadingMessage="Loading report…"
        emptyTitle="Report not found"
        emptyMessage="It may have been deleted, or it hasn't been approved yet."
        onRetry={() => report.refetch()}
        isRetrying={report.isFetching}>
        {report.data && <ReportDetails report={report.data} />}
      </AsyncState>
      {report.isSuccess && !report.data && <Button label="Back to reports" onPress={() => router.back()} />}
      <Disclaimer />
    </Screen>
  );
}

function ReportDetails({ report }: { report: Report }) {
  const { user } = useAuth();
  const isMine = user?.id === report.user_id;
  const isModerator = useIsModerator().data === true;
  const remove = useDeleteReport();

  return (
    <View className="gap-lg">
      <View className="gap-xs">
        <ThemedText variant="heading">{SCHEME_LABELS[report.scheme_type]}</ThemedText>
        <ThemedText color="textSecondary">
          Seen on {PLATFORM_LABELS[report.platform]} · reported {formatDateTime(report.created_at)}
          {report.reporter ? ` by ${report.reporter}` : ''}
        </ThemedText>
      </View>

      {isMine && (
        <Card>
          <StatusPill status={report.status} />
          <ThemedText variant="small" color="textSecondary">
            {STATUS_COPY[report.status].detail}
          </ThemedText>
          {report.review_note && (
            <View className="gap-xs">
              <ThemedText variant="smallBold">{reviewNoteHeading(report.status)}</ThemedText>
              <ThemedText variant="small" selectable>
                {report.review_note}
              </ThemedText>
            </View>
          )}
        </Card>
      )}

      <View className="gap-sm">
        <ThemedText variant="smallBold">What happened</ThemedText>
        <ThemedText selectable>{report.description}</ThemedText>
      </View>

      <View className="gap-sm">
        <ThemedText variant="smallBold">Location</ThemedText>
        <ThemedText color="textSecondary">
          {report.latitude !== null && report.longitude !== null
            ? `Approximate: ${report.latitude.toFixed(2)}, ${report.longitude.toFixed(2)} (to about 1 km)`
            : 'No location given'}
        </ThemedText>
      </View>

      {isMine && <EvidenceSection reportId={report.id} canEdit />}
      {!isMine && isModerator && (
        <>
          <EvidenceSection reportId={report.id} canEdit={false} />
          <ModerationPanel report={report} />
        </>
      )}

      {isMine && (
        <View className="gap-sm">
          <Button
            label="Edit report"
            variant="secondary"
            onPress={() => router.push({ pathname: '/report/[id]/edit', params: { id: report.id } })}
            fullWidth
          />
          <ConfirmDelete
            buttonLabel="Delete report"
            question="Delete this report?"
            explanation="It will be removed for everyone, including from the map, along with any screenshots. This can't be undone."
            onConfirm={() => remove.mutate(report.id, { onSuccess: () => router.back() })}
            isPending={remove.isPending}
            error={remove.error}
          />
        </View>
      )}
    </View>
  );
}
