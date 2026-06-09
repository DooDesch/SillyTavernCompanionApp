import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useConnection } from '@/stores/connectionStore';
import { useProfiles } from '@/stores/profilesStore';
import { useServers } from '@/stores/serversStore';
import { useLocale, type LanguagePref } from '@/stores/localeStore';
import { useConnectionProfiles } from '@/hooks/useConnectionProfiles';
import { useEngineConfig } from '@/hooks/useEngineConfig';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { discoverKobold } from '@/lib/discovery';
import { syncPersonaToPc, syncSelectedProfileToPc } from '@/lib/sync';
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
  const { t } = useTranslation();
  const instance = useConnection((s) => s.instance);
  const disconnect = useConnection((s) => s.disconnect);
  const client = useConnection((s) => s.client);
  const connect = useConnection((s) => s.connect);
  const syncToPc = useProfiles((s) => s.syncToPc);
  const setSyncToPc = useProfiles((s) => s.setSyncToPc);
  const servers = useServers((s) => s.servers);
  const getCreds = useServers((s) => s.getCreds);
  const removeServer = useServers((s) => s.remove);
  const queryClient = useQueryClient();

  const reconnectTo = async (id: string) => {
    const srv = servers.find((s) => s.id === id);
    if (!srv) return;
    const creds = srv.hasAuth ? await getCreds(srv.id) : undefined;
    connect(
      { baseUrl: srv.baseUrl, ip: srv.ip, port: srv.port, version: instance?.version ?? '', source: 'manual' },
      creds,
    );
    void queryClient.invalidateQueries();
  };
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
  const { engine } = useEngineConfig('');
  const backend = useBackendStatus(engine);
  const langPref = useLocale((s) => s.pref);
  const setLanguage = useLocale((s) => s.setLanguage);
  const [scanning, setScanning] = useState(false);
  const [sheet, setSheet] = useState<'profile' | 'persona' | 'language' | null>(null);

  const languageOptions: PickerOption[] = [
    { id: 'system', label: t('settings.languageSystem') },
    { id: 'de', label: 'Deutsch' },
    { id: 'en', label: 'English' },
  ];
  const languageLabel =
    langPref === 'de' ? 'Deutsch' : langPref === 'en' ? 'English' : t('settings.languageSystem');

  const onPickProfile = (id: string) => {
    setActiveProfile(id);
    if (syncToPc && client) {
      void syncSelectedProfileToPc(client, id).then((ok) => {
        if (ok) void queryClient.invalidateQueries({ queryKey: ['settings'] });
      });
    }
  };
  const onPickPersona = (avatar: string) => {
    setActivePersona(avatar);
    if (syncToPc && client) {
      void syncPersonaToPc(client, avatar).then((ok) => {
        if (ok) void queryClient.invalidateQueries({ queryKey: ['settings'] });
      });
    }
  };

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
        Alert.alert('KoboldCpp', t('settings.koboldNotFound'));
        return;
      }
      setKoboldOverride(found[0]!.baseUrl);
      Alert.alert(
        t('settings.koboldFound'),
        found.length === 1
          ? found[0]!.baseUrl
          : t('settings.koboldFoundMultiple', { count: found.length, url: found[0]!.baseUrl }),
      );
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('settings.scanFailed'));
    } finally {
      setScanning(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20 }}>
      <Text className="mb-2 text-sm uppercase tracking-wide text-muted">{t('settings.sillyTavern')}</Text>
      <View className="rounded-2xl border border-border bg-surface px-4 py-3">
        <Text className="text-base font-semibold text-white">{instance?.baseUrl ?? t('common.notConnected')}</Text>
        {!!instance?.version && <Text className="mt-0.5 text-sm text-muted">SillyTavern {instance.version}</Text>}
      </View>
      <Pressable
        onPress={() => {
          disconnect();
          router.replace('/onboarding/discovery');
        }}
        className="mt-3 rounded-2xl border border-border px-4 py-3 active:bg-surface"
      >
        <Text className="text-center text-base font-semibold text-red-400">{t('settings.disconnect')}</Text>
      </Pressable>

      {servers.length > 0 && (
        <>
          <Text className="mb-2 mt-7 text-sm uppercase tracking-wide text-muted">{t('settings.savedServers')}</Text>
          {servers.map((srv) => {
            const active = srv.baseUrl === instance?.baseUrl;
            return (
              <View
                key={srv.id}
                className="mb-2 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <Pressable className="flex-1 active:opacity-60" onPress={() => void reconnectTo(srv.id)}>
                  <Text className="text-base font-semibold text-white" numberOfLines={1}>
                    {srv.label}
                    {srv.hasAuth ? '  🔒' : ''}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted">{active ? t('common.connected') : t('settings.tapToConnect')}</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert(t('settings.removeServer'), t('settings.removeServerConfirm', { label: srv.label }), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('settings.removeServer'), style: 'destructive', onPress: () => void removeServer(srv.id) },
                    ])
                  }
                  className="h-8 w-8 items-center justify-center active:opacity-60"
                >
                  <Text className="text-lg text-muted">✕</Text>
                </Pressable>
              </View>
            );
          })}
        </>
      )}

      <Text className="mb-2 mt-7 text-sm uppercase tracking-wide text-muted">{t('settings.activeConfig')}</Text>
      <Row
        label={t('settings.connectionProfile')}
        value={activeProfile?.name ?? (profiles.length ? t('settings.selectEllipsis') : t('settings.noProfiles'))}
        sub={
          activeProfile
            ? `${activeProfile.mode === 'cc' ? t('settings.chatCompletion') : t('settings.textCompletion')}${activeProfile.api ? ' · ' + activeProfile.api : ''}`
            : undefined
        }
        onPress={profiles.length ? () => setSheet('profile') : undefined}
      />
      <Row
        label={t('settings.persona')}
        value={activePersona?.name ?? (personas.length ? t('settings.selectEllipsis') : t('settings.noPersonas'))}
        onPress={personas.length ? () => setSheet('persona') : undefined}
      />
      <View className="mt-1 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-white">{t('settings.syncToPc')}</Text>
          <Text className="mt-0.5 text-xs text-muted">
            {t('settings.syncToPcSubtitle')}
          </Text>
        </View>
        <Switch
          value={syncToPc}
          onValueChange={setSyncToPc}
          trackColor={{ true: '#7c5cff', false: '#3a3a44' }}
          thumbColor="#ffffff"
        />
      </View>

      <Text className="mb-2 mt-7 text-sm uppercase tracking-wide text-muted">{t('settings.aiBackend')}</Text>
      <View className="rounded-2xl border border-border bg-surface px-4 py-3">
        <View className="flex-row items-center gap-2">
          <View
            className={`h-2.5 w-2.5 rounded-full ${
              backend.isLoading ? 'bg-muted' : backend.data?.connected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <Text className="flex-1 text-base font-semibold text-white" numberOfLines={1}>
            {backend.isLoading
              ? t('settings.checking')
              : backend.data?.connected
                ? backend.data.model || t('common.connected')
                : t('common.notConnected')}
          </Text>
        </View>
        <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
          {engine?.mode === 'cc' ? t('settings.chatCompletion') : t('settings.textCompletion')} ·{' '}
          {koboldOverride ?? t('settings.defaultViaSillyTavern')}
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
            <Text className="text-center font-semibold text-white">{t('settings.autoDetect')}</Text>
          )}
        </Pressable>
        {!!koboldOverride && (
          <Pressable
            onPress={() => setKoboldOverride(undefined)}
            className="rounded-2xl border border-border px-4 py-3 active:bg-surface"
          >
            <Text className="font-semibold text-muted">{t('settings.reset')}</Text>
          </Pressable>
        )}
      </View>

      <Text className="mb-2 mt-7 text-sm uppercase tracking-wide text-muted">{t('settings.language')}</Text>
      <Row label={t('settings.language')} value={languageLabel} onPress={() => setSheet('language')} />

      <Text className="mt-8 text-xs text-muted">
        {t('settings.roadmapNote')}
      </Text>

      <PickerSheet
        visible={sheet === 'language'}
        title={t('settings.language')}
        options={languageOptions}
        activeId={langPref}
        onSelect={(id) => setLanguage(id as LanguagePref)}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'profile'}
        title={t('settings.chooseProfile')}
        options={profileOptions}
        activeId={activeId}
        onSelect={onPickProfile}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'persona'}
        title={t('settings.choosePersona')}
        options={personaOptions}
        activeId={activePersonaAvatar}
        onSelect={onPickPersona}
        onClose={() => setSheet(null)}
      />
    </ScrollView>
  );
}
