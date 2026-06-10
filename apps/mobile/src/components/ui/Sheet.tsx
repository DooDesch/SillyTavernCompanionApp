import { type ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Icon, type IconName } from '@/theme/icons';
import { colors } from '@/theme/tokens';
import { durations, springs, useReducedMotion } from '@/theme/motion';
import { haptics } from '@/theme/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const OFFSCREEN = 900;

/**
 * Gesture-driven spring bottom sheet (backdrop fade + pan-to-dismiss from the handle).
 * The single replacement for the old `Modal + bg-black/50` pattern. Drag is bound to
 * the handle area only, so scrollable content inside never fights the dismiss gesture.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const keyboard = useReanimatedKeyboardAnimation();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(OFFSCREEN);
  const progress = useSharedValue(0);

  // Open: mount, then animate in.
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (reduced) {
      translateY.value = 0;
      progress.value = 1;
      return;
    }
    translateY.value = OFFSCREEN;
    progress.value = 0;
    translateY.value = withSpring(0, springs.sheet);
    progress.value = withTiming(1, { duration: durations.base });
  }, [mounted, reduced, translateY, progress]);

  // Close: animate out, then unmount.
  useEffect(() => {
    if (visible || !mounted) return;
    progress.value = withTiming(0, { duration: durations.fast });
    translateY.value = withTiming(OFFSCREEN, { duration: durations.base }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [visible, mounted, translateY, progress]);

  // runOnJS(true): the reanimated worklet fast path for gesture events crashed natively
  // ("Object is not a function"); JS-thread dispatch is plenty for a dismiss drag.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 800) {
        onClose();
      } else {
        translateY.value = withSpring(0, springs.sheet);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const bottomPad = Math.max(insets.bottom, 12);
  // Lift the sheet above the keyboard. keyboard-controller's `height` is NEGATIVE while the
  // keyboard is open (made for direct translateY use) - subtracting it pushed the sheet DOWN
  // off-screen, which made typing in any sheet impossible.
  // While the keyboard is open the OS bottom inset sits behind it, so the inset padding became
  // dead space under the buttons: slide the sheet down by the surplus (keyboard.progress is
  // 0..1, frame-synced) so exactly 12px of breathing room stays visible above the keyboard.
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          translateY.value + keyboard.height.value + keyboard.progress.value * (bottomPad - 12),
      },
    ],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      {/* An RN Modal is a separate native window on Android - gesture-handler needs its own
          root inside it, or every GestureDetector in the sheet (handle pan, sliders) is dead. */}
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'flex-end' }}>
        <AnimatedPressable
          accessibilityLabel="Close"
          style={[StyleSheet.absoluteFill, backdropStyle, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
        <Animated.View style={sheetStyle}>
          <View className="rounded-t-sheet bg-surface" style={{ boxShadow: '0px -10px 36px rgba(0,0,0,0.5)' }}>
            <GestureDetector gesture={pan}>
              <View className="items-center pb-1 pt-2.5">
                <View className="h-1 w-10 rounded-full bg-border-strong" />
                {title ? (
                  <AppText variant="h2" numberOfLines={1} style={{ alignSelf: 'stretch', marginTop: 10, paddingHorizontal: 20 }}>
                    {title}
                  </AppText>
                ) : null}
              </View>
            </GestureDetector>
            <View style={{ paddingBottom: bottomPad }} className="px-2 pt-1">
              {children}
            </View>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** A tappable row for action-menu sheets (icon + label, optional destructive styling). */
export function SheetActionRow({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5 active:bg-surface-2"
    >
      <Icon name={icon} size={20} color={destructive ? colors.danger : colors.text} />
      <AppText variant="bodyLg" color={destructive ? 'danger' : 'text'}>
        {label}
      </AppText>
    </Pressable>
  );
}
