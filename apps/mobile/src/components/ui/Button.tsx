import { ActivityIndicator } from 'react-native';
import { PressableScale } from './animated';
import { AppText, type TextColor } from './AppText';
import { Icon, type IconName } from '@/theme/icons';
import { colors } from '@/theme/tokens';
import { haptics } from '@/theme/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-accent active:bg-accent-pressed',
  secondary: 'bg-surface-2 border border-border active:bg-surface-3',
  ghost: 'active:bg-surface-2',
  danger: 'bg-danger-soft border border-danger active:bg-surface-2',
};

const LABEL_COLOR: Record<Variant, TextColor> = {
  primary: 'onAccent',
  secondary: 'text',
  ghost: 'muted',
  danger: 'danger',
};

const ICON_COLOR: Record<Variant, string> = {
  primary: colors.onAccent,
  secondary: colors.text,
  ghost: colors.textMuted,
  danger: colors.danger,
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  leftIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  loading = false,
  disabled = false,
  fullWidth = true,
  haptic = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={() => {
        if (haptic) haptics.tap();
        onPress?.();
      }}
      className={`${fullWidth ? 'w-full ' : ''}${size === 'lg' ? 'h-12' : 'h-11'} flex-row items-center justify-center gap-2 rounded-2xl px-5 ${CONTAINER[variant]} ${isDisabled ? 'opacity-40' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={ICON_COLOR[variant]} />
      ) : (
        <>
          {leftIcon ? <Icon name={leftIcon} size={18} color={ICON_COLOR[variant]} /> : null}
          <AppText variant="title" color={LABEL_COLOR[variant]}>
            {label}
          </AppText>
        </>
      )}
    </PressableScale>
  );
}
