import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { FormMessage } from '@/components/form/form-message';
import { TextField } from '@/components/form/text-field';
import { LocationPicker } from '@/components/reports/location-picker';
import { ThemedText } from '@/components/themed-text';
import { PLATFORMS, SCHEME_TYPES } from '@/types/database';
import { PLATFORM_LABELS, reportSchema, SCHEME_LABELS, type ReportForm as FormValues, type ReportInput } from '@/utils/reports';

/** Create / edit form for a community report. */
export function ReportForm({
  defaultValues,
  submitLabel,
  onSubmit,
  isPending,
  error,
}: {
  defaultValues?: Partial<FormValues>;
  submitLabel: string;
  onSubmit: (input: ReportInput) => void;
  isPending: boolean;
  error: Error | null;
}) {
  const { control, handleSubmit } = useForm<FormValues, unknown, ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { description: '', location: null, ...defaultValues },
  });
  const description = useWatch({ control, name: 'description' }) ?? '';

  return (
    <View className="gap-lg">
      <View className="gap-xs rounded-md border border-border bg-surface p-md">
        <ThemedText variant="smallBold">Describe the scheme, not the people</ThemedText>
        <ThemedText variant="small" color="textSecondary">
          Say what was promised, how they contacted you and how they asked to be paid. Don&apos;t include names, phone
          numbers, email addresses or photos of people.
        </ThemedText>
      </View>

      <Controller
        control={control}
        name="schemeType"
        render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
          <ChipGroup
            label="Type of scheme"
            options={SCHEME_TYPES.map((t) => ({ value: t, label: SCHEME_LABELS[t] }))}
            value={value}
            onChange={onChange}
            error={fieldError?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="platform"
        render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
          <ChipGroup
            label="Where did you see it?"
            options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }))}
            value={value}
            onChange={onChange}
            error={fieldError?.message}
          />
        )}
      />

      <TextField
        control={control}
        name="description"
        label="What happened?"
        placeholder="e.g. A Facebook page promised to double any kina sent within 7 days, paid through a mobile money agent."
        multiline
        maxLength={2000}
        autoCapitalize="sentences"
        hint={`${description.trim().length} / 2,000 characters (at least 20)`}
      />

      <Controller
        control={control}
        name="location"
        render={({ field: { value, onChange } }) => <LocationPicker value={value ?? null} onChange={onChange} />}
      />

      {error && <FormMessage tone="error" message={error.message} />}
      <Button label={submitLabel} onPress={handleSubmit(onSubmit)} loading={isPending} fullWidth />
    </View>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <View className="gap-sm">
      <ThemedText variant="smallBold" nativeID={`group-${label}`}>
        {label}
      </ThemedText>
      <View className="flex-row flex-wrap gap-sm" accessibilityRole="radiogroup" aria-labelledby={`group-${label}`}>
        {options.map((o) => (
          <ChoiceChip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
      {error && (
        <ThemedText variant="small" color="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
    </View>
  );
}
