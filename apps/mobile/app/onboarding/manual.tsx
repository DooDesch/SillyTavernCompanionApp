import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { probeInstance, type DiscoveredInstance } from '@st/core';
import { fetchLike } from '@/lib/expoFetch';
import { useConnection } from '@/stores/connectionStore';
import { useServers } from '@/stores/serversStore';
import { AppText, Button, Field } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { haptics } from '@/theme/haptics';

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
          haptics.error();
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
      haptics.success();
      router.replace('/(tabs)/chats');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.connectionFailed'));
      haptics.error();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: t('onboarding.manualTitle'), headerShown: true }} />
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="body" color="muted">
          {t('onboarding.manualDescription')}
        </AppText>

        <Field
          label={t('onboarding.ipAddress')}
          value={host}
          onChangeText={setHost}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          placeholder="192.168.178.23"
        />
        <Field
          label={t('onboarding.port')}
          value={port}
          onChangeText={setPort}
          keyboardType="number-pad"
          placeholder="8000"
        />
        <Field
          label={t('onboarding.username')}
          value={user}
          onChangeText={setUser}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          placeholder="-"
        />
        <Field
          label={t('onboarding.password')}
          value={pass}
          onChangeText={setPass}
          password
          autoCapitalize="none"
          textContentType="password"
          placeholder="-"
          error={error ?? undefined}
        />

        <View className="mt-2">
          <Button label={t('onboarding.connect')} leftIcon="link" loading={busy} onPress={onConnect} />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
