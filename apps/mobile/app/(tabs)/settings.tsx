import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useConnection } from '@/stores/connectionStore';
import { useConnectionProfiles } from '@/hooks/useConnectionProfiles';
import { discoverKobold } from '@/lib/discovery';
import { PickerSheet, type PickerOption } from '@/components/PickerSheet';

function Row({
  label,
  value,
  sub,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 active:bg-surface2"
    >
      <View className="flex-1">
        <Text className="text-xs text-muted">{label}</Text>
        <Text className="mt-0.5 text-base font-semibold text-white" numberOfLines={1}>
          {value}
        </Text>
        {!!sub && (
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      {!!onPress && <Text className="ml-2 text-lg text-muted">›</Text>}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const instance = useConnection((s) => s.instance);
  const disconnect = useConnection((s) => s.disconnect);
  const {
    profiles,
    activeId,
    setActiveProfile,
    personas,
    activePersonaAvatar,
    setActivePersona,
    koboldOverride,
    setKoboldOverride,
  } = useConnectionProfiles();
  const [scanning, setScanning] = useState(false);
  const [sheet, setSheet] = useState<'profile' | 'persona' | null>(null);

  const activeProfile = profiles.find((p) => p.id === activeId);
  const activePersona = personas.find((p) => p.avatar === activePersonaAvatar);

  const profileOptions: PickerOption[] = profiles.map((p) => ({
    id: p.id,
    label: p.name,
    sublabel: [p.api, p.preset, p.instruct].filter(Boolean).join(' · ') || p.mode,
  }));
  const personaOptions: PickerOption[] = personas.map((p) => ({
    id: p.avatar,
    label: p.name,
    sublabel: p.description ? p.description.slice(0, 60) : undefined,
  }));

  const detectKobold = async () => {
    setScanning(true);
    try {
      const found = await discoverKobold(koboldOverride ? { preferUrl: koboldOverride } : {});
      if (found.length === 0) {
        Alert.alert('KoboldCpp', 'Kein KoboldCpp im Netzwerk gefunden (Port 5001).');
        return;
      }
      setKoboldOverride(found[0]!.baseUrl);
      Alert.alert(
        'KoboldCpp gefunden',
        found.length === 1 ? found[0]!.baseUrl : `${found.length} gefunden, übernommen: ${found[0]!.baseUrl}`,
      );
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Scan fehlgeschlagen');
    } finally {
      setScanning(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20 }}>
      <Text className="mb-2 text-sm uppercase tracking-wide text-muted">SillyTavern</Text>
      <View className="rounded-2xl border border-border bg-surface px-4 py-3">
        <Text className="text-base font-semibold text-white">{instance?.baseUrl ?? 'Nicht verbunden'}</Text>
        {!!instance?.version && <Text className="mt-0.5 text-sm text-muted">SillyTavern {instance.version}</Text>}
      </View>
      <Pressable
        onPress={() => {
          disconnect();
          router.replace('/onboarding/discovery');
        }}
        className="mt-3 rounded-2xl border border-border px-4 py-3 active:bg-surface"
      >
        <Text className="text-center text-base font-semibold text-red-400">Trennen</Text>
      </Pressable>

      <Text className="mb-2 mt-7 text-sm uppercase tracking-wide text-muted">Aktive Konfiguration</Text>
      <Row
        label="Verbindungsprofil (Backend)"
        value={activeProfile?.name ?? (profiles.length ? 'Auswählen…' : 'Keine Profile')}
        sub={
          activeProfile
            ? `${activeProfile.mode === 'cc' ? 'Chat-Completion' : 'Text-Completion'}${activeProfile.api ? ' · ' + activeProfile.api : ''}`
            : undefined
        }
        onPress={profiles.length ? () => setSheet('profile') : undefined}
      />
      <Row
        label="Persona"
        value={activePersona?.name ?? (personas.length ? 'Auswählen…' : 'Keine Personas')}
        onPress={personas.length ? () => setSheet('persona') : undefined}
      />

      <Text className="mb-2 mt-7 text-sm uppercase tracking-wide text-muted">KoboldCpp-Backend</Text>
      <View className="rounded-2xl border border-border bg-surface px-4 py-3">
        <Text className="text-base text-white" numberOfLines={1}>
          {koboldOverride ?? 'Standard (über SillyTavern)'}
        </Text>
      </View>
      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={detectKobold}
          disabled={scanning}
          className="flex-1 rounded-2xl bg-primary px-4 py-3 active:opacity-80 disabled:opacity-50"
        >
          {scanning ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center font-semibold text-white">Automatisch erkennen</Text>
          )}
        </Pressable>
        {!!koboldOverride && (
          <Pressable
            onPress={() => setKoboldOverride(undefined)}
            className="rounded-2xl border border-border px-4 py-3 active:bg-surface"
          >
            <Text className="font-semibold text-muted">Zurücksetzen</Text>
          </Pressable>
        )}
      </View>

      <Text className="mt-8 text-xs text-muted">
        Profile wenden Instruct/Context/Sysprompt/Sampler + Backend-URL an. Roadmap: Cloud-Backends
        (Chat-Completion), Preset-Editor.
      </Text>

      <PickerSheet
        visible={sheet === 'profile'}
        title="Verbindungsprofil wählen"
        options={profileOptions}
        activeId={activeId}
        onSelect={(id) => setActiveProfile(id)}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'persona'}
        title="Persona wählen"
        options={personaOptions}
        activeId={activePersonaAvatar}
        onSelect={(id) => setActivePersona(id)}
        onClose={() => setSheet(null)}
      />
    </ScrollView>
  );
}
