import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { cn } from '@/utils/cn';

/** A banner for a form's overall result: an error from the server, or a success note. */
export function FormMessage({ tone, title, message }: { tone: 'error' | 'success'; title?: string; message: string }) {
  return (
    <View
      className={cn(
        'gap-xs rounded-md border border-l-4 bg-surface p-md',
        tone === 'error' ? 'border-danger' : 'border-risk-none'
      )}
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}>
      {title && (
        <ThemedText variant="bodyBold" color={tone === 'error' ? 'danger' : 'text'}>
          {title}
        </ThemedText>
      )}
      <ThemedText variant="small" color={title ? 'textSecondary' : 'text'}>
        {message}
      </ThemedText>
    </View>
  );
}
