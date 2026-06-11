import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router';
import { Screen, EmptyState } from '@/components/ui';

/** Stub - replaced by the Advanced Formatting page (issue #5). */
export default function FormattingScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <EmptyState icon="tune" title={t('settings.formatting')} message={t('common.comingSoon')} />
    </Screen>
  );
}
