import { memo, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Fuse from 'fuse.js';
import { getAllCharacters, type StCharacter } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { Avatar } from '@/components/Avatar';
import { Screen, Header, Card, Chip, AppText, Button, SkeletonList, EmptyState, IconButton } from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors, fonts } from '@/theme/tokens';

const CharacterCard = memo(function CharacterCard({ character }: { character: StCharacter }) {
  const { t } = useTranslation();
  const creator = character.data?.creator?.trim();
  const tags = (character.data?.tags ?? []).filter(Boolean).slice(0, 3);
  const notes = character.data?.creator_notes || character.description || t('characters.noDescription');
  return (
    <Card
      onPress={() => router.push({ pathname: '/character/[avatar]', params: { avatar: character.avatar } })}
      className="px-3.5 py-3"
    >
      <View className="flex-row gap-3">
        <Avatar avatar={character.avatar} name={character.name} size={56} />
        <View className="flex-1">
          <AppText variant="title" numberOfLines={1}>
            {character.name}
          </AppText>
          {creator ? (
            <AppText variant="caption" color="subtle" numberOfLines={1}>
              {t('character.byCreator', { creator })}
            </AppText>
          ) : null}
          <AppText variant="body" color="muted" numberOfLines={2} style={{ marginTop: 4 }}>
            {notes}
          </AppText>
          {tags.length ? (
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Chip key={tag} label={tag} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
});

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

  const body = () => {
    if (!client) return <EmptyState icon="wifi" title={t('characters.notConnected')} />;
    if (isLoading) return <SkeletonList count={6} />;
    if (error) {
      return (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <AppText variant="body" color="danger" style={{ textAlign: 'center' }}>
            {t('characters.loadError')}
          </AppText>
          <Button label={t('common.retry')} variant="secondary" leftIcon="refresh" fullWidth={false} onPress={() => refetch()} />
        </View>
      );
    }
    if ((data?.length ?? 0) === 0)
      return <EmptyState icon="characters" title={t('characters.emptyTitle')} message={t('characters.emptyMessage')} />;
    if (list.length === 0)
      return <EmptyState icon="search" title={t('characters.noResultsTitle')} message={t('characters.noResults', { query })} />;
    return (
      <FlashList<StCharacter>
        data={list}
        keyExtractor={(item) => item.avatar}
        onRefresh={refetch}
        refreshing={isRefetching}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View className="mb-2">
            <CharacterCard character={item} />
          </View>
        )}
      />
    );
  };

  return (
    <Screen edges={['top']}>
      <Header title={t('tabs.characters')} subtitle={t('characters.countLabel', { count: data?.length ?? 0 })} />
      <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-field border border-border bg-surface-2 pl-3 pr-1">
        <Icon name="search" size={18} color={colors.textSubtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('characters.searchPlaceholder', { count: data?.length ?? 0 })}
          placeholderTextColor={colors.textSubtle}
          autoCorrect={false}
          autoCapitalize="none"
          className="h-12 flex-1 text-text"
          style={{ fontFamily: fonts.regular, fontSize: 16 }}
        />
        {query ? (
          <IconButton name="close" size="sm" accessibilityLabel={t('a11y.clearSearch')} onPress={() => setQuery('')} haptic={false} />
        ) : (
          <View className="w-2" />
        )}
      </View>
      {body()}
    </Screen>
  );
}
