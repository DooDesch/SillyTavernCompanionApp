import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getAllCharacters, type StCharacter } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { Avatar } from '@/components/Avatar';

export default function CharactersScreen() {
  const client = useConnection((s) => s.client);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['characters', client?.baseUrl],
    queryFn: () => getAllCharacters(client!),
    enabled: !!client,
  });

  if (!client) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Nicht verbunden.</Text>
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
          Charaktere konnten nicht geladen werden.{'\n'}
          {error instanceof Error ? error.message : ''}
        </Text>
        <Pressable onPress={() => refetch()} className="rounded-xl bg-primary px-4 py-2">
          <Text className="font-semibold text-white">Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <FlashList<StCharacter>
        data={data ?? []}
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
                {item.data?.creator_notes || item.description || 'Keine Beschreibung'}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
