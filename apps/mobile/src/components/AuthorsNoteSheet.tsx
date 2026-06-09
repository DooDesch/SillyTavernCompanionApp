import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet, AppText, Button } from './ui';
import { colors, fonts } from '@/theme/tokens';
import { haptics } from '@/theme/haptics';

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
    <Sheet visible={visible} onClose={onClose} title={t('authorsNote.title')}>
      <View className="px-2 pb-1">
        <AppText variant="caption" color="muted" style={{ marginBottom: 10 }}>
          {t('authorsNote.description')}
        </AppText>
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          placeholder={t('authorsNote.placeholder')}
          placeholderTextColor={colors.textSubtle}
          className="rounded-field border border-border bg-surface-2 px-4 py-3 text-text"
          style={{ fontFamily: fonts.regular, fontSize: 16, minHeight: 96, maxHeight: 180, textAlignVertical: 'top' }}
        />
        <View className="mt-3 flex-row items-center gap-3">
          <AppText variant="label" color="muted">
            {t('authorsNote.depth')}
          </AppText>
          <TextInput
            value={depth}
            onChangeText={setDepth}
            keyboardType="number-pad"
            className="w-16 rounded-field border border-border bg-surface-2 text-center text-text"
            style={{ fontFamily: fonts.regular, fontSize: 16, height: 44 }}
          />
          <View className="flex-1 flex-row justify-end gap-1.5">
            {ROLES.map((r) => (
              <Pressable
                key={r.v}
                onPress={() => {
                  haptics.selection();
                  setRole(r.v);
                }}
                className={`rounded-field px-3 py-2 ${role === r.v ? 'bg-accent' : 'border border-border bg-surface-2'}`}
              >
                <AppText variant="label" color={role === r.v ? 'onAccent' : 'muted'}>
                  {t(r.labelKey)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
          </View>
          <View className="flex-1">
            <Button
              label={t('common.save')}
              onPress={() => onSave({ content, depth: Math.max(0, parseInt(depth, 10) || 0), role })}
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}
