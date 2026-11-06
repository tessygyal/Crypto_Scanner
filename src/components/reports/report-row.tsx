import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { StatusPill } from '@/components/reports/status-pill';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Report } from '@/services/reports';
import { formatWhen } from '@/utils/history';
import { PLATFORM_LABELS, SCHEME_LABELS } from '@/utils/reports';

/** One report in a list. Shows the status pill only for the user's own reports. */
export function ReportRow({ report, showStatus, onPress }: { report: Report; showStatus: boolean; onPress: () => void }) {
  const theme = useTheme();
  const scheme = SCHEME_LABELS[report.scheme_type];
  const platform = PLATFORM_LABELS[report.platform];
  const when = formatWhen(report.created_at);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Report: ${scheme} on ${platform}. ${when}.`}
      accessibilityHint="Opens the report"
      className="flex-row items-center gap-md rounded-md border border-border bg-surface p-md active:opacity-70">
      <View className="flex-1 gap-xs">
        <ThemedText variant="bodyBold">{scheme}</ThemedText>
        <ThemedText variant="small" color="textSecondary">
          {platform} · {when}
          {report.latitude === null ? ' · No location' : ''}
        </ThemedText>
        <ThemedText variant="small" numberOfLines={2}>
          {report.description}
        </ThemedText>
        {showStatus && <StatusPill status={report.status} />}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}
