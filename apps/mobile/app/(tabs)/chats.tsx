import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getAllCharacters, getCharacterChats, type ChatFileInfo, type StCharacter } from '@st/core';
import i18n from '@/i18n';
import { useConnection } from '@/stores/connectionStore';
import { usePrefs } from '@/stores/prefsStore';
import { Avatar } from '@/components/Avatar';
import { ChatActionsSheets, type ChatTarget } from '@/components/ChatActionsSheets';
import { Screen, Header, ListRow, SkeletonList, EmptyState, Button, AppText } from '@/components/ui';
import { haptics } from '@/theme/haptics';

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

/** Human label for a chat file: file id minus extension and the "CharName - " prefix. */
function chatFileLabel(character: StCharacter, chat: ChatFileInfo): string {
  const id = chat.file_id ?? chat.file_name?.replace(/\.jsonl$/i, '') ?? '';
  const prefix = `${character.name} - `;
  const label = id.startsWith(prefix) ? id.slice(prefix.length) : id;
  return label || i18n.t('chats.untitledChat');
}

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'row'; key: string; character: StCharacter }
  | { kind: 'chatrow'; key: string; character: StCharacter; chat: ChatFileInfo; ts: number };

/** A recent-chat entry: shows the last-message preview for the character's current chat. */
function RecentChatRow({
  character,
  onLongPress,
}: {
  character: StCharacter;
  onLongPress: (target: ChatTarget) => void;
}) {
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
      onLongPress={() => {
        if (!fileId) return;
        haptics.impact();
        onLongPress({ avatar: character.avatar, file: fileId });
      }}
    />
  );
}

/** One chat file as its own row ('all' mode): character + chat label + preview. */
function ChatFileRow({
  character,
  chat,
  onLongPress,
}: {
  character: StCharacter;
  chat: ChatFileInfo;
  onLongPress: (target: ChatTarget) => void;
}) {
  const { t } = useTranslation();
  const fileId = chat.file_id ?? chat.file_name?.replace(/\.jsonl$/i, '') ?? '';
  const preview = (chat.mes ?? '').replace(/\s+/g, ' ').trim();
  return (
    <ListRow
      leading={<Avatar avatar={character.avatar} name={character.name} size={52} />}
      title={character.name}
      meta={relativeTime(Number(chat.last_mes))}
      subtitle={`${chatFileLabel(character, chat)}\n${preview || t('chats.noMessages')}`}
      onPress={() =>
        router.push({ pathname: '/chat/[avatar]/[file]', params: { avatar: character.avatar, file: fileId } })
      }
      onLongPress={() => {
        if (!fileId) return;
        haptics.impact();
        onLongPress({ avatar: character.avatar, file: fileId });
      }}
    />
  );
}

export default function ChatsScreen() {
  const { t } = useTranslation();
  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const chatList = usePrefs((s) => s.chatList);
  const host = useConnection((s) => s.instance?.baseUrl)?.replace(/^https?:\/\//, '');
  const [chatMenu, setChatMenu] = useState<ChatTarget | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['characters', client?.baseUrl],
    queryFn: () => getAllCharacters(client!),
    enabled: !!client,
  });

  // Tab screens stay mounted - without a focus refetch, chats created elsewhere only
  // appeared after a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (!client) return;
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['charchats'] });
    }, [client, refetch, queryClient]),
  );

  const recent = useMemo(
    () =>
      (data ?? [])
        .filter((c) => (c.date_last_chat ?? 0) > 0 && !!c.chat)
        .sort((a, b) => (b.date_last_chat ?? 0) - (a.date_last_chat ?? 0)),
    [data],
  );

  // 'all' mode: aggregate every chat file across characters. Same queryKey shape as
  // RecentChatRow, so the cache is shared between modes and switching costs nothing.
  const allMode = chatList === 'all';
  const chatQueries = useQueries({
    queries: (allMode ? recent : []).map((c) => ({
      queryKey: ['charchats', client?.baseUrl, c.avatar] as const,
      queryFn: () => getCharacterChats(client!, c.avatar),
      enabled: !!client,
      staleTime: 60_000,
    })),
    combine: (results) => ({
      lists: results.map((r) => r.data),
      fetching: results.some((r) => r.isLoading),
    }),
  });

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastBucket: Bucket | null = null;
    const pushHeader = (ts: number) => {
      const bucket = dayBucket(ts);
      if (bucket !== lastBucket) {
        out.push({ kind: 'header', key: `h-${bucket}`, label: t(`chats.${bucket}`) });
        lastBucket = bucket;
      }
    };
    if (allMode) {
      const entries: { character: StCharacter; chat: ChatFileInfo; ts: number }[] = [];
      recent.forEach((c, i) => {
        for (const chat of chatQueries.lists[i] ?? []) {
          if (!chat.file_id && !chat.file_name) continue;
          const ts = Number(chat.last_mes);
          entries.push({ character: c, chat, ts: Number.isFinite(ts) ? ts : 0 });
        }
      });
      entries.sort((a, b) => b.ts - a.ts);
      for (const e of entries) {
        pushHeader(e.ts);
        out.push({
          kind: 'chatrow',
          key: `${e.character.avatar}::${e.chat.file_id ?? e.chat.file_name}`,
          character: e.character,
          chat: e.chat,
          ts: e.ts,
        });
      }
    } else {
      for (const c of recent) {
        pushHeader(c.date_last_chat ?? 0);
        out.push({ kind: 'row', key: c.avatar, character: c });
      }
    }
    return out;
  }, [allMode, recent, chatQueries.lists, t]);

  const refresh = () => {
    void refetch();
    if (allMode) void queryClient.invalidateQueries({ queryKey: ['charchats'] });
  };

  return (
    <Screen edges={['top']}>
      <Header title={t('tabs.chats')} subtitle={host} />
      {!client ? (
        <EmptyState icon="wifi" title={t('chats.notConnected')} />
      ) : isLoading || (allMode && rows.length === 0 && chatQueries.fetching) ? (
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
          onRefresh={refresh}
          refreshing={isRefetching}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <AppText variant="label" color="subtle" style={{ textTransform: 'uppercase', marginTop: 16, marginBottom: 8, marginLeft: 4 }}>
                {item.label}
              </AppText>
            ) : item.kind === 'chatrow' ? (
              <View className="mb-2">
                <ChatFileRow character={item.character} chat={item.chat} onLongPress={setChatMenu} />
              </View>
            ) : (
              <View className="mb-2">
                <RecentChatRow character={item.character} onLongPress={setChatMenu} />
              </View>
            )
          }
        />
      )}
      <ChatActionsSheets target={chatMenu} onClose={() => setChatMenu(null)} />
    </Screen>
  );
}
