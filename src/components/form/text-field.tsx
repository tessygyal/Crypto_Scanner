import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

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
        <View className="gap-xs">
          <ThemedText variant="smallBold" nativeID={`${name}-label`}>
            {label}
          </ThemedText>
          <View
            className={cn(
              'min-h-12 flex-row items-center rounded-md border bg-surface',
              error ? 'border-danger' : 'border-border'
            )}>
            <TextInput
              ref={ref}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={secure && hidden}
              autoCapitalize={inputProps.autoCapitalize ?? 'none'}
              autoCorrect={false}
              // A prop, not a style, so it needs the raw color.
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={label}
              aria-labelledby={`${name}-label`}
              aria-invalid={!!error}
              className={cn(
                'flex-1 px-md py-3 text-body text-text',
                inputProps.multiline && 'min-h-[140px] align-top'
              )}
              {...inputProps}
            />
            {secure && (
              <Pressable
                onPress={() => setHidden((h) => !h)}
                accessibilityRole="button"
                accessibilityLabel={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
                hitSlop={8}
                className="px-md">
                <ThemedText variant="smallBold" color="primary">
                  {hidden ? 'Show' : 'Hide'}
                </ThemedText>
              </Pressable>
            )}
          </View>
          {error?.message ? (
            <ThemedText variant="small" color="danger" accessibilityLiveRegion="polite">
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
