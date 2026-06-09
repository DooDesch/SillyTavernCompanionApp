import { type ReactNode } from 'react';
import { View } from 'react-native';
import { PressableScale } from './animated';
import { AppText } from './AppText';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';
import { haptics } from '@/theme/haptics';

/**
 * The app's canonical list/card row: leading slot (avatar/icon), title + optional
 * subtitle, optional right-aligned meta, optional trailing chevron, with press-scale.
 * Replaces the duplicated "rounded card row" markup across the list screens.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  chevron = false,
  active = false,
  subtitleLines = 2,
  onPress,
  onLongPress,
  haptic = true,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  active?: boolean;
  subtitleLines?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  haptic?: boolean;
}) {
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => {
        if (haptic) haptics.selection();
        onPress?.();
      }}
      onLongPress={onLongPress}
      delayLongPress={300}
      className={`flex-row items-center gap-3 overflow-hidden rounded-card border bg-surface px-3.5 py-3 active:bg-surface-2 ${active ? 'border-accent' : 'border-border'}`}
    >
      {active ? <View className="absolute left-0 top-0 h-full w-1 bg-accent" /> : null}
      {leading}
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <AppText variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </AppText>
          {meta ? (
            <AppText variant="caption" color="subtle" style={{ marginLeft: 8 }}>
              {meta}
            </AppText>
          ) : null}
        </View>
        {subtitle ? (
          <AppText variant="body" color="muted" numberOfLines={subtitleLines} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {chevron ? <Icon name="chevronRight" size={18} color={colors.textSubtle} /> : null}
    </PressableScale>
  );
}
