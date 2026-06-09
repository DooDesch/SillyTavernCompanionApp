import { Text, type TextProps } from 'react-native';
import { colors, typography, type TextVariant } from '@/theme/tokens';

export type TextColor =
  | 'text'
  | 'muted'
  | 'subtle'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'onAccent';

const COLOR: Record<TextColor, string> = {
  text: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  accent: colors.accent,
  danger: colors.danger,
  success: colors.success,
  warning: colors.warning,
  onAccent: colors.onAccent,
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
}

/**
 * Canonical text primitive. Sets the exact Inter weight family + size + line-height
 * from the type ramp (RN custom fonts are one family per weight, so we resolve via
 * style rather than relying on font-weight utilities).
 */
export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const t = typography[variant];
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: t.fontFamily,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          color: COLOR[color],
        },
        style,
      ]}
    />
  );
}
