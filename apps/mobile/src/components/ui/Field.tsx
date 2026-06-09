import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { Icon } from '@/theme/icons';
import { colors, fonts, hitSlop } from '@/theme/tokens';

export interface FieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label?: string;
  helper?: string;
  error?: string;
  /** Renders a password field with a show/hide toggle. */
  password?: boolean;
}

/** Labeled text input with helper/error text and an optional password toggle. */
export function Field({ label, helper, error, password = false, ...input }: FieldProps) {
  const [hidden, setHidden] = useState(true);
  const showToggle = password;

  return (
    <View className="gap-1.5">
      {label ? (
        <AppText variant="label" color="muted">
          {label}
        </AppText>
      ) : null}
      <View
        className={`flex-row items-center rounded-field border bg-surface-2 px-4 ${
          error ? 'border-danger' : 'border-border'
        }`}
      >
        <TextInput
          {...input}
          secureTextEntry={password ? hidden : input.secureTextEntry}
          placeholderTextColor={colors.textSubtle}
          className="h-12 flex-1 text-text"
          style={{ fontFamily: fonts.regular, fontSize: 16 }}
        />
        {showToggle ? (
          <Pressable
            hitSlop={hitSlop}
            accessibilityRole="button"
            onPress={() => setHidden((h) => !h)}
            className="pl-2 active:opacity-60"
          >
            <Icon name={hidden ? 'show' : 'hide'} size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="subtle">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}
