import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Fuse from 'fuse.js';
import { getAllCharacters, type StCharacter } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { Avatar } from '@/components/Avatar';

export default function CharactersScreen() {
  const { t } = useTranslation();
  const client = useConnection((s) => s.client);
  const [query, setQuery] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['characters', client?.baseUrl],
    queryFn: () => getAllCharacters(client!),
    enabled: !!client,
  });

  const fuse = useMemo(
    () =>
      new Fuse(data ?? [], {
        keys: ['name', 'description', 'data.creator', 'data.tags', 'data.creator_notes'],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [data],
  );

  const list = useMemo(() => {
    const q = query.trim();
    if (!q) return data ?? [];
    return fuse.search(q).map((r) => r.item);
  }, [query, data, fuse]);

  if (!client) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">{t('characters.notConnected')}</Text>
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
        <Text className="text-center text-red-400">
          {t('characters.loadError')}{'\n'}
          {error instanceof Error ? error.message : ''}
        </Text>
        <Pressable onPress={() => refetch()} className="rounded-xl bg-primary px-4 py-2">
          <Text className="font-semibold text-white">{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="px-3 pb-1 pt-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('characters.searchPlaceholder', { count: data?.length ?? 0 })}
          placeholderTextColor="#5a5a68"
          autoCorrect={false}
          autoCapitalize="none"
          className="rounded-2xl bg-surface2 px-4 py-2.5 text-base text-white"
        />
      </View>
      {list.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-muted">{t('characters.noResults', { query })}</Text>
        </View>
      ) : (
        <FlashList<StCharacter>
          data={list}
          keyExtractor={(item) => item.avatar}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/character/[avatar]', params: { avatar: item.avatar } })
              }
              className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 active:bg-surface2"
            >
              <Avatar avatar={item.avatar} name={item.name} size={48} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-white" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {item.data?.creator_notes || item.description || t('characters.noDescription')}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
