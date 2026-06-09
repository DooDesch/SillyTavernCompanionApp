import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { probeInstance, type DiscoveredInstance } from '@st/core';
import { fetchLike } from '@/lib/expoFetch';
import { useConnection } from '@/stores/connectionStore';
import { useServers } from '@/stores/serversStore';

export default function ManualScreen() {
  const { t } = useTranslation();
  const connect = useConnection((s) => s.connect);
  const upsertServer = useServers((s) => s.upsert);
  const [host, setHost] = useState('192.168.178.');
  const [port, setPort] = useState('8000');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const ip = host.trim();
      const portN = Number(port) || 8000;
      const hasAuth = !!user.trim();
      const basicAuth = hasAuth ? { username: user.trim(), password: pass } : undefined;

      let instance: DiscoveredInstance | null;
      if (hasAuth) {
        // Basic-Auth instances 401 the unauthenticated probe - connect directly; first call validates.
        instance = { baseUrl: `http://${ip}:${portN}`, ip, port: portN, version: '', source: 'manual' };
      } else {
        instance = await probeInstance(ip, portN, { fetchImpl: fetchLike, timeoutMs: 2500 });
        if (!instance) {
          setError(t('onboarding.notReachable'));
          return;
        }
        instance = { ...instance, source: 'manual' };
      }

      const baseUrl = instance.baseUrl;
      await upsertServer(
        { id: baseUrl, label: `${ip}:${portN}`, baseUrl, ip, port: portN, hasAuth },
        basicAuth ? { user: basicAuth.username, pass: basicAuth.password } : undefined,
      );
      connect(instance, basicAuth);
      router.replace('/(tabs)/chats');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.connectionFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['bottom']}>
      <Stack.Screen options={{ title: t('onboarding.manualTitle'), headerShown: true }} />
      <View className="flex-1 px-5 pt-6">
        <Text className="text-muted">{t('onboarding.manualDescription')}</Text>

        <Text className="mt-6 mb-1 text-sm text-muted">{t('onboarding.ipAddress')}</Text>
        <TextInput
          value={host}
          onChangeText={setHost}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          placeholder="192.168.178.23"
          placeholderTextColor="#5a5a68"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-base text-white"
        />

        <Text className="mt-4 mb-1 text-sm text-muted">{t('onboarding.port')}</Text>
        <TextInput
          value={port}
          onChangeText={setPort}
          keyboardType="number-pad"
          placeholder="8000"
          placeholderTextColor="#5a5a68"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-base text-white"
        />

        <Text className="mt-4 mb-1 text-sm text-muted">{t('onboarding.username')}</Text>
        <TextInput
          value={user}
          onChangeText={setUser}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="-"
          placeholderTextColor="#5a5a68"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-base text-white"
        />

        <Text className="mt-4 mb-1 text-sm text-muted">{t('onboarding.password')}</Text>
        <TextInput
          value={pass}
          onChangeText={setPass}
          secureTextEntry
          autoCapitalize="none"
          placeholder="-"
          placeholderTextColor="#5a5a68"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-base text-white"
        />

        {error && <Text className="mt-4 text-red-400">{error}</Text>}

        <Pressable
          onPress={onConnect}
          disabled={busy}
          className="mt-6 rounded-2xl bg-primary px-4 py-3 active:opacity-80 disabled:opacity-50"
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">{t('onboarding.connect')}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
