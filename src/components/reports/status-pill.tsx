import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
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
      style={[styles.pill, { borderColor: theme.border, backgroundColor: theme.surfaceSelected }]}
      accessibilityLabel={`Status: ${STATUS_COPY[status].label}`}>
      <Ionicons name={ICONS[status]} size={14} color={theme.text} />
      <ThemedText variant="smallBold">{STATUS_COPY[status].label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
});
