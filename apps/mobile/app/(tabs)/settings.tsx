import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  detectLlmsViaServer,
  getTextgenModel,
  getTextgenModelField,
  getTextgenServer,
  mergeLlmCandidates,
  textgenTypeLabel,
  type FoundLlm,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useProfiles } from '@/stores/profilesStore';
import { useServers } from '@/stores/serversStore';
import { useLocale, type LanguagePref } from '@/stores/localeStore';
import { usePrefs, type ChatListMode } from '@/stores/prefsStore';
import { useUpdates } from '@/stores/updateStore';
import { downloadAndInstallUpdate } from '@/lib/updates';
import { useConnectionProfiles } from '@/hooks/useConnectionProfiles';
import { useEngineConfig } from '@/hooks/useEngineConfig';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { discoverKobold } from '@/lib/discovery';
import { getLlmHints, parseHostPort, rememberLlmHints } from '@/lib/discoveryHints';
import { syncPersonaToPc, syncSelectedProfileToPc } from '@/lib/sync';
import { PickerSheet, type PickerOption } from '@/components/PickerSheet';
import { Screen, Header, Section, Card, Button, AppText, Badge, IconButton, SliderRow } from '@/components/ui';
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
    backendOverride,
    setBackendOverride,
  } = useConnectionProfiles();
  const { engine } = useEngineConfig('');
  const backend = useBackendStatus(engine);
  const langPref = useLocale((s) => s.pref);
  const setLanguage = useLocale((s) => s.setLanguage);
  const chatList = usePrefs((s) => s.chatList);
  const setChatList = usePrefs((s) => s.setChatList);
  const appLock = usePrefs((s) => s.appLock);
  const setAppLock = usePrefs((s) => s.setAppLock);
  const appLockTimer = usePrefs((s) => s.appLockTimer);
  const setAppLockTimer = usePrefs((s) => s.setAppLockTimer);
  const appLockMinutes = usePrefs((s) => s.appLockMinutes);
  const setAppLockMinutes = usePrefs((s) => s.setAppLockMinutes);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [scanning, setScanning] = useState(false);
  const update = useUpdates((s) => s.available);
  const updateChecking = useUpdates((s) => s.checking);
  const recheckUpdate = useUpdates((s) => s.check);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);

  const installUpdate = async () => {
    if (!update || updateProgress != null) return;
    setUpdateProgress(0);
    try {
      await downloadAndInstallUpdate(update, setUpdateProgress);
    } catch {
      Alert.alert(t('common.error'), t('settings.updateFailed'));
    } finally {
      setUpdateProgress(null);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const [hw, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        // Device-credential-only setups (PIN without biometrics) still work via the fallback.
        const level = await LocalAuthentication.getEnrolledLevelAsync();
        setLockAvailable((hw && enrolled) || level !== LocalAuthentication.SecurityLevel.NONE);
      } catch {
        setLockAvailable(false);
      }
    })();
  }, []);

  // Enabling requires a successful authentication first - users without working
  // credentials must never be able to lock themselves out.
  const toggleAppLock = async (on: boolean) => {
    if (!on) {
      setAppLock(false);
      return;
    }
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.prompt'),
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });
      if (res.success) setAppLock(true);
    } catch {
      // leave disabled
    }
  };
  const [sheet, setSheet] = useState<'profile' | 'persona' | 'language' | 'chatlist' | 'found' | 'model' | null>(
    null,
  );
  const [foundLlms, setFoundLlms] = useState<FoundLlm[]>([]);

  const chatListOptions: PickerOption[] = [
    { id: 'latest', label: t('settings.chatListLatest'), sublabel: t('settings.chatListLatestSub') },
    { id: 'all', label: t('settings.chatListAll'), sublabel: t('settings.chatListAllSub') },
  ];

  const languageOptions: PickerOption[] = [
    { id: 'system', label: t('settings.languageSystem') },
    { id: 'de', label: 'Deutsch' },
    { id: 'en', label: 'English' },
  ];
  const languageLabel =
    langPref === 'de' ? 'Deutsch' : langPref === 'en' ? 'English' : t('settings.languageSystem');

  const onPickProfile = (id: string) => {
    setActiveProfile(id);
    // A picked profile brings its own backend, so the backend picked in the app stops applying.
    setBackendOverride(undefined);
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

  // The backend the engine currently talks to (text completion only).
  const isTextgen = engine?.mainApi === 'textgenerationwebui';
  const currentType = isTextgen ? engine.textgen.type : undefined;
  const currentUrl = isTextgen ? engine.apiServerOverride || getTextgenServer(engine.textgen) : undefined;
  const currentModel = isTextgen ? getTextgenModel(engine.textgen) : undefined;
  const overrideApplied = !!backendOverride && (!backendOverride.legacy || currentType === 'koboldcpp');
  const backendKey = (type: string, url: string, model?: string) =>
    `${type}|${url}|${getTextgenModelField(type) ? (model ?? '') : ''}`;

  // One entry per backend and model, so one tap picks both.
  const foundEntries = foundLlms.flatMap((f) => {
    const selectable = !!getTextgenModelField(f.type);
    const models = selectable && f.models.length > 0 ? f.models : [f.models[0]];
    return models.map((shown) => ({ ...f, shown, model: selectable ? shown : undefined }));
  });
  const foundOptions: PickerOption[] = foundEntries.map((e) => ({
    id: backendKey(e.type, e.url, e.model),
    label: e.shown ? `${textgenTypeLabel(e.type)} · ${e.shown}` : textgenTypeLabel(e.type),
    sublabel: e.url,
  }));
  const onPickFound = (id: string) => {
    const entry = foundEntries.find((e) => backendKey(e.type, e.url, e.model) === id);
    if (!entry) {
      console.warn('[settings] picked LLM entry not found', id);
      return;
    }
    setBackendOverride({ type: entry.type, url: entry.url, ...(entry.model ? { model: entry.model } : {}) });
    console.info(`[settings] backend set to ${entry.type} at ${entry.url}`, entry.model ?? '');
  };

  const listedModels = backend.data?.models ?? [];
  const canPickModel = !!currentType && !!getTextgenModelField(currentType) && listedModels.length > 0;
  const modelOptions: PickerOption[] = listedModels.map((m) => ({ id: m, label: m }));
  const onPickModel = (model: string) => {
    if (!currentType || !currentUrl) {
      console.warn('[settings] model picked without a text-completion backend');
      return;
    }
    setBackendOverride({ type: currentType, url: currentUrl, model });
    console.info(`[settings] model set to ${model} on ${currentType} at ${currentUrl}`);
  };

  /**
   * Find running LLMs. The SillyTavern server probes the backends found in earlier runs and the
   * default ports (it reaches 127.0.0.1 on its own PC); its answer opens the list right away. The
   * phone's LAN scan for KoboldCpp is slower and adds its hits to the open list.
   */
  const detectBackends = async () => {
    if (!client) {
      console.warn('[settings] auto-detect without a SillyTavern connection');
      return;
    }
    setScanning(true);
    try {
      const remembered = await getLlmHints();
      const stHost = parseHostPort(client.baseUrl)?.ip;
      const results: FoundLlm[] = [];
      let listOpen = false;
      // A backend on the SillyTavern PC answers as 127.0.0.1 and as the PC's LAN address (phone
      // scan, earlier hints). Both count as one; the first answer stays.
      const sameBackendKey = (url: string) => {
        const hp = parseHostPort(url);
        if (!hp) return url;
        const local = hp.ip === stHost || hp.ip === 'localhost' || hp.ip === '127.0.0.1';
        return `${local ? '127.0.0.1' : hp.ip}:${hp.port}`;
      };
      const addFound = (items: FoundLlm[]) => {
        for (const item of items) {
          const key = sameBackendKey(item.url);
          if (results.some((r) => sameBackendKey(r.url) === key)) continue;
          results.push(item);
        }
        if (listOpen) setFoundLlms([...results]);
      };

      const preferUrl = backendOverride?.type === 'koboldcpp' ? backendOverride.url : undefined;
      const lanScan = discoverKobold({
        ...(preferUrl ? { preferUrl } : {}),
        onFound: (k) => addFound([{ type: 'koboldcpp', url: k.baseUrl, models: [] }]),
      }).catch((e: unknown) => {
        console.warn('[settings] LAN scan for KoboldCpp failed', e);
        return [];
      });

      addFound(await detectLlmsViaServer(client, mergeLlmCandidates(remembered)));
      console.info('[settings] server probe found', results.map((f) => `${f.type}@${f.url}`));
      if (results.length > 0) {
        listOpen = true;
        setFoundLlms([...results]);
        setSheet('found');
      }

      await lanScan;
      console.info('[settings] auto-detect found', results.map((f) => `${f.type}@${f.url}`));
      void rememberLlmHints(results, remembered);
      if (results.length === 0) {
        Alert.alert(t('settings.autoDetect'), t('settings.llmNotFound'));
        return;
      }
      if (!listOpen) {
        setFoundLlms([...results]);
        setSheet('found');
      }
    } catch (e) {
      console.error('[settings] auto-detect failed', e);
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('settings.scanFailed'));
    } finally {
      setScanning(false);
    }
  };

  const backendConnected = backend.data?.connected;
  const appVersion = Constants.expoConfig?.version ?? '-';

  return (
    <Screen edges={['top']}>
      <Header title={t('tabs.settings')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 }}>
        {/* Update available (automatic check on launch) */}
        {update ? (
          <Card className="mt-2 border-accent px-4 py-4">
            <AppText variant="title" color="accent">
              {t('settings.updateAvailable', { version: update.version })}
            </AppText>
            <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
              {t('settings.updateSubtitle', { size: Math.round(update.apkSize / 1024 / 1024) })}
            </AppText>
            <View className="mt-3">
              <Button
                label={
                  updateProgress != null
                    ? t('settings.updateDownloading', { percent: Math.round(updateProgress * 100) })
                    : t('settings.updateInstall')
                }
                leftIcon="arrowDown"
                loading={updateProgress != null}
                onPress={() => void installUpdate()}
              />
            </View>
          </Card>
        ) : null}

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

        {/* SillyTavern configuration pages */}
        <Section title={t('settings.configuration')} icon="tune">
          <SettingRow
            label={t('settings.formattingSubtitle')}
            value={t('settings.formatting')}
            onPress={() => router.push('/settings/formatting')}
          />
          <SettingRow
            label={t('settings.chatBehaviorSubtitle')}
            value={t('settings.chatBehavior')}
            onPress={() => router.push('/settings/chat-behavior')}
          />
          <SettingRow
            label={t('settings.personasManageSubtitle')}
            value={t('settings.personasManage')}
            onPress={() => router.push('/settings/personas')}
          />
        </Section>

        {/* AI backend */}
        <Section title={t('settings.aiBackend')} icon="zap">
          <Card
            onPress={canPickModel ? () => setSheet('model') : undefined}
            className="flex-row items-center gap-3 px-4 py-3.5"
          >
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
                {[
                  engine?.mode === 'cc' ? t('settings.chatCompletion') : t('settings.textCompletion'),
                  currentType ? textgenTypeLabel(currentType) : undefined,
                  overrideApplied ? currentUrl : t('settings.defaultViaSillyTavern'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
            {canPickModel ? <Icon name="chevronRight" size={18} color={colors.textSubtle} /> : null}
          </Card>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label={t('settings.autoDetect')} leftIcon="search" loading={scanning} onPress={detectBackends} />
            </View>
            {backendOverride ? (
              <Button label={t('settings.reset')} variant="secondary" fullWidth={false} onPress={() => setBackendOverride(undefined)} />
            ) : null}
          </View>
        </Section>

        {/* Display */}
        <Section title={t('settings.display')} icon="chats">
          <SettingRow
            label={t('settings.chatList')}
            value={chatList === 'all' ? t('settings.chatListAll') : t('settings.chatListLatest')}
            onPress={() => setSheet('chatlist')}
          />
        </Section>

        {/* Security */}
        <Section title={t('settings.security')} icon="lock">
          <Card className="flex-row items-center gap-3 px-4 py-3.5">
            <View className="flex-1">
              <AppText variant="title">{t('settings.appLock')}</AppText>
              <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
                {lockAvailable ? t('settings.appLockSubtitle') : t('settings.appLockUnavailable')}
              </AppText>
            </View>
            <Switch
              value={appLock}
              disabled={!lockAvailable}
              onValueChange={(on) => void toggleAppLock(on)}
              trackColor={{ true: colors.accent, false: colors.surface3 }}
              thumbColor={colors.onAccent}
            />
          </Card>
          {appLock ? (
            <Card className="mt-2 px-4 py-3.5">
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <AppText variant="title">{t('settings.appLockTimer')}</AppText>
                  <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
                    {t('settings.appLockTimerSubtitle')}
                  </AppText>
                </View>
                <Switch
                  value={appLockTimer}
                  onValueChange={setAppLockTimer}
                  trackColor={{ true: colors.accent, false: colors.surface3 }}
                  thumbColor={colors.onAccent}
                />
              </View>
              {appLockTimer ? (
                <View className="mt-3">
                  <SliderRow
                    label={t('settings.appLockMinutes')}
                    value={appLockMinutes}
                    min={1}
                    max={30}
                    step={1}
                    onChange={setAppLockMinutes}
                  />
                </View>
              ) : null}
            </Card>
          ) : null}
        </Section>

        {/* Language */}
        <Section title={t('settings.language')} icon="globe">
          <SettingRow label={t('settings.language')} value={languageLabel} onPress={() => setSheet('language')} />
        </Section>

        <AppText variant="caption" color="subtle" style={{ marginTop: 24, textAlign: 'center' }}>
          {t('settings.versionLabel', { version: appVersion })}
        </AppText>
        {!update ? (
          <View className="mt-2 items-center">
            <Button
              label={updateChecking ? t('settings.updateChecking') : t('settings.updateCheck')}
              variant="ghost"
              fullWidth={false}
              loading={updateChecking}
              onPress={() => void recheckUpdate()}
            />
          </View>
        ) : null}
        <AppText variant="caption" color="subtle" style={{ marginTop: 8 }}>
          {t('settings.roadmapNote')}
        </AppText>
      </ScrollView>

      <PickerSheet
        visible={sheet === 'chatlist'}
        title={t('settings.chatList')}
        options={chatListOptions}
        activeId={chatList}
        onSelect={(id) => setChatList(id as ChatListMode)}
        onClose={() => setSheet(null)}
      />
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
        visible={sheet === 'found'}
        title={t('settings.llmFoundTitle')}
        options={foundOptions}
        activeId={currentType && currentUrl ? backendKey(currentType, currentUrl, currentModel) : undefined}
        onSelect={onPickFound}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'model'}
        title={t('settings.chooseModel')}
        options={modelOptions}
        activeId={currentModel}
        onSelect={onPickModel}
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
