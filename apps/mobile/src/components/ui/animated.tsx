import { type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressScale } from '@/theme/motion';

/**
 * A press-scaled Pressable. The scale transform lives on an `Animated.View` wrapper, while
 * `className` stays on a real (NativeWind-interop'd) `Pressable` child — putting an animated
 * `style` AND className on one `Animated.createAnimatedComponent(Pressable)` makes NativeWind
 * drop the className-derived styles, so we keep them on separate nodes.
 */
export function PressableScale({
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  style,
  children,
  ...props
}: Omit<PressableProps, 'children'> & { scaleTo?: number; children?: ReactNode }) {
  const press = usePressScale(scaleTo);
  return (
    <Animated.View style={press.style}>
      <Pressable
        {...props}
        style={style}
        onPressIn={(e: GestureResponderEvent) => {
          press.onPressIn();
          onPressIn?.(e);
        }}
        onPressOut={(e: GestureResponderEvent) => {
          press.onPressOut();
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
