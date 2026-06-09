import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getCharacter, getCharacterChats } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { nowSendDate } from '@/lib/messages';

function cleanFile(name: string): string {
  return name.replace(/\.jsonl$/i, '');
}

export default function CharacterScreen() {
  const { avatar } = useLocalSearchParams<{ avatar: string }>();
  const client = useConnection((s) => s.client);
  const avatarUrl = String(avatar);

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

  const character = charQuery.data;

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

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ title: character?.name ?? 'Charakter', headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {character && (
          <View className="mb-4">
            <Text className="text-xl font-bold text-white">{character.name}</Text>
            {!!character.description && (
              <Text className="mt-2 text-sm text-muted" numberOfLines={6}>
                {character.description}
              </Text>
            )}
          </View>
        )}

        <Pressable
          onPress={newChat}
          className="mb-5 rounded-2xl bg-primary px-4 py-3 active:opacity-80"
        >
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
      </ScrollView>
    </View>
  );
}
