import { type ReactNode } from 'react';
import { View } from 'react-native';
import { PressableScale } from './animated';
import { haptics } from '@/theme/haptics';

/** Surface container. Becomes a press-scaled pressable when `onPress` is provided. */
export function Card({
  children,
  onPress,
  className,
  haptic = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  haptic?: boolean;
}) {
  const base = `rounded-card border border-border bg-surface ${className ?? ''}`;

  if (!onPress) {
    return <View className={base}>{children}</View>;
  }
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => {
        if (haptic) haptics.selection();
        onPress();
      }}
      className={`${base} active:bg-surface-2`}
    >
      {children}
    </PressableScale>
  );
}
