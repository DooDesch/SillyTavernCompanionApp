import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Reliable bottom inset.
 *
 * `useSafeAreaInsets().bottom` is context-adjusted by navigation: full-screen native-stack
 * routes (e.g. the chat screen) report 0 even though the device has a nav bar. We fall back to
 * the device's startup nav-bar inset in that case so bottom-anchored UI never collides with the
 * system navigation bar.
 */
export function useBottomInset(min = 8): number {
  const insets = useSafeAreaInsets();
  if (insets.bottom > 0) return Math.max(insets.bottom, min);
  return Math.max(initialWindowMetrics?.insets.bottom ?? 0, min);
}
