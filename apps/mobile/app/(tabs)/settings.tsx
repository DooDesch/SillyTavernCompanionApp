import { useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
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
import { Screen, Header, Section, Card, Button, AppText, Badge, IconButton } from '@/components/ui';
import { Icon, type IconName } from '@/theme/icons';
import { colors } from '@/theme/tokens';

function SettingRow({
  label,
  value,
  sub,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: IconName;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} className="flex-row items-center gap-3 px-4 py-3">
      {icon ? <Icon name={icon} size={18} color={colors.textMuted} /> : null}
      <View className="flex-1">
        <AppText variant="caption" color="subtle">
          {label}
        </AppText>
        <AppText variant="title" numberOfLines={1} style={{ marginTop: 2 }}>
          {value}
        </AppText>
        {sub ? (
          <AppText variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {sub}
          </AppText>
        ) : null}
      </View>
      {onPress ? <Icon name="chevronRight" size={18} color={colors.textSubtle} /> : null}
    </Card>
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

  const backendConnected = backend.data?.connected;
  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <Screen edges={['top']}>
      <Header title={t('tabs.settings')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 }}>
        {/* Connection */}
        <Section title={t('settings.sillyTavern')} icon="server">
          <Card className="flex-row items-center gap-3 px-4 py-3.5">
            <View className="h-9 w-9 items-center justify-center rounded-2xl bg-accent-soft">
              <Icon name="server" size={18} color={colors.accent} />
            </View>
            <View className="flex-1">
              <AppText variant="title" numberOfLines={1}>
                {instance?.baseUrl ?? t('common.notConnected')}
              </AppText>
              {instance?.version ? (
                <AppText variant="caption" color="muted" style={{ marginTop: 1 }}>
                  SillyTavern {instance.version}
                </AppText>
              ) : null}
            </View>
          </Card>
        </Section>

        <View className="mt-3">
          <Button
            label={t('settings.disconnect')}
            variant="danger"
            leftIcon="link"
            onPress={() => {
              disconnect();
              router.replace('/onboarding/discovery');
            }}
          />
        </View>

        {/* Saved servers */}
        {servers.length > 0 ? (
          <Section title={t('settings.savedServers')}>
            {servers.map((srv) => {
              const active = srv.baseUrl === instance?.baseUrl;
              return (
                <Card
                  key={srv.id}
                  onPress={() => void reconnectTo(srv.id)}
                  className="flex-row items-center gap-3 px-4 py-3"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <AppText variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {srv.label}
                      </AppText>
                      {srv.hasAuth ? <Icon name="lock" size={13} color={colors.textSubtle} /> : null}
                      {active ? <Badge label={t('common.connected')} tone="success" dot /> : null}
                    </View>
                    {!active ? (
                      <AppText variant="caption" color="muted" style={{ marginTop: 1 }}>
                        {t('settings.tapToConnect')}
                      </AppText>
                    ) : null}
                  </View>
                  <IconButton
                    name="close"
                    size="sm"
                    accessibilityLabel={t('a11y.removeServer')}
                    haptic={false}
                    onPress={() =>
                      Alert.alert(t('settings.removeServer'), t('settings.removeServerConfirm', { label: srv.label }), [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('settings.removeServer'), style: 'destructive', onPress: () => void removeServer(srv.id) },
                      ])
                    }
                  />
                </Card>
              );
            })}
          </Section>
        ) : null}

        {/* Active config */}
        <Section title={t('settings.activeConfig')} icon="tune">
          <SettingRow
            label={t('settings.connectionProfile')}
            value={activeProfile?.name ?? (profiles.length ? t('settings.selectEllipsis') : t('settings.noProfiles'))}
            sub={
              activeProfile
                ? `${activeProfile.mode === 'cc' ? t('settings.chatCompletion') : t('settings.textCompletion')}${activeProfile.api ? ' · ' + activeProfile.api : ''}`
                : undefined
            }
            onPress={profiles.length ? () => setSheet('profile') : undefined}
          />
          <SettingRow
            label={t('settings.persona')}
            value={activePersona?.name ?? (personas.length ? t('settings.selectEllipsis') : t('settings.noPersonas'))}
            onPress={personas.length ? () => setSheet('persona') : undefined}
          />
          <Card className="flex-row items-center gap-3 px-4 py-3.5">
            <View className="flex-1">
              <AppText variant="title">{t('settings.syncToPc')}</AppText>
              <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
                {t('settings.syncToPcSubtitle')}
              </AppText>
            </View>
            <Switch
              value={syncToPc}
              onValueChange={setSyncToPc}
              trackColor={{ true: colors.accent, false: colors.surface3 }}
              thumbColor={colors.onAccent}
            />
          </Card>
        </Section>

        {/* AI backend */}
        <Section title={t('settings.aiBackend')} icon="zap">
          <Card className="flex-row items-center gap-3 px-4 py-3.5">
            <View
              className={`h-2.5 w-2.5 rounded-full ${backend.isLoading ? 'bg-text-subtle' : backendConnected ? 'bg-success' : 'bg-danger'}`}
            />
            <View className="flex-1">
              <AppText variant="title" numberOfLines={1}>
                {backend.isLoading
                  ? t('settings.checking')
                  : backendConnected
                    ? backend.data?.model || t('common.connected')
                    : t('common.notConnected')}
              </AppText>
              <AppText variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 1 }}>
                {engine?.mode === 'cc' ? t('settings.chatCompletion') : t('settings.textCompletion')} ·{' '}
                {koboldOverride ?? t('settings.defaultViaSillyTavern')}
              </AppText>
            </View>
          </Card>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label={t('settings.autoDetect')} leftIcon="search" loading={scanning} onPress={detectKobold} />
            </View>
            {koboldOverride ? (
              <Button label={t('settings.reset')} variant="secondary" fullWidth={false} onPress={() => setKoboldOverride(undefined)} />
            ) : null}
          </View>
        </Section>

        {/* Language */}
        <Section title={t('settings.language')} icon="globe">
          <SettingRow label={t('settings.language')} value={languageLabel} onPress={() => setSheet('language')} />
        </Section>

        <AppText variant="caption" color="subtle" style={{ marginTop: 24, textAlign: 'center' }}>
          {t('settings.versionLabel', { version: appVersion })}
        </AppText>
        <AppText variant="caption" color="subtle" style={{ marginTop: 8 }}>
          {t('settings.roadmapNote')}
        </AppText>
      </ScrollView>

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
    </Screen>
  );
}
