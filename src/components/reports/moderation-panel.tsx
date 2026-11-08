import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FormMessage } from '@/components/form/form-message';
import { TextField } from '@/components/form/text-field';
import { StatusPill } from '@/components/reports/status-pill';
import { ThemedText } from '@/components/themed-text';
import { useModerateReport } from '@/hooks/use-moderation';
import type { ModerationDecision } from '@/services/moderation';
import type { Report } from '@/services/reports';
import { formatDateTime } from '@/utils/history';
import { MODERATION_STATUS_COPY, REVIEW_NOTE_MAX, reviewNoteSchema, type ReviewNoteForm } from '@/utils/moderation';

/** Approve / reject controls on someone else's report, for moderators. */
export function ModerationPanel({ report }: { report: Report }) {
  const moderate = useModerateReport(report.id);
  const { control, handleSubmit } = useForm<ReviewNoteForm>({
    resolver: zodResolver(reviewNoteSchema),
    defaultValues: { note: report.review_note ?? '' },
  });

  const decide = (decision: ModerationDecision) =>
    handleSubmit(({ note }) => moderate.mutate({ decision, note: note ?? '' }));

  return (
    <Card className="gap-md">
      <ThemedText variant="heading">Moderation</ThemedText>
      <StatusPill status={report.status} />
      <ThemedText variant="small" color="textSecondary">
        {MODERATION_STATUS_COPY[report.status]}
        {report.reviewed_at ? ` Last reviewed ${formatDateTime(report.reviewed_at)}.` : ''}
      </ThemedText>
      <ThemedText variant="small" color="textSecondary">
        Approve only reports that describe a scheme or platform. Reject reports that name or show people (including in
        screenshots), or that aren&apos;t about a scam.
      </ThemedText>

      <TextField
        control={control}
        name="note"
        label="Note to the reporter (optional)"
        placeholder="e.g. Please remove the name in the description."
        hint="The reporter sees this on their report."
        multiline
        maxLength={REVIEW_NOTE_MAX}
        autoCapitalize="sentences"
      />

      {moderate.error && <FormMessage tone="error" title="Not saved" message={moderate.error.message} />}
      {moderate.isSuccess && !moderate.isPending && (
        <FormMessage
          tone="success"
          message={moderate.variables?.decision === 'approved' ? 'Report approved.' : 'Report not approved.'}
        />
      )}

      <View className="flex-row flex-wrap gap-sm">
        <Button
          label="Approve"
          onPress={decide('approved')}
          loading={moderate.isPending && moderate.variables?.decision === 'approved'}
          disabled={moderate.isPending}
        />
        <Button
          label="Reject"
          variant="secondary"
          onPress={decide('rejected')}
          loading={moderate.isPending && moderate.variables?.decision === 'rejected'}
          disabled={moderate.isPending}
        />
      </View>
    </Card>
  );
}
