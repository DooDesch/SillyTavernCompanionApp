import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, IconButton } from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';

/**
 * Compact playback strip shown above the composer while read-aloud (device TTS) runs.
 * Stop only: expo-speech's pause()/resume() are unavailable on Android (UnavailabilityError).
 */
export function ReadAloudBar({ name, onStop }: { name: string; onStop: () => void }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-3 border-t border-border bg-surface px-3 py-1.5"
    >
      <Icon name="speak" size={18} color={colors.accent} />
      <View className="flex-1">
        <AppText variant="label">{t('chat.readingAloud')}</AppText>
        {!!name && (
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {name}
          </AppText>
        )}
      </View>
      <IconButton name="stop" size="sm" surface accessibilityLabel={t('a11y.stopReading')} onPress={onStop} />
    </View>
  );
}
