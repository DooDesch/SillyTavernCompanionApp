import { useEffect, useState } from 'react';
import { Switch, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { EngineConfig, StClient } from '@st/core';
import { syncOai, syncRoot, syncTextgen } from '@/lib/sync';
import { Sheet, AppText, Button } from './ui';
import { colors, fonts } from '@/theme/tokens';

/**
 * The few generation knobs worth tweaking from the phone (temperature, response length, context size,
 * streaming). Writes back to the desktop settings (read-modify-write) - the full preset editor stays
 * desktop-only, by design.
 */
function NumRow({
  label,
  value,
  onChange,
  keyboard = 'decimal-pad',
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  keyboard?: 'decimal-pad' | 'number-pad';
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <AppText variant="bodyLg">{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        className="w-28 rounded-field border border-border bg-surface-2 text-center text-text"
        style={{ fontFamily: fonts.regular, fontSize: 16, height: 44 }}
      />
    </View>
  );
}

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
  const isCc = engine?.mode === 'cc';
  const tg = (engine?.textgen ?? {}) as Record<string, unknown>;
  const oai = engine?.oai;

  const curTemp = isCc ? oai?.temp_openai : (tg.temp as number | undefined);
  const curResp = isCc ? oai?.openai_max_tokens ?? engine?.maxTokens : engine?.maxTokens;
  const curCtx = isCc ? oai?.openai_max_context ?? engine?.maxContext : engine?.maxContext;
  const curStream = isCc ? oai?.stream_openai !== false : (tg.streaming as boolean | undefined) !== false;

  const [temp, setTemp] = useState('');
  const [resp, setResp] = useState('');
  const [ctx, setCtx] = useState('');
  const [stream, setStream] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTemp(curTemp != null ? String(curTemp) : '');
      setResp(curResp != null ? String(curResp) : '');
      setCtx(curCtx != null ? String(curCtx) : '');
      setStream(curStream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = async () => {
    if (!client || !engine) return;
    setSaving(true);
    const tempN = parseFloat(temp);
    const respN = parseInt(resp, 10);
    const ctxN = parseInt(ctx, 10);
    try {
      if (isCc) {
        const patch: Record<string, unknown> = { stream_openai: stream };
        if (!Number.isNaN(tempN)) patch.temp_openai = tempN;
        if (!Number.isNaN(respN)) patch.openai_max_tokens = respN;
        if (!Number.isNaN(ctxN)) patch.openai_max_context = ctxN;
        await syncOai(client, patch);
      } else {
        const tgPatch: Record<string, unknown> = { streaming: stream };
        if (!Number.isNaN(tempN)) tgPatch.temp = tempN;
        await syncTextgen(client, tgPatch);
        const rootPatch: Record<string, unknown> = {};
        if (!Number.isNaN(respN)) rootPatch.amount_gen = respN;
        if (!Number.isNaN(ctxN)) rootPatch.max_context = ctxN;
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
        <NumRow label={t('quickSettings.temperature')} value={temp} onChange={setTemp} />
        <NumRow label={t('quickSettings.responseLength')} value={resp} onChange={setResp} keyboard="number-pad" />
        <NumRow label={t('quickSettings.contextSize')} value={ctx} onChange={setCtx} keyboard="number-pad" />
        <View className="mb-1 flex-row items-center justify-between">
          <AppText variant="bodyLg">{t('quickSettings.streaming')}</AppText>
          <Switch
            value={stream}
            onValueChange={setStream}
            trackColor={{ true: colors.accent, false: colors.surface3 }}
            thumbColor={colors.onAccent}
          />
        </View>
        <AppText variant="caption" color="subtle" style={{ marginTop: 4 }}>
          {t('quickSettings.savedNotice')}
        </AppText>
        <View className="mt-4 flex-row gap-2">
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
