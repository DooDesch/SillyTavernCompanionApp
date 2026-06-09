import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Modal, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import {
  checkWorldInfo,
  createChatHeader,
  currentSwipeText,
  emptyTimedState,
  estimateTokens,
  getChat,
  getCharacter,
  historyFromMessages,
  saveChat,
  type DepthInjection,
  type StChatHeader,
  type StChatMessage,
  type TimedWorldInfoState,
} from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useEngineConfig } from '@/hooks/useEngineConfig';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { useLorebook } from '@/hooks/useLorebook';
import { useConnectionProfiles } from '@/hooks/useConnectionProfiles';
import { useProfiles } from '@/stores/profilesStore';
import { streamGeneration } from '@/lib/generate';
import { syncPersonaToPc } from '@/lib/sync';
import { ensureIds, makeAssistantMessage, makeUserMessage, nowSendDate } from '@/lib/messages';
import { clearChatDraft, readChatDraft, writeChatDraft } from '@/lib/persist';
import { RichText } from '@/components/RichText';
import { Avatar } from '@/components/Avatar';
import { PickerSheet, type PickerOption } from '@/components/PickerSheet';
import { AuthorsNoteSheet, type AuthorsNoteValue } from '@/components/AuthorsNoteSheet';
import { QuickSettingsSheet } from '@/components/QuickSettingsSheet';
import { LoreSheet, entryUid } from '@/components/LoreSheet';

type GenMode = 'new' | 'regenerate' | 'swipe' | 'continue';

