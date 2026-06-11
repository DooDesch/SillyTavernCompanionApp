import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router';
import { Screen, EmptyState } from '@/components/ui';

/** Stub - replaced by the persona manager (issue #12) page. */
export default function PersonasScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <EmptyState icon="tune" title={t('settings.personasManage')} message={t('common.comingSoon')} />
    </Screen>
  );
}