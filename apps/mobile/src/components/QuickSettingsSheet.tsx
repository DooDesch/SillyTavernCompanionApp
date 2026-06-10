import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import type { EngineConfig, StClient } from '@st/core';
import { syncOai, syncRoot, syncTextgen } from '@/lib/sync';
import { usePrefs } from '@/stores/prefsStore';
import { Sheet, SheetActionRow, AppText, Button, SliderRow, StepperRow } from './ui';
import { colors } from '@/theme/tokens';

const CONTEXT_PRESETS = [2048, 4096, 8192, 16384, 32768, 65536, 131072];

/**
 * The few generation knobs worth tweaking from the phone (temperature, response length, context size,
 * streaming). Writes back to the desktop settings (read-modify-write) - the full preset editor stays
 * desktop-only, by design. Values start as `null` when the engine doesn't expose them and are only
 * patched once the user actually touches them (non-destructive for desktop values outside our ranges).
 */
export function QuickSettingsSheet({
  visible,
  engine,
  client,
  onClose,
  onSaved,
}: {
  visible: boolean;
  engine: EngineConfig | null;
  client: StClient | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const smoothStreaming = usePrefs((s) => s.smoothStreaming);
  const setSmoothStreaming = usePrefs((s) => s.setSmoothStreaming);
  const isCc = engine?.mode === 'cc';
  const tg = (engine?.textgen ?? {}) as Record<string, unknown>;
  const oai = engine?.oai;

  const curTemp = isCc ? oai?.temp_openai : (tg.temp as number | undefined);
  const curResp = isCc ? oai?.openai_max_tokens ?? engine?.maxTokens : engine?.maxTokens;
  const curCtx = isCc ? oai?.openai_max_context ?? engine?.maxContext : engine?.maxContext;
  const curStream = isCc ? oai?.stream_openai !== false : (tg.streaming as boolean | undefined) !== false;

  const [temp, setTemp] = useState<number | null>(null);
  const [resp, setResp] = useState<number | null>(null);
  const [ctx, setCtx] = useState<number | null>(null);
  const [stream, setStream] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTemp(typeof curTemp === 'number' ? curTemp : null);
      setResp(typeof curResp === 'number' ? curResp : null);
      setCtx(typeof curCtx === 'number' ? curCtx : null);
      setStream(curStream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = async () => {
    if (!client || !engine) return;
    setSaving(true);
    try {
      if (isCc) {
        const patch: Record<string, unknown> = { stream_openai: stream };
        if (temp != null) patch.temp_openai = temp;
        if (resp != null) patch.openai_max_tokens = resp;
        if (ctx != null) patch.openai_max_context = ctx;
        await syncOai(client, patch);
      } else {
        const tgPatch: Record<string, unknown> = { streaming: stream };
        if (temp != null) tgPatch.temp = temp;
        await syncTextgen(client, tgPatch);
        const rootPatch: Record<string, unknown> = {};
        if (resp != null) rootPatch.amount_gen = resp;
        if (ctx != null) rootPatch.max_context = ctx;
        if (Object.keys(rootPatch).length) await syncRoot(client, rootPatch);
      }
      onSaved();
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('quickSettings.title')}>
      <View className="px-2 pb-1 pt-1">
        <SliderRow
          label={t('quickSettings.temperature')}
          value={temp}
          min={0}
          max={2}
          step={0.05}
          decimals={2}
          hardMax={5}
          onChange={setTemp}
        />
        <SliderRow
          label={t('quickSettings.responseLength')}
          value={resp}
          min={16}
          max={2048}
          step={16}
          hardMax={32768}
          onChange={setResp}
        />
        <StepperRow label={t('quickSettings.contextSize')} value={ctx} values={CONTEXT_PRESETS} onChange={setCtx} />
        <View className="mb-3">
          <View className="flex-row items-center justify-between">
            <AppText variant="bodyLg">{t('quickSettings.streaming')}</AppText>
            <Switch
              value={stream}
              onValueChange={setStream}
              trackColor={{ true: colors.accent, false: colors.surface3 }}
              thumbColor={colors.onAccent}
            />
          </View>
          <AppText variant="caption" color="subtle" style={{ marginTop: 2, paddingRight: 56 }}>
            {t('quickSettings.streamingHint')}
          </AppText>
        </View>
        {/* Device-local render preference: applies immediately, never synced to the desktop. */}
        <View className="mb-1">
          <View className="flex-row items-center justify-between">
            <AppText variant="bodyLg">{t('quickSettings.smoothStreaming')}</AppText>
            <Switch
              value={smoothStreaming}
              onValueChange={setSmoothStreaming}
              trackColor={{ true: colors.accent, false: colors.surface3 }}
              thumbColor={colors.onAccent}
            />
          </View>
          <AppText variant="caption" color="subtle" style={{ marginTop: 2, paddingRight: 56 }}>
            {t('quickSettings.smoothStreamingHint')}
          </AppText>
        </View>
        <AppText variant="caption" color="subtle" style={{ marginTop: 4 }}>
          {t('quickSettings.savedNotice')}
        </AppText>
        <View className="-mx-2 mt-2 border-t border-border pt-1">
          <SheetActionRow
            icon="tune"
            label={t('quickSettings.allSettings')}
            onPress={() => {
              onClose();
              router.push('/settings/generation');
            }}
          />
        </View>
        <View className="mt-2 flex-row gap-2">
          <View className="flex-1">
            <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
          </View>
          <View className="flex-1">
            <Button label={saving ? t('common.saving') : t('common.save')} loading={saving} onPress={save} />
          </View>
        </View>
      </View>
    </Sheet>
  );
}
