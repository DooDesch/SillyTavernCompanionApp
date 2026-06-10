import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnection } from '@/stores/connectionStore';
import { useEngineConfig } from '@/hooks/useEngineConfig';
import { syncGeneration } from '@/lib/sync';
import { secrets } from '@/lib/storage';
import {
  GEN_FIELDS,
  GEN_SECTIONS,
  KOBOLDCPP_ORDER,
  SAMPLER_LABELS,
  settingsKey,
  type GenField,
} from '@/lib/genSettingsSchema';
import { ToggleRow, TextAreaRow, SegmentedRow, OrderListRow, CollapsibleHeader } from '@/components/form/rows';
import { AppText, Button, EmptyState, Field, IconButton, SliderRow, StepperRow } from '@/components/ui';
import { haptics } from '@/theme/haptics';
import { colors } from '@/theme/tokens';

const WARNED_KEY = 'prefs.genSettingsWarned';
const OPEN_BY_DEFAULT = new Set(['tokens', 'sampling']);

/**
 * Full generation-settings editor with SillyTavern parity (every sampler the desktop
 * frontend exposes for the active backend mode). Data-driven from GEN_FIELDS; the draft
 * holds ONLY touched fields, so saving writes diff-only patches and stale screen values
 * can never clobber newer desktop edits of untouched fields.
 */
