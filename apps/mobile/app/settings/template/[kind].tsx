import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deletePreset, savePreset } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useTemplates } from '@/hooks/useTemplates';
import { syncTemplateSelect } from '@/lib/sync';
import { secrets } from '@/lib/storage';
import {
  TEMPLATE_FIELDS,
  TEMPLATE_SECTIONS,
  buildSelectPatch,
  byName,
  mergeTemplate,
  type TemplateField,
  type TemplateKind,
} from '@/lib/templateSchema';
import { ToggleRow, TextAreaRow, SegmentedRow } from '@/components/form/rows';
import { AppText, Button, EmptyState, Field, IconButton, SectionHeader, Sheet } from '@/components/ui';
import { haptics } from '@/theme/haptics';
import { colors } from '@/theme/tokens';

const WARNED_KEY = 'prefs.templateEditWarned';

function isKind(value: unknown): value is TemplateKind {
  return value === 'instruct' || value === 'context' || value === 'sysprompt';
}

/**
 * Schema-driven editor for ONE Advanced-Formatting template (?name= param). The draft holds
 * only touched fields; saving merges them over the SERVER-side template object (unknown keys
 * like story_string_position survive) and writes the file via /api/presets/save. If the edited
 * template is the selected one, the changed fields are also merged into power_user[kind]
 * (desktop keeps live settings and template file in sync the same way).
 */
