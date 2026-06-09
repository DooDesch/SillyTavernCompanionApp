import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { deleteChat, getCharacter, getCharacterChats, renameChat } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { Avatar } from '@/components/Avatar';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { nowSendDate } from '@/lib/messages';
import {
  AppText,
  Button,
  Field,
  ListRow,
  SectionHeader,
  Sheet,
  SheetActionRow,
  SkeletonList,
} from '@/components/ui';
import { haptics } from '@/theme/haptics';

function cleanFile(name: string): string {
  return name.replace(/\.jsonl$/i, '');
}

export default function CharacterScreen() {
  const { t } = useTranslation();
  const { avatar } = useLocalSearchParams<{ avatar: string }>();
  const client = useConnection((s) => s.client);
  const avatarUrl = String(avatar);
  const queryClient = useQueryClient();

  const charQuery = useQuery({
    queryKey: ['character', client?.baseUrl, avatarUrl],
    queryFn: () => getCharacter(client!, avatarUrl),
    enabled: !!client,
  });
  const chatsQuery = useQuery({
    queryKey: ['chats', client?.baseUrl, avatarUrl],
    queryFn: () => getCharacterChats(client!, avatarUrl),
    enabled: !!client,
  });

  const baseUrl = useConnection((s) => s.instance?.baseUrl);
  const character = charQuery.data;
  const creator = (character?.data as { creator?: string } | undefined)?.creator?.trim();
  const fullImageUri = baseUrl ? `${baseUrl}/thumbnail?type=avatar&file=${encodeURIComponent(avatarUrl)}` : undefined;
  const [menuFile, setMenuFile] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [renaming, setRenaming] = useState<{ file: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['chats', client?.baseUrl, avatarUrl] });

  const openChat = (file: string) => {
    router.push({ pathname: '/chat/[avatar]/[file]', params: { avatar: avatarUrl, file } });
  };

  const newChat = () => {
    const name = `${character?.name ?? 'Chat'} - ${nowSendDate()}`;
    router.push({ pathname: '/chat/[avatar]/[file]', params: { avatar: avatarUrl, file: name, fresh: '1' } });
  };

  const doDelete = (file: string) => {
    Alert.alert(t('character.deleteTitle'), t('character.deleteConfirm', { name: cleanFile(file) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!client) return;
          const ok = await deleteChat(client, { avatarUrl, chatFile: file });
          if (ok) refresh();
          else Alert.alert(t('common.error'), t('character.deleteFailed'));
        },
      },
    ]);
  };

  const doRename = async () => {
    if (!client || !renaming) return;
    const target = renaming.name.trim();
    const original = renaming.file;
    setRenaming(null);
    if (!target || cleanFile(target) === cleanFile(original)) return;
    const ok = await renameChat(client, { avatarUrl, originalFile: original, renamedFile: target });
    if (ok) refresh();
    else Alert.alert(t('common.error'), t('character.renameFailed'));
  };

  const description = character?.description?.trim();

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ title: character?.name ?? t('character.fallbackTitle'), headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {character ? (
          <View className="mb-5 items-center">
            <Pressable onPress={() => setShowImage(true)} className="active:opacity-80">
              <Avatar avatar={avatarUrl} name={character.name} size={128} ring />
            </Pressable>
            <AppText variant="h1" style={{ marginTop: 14, textAlign: 'center' }}>
              {character.name}
            </AppText>
            {creator ? (
              <AppText variant="caption" color="subtle" style={{ marginTop: 2 }}>
                {t('character.byCreator', { creator })}
              </AppText>
            ) : null}
            {description ? (
              <Pressable onPress={() => setExpanded((e) => !e)} className="mt-4 active:opacity-70">
                <AppText variant="body" color="muted" numberOfLines={expanded ? undefined : 6} style={{ textAlign: 'center' }}>
                  {description}
                </AppText>
                {description.length > 180 ? (
                  <AppText variant="label" color="accent" style={{ marginTop: 6, textAlign: 'center' }}>
                    {expanded ? t('character.readLess') : t('character.readMore')}
                  </AppText>
                ) : null}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="mb-5 items-center gap-3 py-6">
            <Avatar avatar={avatarUrl} name="?" size={128} />
          </View>
        )}

        <Button label={t('character.newChat')} leftIcon="plus" onPress={newChat} />

        <SectionHeader title={t('character.savedChats')} />

        {chatsQuery.isLoading ? (
          <SkeletonList count={3} />
        ) : chatsQuery.data && chatsQuery.data.length > 0 ? (
          <View className="gap-2">
            {chatsQuery.data.map((chat) => {
              const file = cleanFile(chat.file_name);
              const preview = typeof chat['mes'] === 'string' ? String(chat['mes']) : undefined;
              return (
                <ListRow
                  key={chat.file_name}
                  title={file}
                  subtitle={preview}
                  subtitleLines={1}
                  chevron
                  onPress={() => openChat(file)}
                  onLongPress={() => {
                    haptics.impact();
                    setMenuFile(chat.file_name);
                  }}
                />
              );
            })}
          </View>
        ) : (
          <AppText variant="body" color="muted">
            {t('character.noChats')}
          </AppText>
        )}

        <AppText variant="caption" color="subtle" style={{ marginTop: 12 }}>
          {t('character.longPressHint')}
        </AppText>
      </ScrollView>

      {/* Chat action menu */}
      <Sheet visible={menuFile != null} onClose={() => setMenuFile(null)}>
        <SheetActionRow
          icon="chats"
          label={t('character.open')}
          onPress={() => {
            const f = menuFile;
            setMenuFile(null);
            if (f) openChat(cleanFile(f));
          }}
        />
        <SheetActionRow
          icon="edit"
          label={t('character.rename')}
          onPress={() => {
            const f = menuFile;
            setMenuFile(null);
            if (f) setRenaming({ file: f, name: cleanFile(f) });
          }}
        />
        <SheetActionRow
          icon="delete"
          label={t('common.delete')}
          destructive
          onPress={() => {
            const f = menuFile;
            setMenuFile(null);
            if (f) doDelete(f);
          }}
        />
      </Sheet>

      {/* Rename */}
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
              <Button label={t('common.save')} onPress={doRename} />
            </View>
          </View>
        </View>
      </Sheet>

      <ImageViewerModal visible={showImage} uri={fullImageUri} onClose={() => setShowImage(false)} />
    </View>
  );
}
