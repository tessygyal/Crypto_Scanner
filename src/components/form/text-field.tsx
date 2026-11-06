import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing, typography } from '@/theme';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Password field with a show/hide toggle. */
  secure?: boolean;
  hint?: string;
} & Pick<
  TextInputProps,
  | 'placeholder'
  | 'keyboardType'
  | 'autoComplete'
  | 'textContentType'
  | 'autoCapitalize'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'maxLength'
  | 'editable'
  | 'multiline'
>;

/** A labelled text input bound to react-hook-form, with its validation error underneath. */
export function TextField<T extends FieldValues>({ control, name, label, secure, hint, ...inputProps }: Props<T>) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
        <View style={styles.field}>
          <ThemedText variant="smallBold" nativeID={`${name}-label`}>
            {label}
          </ThemedText>
          <View
            style={[
              styles.inputRow,
              { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
            ]}>
            <TextInput
              ref={ref}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={secure && hidden}
              autoCapitalize={inputProps.autoCapitalize ?? 'none'}
              autoCorrect={false}
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={label}
              aria-labelledby={`${name}-label`}
              aria-invalid={!!error}
              style={[styles.input, inputProps.multiline && styles.multiline, { color: theme.text }]}
              {...inputProps}
            />
            {secure && (
              <Pressable
                onPress={() => setHidden((h) => !h)}
                accessibilityRole="button"
                accessibilityLabel={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
                hitSlop={8}
                style={styles.toggle}>
                <ThemedText variant="smallBold" color="primary">
                  {hidden ? 'Show' : 'Hide'}
                </ThemedText>
              </Pressable>
            )}
          </View>
          {error?.message ? (
            <ThemedText variant="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
              {error.message}
            </ThemedText>
          ) : hint ? (
            <ThemedText variant="small" color="textSecondary">
              {hint}
            </ThemedText>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  multiline: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  toggle: {
    paddingHorizontal: spacing.md,
  },
});
