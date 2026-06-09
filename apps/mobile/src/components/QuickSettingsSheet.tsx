import { useEffect, useState } from 'react';
import { Modal, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EngineConfig, StClient } from '@st/core';
import { syncOai, syncRoot, syncTextgen } from '@/lib/sync';

/**
 * The few generation knobs worth tweaking from the phone (temperature, response length, context size,
 * streaming). Writes back to the desktop settings (read-modify-write) - the full preset editor stays
 * desktop-only, by design.
 */
function Field({
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
      <Text className="text-base text-white">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        className="w-28 rounded-xl bg-surface2 px-3 py-2 text-center text-base text-white"
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
  const insets = useSafeAreaInsets();
  const kbVisible = useKeyboardState((s) => s.isVisible);
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          style={{ paddingBottom: kbVisible ? 12 : Math.max(insets.bottom, 12) }}
          className="rounded-t-3xl bg-surface px-4 pt-4"
        >
          <Text className="mb-3 text-base font-semibold text-white">Generierung</Text>
          <Field label="Temperatur" value={temp} onChange={setTemp} />
          <Field label="Antwortlänge (Tokens)" value={resp} onChange={setResp} keyboard="number-pad" />
          <Field label="Kontextgröße (Tokens)" value={ctx} onChange={setCtx} keyboard="number-pad" />
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-base text-white">Streaming</Text>
            <Switch value={stream} onValueChange={setStream} trackColor={{ true: '#7c5cff', false: '#3a3a44' }} thumbColor="#ffffff" />
          </View>
          <Text className="mt-1 text-xs text-muted">Wird auf SillyTavern (PC) gespeichert.</Text>
          <View className="mt-3 flex-row justify-end gap-2">
            <Pressable onPress={onClose} className="rounded-xl px-4 py-2">
              <Text className="text-muted">Abbrechen</Text>
            </Pressable>
            <Pressable onPress={save} disabled={saving} className="rounded-xl bg-primary px-4 py-2 disabled:opacity-50">
              <Text className="font-semibold text-white">{saving ? 'Speichert…' : 'Speichern'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