export default function GenerationSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const { engine } = useEngineConfig('');
  const mode = engine?.mode ?? 'tc';

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [open, setOpen] = useState<Set<string>>(new Set(OPEN_BY_DEFAULT));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const fields = useMemo(() => GEN_FIELDS.filter((f) => f.mode === 'both' || f.mode === mode), [mode]);
  const dirty = Object.keys(draft).length > 0;

  const initialValue = useCallback(
    (field: GenField): unknown => {
      if (!engine) return undefined;
      if (field.target === 'root') {
        return field.key === 'amount_gen' ? engine.maxTokens : engine.maxContext;
      }
      const bag = (field.target === 'textgen' ? engine.textgen : engine.oai) as Record<string, unknown>;
      return bag?.[settingsKey(field)];
    },
    [engine],
  );

  const valueOf = useCallback(
    (field: GenField): unknown => (field.key in draft ? draft[field.key] : initialValue(field) ?? field.def),
    [draft, initialValue],
  );

  const setValue = useCallback((key: string, v: unknown) => {
    setDraft((d) => ({ ...d, [key]: v }));
  }, []);

  const resetField = useCallback(
    (field: GenField) => {
      haptics.tap();
      setValue(field.key, field.def);
    },
    [setValue],
  );

  const jsonError = useCallback(
    (field: GenField): string | undefined => {
      if (!field.jsonArray) return undefined;
      const v = valueOf(field);
      if (typeof v !== 'string' || !v.trim()) return undefined;
      try {
        const parsed: unknown = JSON.parse(v);
        return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')
          ? undefined
          : t('genSettings.invalidJson');
      } catch {
        return t('genSettings.invalidJson');
      }
    },
    [valueOf, t],
  );

  const hasJsonError = fields.some((f) => f.key in draft && jsonError(f));

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

  const doSave = useCallback(async () => {
    if (!client || !dirty || hasJsonError) return;
    const warned = await secrets.get(WARNED_KEY).catch(() => '1');
    if (warned !== '1') {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(t('genSettings.writeWarningTitle'), t('genSettings.writeWarning'), [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('common.save'), onPress: () => resolve(true) },
        ]);
      });
      if (!ok) return;
      void secrets.set(WARNED_KEY, '1').catch(() => {});
    }
    setSaving(true);
    try {
      const patches: { textgen: Record<string, unknown>; oai: Record<string, unknown>; root: Record<string, unknown> } = {
        textgen: {},
        oai: {},
        root: {},
      };
      for (const field of fields) {
        if (!(field.key in draft)) continue;
        patches[field.target][settingsKey(field)] = draft[field.key];
      }
      const ok = await syncGeneration(client, patches);
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['settings'] });
        setDraft({});
        router.back();
      } else {
        Alert.alert(t('common.error'), t('genSettings.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  }, [client, dirty, hasJsonError, fields, draft, queryClient, t]);

  const save = useCallback(() => {
    void doSave();
  }, [doSave]);

  const visible = useCallback(
    (field: GenField): boolean => {
      if (!field.showIf) return true;
      const dep = fields.find((f) => f.key === field.showIf!.key);
      const depValue = dep ? valueOf(dep) : undefined;
      if (field.showIf.equals === 'nonzero') return depValue !== 0 && depValue !== undefined;
      return depValue === field.showIf.equals;
    },
    [fields, valueOf],
  );

  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (field: GenField) => !q || t(`genSettings.fields.${field.key}`).toLowerCase().includes(q),
    [q, t],
  );

  const renderField = (field: GenField) => {
    const label = t(`genSettings.fields.${field.key}`) + (field.key in draft ? ' •' : '');
    const hint = field.hint ? t(`genSettings.hints.${field.key}`) : undefined;
    const onLongPress = () => resetField(field);
    switch (field.type) {
      case 'slider': {
        const v = valueOf(field);
        return (
          <View key={field.key}>
            {hint ? (
              <AppText variant="caption" color="subtle" style={{ marginBottom: 2 }}>
                {hint}
              </AppText>
            ) : null}
            <SliderRow
              label={label}
              value={typeof v === 'number' ? v : null}
              min={field.min ?? 0}
              max={field.max ?? 1}
              step={field.step ?? 0.01}
              decimals={field.decimals ?? 0}
              hardMin={field.hardMin ?? field.min ?? 0}
              hardMax={field.hardMax ?? field.max ?? 1}
              onChange={(n) => setValue(field.key, n)}
            />
          </View>
        );
      }
      case 'stepper': {
        const v = valueOf(field);
        return (
          <View key={field.key}>
            {hint ? (
              <AppText variant="caption" color="subtle" style={{ marginBottom: 2 }}>
                {hint}
              </AppText>
            ) : null}
            <StepperRow
              label={label}
              value={typeof v === 'number' ? v : null}
              values={field.presets ?? []}
              min={field.hardMin ?? field.min ?? 1}
              onChange={(n) => setValue(field.key, n)}
            />
          </View>
        );
      }
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
      case 'textarea':
        return (
          <TextAreaRow
            key={field.key}
            label={label}
            hint={hint}
            value={typeof valueOf(field) === 'string' ? (valueOf(field) as string) : ''}
            error={field.key in draft ? jsonError(field) : undefined}
            onChange={(s) => setValue(field.key, s)}
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
      case 'order': {
        const v = valueOf(field);
        return (
          <OrderListRow
            key={field.key}
            label={label}
            hint={hint}
            value={Array.isArray(v) ? (v as number[]) : KOBOLDCPP_ORDER}
            itemLabels={SAMPLER_LABELS}
            onChange={(arr) => setValue(field.key, arr)}
            onLongPress={onLongPress}
          />
        );
      }
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
            {t('genSettings.title')}
          </AppText>
          <AppText variant="caption" color="muted">
            {mode === 'cc' ? t('settings.chatCompletion') : t('settings.textCompletion')}
          </AppText>
        </View>
      </View>

      {!engine ? (
        <EmptyState icon="tune" title={t('genSettings.notConnected')} />
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="mt-3">
              <Field
                value={query}
                onChangeText={setQuery}
                placeholder={t('genSettings.search')}
                accessibilityLabel={t('a11y.search')}
              />
              <AppText variant="caption" color="subtle" style={{ marginTop: 6 }}>
                {t('genSettings.resetHint')}
              </AppText>
            </View>
            {GEN_SECTIONS.map((section) => {
              const sectionFields = fields.filter((f) => f.section === section && matches(f) && visible(f));
              if (sectionFields.length === 0) return null;
              const isOpen = !!q || open.has(section);
              return (
                <View key={section}>
                  <CollapsibleHeader
                    title={t(`genSettings.sections.${section}`)}
                    open={isOpen}
                    onToggle={() =>
                      setOpen((prev) => {
                        const next = new Set(prev);
                        if (next.has(section)) next.delete(section);
                        else next.add(section);
                        return next;
                      })
                    }
                  />
                  {isOpen ? <View className="mt-3 px-1">{sectionFields.map(renderField)}</View> : null}
                </View>
              );
            })}
            <AppText variant="caption" color="subtle" style={{ marginTop: 12 }}>
              {t('quickSettings.savedNotice')}
            </AppText>
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
                disabled={!dirty || hasJsonError || !client}
                onPress={save}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}
