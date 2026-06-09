import * as Haptics from 'expo-haptics';

/**
 * Thin, fail-safe wrapper around expo-haptics. Every call is fire-and-forget and
 * swallows errors so haptics never break a flow (e.g. unsupported device / web).
 */
export const haptics = {
  /** Light tick for selection changes (tab switch, picker, toggle). */
  selection: () => {
    void Haptics.selectionAsync().catch(() => {});
  },
  /** Confirmation tap for primary actions (send, connect). */
  tap: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Heavier impact for notable actions (regenerate, swipe). */
  impact: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
