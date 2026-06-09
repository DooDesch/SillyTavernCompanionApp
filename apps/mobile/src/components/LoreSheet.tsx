import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WorldInfoEntry } from '@st/core';

export const entryUid = (e: WorldInfoEntry, i: number): string => String(e.uid ?? `i${i}`);

const entryLabel = (e: WorldInfoEntry): string => {
  if (e.comment && e.comment.trim()) return e.comment.trim();
  const keys = (e.key ?? []).filter(Boolean);
  return keys.length ? keys.join(', ') : '(ohne Schlüssel)';
};

/**
 * World Info panel: shows the lorebook entries in play, which would fire for the next reply ("aktiv"),
 * and lets the user mute individual entries (client-side suppression before they reach the prompt).
 */
export function LoreSheet({
  visible,
  entries,
  activeUids,
  disabledUids,
  onToggle,
  onClose,
}: {
  visible: boolean;
  entries: WorldInfoEntry[];
  activeUids: Set<string>;
  disabledUids: Set<string>;
  onToggle: (uid: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          style={{ paddingBottom: Math.max(insets.bottom, 12), maxHeight: '75%' }}
          className="rounded-t-3xl bg-surface px-4 pt-4"
        >
          <Text className="mb-1 text-base font-semibold text-white">Lorebook</Text>
          <Text className="mb-2 text-xs text-muted">
            „Aktiv" = würde bei der nächsten Antwort feuern. Schalter zum Stummschalten einzelner Einträge.
          </Text>
          {entries.length === 0 ? (
            <Text className="py-6 text-center text-muted">Kein Lorebook für diesen Charakter aktiv.</Text>
          ) : (
            <ScrollView className="mb-2">
              {entries.map((e, i) => {
                const uid = entryUid(e, i);
                const active = activeUids.has(uid);
                const enabled = !disabledUids.has(uid);
                return (
                  <View
                    key={uid}
                    className="mb-1.5 flex-row items-center gap-2 rounded-2xl border border-border bg-surface2 px-3 py-2.5"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="flex-1 text-sm font-semibold text-white" numberOfLines={1}>
                          {entryLabel(e)}
                        </Text>
                        {e.constant ? <Text className="text-[10px] text-primary">stets</Text> : null}
                        {active ? (
                          <Text className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">aktiv</Text>
                        ) : null}
                      </View>
                      <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                        {(e.content ?? '').replace(/\s+/g, ' ').slice(0, 80)}
                      </Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={() => onToggle(uid)}
                      trackColor={{ true: '#7c5cff', false: '#3a3a44' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}
          <Pressable onPress={onClose} className="rounded-xl bg-surface2 px-4 py-2.5 active:opacity-70">
            <Text className="text-center font-semibold text-white">Schließen</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
