import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet, AppText } from './ui';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';
import { haptics } from '@/theme/haptics';

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

/** A bottom-sheet single-select picker (scales to many options). */
export function PickerSheet({
  visible,
  title,
  options,
  activeId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  activeId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 380 }} className="px-1">
        {options.length === 0 ? (
          <AppText variant="body" color="muted" style={{ padding: 16 }}>
            {t('sheets.pickerEmpty')}
          </AppText>
        ) : null}
        {options.map((o) => {
          const active = o.id === activeId;
          return (
            <Pressable
              key={o.id}
              onPress={() => {
                haptics.selection();
                onSelect(o.id);
                onClose();
              }}
              className={`mb-1 rounded-2xl px-3 py-3 active:bg-surface-2 ${active ? 'bg-surface-2' : ''}`}
            >
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1">
                  <AppText variant="bodyLg" numberOfLines={1}>
                    {o.label}
                  </AppText>
                  {o.sublabel ? (
                    <AppText variant="caption" color="subtle" numberOfLines={1} style={{ marginTop: 2 }}>
                      {o.sublabel}
                    </AppText>
                  ) : null}
                </View>
                {active ? <Icon name="check" size={18} color={colors.accent} /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}
