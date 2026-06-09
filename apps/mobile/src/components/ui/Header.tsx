import { type ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

/** In-screen header: optional back button, title (+ subtitle), optional right slot. */
export function Header({
  title,
  subtitle,
  right,
  onBack,
  backLabel = 'Back',
  large = false,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  large?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-1 px-3 pb-2 pt-1">
      {onBack ? (
        <IconButton name="back" size="lg" accessibilityLabel={backLabel} onPress={onBack} haptic={false} />
      ) : (
        <View className="w-1" />
      )}
      <View className="flex-1 px-1">
        <AppText variant={large ? 'display' : 'h1'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}
