import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

/** Shared motion vocabulary so every animation in the app feels like one system. */
export const durations = { fast: 140, base: 220, slow: 320 } as const;

export const springs = {
  press: { mass: 0.5, damping: 18, stiffness: 340 },
  sheet: { mass: 0.9, damping: 26, stiffness: 260 },
  gentle: { mass: 0.8, damping: 22, stiffness: 200 },
} as const;

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);

/** Tracks the OS "Reduce Motion" setting so animations can degrade to instant. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/**
 * Press-scale feedback for tappable cards/buttons. Returns an animated style plus
 * press handlers; no-ops under Reduce Motion.
 */
export function usePressScale(to = 0.97) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = reduced ? 1 : withSpring(to, springs.press);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, springs.press);
  };
  return { style, onPressIn, onPressOut };
}
