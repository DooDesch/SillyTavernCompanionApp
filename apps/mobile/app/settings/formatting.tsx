import { useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnection } from '@/stores/connectionStore';
import { useTemplates } from '@/hooks/useTemplates';
import { useConnectionProfiles } from '@/hooks/useConnectionProfiles';
import { syncTemplateSelect } from '@/lib/sync';
import { buildSelectPatch, byName, type TemplateKind } from '@/lib/templateSchema';
import { PickerSheet, type PickerOption } from '@/components/PickerSheet';
import { AppText, Button, Card, EmptyState, IconButton, Section } from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';

/**
 * Advanced Formatting (desktop "A" panel): per kind (instruct/context/sysprompt) the selected
 * template, an enabled toggle (instruct + sysprompt) and the entry into the template editor.
 * Selections/toggles are written straight to the PC (desktop select semantics) - no draft state.
 */
export default function FormattingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const templates = useTemplates();
  const { profiles, activeId } = useConnectionProfiles();
  const activeProfile = profiles.find((p) => p.id === activeId);

  const [picker, setPicker] = useState<TemplateKind | null>(null);
  const [busy, setBusy] = useState<TemplateKind | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['settings'] });

  const onSelect = async (kind: TemplateKind, name: string) => {
    if (!client || busy) return;
    const template = byName(templates[kind], name);
    if (!template) return;
    setBusy(kind);
    try {
      const patch = buildSelectPatch(kind, template);
      const ok = await syncTemplateSelect(client, kind, patch.fields, patch.globals);
      if (ok) await invalidate();
      else Alert.alert(t('common.error'), t('formatting.selectFailed'));
    } finally {
      setBusy(null);
    }
  };

  const onToggle = async (kind: 'instruct' | 'sysprompt', enabled: boolean) => {
    if (!client || busy) return;
    setBusy(kind);
    try {
      const ok = await syncTemplateSelect(client, kind, { enabled });
      if (ok) await invalidate();
      else Alert.alert(t('common.error'), t('formatting.selectFailed'));
    } finally {
      setBusy(null);
    }
  };

  const openEditor = (kind: TemplateKind) => {
    const name = templates.selected[kind];
    if (!name) return;
    router.push({ pathname: '/settings/template/[kind]', params: { kind, name } });
  };

  const renderKind = (kind: TemplateKind) => {
    const selectedName = templates.selected[kind];
    const pinned =
      kind === 'instruct' ? activeProfile?.instruct : kind === 'context' ? activeProfile?.context : activeProfile?.sysprompt;
    const hasToggle = kind !== 'context';
    return (
      <Section key={kind} title={t(`formatting.${kind}`)} icon="tune">
        {hasToggle ? (
          <Card className="flex-row items-center gap-3 px-4 py-3.5">
            <View className="flex-1">
              <AppText variant="title">{t('formatting.enabled')}</AppText>
            </View>
            <Switch
              value={templates.enabled[kind]}
              disabled={!client || busy === kind}
              onValueChange={(v) => void onToggle(kind, v)}
              trackColor={{ true: colors.accent, false: colors.surface3 }}
              thumbColor={colors.onAccent}
            />
          </Card>
        ) : null}
        <Card onPress={templates[kind].length ? () => setPicker(kind) : undefined} className="flex-row items-center gap-3 px-4 py-3">
          <View className="flex-1">
            <AppText variant="caption" color="subtle">
              {t('formatting.template')}
            </AppText>
            <AppText variant="title" numberOfLines={1} style={{ marginTop: 2 }}>
              {selectedName ?? t('settings.selectEllipsis')}
            </AppText>
          </View>
          {templates[kind].length ? <Icon name="chevronRight" size={18} color={colors.textSubtle} /> : null}
        </Card>
        <Button
          label={t('formatting.edit')}
          variant="secondary"
          leftIcon="edit"
          disabled={!selectedName || !byName(templates[kind], selectedName)}
          onPress={() => openEditor(kind)}
        />
        {pinned ? (
          <AppText variant="caption" color="subtle" style={{ marginTop: 2 }}>
            {t('formatting.profileOverride', { profile: activeProfile?.name ?? '', template: pinned })}
          </AppText>
        ) : null}
      </Section>
    );
  };

  const pickerOptions: PickerOption[] = picker
    ? templates[picker].map((tpl) => ({ id: String(tpl.name ?? ''), label: String(tpl.name ?? '') }))
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center gap-1 border-b border-border bg-surface px-1 pb-2"
      >
        <IconButton name="back" size="lg" accessibilityLabel={t('a11y.back')} haptic={false} onPress={() => router.back()} />
        <View className="flex-1">
          <AppText variant="h2" numberOfLines={1}>
            {t('formatting.title')}
          </AppText>
          <AppText variant="caption" color="muted">
            {t('settings.formattingSubtitle')}
          </AppText>
        </View>
      </View>

      {!client ? (
        <EmptyState icon="tune" title={t('common.notConnected')} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 24) }}
        >
          {(['instruct', 'context', 'sysprompt'] as TemplateKind[]).map(renderKind)}
          <AppText variant="caption" color="subtle" style={{ marginTop: 16 }}>
            {t('formatting.savedNotice')}
          </AppText>
        </ScrollView>
      )}

      <PickerSheet
        visible={picker != null}
        title={picker ? t(`formatting.${picker}`) : ''}
        options={pickerOptions}
        activeId={picker ? templates.selected[picker] : undefined}
        onSelect={(name) => {
          if (picker) void onSelect(picker, name);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}
