import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getAllCharacters, getCharacterChats, type StCharacter } from '@st/core';
import i18n from '@/i18n';
import { useConnection } from '@/stores/connectionStore';
import { Avatar } from '@/components/Avatar';

function relativeTime(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return '';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return i18n.t('chats.justNow');
  if (min < 60) return i18n.t('chats.minutesAgo', { n: min });
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return i18n.t('chats.hoursAgo', { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return i18n.t('chats.daysAgo', { n: days });
  return new Date(ms).toLocaleDateString();
}

/** A single recent-chat entry: shows the last-message preview for the character's current chat. */
function RecentChatRow({ character }: { character: StCharacter }) {
  const { t } = useTranslation();
  const client = useConnection((s) => s.client);

  const { data, isLoading } = useQuery({
    queryKey: ['charchats', client?.baseUrl, character.avatar],
    queryFn: () => getCharacterChats(client!, character.avatar),
    enabled: !!client,
    staleTime: 60_000,
  });

  const chat = useMemo(() => {
    if (!data || data.length === 0) return undefined;
    const current = data.find((c) => c.file_id === character.chat);
    if (current) return current;
    return [...data].sort((a, b) => Number(b.last_mes ?? 0) - Number(a.last_mes ?? 0))[0];
  }, [data, character.chat]);

  const fileId = chat?.file_id ?? character.chat ?? '';
  const preview = (chat?.mes ?? '').replace(/\s+/g, ' ').trim();
  const time = relativeTime(Number(chat?.last_mes ?? character.date_last_chat));

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/chat/[avatar]/[file]', params: { avatar: character.avatar, file: fileId } })
      }
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 active:bg-surface2"
    >
      <Avatar avatar={character.avatar} name={character.name} size={48} />
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-base font-semibold text-white" numberOfLines={1}>
            {character.name}
          </Text>
          <Text className="ml-2 text-xs text-muted">{time}</Text>
        </View>
        <Text className="text-sm text-muted" numberOfLines={2}>
          {isLoading ? t('common.loading') : preview || t('chats.noMessages')}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ChatsScreen() {
  const { t } = useTranslation();
  const client = useConnection((s) => s.client);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['characters', client?.baseUrl],
    queryFn: () => getAllCharacters(client!),
    enabled: !!client,
  });

  const recent = useMemo(
    () =>
      (data ?? [])
        .filter((c) => (c.date_last_chat ?? 0) > 0 && !!c.chat)
        .sort((a, b) => (b.date_last_chat ?? 0) - (a.date_last_chat ?? 0)),
    [data],
  );

  if (!client) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">{t('chats.notConnected')}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#7c5cff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-bg px-6">
        <Text className="text-center text-red-400">{t('chats.loadError')}</Text>
        <Pressable onPress={() => refetch()} className="rounded-xl bg-primary px-4 py-2">
          <Text className="font-semibold text-white">{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (recent.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <Text className="text-center text-muted">
          {t('chats.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <FlashList<StCharacter>
        data={recent}
        keyExtractor={(item) => item.avatar}
        onRefresh={refetch}
        refreshing={isRefetching}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => <RecentChatRow character={item} />}
      />
    </View>
  );
}
