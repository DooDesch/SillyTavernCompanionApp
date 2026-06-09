import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

/** A bottom-sheet style single-select picker (scales to many options). */
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
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          style={{ paddingBottom: Math.max(insets.bottom, 12), maxHeight: '75%' }}
          className="rounded-t-3xl bg-surface px-2 pt-3"
        >
          <Text className="mb-2 px-3 text-base font-semibold text-white">{title}</Text>
          <ScrollView>
            {options.length === 0 && (
              <Text className="px-3 py-4 text-muted">Keine Einträge.</Text>
            )}
            {options.map((o) => {
              const active = o.id === activeId;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    onSelect(o.id);
                    onClose();
                  }}
                  className={`mb-1 rounded-xl px-3 py-3 active:bg-surface2 ${active ? 'bg-surface2' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-base text-white" numberOfLines={1}>
                      {o.label}
                    </Text>
                    {active && <Text className="ml-2 text-base text-primary">●</Text>}
                  </View>
                  {!!o.sublabel && (
                    <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                      {o.sublabel}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
