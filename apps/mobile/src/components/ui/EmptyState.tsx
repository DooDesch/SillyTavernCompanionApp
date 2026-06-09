import { View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from '@/theme/icons';
import { colors } from '@/theme/tokens';

/** Friendly empty/zero-data state: glyph, title, message, optional CTA. */
export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionIcon,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  actionIcon?: IconName;
  onAction?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface-2">
        <Icon name={icon} size={28} color={colors.textMuted} />
      </View>
      <AppText variant="h2" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="muted" style={{ textAlign: 'center', marginTop: 6 }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-5">
          <Button label={actionLabel} leftIcon={actionIcon} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}
