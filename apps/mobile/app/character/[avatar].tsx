import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteChat, getCharacter, getCharacterChats, renameChat } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { Avatar } from '@/components/Avatar';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { nowSendDate } from '@/lib/messages';

function cleanFile(name: string): string {
  return name.replace(/\.jsonl$/i, '');
}

export default function CharacterScreen() {
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

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['chats', client?.baseUrl, avatarUrl] });

  const openChat = (file: string) => {
    router.push({ pathname: '/chat/[avatar]/[file]', params: { avatar: avatarUrl, file } });
  };

  const newChat = () => {
    const name = `${character?.name ?? 'Chat'} - ${nowSendDate()}`;
    router.push({
      pathname: '/chat/[avatar]/[file]',
      params: { avatar: avatarUrl, file: name, fresh: '1' },
    });
  };

  const doDelete = (file: string) => {
    Alert.alert('Chat löschen', `„${cleanFile(file)}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          if (!client) return;
          const ok = await deleteChat(client, { avatarUrl, chatFile: file });
          if (ok) refresh();
          else Alert.alert('Fehler', 'Chat konnte nicht gelöscht werden.');
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
    else Alert.alert('Fehler', 'Chat konnte nicht umbenannt werden (Name evtl. vergeben).');
  };

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ title: character?.name ?? 'Charakter', headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {character && (
          <View className="mb-4">
            <View className="items-center">
              <Pressable onPress={() => setShowImage(true)} className="active:opacity-80">
                <Avatar avatar={avatarUrl} name={character.name} size={140} />
              </Pressable>
              <Text className="mt-3 text-center text-xl font-bold text-white">{character.name}</Text>
              {!!creator && <Text className="mt-0.5 text-xs text-muted">von {creator}</Text>}
            </View>
            {!!character.description && (
              <Text className="mt-3 text-sm text-muted" numberOfLines={8}>
                {character.description}
              </Text>
            )}
          </View>
        )}

        <Pressable onPress={newChat} className="mb-5 rounded-2xl bg-primary px-4 py-3 active:opacity-80">
          <Text className="text-center text-base font-semibold text-white">+ Neuer Chat</Text>
        </Pressable>

        <Text className="mb-2 text-sm uppercase tracking-wide text-muted">Gespeicherte Chats</Text>

        {chatsQuery.isLoading && <ActivityIndicator color="#7c5cff" />}
        {chatsQuery.data?.length === 0 && (
          <Text className="text-muted">Noch keine Chats. Starte einen neuen.</Text>
        )}
        {chatsQuery.data?.map((chat) => {
          const file = cleanFile(chat.file_name);
          return (
            <Pressable
              key={chat.file_name}
              onPress={() => openChat(file)}
              onLongPress={() => setMenuFile(chat.file_name)}
              delayLongPress={300}
              className="mb-2 rounded-2xl border border-border bg-surface px-4 py-3 active:bg-surface2"
            >
              <Text className="text-base font-semibold text-white" numberOfLines={1}>
                {file}
              </Text>
              {typeof chat['mes'] === 'string' && (
                <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
                  {String(chat['mes'])}
                </Text>
              )}
            </Pressable>
          );
        })}
        <Text className="mt-2 text-xs text-muted">Tipp: Chat gedrückt halten zum Umbenennen/Löschen.</Text>
      </ScrollView>

      {/* Chat action menu */}
      <Modal visible={menuFile != null} transparent animationType="fade" onRequestClose={() => setMenuFile(null)}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setMenuFile(null)}>
          <Pressable className="rounded-t-3xl bg-surface px-2 pb-6 pt-2">
            <Pressable
              onPress={() => {
                const f = menuFile;
                setMenuFile(null);
                if (f) openChat(cleanFile(f));
              }}
              className="rounded-2xl px-4 py-3 active:bg-surface2"
            >
              <Text className="text-base text-white">Öffnen</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const f = menuFile;
                setMenuFile(null);
                if (f) setRenaming({ file: f, name: cleanFile(f) });
              }}
              className="rounded-2xl px-4 py-3 active:bg-surface2"
            >
              <Text className="text-base text-white">Umbenennen</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const f = menuFile;
                setMenuFile(null);
                if (f) doDelete(f);
              }}
              className="rounded-2xl px-4 py-3 active:bg-surface2"
            >
              <Text className="text-base text-red-400">Löschen</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename modal */}
      <Modal visible={renaming != null} transparent animationType="slide" onRequestClose={() => setRenaming(null)}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setRenaming(null)}>
          <Pressable className="rounded-t-3xl bg-surface px-4 pb-6 pt-4">
            <Text className="mb-2 text-base font-semibold text-white">Chat umbenennen</Text>
            <TextInput
              value={renaming?.name ?? ''}
              onChangeText={(t) => setRenaming((r) => (r ? { ...r, name: t } : r))}
              autoFocus
              className="rounded-2xl bg-surface2 px-4 py-3 text-base text-white"
            />
            <View className="mt-3 flex-row justify-end gap-2">
              <Pressable onPress={() => setRenaming(null)} className="rounded-xl px-4 py-2">
                <Text className="text-muted">Abbrechen</Text>
              </Pressable>
              <Pressable onPress={doRename} className="rounded-xl bg-primary px-4 py-2">
                <Text className="font-semibold text-white">Speichern</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <ImageViewerModal visible={showImage} uri={fullImageUri} onClose={() => setShowImage(false)} />
    </View>
  );
}
