import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { deleteChat, getCharacter, getCharacterChats, renameChat, type StCharacter } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { Avatar } from '@/components/Avatar';
import { RichText } from '@/components/RichText';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { nowSendDate } from '@/lib/messages';
import {
  AppText,
  Button,
  Card,
  Chip,
  Field,
  ListRow,
  SectionHeader,
  Sheet,
  SheetActionRow,
  SkeletonList,
} from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';
import { haptics } from '@/theme/haptics';

function cleanFile(name: string): string {
  return name.replace(/\.jsonl$/i, '');
}

/** Raw card fields for display (data block preferred, legacy top-level fallback) - unsubstituted, like ST's editor. */
function rawField(c: StCharacter, key: 'description' | 'personality' | 'scenario' | 'first_mes' | 'mes_example'): string {
  return (c.data?.[key] ?? c[key] ?? '').trim();
}

/** Split ST example dialogues into their <START> blocks for separate rendering. */
function splitExamples(text: string): string[] {
  return text
    .split(/<START>/i)
    .map((b) => b.trim())
    .filter(Boolean);
}

/**
 * One definition field as its own collapsible card (accent label + meta + chevron header,
 * markdown-rendered body) - mirrors the desktop editor's one-drawer-per-field layout.
 */
function DefinitionCard({
  label,
  text,
  meta,
  blocks,
  defaultOpen = false,
}: {
  label: string;
  text?: string;
  meta?: string;
  /** Pre-split content blocks (example dialogues); takes precedence over `text`. */
  blocks?: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const content = blocks ?? (text ? [text] : []);
  if (content.length === 0) return null;
  return (
    <View className="mb-2 overflow-hidden rounded-card border border-border bg-surface">
      <Pressable
        onPress={() => {
          haptics.selection();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center gap-2 px-4 py-3 active:bg-surface-2"
      >
        <AppText variant="title" color="accent" style={{ flex: 1 }}>
          {label}
        </AppText>
        {meta ? (
          <AppText variant="caption" color="subtle">
            {meta}
          </AppText>
        ) : null}
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} color={colors.textSubtle} />
      </Pressable>
      {open ? (
        <View className="border-t border-border px-4 py-3">
          {content.map((block, i) => (
            <View key={i} className={i > 0 ? 'mt-3 border-t border-border pt-3' : undefined}>
              {content.length > 1 ? (
                <AppText variant="caption" color="subtle" style={{ marginBottom: 4 }}>
                  {i + 1}/{content.length}
                </AppText>
              ) : null}
              <RichText text={block} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
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
  const creator = character?.data?.creator?.trim();
  const fullImageUri = baseUrl ? `${baseUrl}/thumbnail?type=avatar&file=${encodeURIComponent(avatarUrl)}` : undefined;
  const [menuFile, setMenuFile] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [renaming, setRenaming] = useState<{ file: string; name: string } | null>(null);
  // Spoiler gate: definitions stay hidden per visit (never persisted), like ST's spoiler-free mode.
  const [defsRevealed, setDefsRevealed] = useState(false);

  const tags = useMemo(
    () => (character?.data?.tags ?? character?.tags ?? []).filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 8),
    [character],
  );
  const creatorNotes = character?.data?.creator_notes?.trim();
  const depthPrompt = character?.data?.extensions?.depth_prompt;
  const altGreetings = (character?.data?.alternate_greetings ?? []).filter((g) => !!g?.trim());
  const bookEntryCount = useMemo(() => {
    const book = character?.data?.character_book as { entries?: unknown } | undefined;
    const entries = book?.entries;
    if (Array.isArray(entries)) return entries.length;
    if (entries && typeof entries === 'object') return Object.keys(entries).length;
    return 0;
  }, [character]);
  const hasDefinitions =
    !!character &&
    (!!rawField(character, 'description') ||
      !!rawField(character, 'personality') ||
      !!rawField(character, 'scenario') ||
      !!rawField(character, 'first_mes') ||
      !!rawField(character, 'mes_example') ||
      !!depthPrompt?.prompt ||
      !!character.data?.system_prompt ||
      !!character.data?.post_history_instructions);

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
            {tags.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap justify-center gap-1.5">
                {tags.map((tag) => (
                  <Chip key={tag} label={tag} />
                ))}
              </View>
            ) : null}
            {/* Creator notes are MEANT for the player (unlike the definitions) - show them openly. */}
            {creatorNotes ? (
              <AppText selectable variant="body" color="muted" style={{ marginTop: 14, textAlign: 'center' }}>
                {creatorNotes}
              </AppText>
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

        {/* Character definitions (prompt material) - spoiler-gated like ST's spoiler-free mode. */}
        {hasDefinitions && character ? (
          <>
            <SectionHeader title={t('character.definitions')} />
            {!defsRevealed ? (
              <Card className="items-center px-5 py-6">
                <Icon name="hide" size={26} color={colors.textMuted} />
                <AppText variant="title" style={{ marginTop: 10 }}>
                  {t('character.spoilerTitle')}
                </AppText>
                <AppText variant="caption" color="muted" style={{ marginTop: 4, textAlign: 'center' }}>
                  {t('character.spoilerMessage')}
                </AppText>
                <View className="mt-4 w-full">
                  <Button
                    label={t('character.revealDefinitions')}
                    variant="secondary"
                    leftIcon="show"
                    onPress={() => {
                      haptics.tap();
                      setDefsRevealed(true);
                    }}
                  />
                </View>
              </Card>
            ) : (
              <View>
                <DefinitionCard label={t('character.fieldDescription')} text={rawField(character, 'description')} defaultOpen />
                <DefinitionCard label={t('character.fieldPersonality')} text={rawField(character, 'personality')} />
                <DefinitionCard label={t('character.fieldScenario')} text={rawField(character, 'scenario')} />
                <DefinitionCard
                  label={t('character.fieldFirstMes')}
                  blocks={[rawField(character, 'first_mes'), ...altGreetings].filter(Boolean)}
                  meta={altGreetings.length > 0 ? t('character.altGreetings', { count: altGreetings.length }) : undefined}
                />
                <DefinitionCard
                  label={t('character.fieldMesExample')}
                  blocks={splitExamples(rawField(character, 'mes_example'))}
                />
                <DefinitionCard
                  label={t('character.fieldDepthPrompt')}
                  text={depthPrompt?.prompt?.trim() ?? ''}
                  meta={depthPrompt ? `@${depthPrompt.depth}` : undefined}
                />
                <DefinitionCard label={t('character.fieldSystemPrompt')} text={character.data?.system_prompt?.trim() ?? ''} />
                <DefinitionCard
                  label={t('character.fieldPostHistory')}
                  text={character.data?.post_history_instructions?.trim() ?? ''}
                />
                {bookEntryCount > 0 ? (
                  <AppText variant="caption" color="subtle" style={{ marginLeft: 4, marginTop: 2 }}>
                    {t('character.embeddedLorebook', { count: bookEntryCount })}
                  </AppText>
                ) : null}
                <View className="mt-2">
                  <Button
                    label={t('character.hideDefinitions')}
                    variant="ghost"
                    leftIcon="hide"
                    onPress={() => setDefsRevealed(false)}
                  />
                </View>
              </View>
            )}
          </>
        ) : null}
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
