import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export interface AuthorsNoteValue {
  content: string;
  depth: number;
  role: number; // 0=system, 1=user, 2=assistant
}

const ROLES = [
  { v: 0, labelKey: 'authorsNote.roleSystem' },
  { v: 1, labelKey: 'authorsNote.roleUser' },
  { v: 2, labelKey: 'authorsNote.roleAi' },
];

/** Per-chat Author's Note editor. Injected in-chat at the configured depth (uses the @depth pipeline). */
export function AuthorsNoteSheet({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: AuthorsNoteValue;
  onSave: (v: AuthorsNoteValue) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const kbVisible = useKeyboardState((s) => s.isVisible);
  const [content, setContent] = useState(initial.content);
  const [depth, setDepth] = useState(String(initial.depth));
  const [role, setRole] = useState(initial.role);

  useEffect(() => {
    if (visible) {
      setContent(initial.content);
      setDepth(String(initial.depth));
      setRole(initial.role);
    }
  }, [visible, initial.content, initial.depth, initial.role]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          style={{ paddingBottom: kbVisible ? 12 : Math.max(insets.bottom, 12) }}
          className="rounded-t-3xl bg-surface px-4 pt-4"
        >
          <Text className="mb-1 text-base font-semibold text-white">{t('authorsNote.title')}</Text>
          <Text className="mb-2 text-xs text-muted">
            {t('authorsNote.description')}
          </Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            placeholder={t('authorsNote.placeholder')}
            placeholderTextColor="#5a5a68"
            className="max-h-48 rounded-2xl bg-surface2 px-4 py-3 text-base text-white"
          />
          <View className="mt-3 flex-row items-center gap-3">
            <Text className="text-sm text-muted">{t('authorsNote.depth')}</Text>
            <TextInput
              value={depth}
              onChangeText={setDepth}
              keyboardType="number-pad"
              className="w-16 rounded-xl bg-surface2 px-3 py-2 text-center text-base text-white"
            />
            <View className="flex-1 flex-row justify-end gap-1">
              {ROLES.map((r) => (
                <Pressable
                  key={r.v}
                  onPress={() => setRole(r.v)}
                  className={`rounded-xl px-3 py-2 ${role === r.v ? 'bg-primary' : 'bg-surface2'}`}
                >
                  <Text className={role === r.v ? 'text-white' : 'text-muted'}>{t(r.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="mt-3 flex-row justify-end gap-2">
            <Pressable onPress={onClose} className="rounded-xl px-4 py-2">
              <Text className="text-muted">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave({ content, depth: Math.max(0, parseInt(depth, 10) || 0), role })}
              className="rounded-xl bg-primary px-4 py-2"
            >
              <Text className="font-semibold text-white">{t('common.save')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
