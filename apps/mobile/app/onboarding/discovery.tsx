import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { DiscoveredInstance } from '@st/core';
import { discoverInstances } from '@/lib/discovery';
import { useConnection } from '@/stores/connectionStore';
import { Screen, AppText, Button, ListRow, Badge } from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';
import { easeOut, useReducedMotion } from '@/theme/motion';
import { haptics } from '@/theme/haptics';
import { useBottomInset } from '@/theme/insets';

/** A radar-style ping behind the brand mark while the network is being scanned. */
function ScanPulse({ label }: { label: string }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      p.value = 0;
      return;
    }
    p.value = withRepeat(withTiming(1, { duration: 1900, easing: easeOut }), -1, false);
  }, [reduced, p]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + p.value * 0.9 }],
    opacity: 0.45 * (1 - p.value),
  }));

  return (
    <View className="items-center justify-center py-6">
      <View className="h-20 w-20 items-center justify-center">
        <Animated.View
          style={[
            ring,
            { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: colors.accent },
          ]}
        />
        <View className="h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <Icon name="wifi" size={26} color={colors.accent} />
        </View>
      </View>
      <AppText variant="body" color="muted" style={{ marginTop: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

export default function DiscoveryScreen() {
  const { t } = useTranslation();
  const bottomInset = useBottomInset(16);
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
          setFound((prev) => {
            if (prev.some((p) => p.baseUrl === instance.baseUrl)) return prev;
            haptics.tap();
            return [...prev, instance];
          }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.scanFailed'));
    } finally {
      if (abortRef.current === ac) setScanning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void startScan();
    return () => abortRef.current?.abort();
  }, [startScan]);

  const onConnect = (instance: DiscoveredInstance) => {
    haptics.success();
    connect(instance);
    router.replace('/(tabs)/chats');
  };

  return (
    <Screen edges={['top']} className="px-5">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="items-center pb-4 pt-10">
        <View className="h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft">
          <Icon name="chats" size={30} color={colors.accent} />
        </View>
        <AppText variant="display" style={{ marginTop: 16, textAlign: 'center' }}>
          {t('onboarding.findTitle')}
        </AppText>
        <AppText variant="body" color="muted" style={{ marginTop: 6, textAlign: 'center' }}>
          {t('onboarding.tagline')}
        </AppText>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
        {found.map((instance) => (
          <ListRow
            key={instance.baseUrl}
            leading={
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
                <Icon name="server" size={20} color={colors.accent} />
              </View>
            }
            title={instance.baseUrl.replace(/^https?:\/\//, '')}
            subtitle={`SillyTavern ${instance.version ?? '?'}`}
            trailing={instance.rttMs != null ? <Badge label={`${instance.rttMs} ms`} tone="success" dot /> : undefined}
            chevron
            onPress={() => onConnect(instance)}
          />
        ))}

        {scanning && found.length === 0 ? <ScanPulse label={t('onboarding.scanning')} /> : null}

        {error ? (
          <AppText variant="body" color="danger" style={{ textAlign: 'center', marginTop: 8 }}>
            {error}
          </AppText>
        ) : null}

        {!scanning && found.length === 0 && !error ? (
          <View className="items-center py-8">
            <Icon name="wifi" size={26} color={colors.textSubtle} />
            <AppText variant="body" color="muted" style={{ marginTop: 10, textAlign: 'center' }}>
              {t('onboarding.noInstanceFound')}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <View className="gap-3 pt-2" style={{ paddingBottom: bottomInset }}>
        <Button
          label={scanning ? t('onboarding.scanningButton') : t('onboarding.scanAgain')}
          leftIcon="refresh"
          loading={scanning}
          onPress={startScan}
        />
        <Button
          label={t('onboarding.manualPair')}
          variant="secondary"
          leftIcon="link"
          onPress={() => router.push('/onboarding/manual')}
        />
      </View>
    </Screen>
  );
}
