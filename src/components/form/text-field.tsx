import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
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
  /** Decorative icon at the start of the field (e.g. "link" for a web address). */
  icon?: ComponentProps<typeof Ionicons>['name'];
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

/**
 * A labelled text input bound to react-hook-form, with its validation error underneath.
 * Single-line fields are lavender pills; multi-line fields are rounded boxes.
 * The border turns purple while typing and red when there is an error.
 */
export function TextField<T extends FieldValues>({ control, name, label, secure, hint, icon, ...inputProps }: Props<T>) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

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
              'min-h-14 flex-row items-center border-2 bg-surface',
              inputProps.multiline ? 'rounded-md' : 'rounded-pill',
              icon && 'pl-md',
              error ? 'border-danger' : focused ? 'border-primary' : 'border-transparent'
            )}>
            {icon && <Ionicons name={icon} size={22} color={theme.primary} importantForAccessibility="no" />}
            <TextInput
              ref={ref}
              value={value ?? ''}
              onChangeText={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              secureTextEntry={secure && hidden}
              autoCapitalize={inputProps.autoCapitalize ?? 'none'}
              autoCorrect={false}
              // A prop, not a style, so it needs the raw color.
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={label}
              aria-labelledby={`${name}-label`}
              aria-invalid={!!error}
              className={cn(
                'flex-1 py-3 text-body text-text',
                icon ? 'pl-sm pr-lg' : 'px-lg',
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
                className="min-h-12 justify-center pr-lg">
                <ThemedText variant="smallBold" color="primary">
                  {hidden ? 'Show' : 'Hide'}
                </ThemedText>
              </Pressable>
            )}
          </View>
          {error?.message ? (
            <View className="flex-row items-center gap-xs px-sm" accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={16} color={theme.danger} importantForAccessibility="no" />
              <ThemedText variant="smallBold" color="danger" className="flex-1">
                {error.message}
              </ThemedText>
            </View>
          ) : hint ? (
            <ThemedText variant="small" color="textSecondary" className="px-sm">
              {hint}
            </ThemedText>
          ) : null}
        </View>
      )}
    />
  );
}
