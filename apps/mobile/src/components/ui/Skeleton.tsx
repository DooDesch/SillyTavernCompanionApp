import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '@/theme/motion';
import { colors } from '@/theme/tokens';

/** A single shimmering placeholder block. */
export function Skeleton({
  width = '100%',
  height = 12,
  radius = 8,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  const opacity = useSharedValue(0.5);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      opacity.value = 0.5;
      return;
    }
    opacity.value = withRepeat(withTiming(0.9, { duration: 750 }), -1, true);
  }, [reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface2 }, style]} />;
}

/** A list of card-shaped row placeholders (matches ListRow's shape). */
export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View className="gap-2 px-4 pt-3">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="flex-row items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3"
        >
          <Skeleton width={48} height={48} radius={24} />
          <View className="flex-1 gap-2">
            <Skeleton width="55%" height={13} />
            <Skeleton width="85%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}