export default function TemplateEditorScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind: string; name: string }>();
  const kind: TemplateKind = isKind(params.kind) ? params.kind : 'instruct';
  const name = typeof params.name === 'string' ? params.name : '';

  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const templates = useTemplates();
  const base = byName(templates[kind], name);
  const isSelected = templates.selected[kind] === name;

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState<{ name: string } | null>(null);

  const fields = TEMPLATE_FIELDS[kind];
  const dirty = Object.keys(draft).length > 0;

  const valueOf = useCallback(
    (field: TemplateField): unknown =>
      field.key in draft ? draft[field.key] : (base?.[field.key] ?? field.def),
    [draft, base],
  );

  const setValue = useCallback((key: string, v: unknown) => {
    setDraft((d) => ({ ...d, [key]: v }));
  }, []);

  const resetField = useCallback(
    (field: TemplateField) => {
      haptics.tap();
      setValue(field.key, field.def);
    },
    [setValue],
  );

  const confirmDiscard = useCallback((proceed: () => void) => {
    Alert.alert(t('genSettings.discardTitle'), t('genSettings.discardMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: proceed },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = useCallback(() => {
    if (dirty) confirmDiscard(() => router.back());
    else router.back();
  }, [dirty, confirmDiscard]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dirty) {
        confirmDiscard(() => router.back());
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [dirty, confirmDiscard]);

  /** Warn-once before the first template-file write (mirrors the generation-settings pattern). */
  const confirmFirstWrite = useCallback(async (): Promise<boolean> => {
    // Fail closed: when the storage read fails we cannot know the user was warned - warn again.
    const warned = await secrets.get(WARNED_KEY).catch(() => null);
    if (warned === '1') return true;
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(t('formatting.writeWarningTitle'), t('formatting.writeWarning'), [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('common.save'), onPress: () => resolve(true) },
      ]);
    });
    if (ok) void secrets.set(WARNED_KEY, '1').catch(() => {});
    return ok;
  }, [t]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['settings'] });

  const doSave = useCallback(async () => {
    if (!client || !dirty || !base) return;
    if (!(await confirmFirstWrite())) return;
    setSaving(true);
    try {
      const merged = mergeTemplate(base, draft, name);
      const ok = await savePreset(client, { apiId: kind, name, preset: merged });
      if (!ok) {
        Alert.alert(t('common.error'), t('formatting.saveFailed'));
        return;
      }
      if (isSelected) {
        // Desktop live-edit semantics: editing a control writes power_user[kind][prop] for the
        // TOUCHED fields only (no migration-default resets, no enabled flip like a full select).
        const liveKey = kind === 'sysprompt' ? 'name' : 'preset';
        await syncTemplateSelect(client, kind, { ...draft, [liveKey]: name });
      }
      await invalidate();
      setDraft({});
      router.back();
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, dirty, base, draft, name, kind, isSelected, confirmFirstWrite, t]);

  const doSaveCopy = useCallback(async () => {
    if (!client || !copying || !base) return;
    const newName = copying.name.trim();
    if (!newName) return;
    if (byName(templates[kind], newName)) {
      Alert.alert(t('common.error'), t('formatting.nameTaken'));
      return;
    }
    setCopying(null);
    if (!(await confirmFirstWrite())) return;
    setSaving(true);
    try {
      const merged = mergeTemplate(base, draft, newName);
      const ok = await savePreset(client, { apiId: kind, name: newName, preset: merged });
      if (!ok) {
        Alert.alert(t('common.error'), t('formatting.saveFailed'));
        return;
      }
      const finish = async () => {
        await invalidate();
        setDraft({});
        router.back();
      };
      Alert.alert(t('formatting.copySavedTitle'), t('formatting.copySavedMessage', { name: newName }), [
        { text: t('common.close'), onPress: () => void finish() },
        {
          text: t('formatting.useCopy'),
          onPress: () => {
            void (async () => {
              const patch = buildSelectPatch(kind, merged);
              await syncTemplateSelect(client, kind, patch.fields, patch.globals);
              await finish();
            })();
          },
        },
      ]);
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, copying, base, draft, kind, templates, confirmFirstWrite, t]);

  const doDelete = useCallback(() => {
    if (!client) return;
    if (isSelected) {
      Alert.alert(t('formatting.deleteTitle'), t('formatting.deleteBlocked'));
      return;
    }
    Alert.alert(t('formatting.deleteTitle'), t('formatting.deleteConfirm', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await deletePreset(client, { apiId: kind, name });
            if (!ok) {
              Alert.alert(t('common.error'), t('formatting.deleteFailed'));
              return;
            }
            await invalidate();
            setDraft({});
            router.back();
          })();
        },
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isSelected, kind, name, t]);

  const renderField = (field: TemplateField) => {
    const label = t(`formatting.fields.${field.key}`) + (field.key in draft ? ' •' : '');
    const hint = field.hint ? t(`formatting.hints.${field.key}`) : undefined;
    const onLongPress = () => resetField(field);
    switch (field.type) {
      case 'toggle':
        return (
          <ToggleRow
            key={field.key}
            label={label}
            hint={hint}
            value={valueOf(field) === true}
            onChange={(b) => setValue(field.key, b)}
            onLongPress={onLongPress}
          />
        );
      case 'segmented':
        return (
          <SegmentedRow
            key={field.key}
            label={label}
            hint={hint}
            value={valueOf(field) as number | string}
            options={field.options ?? []}
            onChange={(v) => setValue(field.key, v)}
            onLongPress={onLongPress}
          />
        );
      case 'textarea':
        return (
          <TextAreaRow
            key={field.key}
            label={label}
            hint={hint}
            tall={field.tall}
            value={typeof valueOf(field) === 'string' ? (valueOf(field) as string) : ''}
            onChange={(s) => setValue(field.key, s)}
            onLongPress={onLongPress}
          />
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center gap-1 border-b border-border bg-surface px-1 pb-2"
      >
        <IconButton name="back" size="lg" accessibilityLabel={t('a11y.back')} haptic={false} onPress={goBack} />
        <View className="flex-1">
          <AppText variant="h2" numberOfLines={1}>
            {name || t('formatting.title')}
          </AppText>
          <AppText variant="caption" color="muted">
            {t(`formatting.${kind}`)}
            {isSelected ? ` · ${t('formatting.selectedBadge')}` : ''}
          </AppText>
        </View>
        <IconButton
          name="copy"
          accessibilityLabel={t('a11y.copyTemplate')}
          haptic={false}
          disabled={!base || !client}
          onPress={() => setCopying({ name: t('formatting.copyDefaultName', { name }) })}
        />
        <IconButton
          name="delete"
          accessibilityLabel={t('a11y.deleteTemplate')}
          haptic={false}
          disabled={!base || !client}
          onPress={doDelete}
        />
      </View>

      {!client ? (
        <EmptyState icon="tune" title={t('common.notConnected')} />
      ) : !base ? (
        <EmptyState icon="tune" title={templates.isLoading ? t('common.loading') : t('formatting.missing')} />
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <AppText variant="caption" color="subtle" style={{ marginTop: 8 }}>
              {t('genSettings.resetHint')}
            </AppText>
            {TEMPLATE_SECTIONS[kind].map((section) => {
              const sectionFields = fields.filter((f) => f.section === section);
              if (sectionFields.length === 0) return null;
              return (
                <View key={section}>
                  <SectionHeader title={t(`formatting.sections.${section}`)} />
                  <View className="px-1">{sectionFields.map(renderField)}</View>
                </View>
              );
            })}
          </ScrollView>
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="flex-row gap-2 border-t border-border bg-surface px-4 pt-3"
          >
            <View className="flex-1">
              <Button label={t('common.cancel')} variant="secondary" onPress={goBack} />
            </View>
            <View className="flex-1">
              <Button
                label={saving ? t('common.saving') : t('common.save')}
                loading={saving}
                disabled={!dirty || !client}
                onPress={() => void doSave()}
              />
            </View>
          </View>
        </>
      )}

      <Sheet visible={copying != null} onClose={() => setCopying(null)} title={t('formatting.copyTitle')}>
        <View className="px-2 pb-2 pt-1">
          <Field
            value={copying?.name ?? ''}
            onChangeText={(text) => setCopying((c) => (c ? { name: text } : c))}
            autoFocus
            autoCapitalize="none"
          />
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button label={t('common.cancel')} variant="secondary" onPress={() => setCopying(null)} />
            </View>
            <View className="flex-1">
              <Button label={t('common.save')} disabled={!copying?.name.trim()} onPress={() => void doSaveCopy()} />
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}
