import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { riskColors } from '@/theme';
import type { RiskLevel } from '@/utils/risk/types';

export const RISK_ICONS: Record<RiskLevel, ComponentProps<typeof Ionicons>['name']> = {
  none: 'checkmark-circle',
  low: 'information-circle',
  medium: 'warning',
  high: 'alert-circle',
};

/** The icon + color for a risk level. Always shown next to a text label. */
export function RiskIcon({ level, size = 24 }: { level: RiskLevel; size?: number }) {
  return <Ionicons name={RISK_ICONS[level]} size={size} color={riskColors[level]} importantForAccessibility="no" />;
}
