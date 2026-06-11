import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router';
import { Screen, EmptyState } from '@/components/ui';

/** Stub - replaced by the chat-behavior settings (issue #11) page. */
export default function ChatBehaviorScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <EmptyState icon="tune" title={t('settings.chatBehavior')} message={t('common.comingSoon')} />
    </Screen>
  );
}