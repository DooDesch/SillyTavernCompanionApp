import { Pressable } from 'react-native';
import { AppText } from './AppText';
import { haptics } from '@/theme/haptics';

/**
 * Small pill. Static when no `onPress` (e.g. a tag); selectable filter chip otherwise.
 */
export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const className = `self-start rounded-pill border px-3 py-1.5 ${
    selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2'
  } ${onPress ? 'active:opacity-70' : ''}`;

  if (!onPress) {
    return (
      <Pressable disabled className={className}>
        <AppText variant="caption" color={selected ? 'accent' : 'muted'}>
          {label}
        </AppText>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className={className}
    >
      <AppText variant="caption" color={selected ? 'accent' : 'muted'}>
        {label}
      </AppText>
    </Pressable>
  );
}
