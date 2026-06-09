import '../global.css';
import '@/i18n';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { fileStorage } from '@/lib/persist';
import { useProfiles } from '@/stores/profilesStore';
import { useServers } from '@/stores/serversStore';
import { useLocale } from '@/stores/localeStore';

const persister = createAsyncStoragePersister({ storage: fileStorage, throttleTime: 1000 });

export default function RootLayout() {
  useEffect(() => {
    void useProfiles.getState().hydrate();
    void useServers.getState().hydrate();
    void useLocale.getState().hydrate();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister,
              maxAge: 1000 * 60 * 60 * 24 * 7, // keep the offline cache for a week
              // Don't persist the settings blob to disk - it can contain cloud API keys.
              dehydrateOptions: {
                shouldDehydrateQuery: (q) => q.queryKey[0] !== 'settings',
              },
            }}
          >
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: '#15151c' },
                headerTintColor: '#ffffff',
                contentStyle: { backgroundColor: '#0b0b0f' },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
