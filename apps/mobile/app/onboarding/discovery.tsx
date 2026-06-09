import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Stack, router, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { DiscoveredInstance } from '@st/core';
import { discoverInstances } from '@/lib/discovery';
import { useConnection } from '@/stores/connectionStore';

export default function DiscoveryScreen() {
  const { t } = useTranslation();
  const connect = useConnection((s) => s.connect);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<DiscoveredInstance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startScan = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setFound([]);
    setError(null);
    setScanning(true);
    try {
      await discoverInstances({
        signal: ac.signal,
        onFound: (instance) =>
          setFound((prev) =>
            prev.some((p) => p.baseUrl === instance.baseUrl) ? prev : [...prev, instance],
          ),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.scanFailed'));
    } finally {
      if (abortRef.current === ac) setScanning(false);
    }
  }, []);

  useEffect(() => {
    void startScan();
    return () => abortRef.current?.abort();
  }, [startScan]);

  const onConnect = (instance: DiscoveredInstance) => {
    connect(instance);
    router.replace('/(tabs)/chats');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-5 pt-6">
        <Text className="text-2xl font-bold text-white">{t('onboarding.findTitle')}</Text>
        <Text className="mt-1 text-muted">
          {t('onboarding.findDescription')}
        </Text>

        <View className="mt-6 flex-1">
          {found.length === 0 && scanning && (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color="#7c5cff" />
              <Text className="text-muted">{t('onboarding.scanning')}</Text>
            </View>
          )}

          {found.map((instance) => (
            <Pressable
              key={instance.baseUrl}
              onPress={() => onConnect(instance)}
              className="mb-3 rounded-2xl border border-border bg-surface px-4 py-3 active:bg-surface2"
            >
              <Text className="text-base font-semibold text-white">{instance.baseUrl}</Text>
              <Text className="mt-0.5 text-sm text-muted">
                SillyTavern {instance.version ?? '?'} · {instance.rttMs ?? '?'} ms
              </Text>
            </Pressable>
          ))}

          {error && <Text className="mt-2 text-red-400">{error}</Text>}

          {!scanning && found.length === 0 && !error && (
            <Text className="text-muted">{t('onboarding.noInstanceFound')}</Text>
          )}
        </View>

        <View className="gap-3 pb-2">
          <Pressable
            onPress={startScan}
            disabled={scanning}
            className="rounded-2xl bg-primary px-4 py-3 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-center text-base font-semibold text-white">
              {scanning ? t('onboarding.scanningButton') : t('onboarding.scanAgain')}
            </Text>
          </Pressable>
          <Link href="/onboarding/manual" asChild>
            <Pressable className="rounded-2xl border border-border px-4 py-3 active:bg-surface">
              <Text className="text-center text-base font-semibold text-white">
                {t('onboarding.manualPair')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
