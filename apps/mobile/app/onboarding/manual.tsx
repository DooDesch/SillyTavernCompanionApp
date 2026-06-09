import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { probeInstance } from '@st/core';
import { fetchLike } from '@/lib/expoFetch';
import { useConnection } from '@/stores/connectionStore';

export default function ManualScreen() {
  const connect = useConnection((s) => s.connect);
  const [host, setHost] = useState('192.168.178.');
  const [port, setPort] = useState('8000');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const instance = await probeInstance(host.trim(), Number(port) || 8000, {
        fetchImpl: fetchLike,
        timeoutMs: 2500,
      });
      if (!instance) {
        setError('Keine SillyTavern-Instanz unter dieser Adresse erreichbar.');
        return;
      }
      connect({ ...instance, source: 'manual' });
      router.replace('/(tabs)/chats');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Manuell koppeln', headerShown: true }} />
      <View className="flex-1 px-5 pt-6">
        <Text className="text-muted">
          IP-Adresse und Port deiner SillyTavern-Instanz eingeben. (QR-Scan folgt.)
        </Text>

        <Text className="mt-6 mb-1 text-sm text-muted">IP-Adresse</Text>
        <TextInput
          value={host}
          onChangeText={setHost}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          placeholder="192.168.178.23"
          placeholderTextColor="#5a5a68"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-base text-white"
        />

        <Text className="mt-4 mb-1 text-sm text-muted">Port</Text>
        <TextInput
          value={port}
          onChangeText={setPort}
          keyboardType="number-pad"
          placeholder="8000"
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
            <Text className="text-center text-base font-semibold text-white">Verbinden</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
