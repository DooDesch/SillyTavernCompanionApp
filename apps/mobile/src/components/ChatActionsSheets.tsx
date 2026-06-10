import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { deleteChat, renameChat } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { Button, Field, Sheet, SheetActionRow } from '@/components/ui';

export interface ChatTarget {
  avatar: string;
  /** Chat file name, with or without .jsonl (endpoints normalize). */
  file: string;
}

function cleanFile(name: string): string {
  return name.replace(/\.jsonl$/i, '');
}

/**
 * Shared open/rename/delete sheets for a chat file - used by the character page AND the
 * chats tab. Mutations invalidate every chat-related query family ('charchats' for the
 * lists, 'characters' for the latest-chat pointers), so all screens update immediately.
 */
export function ChatActionsSheets({ target, onClose }: { target: ChatTarget | null; onClose: () => void }) {
  const { t } = useTranslation();
  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState<ChatTarget & { name: string } | null>(null);

  // A new long-press replaces any half-finished rename for a different chat.
  useEffect(() => {
    if (target) setRenaming(null);
  }, [target]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['charchats'] });
    void queryClient.invalidateQueries({ queryKey: ['characters'] });
  };

  const openChat = (tgt: ChatTarget) => {
    router.push({ pathname: '/chat/[avatar]/[file]', params: { avatar: tgt.avatar, file: cleanFile(tgt.file) } });
  };

  const doDelete = (tgt: ChatTarget) => {
    Alert.alert(t('character.deleteTitle'), t('character.deleteConfirm', { name: cleanFile(tgt.file) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!client) return;
          const ok = await deleteChat(client, { avatarUrl: tgt.avatar, chatFile: tgt.file });
          if (ok) invalidate();
          else Alert.alert(t('common.error'), t('character.deleteFailed'));
        },
      },
    ]);
  };

  const doRename = async () => {
    if (!client || !renaming) return;
    const name = renaming.name.trim();
    const original = renaming.file;
    const avatar = renaming.avatar;
    setRenaming(null);
    if (!name || cleanFile(name) === cleanFile(original)) return;
    const ok = await renameChat(client, { avatarUrl: avatar, originalFile: original, renamedFile: name });
    if (ok) invalidate();
    else Alert.alert(t('common.error'), t('character.renameFailed'));
  };

  return (
    <>
      <Sheet visible={target != null} onClose={onClose}>
        <SheetActionRow
          icon="chats"
          label={t('character.open')}
          onPress={() => {
            const tgt = target;
            onClose();
            if (tgt) openChat(tgt);
          }}
        />
        <SheetActionRow
          icon="edit"
          label={t('character.rename')}
          onPress={() => {
            const tgt = target;
            onClose();
            if (tgt) setRenaming({ ...tgt, name: cleanFile(tgt.file) });
          }}
        />
        <SheetActionRow
          icon="delete"
          label={t('common.delete')}
          destructive
          onPress={() => {
            const tgt = target;
            onClose();
            if (tgt) doDelete(tgt);
          }}
        />
      </Sheet>

      <Sheet visible={renaming != null} onClose={() => setRenaming(null)} title={t('character.renameTitle')}>
        <View className="px-2 pb-2 pt-1">
          <Field
            value={renaming?.name ?? ''}
            onChangeText={(text) => setRenaming((r) => (r ? { ...r, name: text } : r))}
            autoFocus
            autoCapitalize="none"
          />
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button label={t('common.cancel')} variant="secondary" onPress={() => setRenaming(null)} />
            </View>
            <View className="flex-1">
              <Button label={t('common.save')} onPress={() => void doRename()} />
            </View>
          </View>
        </View>
      </Sheet>
    </>
  );
}
