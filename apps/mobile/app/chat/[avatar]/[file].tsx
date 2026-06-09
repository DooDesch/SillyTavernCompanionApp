import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  createChatHeader,
  currentSwipeText,
  getChat,
  getCharacter,
  saveChat,
  type StChatHeader,
  type StChatMessage,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useEngineConfig } from '@/hooks/useEngineConfig';
import { useLorebook } from '@/hooks/useLorebook';
import { streamGeneration } from '@/lib/generate';
import { makeAssistantMessage, makeUserMessage, nowSendDate } from '@/lib/messages';
import { RichText } from '@/components/RichText';

type GenMode = 'new' | 'regenerate' | 'swipe';

export default function ChatScreen() {
  const params = useLocalSearchParams<{ avatar: string; file: string; fresh?: string }>();
  const avatarUrl = String(params.avatar);
  const fileName = String(params.file);
  const isFresh = params.fresh === '1';

  const client = useConnection((s) => s.client);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlashListRef<StChatMessage>>(null);
  const abortRef = useRef<AbortController | null>(null);

  const charQuery = useQuery({
    queryKey: ['character', client?.baseUrl, avatarUrl],
    queryFn: () => getCharacter(client!, avatarUrl),
    enabled: !!client,
  });
  const character = charQuery.data;
  const { engine } = useEngineConfig(character?.name ?? '');
  const lorebook = useLorebook(character);

  const [header, setHeader] = useState<StChatHeader | null>(null);
  const [messages, setMessages] = useState<StChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null);

  useEffect(() => {
    if (!client || !character || loaded) return;
    let cancelled = false;
    void (async () => {
      const newHeader = createChatHeader({
        userName: engine?.identity.user ?? 'User',
        characterName: character.name,
        createDate: nowSendDate(),
      });
      if (isFresh) {
        const greeting = character.first_mes?.trim()
          ? [makeAssistantMessage(character.name, character.first_mes)]
          : [];
        if (!cancelled) {
          setHeader(newHeader);
          setMessages(greeting);
          setLoaded(true);
        }
        return;
      }
      const chat = await getChat(client, avatarUrl, fileName);
      if (cancelled) return;
      setHeader(chat?.header ?? newHeader);
      setMessages(chat?.messages ?? []);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [client, character, loaded, isFresh, engine, avatarUrl, fileName]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const persist = useCallback(
    async (msgs: StChatMessage[], force = false) => {
      if (!client || !header) return;
      const res = await saveChat(client, { avatarUrl, fileName, chat: { header, messages: msgs }, force });
      if (res.conflict) {
        Alert.alert('Konflikt', 'Der PC hat diesen Chat seit dem Laden geändert.', [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Überschreiben', style: 'destructive', onPress: () => void persist(msgs, true) },
        ]);
      }
    },
    [client, header, avatarUrl, fileName],
  );

  const runGeneration = useCallback(
    async (contextMsgs: StChatMessage[], assistantIndex: number, mode: GenMode) => {
      if (!client || !engine || !character) return;
      setStreaming(true);
      const ac = new AbortController();
      abortRef.current = ac;
      let finalText = '';
      try {
        for await (const acc of streamGeneration(client, engine, character, contextMsgs, {
          type: mode === 'regenerate' ? 'regenerate' : mode === 'swipe' ? 'swipe' : 'normal',
          signal: ac.signal,
          ...(lorebook ? { lorebook } : {}),
          ...(header?.chat_metadata
            ? {
                chatMetadata: header.chat_metadata as {
                  system_prompt?: string;
                  scenario?: string;
                  mes_example?: string;
                },
              }
            : {}),
        })) {
          finalText = acc;
          setMessages((prev) => {
            const next = [...prev];
            const cur = next[assistantIndex];
            if (cur) next[assistantIndex] = { ...cur, mes: acc };
            return next;
          });
        }
      } catch {
        // aborted / network error — keep whatever streamed
      } finally {
        abortRef.current = null;
        setStreaming(false);
        let finalMsgs: StChatMessage[] = [];
        setMessages((prev) => {
          const next = [...prev];
          const cur = next[assistantIndex];
          if (cur) {
            next[assistantIndex] = finalizeAssistant(cur, finalText, mode);
          }
          finalMsgs = next;
          return next;
        });
        void persist(finalMsgs);
        scrollToEnd();
      }
    },
    [client, engine, character, persist, scrollToEnd],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !character || !engine) return;
    setInput('');
    const userMsg = makeUserMessage(engine.identity.user, text);
    const assistant = makeAssistantMessage(character.name, '');
    const base = [...messages, userMsg];
    setMessages([...base, assistant]);
    scrollToEnd();
    await runGeneration(base, base.length, 'new');
  }, [input, streaming, character, engine, messages, runGeneration, scrollToEnd]);

  const regenerate = useCallback(async () => {
    if (streaming || messages.length === 0) return;
    const lastIdx = messages.length - 1;
    if (messages[lastIdx]?.is_user) return;
    const context = messages.slice(0, lastIdx);
    await runGeneration(context, lastIdx, 'regenerate');
  }, [streaming, messages, runGeneration]);

  const cycleSwipe = useCallback(
    (dir: 1 | -1) => {
      if (streaming) return;
      const lastIdx = messages.length - 1;
      const m = messages[lastIdx];
      if (!m || m.is_user) return;
      const swipes = m.swipes ?? [m.mes];
      const sid = m.swipe_id ?? 0;
      if (dir === 1 && sid >= swipes.length - 1) {
        // At the newest swipe → generate a fresh alternative.
        void runGeneration(messages.slice(0, lastIdx), lastIdx, 'swipe');
        return;
      }
      const nsid = Math.max(0, Math.min(swipes.length - 1, sid + dir));
      let updated: StChatMessage[] = [];
      setMessages((prev) => {
        const next = [...prev];
        const cur = next[lastIdx];
        if (cur) next[lastIdx] = { ...cur, swipe_id: nsid, mes: swipes[nsid] ?? cur.mes };
        updated = next;
        return next;
      });
      void persist(updated);
    },
    [streaming, messages, runGeneration, persist],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const startEdit = useCallback(
    (index: number) => {
      const m = messages[index];
      if (m) setEditing({ index, text: currentSwipeText(m) });
    },
    [messages],
  );

  const saveEdit = useCallback(() => {
    if (!editing) return;
    const { index, text } = editing;
    let updated: StChatMessage[] = [];
    setMessages((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (cur) {
        const swipes = cur.swipes ? [...cur.swipes] : undefined;
        const sid = cur.swipe_id ?? 0;
        if (swipes && swipes[sid] !== undefined) swipes[sid] = text;
        next[index] = { ...cur, mes: text, ...(swipes ? { swipes } : {}) };
      }
      updated = next;
      return next;
    });
    setEditing(null);
    void persist(updated);
  }, [editing, persist]);

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#7c5cff" />
      </View>
    );
  }

  const last = messages[messages.length - 1];
  const showSwipeBar = !streaming && !!last && !last.is_user;
  const swipeCount = last?.swipes?.length ?? 1;
  const swipeId = (last?.swipe_id ?? 0) + 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#0b0b0f' }} behavior="padding">
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center gap-1 border-b border-border bg-surface px-2 pb-2"
      >
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center active:opacity-60"
        >
          <Text className="text-3xl text-white">‹</Text>
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-white" numberOfLines={1}>
          {character?.name ?? 'Chat'}
        </Text>
      </View>
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={(_m, i) => String(i)}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item, index }) => (
          <Bubble
            message={item}
            plain={streaming && index === messages.length - 1}
            onLongPress={() => startEdit(index)}
          />
        )}
      />

      {showSwipeBar && (
        <View className="flex-row items-center justify-center gap-4 pb-1">
          <Pressable onPress={() => cycleSwipe(-1)} className="px-3 py-1 active:opacity-60">
            <Text className="text-lg text-muted">‹</Text>
          </Pressable>
          <Text className="text-xs text-muted">
            {swipeId}/{swipeCount}
          </Text>
          <Pressable onPress={() => cycleSwipe(1)} className="px-3 py-1 active:opacity-60">
            <Text className="text-lg text-muted">›</Text>
          </Pressable>
          <Pressable onPress={regenerate} className="ml-2 rounded-full bg-surface2 px-3 py-1 active:opacity-70">
            <Text className="text-sm text-white">↻</Text>
          </Pressable>
        </View>
      )}

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        className="flex-row items-end gap-2 border-t border-border bg-surface px-3 pt-2"
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          onFocus={() => setTimeout(scrollToEnd, 250)}
          multiline
          placeholder="Nachricht schreiben…"
          placeholderTextColor="#5a5a68"
          editable={!streaming}
          className="max-h-32 flex-1 rounded-2xl bg-surface2 px-4 py-2.5 text-base text-white"
        />
        {streaming ? (
          <Pressable onPress={stop} className="h-11 w-11 items-center justify-center rounded-full bg-red-600 active:opacity-80">
            <Text className="text-white">■</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={send}
            disabled={!input.trim()}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80 disabled:opacity-40"
          >
            <Text className="text-lg text-white">↑</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setEditing(null)}>
          <Pressable
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="rounded-t-3xl bg-surface px-4 pt-4"
          >
            <Text className="mb-2 text-base font-semibold text-white">Nachricht bearbeiten</Text>
            <TextInput
              value={editing?.text ?? ''}
              onChangeText={(t) => setEditing((e) => (e ? { ...e, text: t } : e))}
              multiline
              autoFocus
              className="max-h-72 rounded-2xl bg-surface2 px-4 py-3 text-base text-white"
            />
            <View className="mt-3 flex-row justify-end gap-2">
              <Pressable onPress={() => setEditing(null)} className="rounded-xl px-4 py-2">
                <Text className="text-muted">Abbrechen</Text>
              </Pressable>
              <Pressable onPress={saveEdit} className="rounded-xl bg-primary px-4 py-2">
                <Text className="font-semibold text-white">Speichern</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function finalizeAssistant(cur: StChatMessage, finalText: string, mode: GenMode): StChatMessage {
  const finished = nowSendDate();
  if (mode === 'swipe') {
    const swipes = [...(cur.swipes ?? [cur.mes]), finalText];
    return { ...cur, mes: finalText, swipes, swipe_id: swipes.length - 1, gen_finished: finished };
  }
  if (mode === 'regenerate') {
    const swipes = cur.swipes ? [...cur.swipes] : [];
    const sid = cur.swipe_id ?? 0;
    if (swipes.length > 0) swipes[sid] = finalText;
    else swipes.push(finalText);
    return { ...cur, mes: finalText, swipes, swipe_id: sid, gen_finished: finished };
  }
  return { ...cur, mes: finalText, swipes: [finalText], swipe_id: 0, gen_finished: finished };
}

const Bubble = memo(function Bubble({
  message,
  plain,
  onLongPress,
}: {
  message: StChatMessage;
  plain?: boolean;
  onLongPress?: () => void;
}) {
  const text = currentSwipeText(message);
  const isUser = message.is_user;
  return (
    <View className={`mb-2 max-w-[88%] ${isUser ? 'self-end' : 'self-start'}`}>
      {!isUser && <Text className="mb-0.5 ml-1 text-xs font-semibold text-muted">{message.name}</Text>}
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        className={`rounded-2xl px-3.5 py-2.5 ${isUser ? 'bg-user' : 'bg-char'}`}
      >
        {plain ? (
          <Text className="text-[15px] leading-5 text-white">{text || ' '}</Text>
        ) : (
          <RichText text={text || ' '} />
        )}
      </Pressable>
    </View>
  );
});