/** Read persisted World-Info timed-effect state from a chat header (a copy, to mutate freely). */
function readTimedState(h: StChatHeader): TimedWorldInfoState {
  const tw = (h.chat_metadata as { timedWorldInfo?: TimedWorldInfoState } | undefined)?.timedWorldInfo;
  return tw && tw.sticky && tw.cooldown
    ? { sticky: { ...tw.sticky }, cooldown: { ...tw.cooldown } }
    : emptyTimedState();
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ avatar: string; file: string; fresh?: string }>();
  const avatarUrl = String(params.avatar);
  const fileName = String(params.file);
  const isFresh = params.fresh === '1';

  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const syncToPc = useProfiles((s) => s.syncToPc);
  const insets = useSafeAreaInsets();
  const kbVisible = useKeyboardState((s) => s.isVisible);
  // No safe-area bottom inset while the keyboard is up (the KeyboardAvoidingView already lifts the
  // sheet above it) - otherwise the inset becomes a dead gap below the buttons.
  const sheetPadBottom = kbVisible ? 12 : Math.max(insets.bottom, 12);
  const listRef = useRef<FlashListRef<StChatMessage>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const abortedByUserRef = useRef(false);
  // World-Info timed-effect state (sticky/cooldown), loaded from / persisted to chat_metadata.
  const timedStateRef = useRef<TimedWorldInfoState>(emptyTimedState());

  const charQuery = useQuery({
    queryKey: ['character', client?.baseUrl, avatarUrl],
    queryFn: () => getCharacter(client!, avatarUrl),
    enabled: !!client,
  });
  const character = charQuery.data;
  const { engine } = useEngineConfig(character?.name ?? '');
  const backend = useBackendStatus(engine);
  const lorebook = useLorebook(character);
  const { personas, activePersonaAvatar, setActivePersona } = useConnectionProfiles();

  const [header, setHeader] = useState<StChatHeader | null>(null);
  const [messages, setMessages] = useState<StChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [plusMenu, setPlusMenu] = useState(false);
  const [sheet, setSheet] = useState<'persona' | 'note' | 'quick' | 'lore' | null>(null);
  const [disabledLore, setDisabledLore] = useState<Set<string>>(new Set());
  const [activeLore, setActiveLore] = useState<Set<string>>(new Set());

  // Author's Note lives in the chat header's chat_metadata (round-trips to the desktop).
  const meta = header?.chat_metadata as Record<string, unknown> | undefined;
  const authorsNoteValue: AuthorsNoteValue = {
    content: typeof meta?.note_prompt === 'string' ? meta.note_prompt : '',
    depth: typeof meta?.note_depth === 'number' ? meta.note_depth : 4,
    role: typeof meta?.note_role === 'number' ? meta.note_role : 0,
  };
  const authorsNote: DepthInjection | undefined = authorsNoteValue.content.trim()
    ? { depth: authorsNoteValue.depth, role: authorsNoteValue.role, content: authorsNoteValue.content }
    : undefined;

  // Lorebook with user-muted entries removed + the timed-effect state attached (mutated during scan).
  const effectiveLorebook = lorebook
    ? {
        entries:
          disabledLore.size > 0
            ? lorebook.entries.filter((e, i) => !disabledLore.has(entryUid(e, i)))
            : lorebook.entries,
        settings: lorebook.settings,
        timedState: timedStateRef.current,
      }
    : undefined;

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
          timedStateRef.current = emptyTimedState();
          setHeader(newHeader);
          setMessages(greeting);
          setLoaded(true);
        }
        return;
      }
      const chat = await getChat(client, avatarUrl, fileName);
      if (cancelled) return;
      const loadedHeader = chat?.header ?? newHeader;
      timedStateRef.current = readTimedState(loadedHeader);
      setHeader(loadedHeader);
      setMessages(ensureIds(chat?.messages ?? []));
      setLoaded(true);
      // A lingering draft means the last change never reached the server (offline/crash) - offer it.
      const draft = await readChatDraft<StChatHeader, StChatMessage>(avatarUrl, fileName);
      if (!cancelled && draft && draft.messages.length > 0) {
        Alert.alert(
          'Ungespeicherte Änderungen',
          'Aus einer früheren Sitzung gibt es ungespeicherte Änderungen. Wiederherstellen?',
          [
            { text: 'Verwerfen', style: 'destructive', onPress: () => clearChatDraft(avatarUrl, fileName) },
            {
              text: 'Wiederherstellen',
              onPress: () => {
                if (draft.header) setHeader(draft.header);
                setMessages(ensureIds(draft.messages));
              },
            },
          ],
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, character, loaded, isFresh, engine, avatarUrl, fileName]);

  // Stop any TTS when leaving the chat.
  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const persist = useCallback(
    async (msgs: StChatMessage[], force = false) => {
      if (!client || !header) return;
      // SAFETY: never overwrite a chat with an empty message list. If `messages` is empty here it almost
      // always means the chat failed to load (transient/null) - saving would WIPE the real chat on the PC.
      if (msgs.length === 0) return;
      // Fold the (possibly updated) World-Info timed state into the header so it round-trips to the PC.
      const hdr: StChatHeader = lorebook
        ? { ...header, chat_metadata: { ...header.chat_metadata, timedWorldInfo: timedStateRef.current } }
        : header;
      // Write a local crash-draft first; clear it only once the server confirms the save.
      writeChatDraft(avatarUrl, fileName, hdr, msgs, Date.now());
      const res = await saveChat(client, { avatarUrl, fileName, chat: { header: hdr, messages: msgs }, force });
      if (res.conflict) {
        Alert.alert('Konflikt', 'Der PC hat diesen Chat seit dem Laden geändert.', [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Überschreiben', style: 'destructive', onPress: () => void persist(msgs, true) },
        ]);
      } else if (res.ok) {
        clearChatDraft(avatarUrl, fileName);
      }
    },
    [client, header, avatarUrl, fileName, lorebook],
  );

  const runGeneration = useCallback(
    async (contextMsgs: StChatMessage[], assistantIndex: number, mode: GenMode) => {
      if (!client || !engine || !character) return;
      const isContinue = mode === 'continue';
      const prefix = isContinue ? currentSwipeText(contextMsgs[assistantIndex]!) : '';
      setStreaming(true);
      abortedByUserRef.current = false;
      const ac = new AbortController();
      abortRef.current = ac;
      let finalText = prefix;
      let finalReasoning = '';
      let gotText = false;
      try {
        for await (const acc of streamGeneration(client, engine, character, contextMsgs, {
          type: mode === 'new' ? 'normal' : mode,
          signal: ac.signal,
          ...(effectiveLorebook ? { lorebook: effectiveLorebook } : {}),
          ...(authorsNote ? { authorsNote } : {}),
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
          if (acc.text.trim()) gotText = true;
          finalText = isContinue ? prefix + acc.text : acc.text;
          finalReasoning = acc.reasoning;
          const mes = finalText;
          const reasoning = acc.reasoning;
          setMessages((prev) => {
            const next = [...prev];
            const cur = next[assistantIndex];
            if (cur) {
              next[assistantIndex] = {
                ...cur,
                mes,
                ...(reasoning ? { extra: { ...cur.extra, reasoning } } : {}),
              };
            }
            return next;
          });
        }
      } catch {
        // aborted / network error - handled below via gotText/abortedByUser
      } finally {
        abortRef.current = null;
        setStreaming(false);
        // ST 1:1: an empty (non-aborted) result is "No message generated" - never keep/save junk.
        const failed = !gotText && !abortedByUserRef.current;
        let finalMsgs: StChatMessage[] = [];
        setMessages((prev) => {
          const next = [...prev];
          const cur = next[assistantIndex];
          if (failed) {
            if (mode === 'new') {
              next.splice(assistantIndex, 1); // drop the empty placeholder, keep the user message
            } else if (cur) {
              next[assistantIndex] = { ...cur, mes: currentSwipeText(cur) }; // restore the previous reply
            }
          } else if (cur) {
            next[assistantIndex] = finalizeAssistant(cur, finalText, mode, finalReasoning);
          }
          finalMsgs = next;
          return next;
        });
        void persist(finalMsgs);
        scrollToEnd();
        if (failed) {
          Alert.alert(
            'Keine Antwort',
            'Es wurde keine Nachricht generiert. Ist das KI-Backend (KoboldCpp/Cloud) erreichbar und in SillyTavern verbunden?',
          );
        }
      }
    },
    [client, engine, character, persist, scrollToEnd, effectiveLorebook, authorsNote, header],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && !pendingImage) || streaming || !character || !engine) return;
    setInput('');
    const img = pendingImage;
    setPendingImage(null);
    const userMsg = makeUserMessage(engine.identity.user, text);
    if (img) userMsg.extra = { ...userMsg.extra, image: img };
    const assistant = makeAssistantMessage(character.name, '');
    const base = [...messages, userMsg];
    setMessages([...base, assistant]);
    scrollToEnd();
    await runGeneration(base, base.length, 'new');
  }, [input, pendingImage, streaming, character, engine, messages, runGeneration, scrollToEnd]);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Kein Zugriff', 'Die Foto-Berechtigung wurde abgelehnt.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
    const asset = res.canceled ? undefined : res.assets[0];
    if (asset?.base64) setPendingImage(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
  }, []);

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

  const stop = useCallback(() => {
    abortedByUserRef.current = true;
    abortRef.current?.abort();
  }, []);

  // Impersonate: draft the user's next turn into the input box (text-completion only).
  const impersonate = useCallback(async () => {
    if (streaming || !client || !engine || !character || engine.mode === 'cc') return;
    setStreaming(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      for await (const acc of streamGeneration(client, engine, character, messages, {
        isImpersonate: true,
        signal: ac.signal,
        ...(effectiveLorebook ? { lorebook: effectiveLorebook } : {}),
        ...(authorsNote ? { authorsNote } : {}),
      })) {
        setInput(acc.text);
      }
    } catch {
      // aborted / network - keep whatever drafted
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }, [streaming, client, engine, character, messages, effectiveLorebook, authorsNote]);

  // Persist a header change (e.g. Author's Note) back to the server.
  const saveHeader = useCallback(
    async (newHeader: StChatHeader) => {
      setHeader(newHeader);
      if (!client) return;
      if (messages.length === 0) return; // never overwrite a (possibly failed-to-load) chat with nothing
      writeChatDraft(avatarUrl, fileName, newHeader, messages, Date.now());
      const res = await saveChat(client, {
        avatarUrl,
        fileName,
        chat: { header: newHeader, messages },
        force: false,
      });
      if (res.ok) clearChatDraft(avatarUrl, fileName);
    },
    [client, avatarUrl, fileName, messages],
  );

  const saveAuthorsNote = useCallback(
    (v: AuthorsNoteValue) => {
      setSheet(null);
      if (!header) return;
      void saveHeader({
        ...header,
        chat_metadata: {
          ...header.chat_metadata,
          note_prompt: v.content,
          note_depth: v.depth,
          note_role: v.role,
          note_position: 1,
        },
      });
    },
    [header, saveHeader],
  );

  const switchPersona = useCallback(
    (avatar: string) => {
      setActivePersona(avatar);
      setSheet(null);
      if (syncToPc && client) {
        void syncPersonaToPc(client, avatar).then((ok) => {
          if (ok) void queryClient.invalidateQueries({ queryKey: ['settings'] });
        });
      }
    },
    [setActivePersona, syncToPc, client, queryClient],
  );

  const toggleLore = useCallback((uid: string) => {
    setDisabledLore((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  // Compute which lorebook entries would fire for the next reply (for the "aktiv" badge).
  const openLore = useCallback(() => {
    if (lorebook && engine) {
      try {
        const hist = historyFromMessages(messages, character?.name ?? '');
        const wi = checkWorldInfo({
          entries: lorebook.entries,
          chatMessages: hist.map((m) => `${m.name}: ${m.mes}`),
          settings: lorebook.settings,
          maxContext: engine.maxContext,
          identity: engine.identity,
          countTokens: estimateTokens,
        });
        const fired = new Set<string>();
        // Re-run match to tag active entries by uid (cheap: compare included content).
        const active = new Set([...wi.before.split('\n'), ...wi.after.split('\n'), ...wi.depth.map((d) => d.content)]);
        lorebook.entries.forEach((e, i) => {
          if (e.content && active.has(e.content)) fired.add(entryUid(e, i));
        });
        setActiveLore(fired);
      } catch {
        setActiveLore(new Set());
      }
    }
    setSheet('lore');
  }, [lorebook, engine, messages, character]);

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

  const continueLast = useCallback(async () => {
    if (streaming || messages.length === 0) return;
    const lastIdx = messages.length - 1;
    const m = messages[lastIdx];
    if (!m || m.is_user) return;
    await runGeneration(messages, lastIdx, 'continue');
  }, [streaming, messages, runGeneration]);

  const deleteMessage = useCallback(
    (index: number) => {
      let updated: StChatMessage[] = [];
      setMessages((prev) => {
        const next = prev.filter((_, i) => i !== index);
        updated = next;
        return next;
      });
      void persist(updated);
    },
    [persist],
  );

  const toggleHide = useCallback(
    (index: number) => {
      let updated: StChatMessage[] = [];
      setMessages((prev) => {
        const next = [...prev];
        const cur = next[index];
        if (cur) next[index] = { ...cur, is_system: !cur.is_system };
        updated = next;
        return next;
      });
      void persist(updated);
    },
    [persist],
  );

  const copyMessage = useCallback(
    async (index: number) => {
      const m = messages[index];
      if (m) await Clipboard.setStringAsync(currentSwipeText(m));
    },
    [messages],
  );

  // Read a message aloud with the device's own TTS (no server TTS config needed).
  const speakMessage = useCallback(
    (index: number) => {
      const m = messages[index];
      if (!m) return;
      // Strip RP markup so the asterisks/quotes aren't read literally.
      const plain = currentSwipeText(m)
        .replace(/[*_`#>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      Speech.stop();
      if (plain) Speech.speak(plain);
    },
    [messages],
  );

  const branchFrom = useCallback(
    async (index: number) => {
      if (!client || !character) return;
      const branchMsgs = messages.slice(0, index + 1);
      const newFile = `${character.name} - ${nowSendDate()} (Branch)`;
      const branchHeader = createChatHeader({
        userName: engine?.identity.user ?? 'User',
        characterName: character.name,
        createDate: nowSendDate(),
      });
      const res = await saveChat(client, {
        avatarUrl,
        fileName: newFile,
        chat: { header: branchHeader, messages: branchMsgs },
        force: true,
      });
      if (res.ok) {
        router.replace({ pathname: '/chat/[avatar]/[file]', params: { avatar: avatarUrl, file: newFile } });
      } else {
        Alert.alert('Fehler', 'Branch konnte nicht erstellt werden.');
      }
    },
    [client, character, messages, engine, avatarUrl],
  );

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
  const canContinue = !streaming && !!last && !last.is_user;
  const swipeCount = last?.swipes?.length ?? 1;
  const swipeId = (last?.swipe_id ?? 0) + 1;

  const menuMsg = menuIndex != null ? messages[menuIndex] : null;
  const menuIsLastAssistant =
    menuIndex != null && menuIndex === messages.length - 1 && !!menuMsg && !menuMsg.is_user;
  const closeMenu = () => setMenuIndex(null);

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
        <Pressable
          onPress={() => router.push({ pathname: '/character/[avatar]', params: { avatar: avatarUrl } })}
          className="flex-1 flex-row items-center gap-2 active:opacity-70"
        >
          <Avatar avatar={avatarUrl} name={character?.name ?? '?'} size={36} />
          <View className="flex-1">
            <Text className="text-lg font-semibold text-white" numberOfLines={1}>
              {character?.name ?? 'Chat'}
            </Text>
            {personas.length > 0 && (
              <Pressable onPress={() => setSheet('persona')} className="self-start active:opacity-60">
                <Text className="text-xs text-muted" numberOfLines={1}>
                  als {personas.find((p) => p.avatar === activePersonaAvatar)?.name ?? 'Persona wählen'} ▾
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
        <Pressable onPress={() => setSheet('note')} className="h-9 w-9 items-center justify-center active:opacity-60">
          <Text className={`text-lg ${authorsNote ? 'text-primary' : 'text-muted'}`}>✎</Text>
        </Pressable>
        {!!lorebook && (
          <Pressable onPress={openLore} className="h-9 w-9 items-center justify-center active:opacity-60">
            <Text className="text-lg text-muted">📖</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setSheet('quick')} className="h-9 w-9 items-center justify-center active:opacity-60">
          <Text className="text-lg text-muted">⚙︎</Text>
        </Pressable>
      </View>

      {backend.data && !backend.data.connected && (
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          className="bg-red-950 px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-center text-xs text-red-300">
            ⚠ KI-Backend nicht verbunden - Generierung schlägt fehl. Tippen zum Prüfen.
          </Text>
        </Pressable>
      )}
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={(m, i) => m._cid ?? String(i)}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item, index }) => (
          <Bubble
            message={item}
            charAvatar={avatarUrl}
            plain={streaming && index === messages.length - 1}
            onLongPress={() => setMenuIndex(index)}
          />
        )}
      />

      {showSwipeBar && (
        <View className="flex-row items-center justify-center gap-4 pb-1">
          <Pressable onPress={regenerate} className="rounded-full bg-surface2 px-3 py-1 active:opacity-70">
            <Text className="text-sm text-white">↻</Text>
          </Pressable>
          <Pressable onPress={() => cycleSwipe(-1)} className="px-3 py-1 active:opacity-60">
            <Text className="text-lg text-muted">‹</Text>
          </Pressable>
          <Text className="text-xs text-muted">
            {swipeId}/{swipeCount}
          </Text>
          <Pressable onPress={() => cycleSwipe(1)} className="px-3 py-1 active:opacity-60">
            <Text className="text-lg text-muted">›</Text>
          </Pressable>
          <Pressable
            onPress={() => void continueLast()}
            className="rounded-full bg-surface2 px-3 py-1 active:opacity-70"
          >
            <Text className="text-sm text-white">→|</Text>
          </Pressable>
        </View>
      )}

      {pendingImage && (
        <View className="flex-row items-center gap-2 border-t border-border bg-surface px-3 pt-2">
          <Image source={{ uri: pendingImage }} style={{ width: 44, height: 44, borderRadius: 8 }} />
          <Text className="flex-1 text-xs text-muted">Bild angehängt</Text>
          <Pressable onPress={() => setPendingImage(null)} className="h-8 w-8 items-center justify-center active:opacity-60">
            <Text className="text-lg text-muted">✕</Text>
          </Pressable>
        </View>
      )}
      <View
        style={{ paddingBottom: kbVisible ? 8 : Math.max(insets.bottom, 8) }}
        className="flex-row items-end gap-2 border-t border-border bg-surface px-3 pt-2"
      >
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setPlusMenu(true);
          }}
          disabled={streaming}
          className="h-11 w-9 items-center justify-center active:opacity-60 disabled:opacity-30"
        >
          <Text className="text-3xl leading-9 text-muted">＋</Text>
        </Pressable>
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
            disabled={!input.trim() && !pendingImage}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80 disabled:opacity-40"
          >
            <Text className="text-lg text-white">↑</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={plusMenu} transparent animationType="fade" onRequestClose={() => setPlusMenu(false)}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setPlusMenu(false)}>
          <Pressable
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="rounded-t-3xl bg-surface px-2 pt-2"
          >
            {canContinue && (
              <ActionRow
                icon="→|"
                label="Fortsetzen (letzte Antwort verlängern)"
                onPress={() => {
                  setPlusMenu(false);
                  void continueLast();
                }}
              />
            )}
            {engine?.mode === 'cc' ? (
              <ActionRow
                icon="📎"
                label="Bild anhängen"
                onPress={() => {
                  setPlusMenu(false);
                  void pickImage();
                }}
              />
            ) : (
              <ActionRow
                icon="✍︎"
                label="KI schreibt meinen Zug (Impersonate)"
                onPress={() => {
                  setPlusMenu(false);
                  void impersonate();
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={menuIndex != null} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={closeMenu}>
          <Pressable
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="rounded-t-3xl bg-surface px-2 pt-2"
          >
            <ActionRow
              icon="⧉"
              label="Kopieren"
              onPress={() => {
                if (menuIndex != null) void copyMessage(menuIndex);
                closeMenu();
              }}
            />
            <ActionRow
              icon="✎"
              label="Bearbeiten"
              onPress={() => {
                if (menuIndex != null) startEdit(menuIndex);
                closeMenu();
              }}
            />
            <ActionRow
              icon="🔊"
              label="Vorlesen"
              onPress={() => {
                if (menuIndex != null) speakMessage(menuIndex);
                closeMenu();
              }}
            />
            {menuIsLastAssistant && !streaming && (
              <>
                <ActionRow
                  icon="↳"
                  label="Fortsetzen"
                  onPress={() => {
                    closeMenu();
                    void continueLast();
                  }}
                />
                <ActionRow
                  icon="↻"
                  label="Neu generieren"
                  onPress={() => {
                    closeMenu();
                    void regenerate();
                  }}
                />
              </>
            )}
            <ActionRow
              icon="⑃"
              label="Ab hier verzweigen"
              onPress={() => {
                const idx = menuIndex;
                closeMenu();
                if (idx != null) void branchFrom(idx);
              }}
            />
            <ActionRow
              icon={menuMsg?.is_system ? '◌' : '◍'}
              label={menuMsg?.is_system ? 'Wieder einblenden' : 'Aus Kontext ausblenden'}
              onPress={() => {
                if (menuIndex != null) toggleHide(menuIndex);
                closeMenu();
              }}
            />
            <ActionRow
              icon="🗑"
              label="Löschen"
              destructive
              onPress={() => {
                const idx = menuIndex;
                closeMenu();
                if (idx == null) return;
                Alert.alert('Löschen', 'Diese Nachricht löschen?', [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Löschen', style: 'destructive', onPress: () => deleteMessage(idx) },
                ]);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setEditing(null)}>
          <Pressable style={{ paddingBottom: sheetPadBottom }} className="rounded-t-3xl bg-surface px-4 pt-4">
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
        </KeyboardAvoidingView>
      </Modal>

      <PickerSheet
        visible={sheet === 'persona'}
        title="Persona wählen"
        options={personas.map((p): PickerOption => ({
          id: p.avatar,
          label: p.name,
          sublabel: p.description ? p.description.slice(0, 60) : undefined,
        }))}
        activeId={activePersonaAvatar}
        onSelect={switchPersona}
        onClose={() => setSheet(null)}
      />
      <AuthorsNoteSheet
        visible={sheet === 'note'}
        initial={authorsNoteValue}
        onSave={saveAuthorsNote}
        onClose={() => setSheet(null)}
      />
      <QuickSettingsSheet
        visible={sheet === 'quick'}
        engine={engine}
        client={client}
        onClose={() => setSheet(null)}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ['settings'] })}
      />
      <LoreSheet
        visible={sheet === 'lore'}
        entries={lorebook?.entries ?? []}
        activeUids={activeLore}
        disabledUids={disabledLore}
        onToggle={toggleLore}
        onClose={() => setSheet(null)}
      />
    </KeyboardAvoidingView>
  );
}

function finalizeAssistant(
  cur: StChatMessage,
  finalText: string,
  mode: GenMode,
  reasoning?: string,
): StChatMessage {
  const finished = nowSendDate();
  const extra = reasoning ? { ...cur.extra, reasoning } : cur.extra;
  const withExtra = (m: StChatMessage): StChatMessage => (extra ? { ...m, extra } : m);
  if (mode === 'swipe') {
    const swipes = [...(cur.swipes ?? [cur.mes]), finalText];
    return withExtra({ ...cur, mes: finalText, swipes, swipe_id: swipes.length - 1, gen_finished: finished });
  }
  if (mode === 'regenerate' || mode === 'continue') {
    // Update the active swipe in place (continue extends it; regenerate replaces it).
    const swipes = cur.swipes ? [...cur.swipes] : [];
    const sid = cur.swipe_id ?? 0;
    if (swipes.length > 0) swipes[sid] = finalText;
    else swipes.push(finalText);
    return withExtra({ ...cur, mes: finalText, swipes, swipe_id: sid, gen_finished: finished });
  }
  return withExtra({ ...cur, mes: finalText, swipes: [finalText], swipe_id: 0, gen_finished: finished });
}

function shortTime(d: string | number | undefined): string {
  if (d == null) return '';
  if (typeof d === 'number') {
    const dt = new Date(d);
    return `${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }
  const m = /@(\d{1,2})h(\d{2})m/.exec(d);
  return m ? `${m[1]}:${m[2]}` : '';
}

const Bubble = memo(function Bubble({
  message,
  charAvatar,
  plain,
  onLongPress,
}: {
  message: StChatMessage;
  charAvatar?: string;
  plain?: boolean;
  onLongPress?: () => void;
}) {
  const text = currentSwipeText(message);
  const isUser = message.is_user;
  const isHidden = message.is_system === true;
  const reasoning = message.extra?.reasoning;
  const showDots = !!plain && text.trim().length === 0;
  const time = shortTime(message.gen_finished || message.send_date);

  const image = message.extra?.image;
  const bubble = (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={350}
      className={`rounded-2xl px-3.5 py-2.5 ${isUser ? 'bg-user' : 'bg-char'} ${isHidden ? 'opacity-50' : ''}`}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: 180, height: 180, borderRadius: 10, marginBottom: text ? 6 : 0 }} resizeMode="cover" />
      ) : null}
      {!isUser && reasoning ? <ReasoningBlock text={reasoning} /> : null}
      {showDots ? (
        <TypingDots thinking={!!reasoning} />
      ) : plain ? (
        <Text className="text-[15px] leading-5 text-white">{text || ' '}</Text>
      ) : (
        <RichText text={text || ' '} />
      )}
    </Pressable>
  );

  if (isUser) {
    return (
      <View className="mb-2 max-w-[88%] self-end">
        {bubble}
        {!!time && <Text className="mr-1 mt-0.5 text-right text-[10px] text-muted">{time}</Text>}
      </View>
    );
  }

  return (
    <View className="mb-2 max-w-[90%] flex-row gap-2 self-start">
      {charAvatar ? <Avatar avatar={charAvatar} name={message.name} size={28} /> : null}
      <View className="flex-1">
        <Text className="mb-0.5 ml-1 text-xs font-semibold text-muted">
          {message.name}
          {isHidden ? '  ·  ausgeblendet' : ''}
        </Text>
        {bubble}
        {!!time && <Text className="ml-1 mt-0.5 text-[10px] text-muted">{time}</Text>}
      </View>
    </View>
  );
});

function ActionRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-2xl px-4 py-3 active:bg-surface2">
      <Text className={`w-6 text-center text-lg ${destructive ? 'text-red-400' : 'text-white'}`}>{icon}</Text>
      <Text className={`text-base ${destructive ? 'text-red-400' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}

function TypingDots({ thinking }: { thinking?: boolean }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <Text className="text-[15px] leading-5 text-muted">
      {thinking ? 'Denkt' : ''}
      {'.'.repeat(n)}
    </Text>
  );
}

function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-1.5">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center active:opacity-60">
        <Text className="text-xs text-muted">{open ? '▾' : '▸'} Gedanken</Text>
      </Pressable>
      {open && (
        <Text selectable className="mt-1 border-l-2 border-border pl-2 text-xs italic text-muted">
          {text}
        </Text>
      )}
    </View>
  );
}
