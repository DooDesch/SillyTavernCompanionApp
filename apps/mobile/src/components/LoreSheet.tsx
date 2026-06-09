import { ScrollView, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { WorldInfoEntry } from '@st/core';
import { Sheet, AppText, Badge } from './ui';
import { colors } from '@/theme/tokens';

export const entryUid = (e: WorldInfoEntry, i: number): string => String(e.uid ?? `i${i}`);

const entryLabel = (e: WorldInfoEntry): string => {
  if (e.comment && e.comment.trim()) return e.comment.trim();
  const keys = (e.key ?? []).filter(Boolean);
  return keys.length ? keys.join(', ') : i18n.t('lore.noKeys');
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
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('lore.title')}>
      <View className="px-2 pb-1">
        <AppText variant="caption" color="muted" style={{ marginBottom: 10 }}>
          {t('lore.description')}
        </AppText>
        {entries.length === 0 ? (
          <AppText variant="body" color="muted" style={{ paddingVertical: 24, textAlign: 'center' }}>
            {t('lore.empty')}
          </AppText>
        ) : (
          <ScrollView style={{ maxHeight: 420 }}>
            {entries.map((e, i) => {
              const uid = entryUid(e, i);
              const active = activeUids.has(uid);
              const enabled = !disabledUids.has(uid);
              return (
                <View
                  key={uid}
                  className="mb-2 flex-row items-center gap-2 rounded-card border border-border bg-surface-2 px-3 py-2.5"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <AppText variant="title" numberOfLines={1} style={{ flex: 1 }}>
                        {entryLabel(e)}
                      </AppText>
                      {e.constant ? <Badge label={t('lore.constant')} tone="neutral" /> : null}
                      {active ? <Badge label={t('lore.active')} tone="accent" dot /> : null}
                    </View>
                    <AppText variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                      {(e.content ?? '').replace(/\s+/g, ' ').slice(0, 80)}
                    </AppText>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={() => onToggle(uid)}
                    trackColor={{ true: colors.accent, false: colors.surface3 }}
                    thumbColor={colors.onAccent}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Sheet>
  );
}
