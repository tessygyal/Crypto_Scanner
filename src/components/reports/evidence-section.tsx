import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FormMessage } from '@/components/form/form-message';
import { ThemedText } from '@/components/themed-text';
import { useAddEvidence, useDeleteEvidence, useEvidence } from '@/hooks/use-evidence';
import { useTheme } from '@/hooks/use-theme';
import type { Evidence } from '@/services/evidence';
import { MAX_EVIDENCE } from '@/utils/evidence';
import { isOfflineWithoutData } from '@/utils/offline';

/**
 * Private screenshots on a report. The owner can add and remove them;
 * a moderator (canEdit = false) can only look.
 */
export function EvidenceSection({ reportId, canEdit }: { reportId: string; canEdit: boolean }) {
  const theme = useTheme();
  const evidence = useEvidence(reportId, true);
  const add = useAddEvidence(reportId);
  const remove = useDeleteEvidence(reportId);
  const count = evidence.data?.length ?? 0;

  return (
    <Card>
      <View className="flex-row items-center gap-sm">
        <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} />
        <ThemedText variant="smallBold">Screenshots (private)</ThemedText>
      </View>
      <ThemedText variant="small" color="textSecondary">
        {canEdit
          ? 'Only you and the moderators can see these. They help moderators review your report. Crop out names, faces and phone numbers first.'
          : 'Only the reporter and moderators can see these.'}
      </ThemedText>

      <AsyncState
        isLoading={evidence.isLoading}
        error={evidence.error}
        isOffline={isOfflineWithoutData(evidence)}
        isEmpty={evidence.isSuccess && count === 0 && !canEdit}
        loadingMessage="Loading screenshots…"
        emptyTitle="No screenshots"
        emptyMessage="The reporter didn't add any screenshots."
        onRetry={() => evidence.refetch()}
        isRetrying={evidence.isFetching}>
        {count > 0 && (
          <View className="gap-md">
            {evidence.data!.map((item, i) => (
              <EvidenceItem
                key={item.id}
                item={item}
                index={i}
                onRemove={canEdit ? () => remove.mutate(item) : undefined}
                isRemoving={remove.isPending && remove.variables?.id === item.id}
              />
            ))}
          </View>
        )}
        {remove.error && <FormMessage tone="error" title="Not removed" message={remove.error.message} />}

        {canEdit && (
          <>
            {add.error && <FormMessage tone="error" title="Screenshot not added" message={add.error.message} />}
            {count < MAX_EVIDENCE ? (
              <Button
                label={count === 0 ? 'Add a screenshot' : `Add another (${count} of ${MAX_EVIDENCE})`}
                variant="secondary"
                onPress={() => add.mutate(count)}
                loading={add.isPending}
                fullWidth
              />
            ) : (
              <ThemedText variant="small" color="textSecondary">
                {`You've added the most screenshots allowed (${MAX_EVIDENCE}). Remove one to add another.`}
              </ThemedText>
            )}
          </>
        )}
      </AsyncState>
    </Card>
  );
}

function EvidenceItem({
  item,
  index,
  onRemove,
  isRemoving,
}: {
  item: Evidence;
  index: number;
  onRemove?: () => void;
  isRemoving: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const label = `Screenshot ${index + 1}`;

  return (
    <View className="gap-sm">
      {item.url && !failed ? (
        <Image
          source={{ uri: item.url }}
          contentFit="contain"
          accessibilityLabel={label}
          onError={() => setFailed(true)}
          style={{ height: 256, width: '100%', borderRadius: 8 }}
        />
      ) : (
        <View className="h-24 items-center justify-center rounded-md border border-border">
          <ThemedText variant="small" color="textSecondary">
            {label} couldn&apos;t be shown. Please try again later.
          </ThemedText>
        </View>
      )}
      {onRemove && <Button label={`Remove ${label.toLowerCase()}`} variant="secondary" onPress={onRemove} loading={isRemoving} />}
    </View>
  );
}
