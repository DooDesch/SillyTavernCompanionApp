import { View } from 'react-native';
import { AppText, type TextColor } from './AppText';

type Tone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning';

const DOT: Record<Tone, string> = {
  neutral: 'bg-text-subtle',
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
};

const TEXT: Record<Tone, TextColor> = {
  neutral: 'muted',
  accent: 'accent',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
};

/** Compact status pill. Optional leading status dot. */
export function Badge({
  label,
  tone = 'neutral',
  dot = false,
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-1.5 self-start rounded-pill border border-border bg-surface-2 px-2.5 py-1">
      {dot ? <View className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} /> : null}
      <AppText variant="caption" color={TEXT[tone]}>
        {label}
      </AppText>
    </View>
  );
}
