import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from './AppText';
import { colors, fonts } from '@/theme/tokens';

/** German keyboards produce commas on decimal-pad - normalize before parsing. */
export function parseNum(s: string): number | null {
  const n = parseFloat(s.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const THUMB = 22;

/**
 * Pure-JS slider (gesture-handler pan/tap + reanimated fill) - deliberately NOT
 * @react-native-community/slider: no new native module, and the Android SeekBar
 * can't be themed to match the design system. Tapping the value chip opens an
 * inline TextInput for exact entry; typed values may exceed the drag range up to
 * hardMin/hardMax (desktop ST allows wider ranges than are useful on a slider).
 */
export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  decimals = 0,
  hardMin = min,
  hardMax = max,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  hardMin?: number;
  hardMax?: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  const [trackW, setTrackW] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const shown = value ?? min;
  const pct = useSharedValue(clamp01((shown - min) / (max - min)));
  const lastCommitted = useRef<number | null>(value);

  useEffect(() => {
    pct.value = withTiming(clamp01((shown - min) / (max - min)), { duration: 80 });
  }, [shown, min, max, pct]);

  const round = (v: number) => Number(v.toFixed(decimals));

  const commitPct = (p: number) => {
    const v = round(Math.min(max, Math.max(min, min + Math.round((clamp01(p) * (max - min)) / step) * step)));
    if (v !== lastCommitted.current) {
      lastCommitted.current = v;
      onChange(v);
    }
  };

  const commitTyped = (s: string) => {
    setEditing(null);
    const n = parseNum(s);
    if (n == null) return; // revert to last valid value
    const v = round(Math.min(hardMax, Math.max(hardMin, n)));
    lastCommitted.current = v;
    onChange(v);
  };

  const nudge = (dir: 1 | -1) => {
    const v = round(Math.min(max, Math.max(min, shown + dir * step * 5)));
    lastCommitted.current = v;
    onChange(v);
  };

  // runOnJS(true): callbacks run on the JS thread via the classic event path. The reanimated
  // fast path (worklet callbacks) crashed natively here ("Object is not a function" in
  // EventHandler.receiveEvent) and a slider doesn't need UI-thread dispatch - shared values
  // remain settable from JS, so the fill/thumb still animate via reanimated.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      if (trackW <= 0) return;
      const p = clamp01(e.x / trackW);
      pct.value = p;
      commitPct(p);
    })
    .onEnd((e) => {
      if (trackW <= 0) return;
      commitPct(clamp01(e.x / trackW));
    });
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      if (trackW <= 0) return;
      const p = clamp01(e.x / trackW);
      pct.value = withTiming(p, { duration: 80 });
      commitPct(p);
    });

  const fillStyle = useAnimatedStyle(() => ({ width: `${pct.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ left: pct.value * Math.max(trackW - THUMB, 0) }));

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between">
        <AppText variant="bodyLg">{label}</AppText>
        {editing !== null ? (
          <TextInput
            value={editing}
            onChangeText={setEditing}
            autoFocus
            keyboardType="decimal-pad"
            onBlur={() => commitTyped(editing)}
            onSubmitEditing={() => commitTyped(editing)}
            accessibilityLabel={t('a11y.editValue')}
            className="w-24 rounded-field border border-border bg-surface-2 text-center text-text"
            style={{ fontFamily: fonts.regular, fontSize: 15, height: 38, paddingVertical: 0 }}
          />
        ) : (
          <Pressable
            onPress={() => setEditing(value != null ? String(round(shown)).replace('.', ',') : '')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.editValue')}
            className="w-24 items-center rounded-field bg-surface-2 py-2 active:bg-surface-3"
          >
            <AppText variant="title">{value != null ? shown.toFixed(decimals) : '–'}</AppText>
          </Pressable>
        )}
      </View>
      <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: shown }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
          className="mt-1 justify-center"
          style={{ height: 36 }}
        >
          <View className="h-1 overflow-hidden rounded-full bg-surface-3">
            <Animated.View style={[fillStyle, { height: '100%', backgroundColor: colors.accent }]} />
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              thumbStyle,
              {
                position: 'absolute',
                width: THUMB,
                height: THUMB,
                borderRadius: THUMB / 2,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
