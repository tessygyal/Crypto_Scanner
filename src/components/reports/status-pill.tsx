import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { ReportStatus } from '@/types/database';
import { STATUS_COPY } from '@/utils/reports';

const ICONS: Record<ReportStatus, ComponentProps<typeof Ionicons>['name']> = {
  pending: 'time-outline',
  approved: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
};

/** Moderation status as icon + text (never color alone). */
export function StatusPill({ status }: { status: ReportStatus }) {
  const theme = useTheme();
  return (
    <View
      className="flex-row items-center gap-xs self-start rounded-pill border border-border bg-surface-selected px-sm py-0.5"
      accessibilityLabel={`Status: ${STATUS_COPY[status].label}`}>
      <Ionicons name={ICONS[status]} size={14} color={theme.text} />
      <ThemedText variant="smallBold">{STATUS_COPY[status].label}</ThemedText>
    </View>
  );
}
