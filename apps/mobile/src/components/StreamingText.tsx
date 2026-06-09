import { useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { streamingSession } from '@/lib/streamingSession';
import { streamDebug } from '@/lib/streamDebug';
import { AppText } from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/motion';

/**
 * The live content of the currently-streaming bubble. Subscribes to `streamingSession`
 * directly so per-token updates re-render ONLY this component — the chat's FlashList and
 * every other bubble stay untouched while text streams in.
 */
export function StreamingBubbleContent() {
  const s = useSyncExternalStore(streamingSession.subscribe, streamingSession.getSnapshot);
  useEffect(() => {
    if (s.active) streamDebug.mark('render', s.text.length);
  }, [s]);
  const showDots = s.text.trim().length === 0;
  return (
    <>
      {s.reasoning ? <ReasoningBlock text={s.reasoning} /> : null}
      {showDots ? <TypingDots thinking={!!s.reasoning} /> : <AppText variant="body">{s.text}</AppText>}
    </>
  );
}

const DOT = { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSubtle } as const;

function dotOpacity(v: number, i: number): number {
  'worklet';
  const phase = (((v - i) % 3) + 3) % 3;
  return phase < 1.5 ? 0.3 + 0.7 * (phase / 1.5) : 0.3 + 0.7 * ((3 - phase) / 1.5);
}

export function TypingDots({ thinking }: { thinking?: boolean }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(3, { duration: 1100 }), -1, false);
  }, [reduced, v]);
  const d0 = useAnimatedStyle(() => ({ opacity: dotOpacity(v.value, 0) }));
  const d1 = useAnimatedStyle(() => ({ opacity: dotOpacity(v.value, 1) }));
  const d2 = useAnimatedStyle(() => ({ opacity: dotOpacity(v.value, 2) }));
  return (
    <View className="flex-row items-center gap-1.5 py-1">
      {thinking ? (
        <AppText variant="body" color="muted" style={{ marginRight: 2 }}>
          {t('chat.thinking')}
        </AppText>
      ) : null}
      <Animated.View style={[d0, DOT]} />
      <Animated.View style={[d1, DOT]} />
      <Animated.View style={[d2, DOT]} />
    </View>
  );
}

export function ReasoningBlock({ text }: { text: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-2">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-1 active:opacity-60">
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={13} color={colors.textSubtle} />
        <AppText variant="caption" color="subtle">
          {t('chat.reasoning')}
        </AppText>
      </Pressable>
      {open ? (
        <AppText
          selectable
          variant="caption"
          color="muted"
          style={{ marginTop: 4, borderLeftWidth: 2, borderLeftColor: colors.borderStrong, paddingLeft: 8, fontStyle: 'italic' }}
        >
          {text}
        </AppText>
      ) : null}
    </View>
  );
}
