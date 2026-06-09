import { useMemo } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getAllCharacters, getCharacterChats, type StCharacter } from '@st/core';
import i18n from '@/i18n';
import { useConnection } from '@/stores/connectionStore';
import { Avatar } from '@/components/Avatar';
import { Screen, Header, ListRow, SkeletonList, EmptyState, Button, AppText } from '@/components/ui';

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

type Bucket = 'today' | 'yesterday' | 'earlier';

function dayBucket(ms: number): Bucket {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ms >= startToday) return 'today';
  if (ms >= startToday - 86_400_000) return 'yesterday';
  return 'earlier';
}

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'row'; key: string; character: StCharacter };

/** A recent-chat entry: shows the last-message preview for the character's current chat. */
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
    <ListRow
      leading={<Avatar avatar={character.avatar} name={character.name} size={52} />}
      title={character.name}
      meta={time}
      subtitle={isLoading ? t('common.loading') : preview || t('chats.noMessages')}
      onPress={() =>
        router.push({ pathname: '/chat/[avatar]/[file]', params: { avatar: character.avatar, file: fileId } })
      }
    />
  );
}

export default function ChatsScreen() {
  const { t } = useTranslation();
  const client = useConnection((s) => s.client);
  const host = useConnection((s) => s.instance?.baseUrl)?.replace(/^https?:\/\//, '');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['characters', client?.baseUrl],
    queryFn: () => getAllCharacters(client!),
    enabled: !!client,
  });

  const rows = useMemo<Row[]>(() => {
    const recent = (data ?? [])
      .filter((c) => (c.date_last_chat ?? 0) > 0 && !!c.chat)
      .sort((a, b) => (b.date_last_chat ?? 0) - (a.date_last_chat ?? 0));
    const out: Row[] = [];
    let lastBucket: Bucket | null = null;
    for (const c of recent) {
      const bucket = dayBucket(c.date_last_chat ?? 0);
      if (bucket !== lastBucket) {
        out.push({ kind: 'header', key: `h-${bucket}`, label: t(`chats.${bucket}`) });
        lastBucket = bucket;
      }
      out.push({ kind: 'row', key: c.avatar, character: c });
    }
    return out;
  }, [data, t]);

  return (
    <Screen edges={['top']}>
      <Header title={t('tabs.chats')} subtitle={host} />
      {!client ? (
        <EmptyState icon="wifi" title={t('chats.notConnected')} />
      ) : isLoading ? (
        <SkeletonList count={7} />
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <AppText variant="body" color="danger" style={{ textAlign: 'center' }}>
            {t('chats.loadError')}
          </AppText>
          <Button label={t('common.retry')} variant="secondary" leftIcon="refresh" fullWidth={false} onPress={() => refetch()} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="chats"
          title={t('chats.emptyTitle')}
          message={t('chats.empty')}
          actionLabel={t('chats.emptyCta')}
          actionIcon="characters"
          onAction={() => router.push('/(tabs)/characters')}
        />
      ) : (
        <FlashList<Row>
          data={rows}
          keyExtractor={(item) => item.key}
          getItemType={(item) => item.kind}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <AppText variant="label" color="subtle" style={{ textTransform: 'uppercase', marginTop: 16, marginBottom: 8, marginLeft: 4 }}>
                {item.label}
              </AppText>
            ) : (
              <View className="mb-2">
                <RecentChatRow character={item.character} />
              </View>
            )
          }
        />
      )}
    </Screen>
  );
}
