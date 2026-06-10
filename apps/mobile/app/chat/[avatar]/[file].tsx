import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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
import { usePrefs } from '@/stores/prefsStore';
import { streamGeneration } from '@/lib/generate';
import { streamingSession } from '@/lib/streamingSession';
import { streamDebug } from '@/lib/streamDebug';
import { syncPersonaToPc } from '@/lib/sync';
import { ensureIds, makeAssistantMessage, makeUserMessage, nowSendDate } from '@/lib/messages';
import { clearChatDraft, readChatDraft, writeChatDraft } from '@/lib/persist';
import { chunkForSpeech, plainForSpeech } from '@/lib/tts';
import { RichText } from '@/components/RichText';
import { ReadAloudBar } from '@/components/ReadAloudBar';
import { StreamingBubbleContent, ReasoningBlock } from '@/components/StreamingText';
import { Avatar } from '@/components/Avatar';
import { PickerSheet, type PickerOption } from '@/components/PickerSheet';
import { AuthorsNoteSheet, type AuthorsNoteValue } from '@/components/AuthorsNoteSheet';
import { QuickSettingsSheet } from '@/components/QuickSettingsSheet';
import { LoreSheet, entryUid } from '@/components/LoreSheet';
import { AppText, Button, IconButton, Sheet, SheetActionRow } from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors, fonts } from '@/theme/tokens';
import { haptics } from '@/theme/haptics';
import { useReducedMotion } from '@/theme/motion';
import { useBottomInset } from '@/theme/insets';

type GenMode = 'new' | 'regenerate' | 'swipe' | 'continue';

/** Read persisted World-Info timed-effect state from a chat header (a copy, to mutate freely). */
function readTimedState(h: StChatHeader): TimedWorldInfoState {
  const tw = (h.chat_metadata as { timedWorldInfo?: TimedWorldInfoState } | undefined)?.timedWorldInfo;
  return tw && tw.sticky && tw.cooldown
    ? { sticky: { ...tw.sticky }, cooldown: { ...tw.cooldown } }
    : emptyTimedState();
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ avatar: string; file: string; fresh?: string }>();
  const avatarUrl = String(params.avatar);
  const fileName = String(params.file);
  const isFresh = params.fresh === '1';

  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const syncToPc = useProfiles((s) => s.syncToPc);
  const smoothStreaming = usePrefs((s) => s.smoothStreaming);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const kbVisible = useKeyboardState((s) => s.isVisible);
  const bottomInset = useBottomInset(16);
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
  const [speaking, setSpeaking] = useState<{ index: number; name: string } | null>(null);
  const speakSessionRef = useRef(0);

  // Author's Note lives in the chat header's chat_metadata (round-trips to the desktop).
  const meta = header?.chat_metadata as Record<string, unknown> | undefined;
  const authorsNoteValue: AuthorsNoteValue = {
    content: typeof meta?.note_prompt === 'string' ? meta.note_prompt : '',
    depth: typeof meta?.note_depth === 'number' ? meta.note_depth : 4,
    role: typeof meta?.note_role === 'number' ? meta.note_role : 0,
  };
  const authorsNote: DepthInjection | undefined = useMemo(
    () =>
      authorsNoteValue.content.trim()
        ? { depth: authorsNoteValue.depth, role: authorsNoteValue.role, content: authorsNoteValue.content }
        : undefined,
    [authorsNoteValue.content, authorsNoteValue.depth, authorsNoteValue.role],
  );

  // Lorebook with user-muted entries removed + the timed-effect state attached. Built on demand at
  // generation time (not during render) so we never read the mutable timed-state ref while rendering.
  const buildEffectiveLorebook = useCallback(
    () =>
      lorebook
        ? {
            entries:
              disabledLore.size > 0
                ? lorebook.entries.filter((e, i) => !disabledLore.has(entryUid(e, i)))
                : lorebook.entries,
            settings: lorebook.settings,
            timedState: timedStateRef.current,
          }
        : undefined,
    [lorebook, disabledLore],
  );

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
          t('chat.unsavedTitle'),
          t('chat.unsavedMessage'),
          [
            { text: t('common.discard'), style: 'destructive', onPress: () => clearChatDraft(avatarUrl, fileName) },
            {
              text: t('common.restore'),
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
  }, [client, character, loaded, isFresh, engine, avatarUrl, fileName, t]);

  // Stop any TTS when leaving the chat.
  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  // Keep the screen awake for the whole generation window (prompt build + token streaming):
  // the display timing out lets Android pause the app and abort the SSE stream mid-reply.
  // `streaming` flips true before the prompt is built, so the lock covers the full request.
  useEffect(() => {
    if (!streaming) return;
    void activateKeepAwakeAsync('generation').catch(() => {});
    return () => {
      void deactivateKeepAwake('generation').catch(() => {});
    };
  }, [streaming]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const openMenu = useCallback((index: number) => setMenuIndex(index), []);

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
        Alert.alert(t('chat.conflictTitle'), t('chat.conflictMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.overwrite'), style: 'destructive', onPress: () => void persist(msgs, true) },
        ]);
      } else if (res.ok) {
        clearChatDraft(avatarUrl, fileName);
      }
    },
    [client, header, avatarUrl, fileName, lorebook, t],
  );

  // `fullMsgs` is the complete on-screen array at generation start (context + placeholder).
  // Finalize/persist are computed from it directly - NEVER from a setMessages-updater closure:
  // React only runs updaters at render time, so a captured variable can still be empty when
  // persist() reads it (that silently skipped saves, and once caused a chat wipe). Message
  // actions are disabled while streaming, so `fullMsgs` cannot go stale.
  const runGeneration = useCallback(
    async (fullMsgs: StChatMessage[], contextMsgs: StChatMessage[], assistantIndex: number, mode: GenMode) => {
      if (!client || !engine || !character) return;
      const effectiveLorebook = buildEffectiveLorebook();
      const isContinue = mode === 'continue';
      const prefix = isContinue ? currentSwipeText(contextMsgs[assistantIndex]!) : '';
      setStreaming(true);
      // Streamed text renders through `streamingSession` (only the live bubble re-renders per
      // token); the messages array stays untouched until finalize. Seeding with the continue
      // prefix shows the existing reply instantly and animates only the new text.
      streamingSession.start({
        smooth: smoothStreaming && !reducedMotion,
        ...(prefix ? { initialText: prefix } : {}),
      });
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
          streamingSession.update(finalText, acc.reasoning);
        }
      } catch {
        // aborted / network error - handled below via gotText/abortedByUser
      } finally {
        abortRef.current = null;
        // ST 1:1: an empty (non-aborted) result is "No message generated" - never keep/save junk.
        const failed = !gotText && !abortedByUserRef.current;
        // Drain the visual pacer (bounded) so the animated tail isn't cut; on abort/failure
        // reveal everything instantly. Finalize always uses the raw network text (`finalText`).
        if (failed || abortedByUserRef.current) streamingSession.flushNow();
        else await streamingSession.end();
        streamDebug.dump('gen');
        setStreaming(false);
        const next = [...fullMsgs];
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
        setMessages(next);
        streamingSession.reset();
        void persist(next);
        scrollToEnd();
        if (failed) {
          Alert.alert(
            t('chat.noResponseTitle'),
            t('chat.noResponseMessage'),
          );
        }
      }
    },
    [client, engine, character, persist, scrollToEnd, buildEffectiveLorebook, authorsNote, header, smoothStreaming, reducedMotion, t],
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
    const full = [...base, assistant];
    setMessages(full);
    scrollToEnd();
    await runGeneration(full, base, base.length, 'new');
  }, [input, pendingImage, streaming, character, engine, messages, runGeneration, scrollToEnd]);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('chat.noPhotoAccessTitle'), t('chat.noPhotoAccessMessage'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
    const asset = res.canceled ? undefined : res.assets[0];
    if (asset?.base64) setPendingImage(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
  }, [t]);

  const regenerate = useCallback(async () => {
    if (streaming || messages.length === 0) return;
    const lastIdx = messages.length - 1;
    if (messages[lastIdx]?.is_user) return;
    const context = messages.slice(0, lastIdx);
    await runGeneration(messages, context, lastIdx, 'regenerate');
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
        void runGeneration(messages, messages.slice(0, lastIdx), lastIdx, 'swipe');
        return;
      }
      const nsid = Math.max(0, Math.min(swipes.length - 1, sid + dir));
      const next = [...messages];
      next[lastIdx] = { ...m, swipe_id: nsid, mes: swipes[nsid] ?? m.mes };
      setMessages(next);
      void persist(next);
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
    const effectiveLorebook = buildEffectiveLorebook();
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
  }, [streaming, client, engine, character, messages, buildEffectiveLorebook, authorsNote]);

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
    const next = [...messages];
    const cur = next[index];
    if (cur) {
      const swipes = cur.swipes ? [...cur.swipes] : undefined;
      const sid = cur.swipe_id ?? 0;
      if (swipes && swipes[sid] !== undefined) swipes[sid] = text;
      next[index] = { ...cur, mes: text, ...(swipes ? { swipes } : {}) };
    }
    setMessages(next);
    setEditing(null);
    void persist(next);
  }, [editing, messages, persist]);

  const continueLast = useCallback(async () => {
    if (streaming || messages.length === 0) return;
    const lastIdx = messages.length - 1;
    const m = messages[lastIdx];
    if (!m || m.is_user) return;
    await runGeneration(messages, messages, lastIdx, 'continue');
  }, [streaming, messages, runGeneration]);

  const deleteMessage = useCallback(
    (index: number) => {
      const next = messages.filter((_, i) => i !== index);
      setMessages(next);
      void persist(next);
    },
    [messages, persist],
  );

  const toggleHide = useCallback(
    (index: number) => {
      const next = [...messages];
      const cur = next[index];
      if (cur) next[index] = { ...cur, is_system: !cur.is_system };
      setMessages(next);
      void persist(next);
    },
    [messages, persist],
  );

  const copyMessage = useCallback(
    async (index: number) => {
      const m = messages[index];
      if (m) await Clipboard.setStringAsync(currentSwipeText(m));
    },
    [messages],
  );

  // Read a message aloud with the device's own TTS (no server TTS config needed). The session
  // token guards the stop->speak race: a flushed utterance's onStopped arrives AFTER the next
  // read already set state and must not clear the new bar.
  const stopSpeaking = useCallback(() => {
    speakSessionRef.current++;
    void Speech.stop();
    setSpeaking(null);
  }, []);

  const speakMessage = useCallback(
    (index: number) => {
      const m = messages[index];
      if (!m) return;
      const plain = plainForSpeech(currentSwipeText(m));
      const session = ++speakSessionRef.current;
      void Speech.stop(); // flushes the whole native queue
      if (!plain) {
        setSpeaking(null);
        return;
      }
      const clear = () => {
        if (speakSessionRef.current === session) setSpeaking(null);
      };
      const chunks = chunkForSpeech(plain);
      chunks.forEach((c, i) =>
        Speech.speak(c, {
          ...(i === chunks.length - 1 ? { onDone: clear } : {}),
          onStopped: clear,
          onError: clear,
        }),
      );
      // Capture the name now - the bar must never dereference messages[index] later.
      setSpeaking({ index, name: m.name });
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
        Alert.alert(t('common.error'), t('chat.branchFailed'));
      }
    },
    [client, character, messages, engine, avatarUrl, t],
  );

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.accent} />
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center gap-0.5 border-b border-border bg-surface px-1 pb-2"
      >
        <IconButton
          name="back"
          size="lg"
          accessibilityLabel={t('a11y.back')}
          haptic={false}
          onPress={() => router.back()}
        />
        <Pressable
          onPress={() => router.push({ pathname: '/character/[avatar]', params: { avatar: avatarUrl } })}
          className="flex-1 flex-row items-center gap-2.5 active:opacity-70"
        >
          <Avatar avatar={avatarUrl} name={character?.name ?? '?'} size={38} />
          <View className="flex-1">
            <AppText variant="h2" numberOfLines={1}>
              {character?.name ?? 'Chat'}
            </AppText>
            {personas.length > 0 && (
              <Pressable onPress={() => setSheet('persona')} className="flex-row items-center self-start active:opacity-60">
                <AppText variant="caption" color="muted" numberOfLines={1}>
                  {t('chat.asPersona', {
                    name: personas.find((p) => p.avatar === activePersonaAvatar)?.name ?? t('chat.choosePersona'),
                  })}
                </AppText>
                <Icon name="chevronDown" size={13} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </Pressable>
        <IconButton name="note" accessibilityLabel={t('a11y.authorsNote')} active={!!authorsNote} onPress={() => setSheet('note')} />
        {!!lorebook && <IconButton name="lore" accessibilityLabel={t('a11y.lorebook')} onPress={openLore} />}
        <IconButton name="tune" accessibilityLabel={t('a11y.generationSettings')} onPress={() => setSheet('quick')} />
      </View>

      {backend.data && !backend.data.connected && (
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          className="flex-row items-center justify-center gap-2 bg-danger-soft px-3 py-2 active:opacity-70"
        >
          <Icon name="warning" size={14} color={colors.danger} />
          <AppText variant="caption" color="danger" numberOfLines={1} style={{ flexShrink: 1 }}>
            {t('chat.backendWarning')}
          </AppText>
        </Pressable>
      )}
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={(m, i) => m._cid ?? String(i)}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        // Pin to the bottom while the streaming bubble grows, but stop following when the
        // user scrolls up to read (ST-web-like). Replaces scroll-to-end on content size
        // change, which fought the user and fired per streamed token.
        maintainVisibleContentPosition={{ autoscrollToBottomThreshold: 0.2, startRenderingFromBottom: true }}
        renderItem={({ item, index }) => (
          <Bubble
            message={item}
            charAvatar={avatarUrl}
            plain={streaming && index === messages.length - 1}
            index={index}
            // Message actions are disabled while generating (like desktop ST) - finalize
            // computes from the generation-start array, so it must not change mid-stream.
            onLongPress={streaming ? undefined : openMenu}
          />
        )}
      />

      {showSwipeBar && (
        <View className="flex-row items-center justify-center gap-2 pb-1 pt-0.5">
          <IconButton name="regenerate" size="sm" surface accessibilityLabel={t('a11y.regenerate')} onPress={regenerate} />
          <View className="flex-row items-center rounded-pill bg-surface-2 px-1">
            <IconButton name="chevronLeft" size="sm" accessibilityLabel={t('a11y.previousSwipe')} onPress={() => cycleSwipe(-1)} />
            <AppText variant="label" color="muted" style={{ minWidth: 36, textAlign: 'center' }}>
              {swipeId}/{swipeCount}
            </AppText>
            <IconButton name="chevronRight" size="sm" accessibilityLabel={t('a11y.nextSwipe')} onPress={() => cycleSwipe(1)} />
          </View>
          <IconButton name="fastForward" size="sm" surface accessibilityLabel={t('a11y.continueReply')} onPress={() => void continueLast()} />
        </View>
      )}

      {speaking && <ReadAloudBar name={speaking.name} onStop={stopSpeaking} />}

      {pendingImage && (
        <View className="flex-row items-center gap-3 border-t border-border bg-surface px-3 pt-2">
          <Image source={{ uri: pendingImage }} style={{ width: 44, height: 44, borderRadius: 10 }} />
          <AppText variant="caption" color="muted" style={{ flex: 1 }}>
            {t('chat.imageAttached')}
          </AppText>
          <IconButton name="close" size="sm" accessibilityLabel={t('a11y.removeImage')} haptic={false} onPress={() => setPendingImage(null)} />
        </View>
      )}
      <View
        style={{ paddingBottom: kbVisible ? 10 : bottomInset }}
        className="flex-row items-end gap-2 border-t border-border bg-surface px-2 pt-2"
      >
        <IconButton
          name="plus"
          accessibilityLabel={t('a11y.more')}
          disabled={streaming}
          onPress={() => {
            Keyboard.dismiss();
            setPlusMenu(true);
          }}
        />
        <TextInput
          value={input}
          onChangeText={setInput}
          onFocus={() => setTimeout(scrollToEnd, 250)}
          multiline
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={colors.textSubtle}
          editable={!streaming}
          className="max-h-32 flex-1 rounded-3xl border border-border bg-surface-2 px-4 py-2.5 text-text"
          style={{ fontFamily: fonts.regular, fontSize: 16, minHeight: 44 }}
        />
        {streaming ? (
          <Pressable
            onPress={stop}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.stop')}
            className="h-11 w-11 items-center justify-center rounded-full bg-danger active:opacity-80"
          >
            <Icon name="stop" size={18} color={colors.onAccent} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              haptics.tap();
              void send();
            }}
            disabled={!input.trim() && !pendingImage}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.send')}
            className="h-11 w-11 items-center justify-center rounded-full bg-accent active:bg-accent-pressed disabled:opacity-40"
          >
            <Icon name="send" size={18} color={colors.onAccent} />
          </Pressable>
        )}
      </View>

      <Sheet visible={plusMenu} onClose={() => setPlusMenu(false)}>
        {canContinue && (
          <SheetActionRow
            icon="fastForward"
            label={t('chat.continueExtend')}
            onPress={() => {
              setPlusMenu(false);
              void continueLast();
            }}
          />
        )}
        {engine?.mode === 'cc' ? (
          <SheetActionRow
            icon="attach"
            label={t('chat.attachImage')}
            onPress={() => {
              setPlusMenu(false);
              void pickImage();
            }}
          />
        ) : (
          <SheetActionRow
            icon="impersonate"
            label={t('chat.impersonate')}
            onPress={() => {
              setPlusMenu(false);
              void impersonate();
            }}
          />
        )}
      </Sheet>

      <Sheet visible={menuIndex != null} onClose={closeMenu} title={t('a11y.messageActions')}>
        <SheetActionRow
          icon="copy"
          label={t('chat.copy')}
          onPress={() => {
            if (menuIndex != null) void copyMessage(menuIndex);
            closeMenu();
          }}
        />
        <SheetActionRow
          icon="edit"
          label={t('chat.edit')}
          onPress={() => {
            if (menuIndex != null) startEdit(menuIndex);
            closeMenu();
          }}
        />
        <SheetActionRow
          icon="speak"
          label={t('chat.readAloud')}
          onPress={() => {
            if (menuIndex != null) speakMessage(menuIndex);
            closeMenu();
          }}
        />
        {menuIsLastAssistant && !streaming && (
          <>
            <SheetActionRow
              icon="continue"
              label={t('chat.continue')}
              onPress={() => {
                closeMenu();
                void continueLast();
              }}
            />
            <SheetActionRow
              icon="regenerate"
              label={t('chat.regenerate')}
              onPress={() => {
                closeMenu();
                void regenerate();
              }}
            />
          </>
        )}
        <SheetActionRow
          icon="branch"
          label={t('chat.branchFromHere')}
          onPress={() => {
            const idx = menuIndex;
            closeMenu();
            if (idx != null) void branchFrom(idx);
          }}
        />
        <SheetActionRow
          icon={menuMsg?.is_system ? 'show' : 'hide'}
          label={menuMsg?.is_system ? t('chat.unhide') : t('chat.hideFromContext')}
          onPress={() => {
            if (menuIndex != null) toggleHide(menuIndex);
            closeMenu();
          }}
        />
        <SheetActionRow
          icon="delete"
          label={t('common.delete')}
          destructive
          onPress={() => {
            const idx = menuIndex;
            closeMenu();
            if (idx == null) return;
            Alert.alert(t('common.delete'), t('chat.deleteConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.delete'), style: 'destructive', onPress: () => deleteMessage(idx) },
            ]);
          }}
        />
      </Sheet>

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={t('chat.editMessage')}>
        <View className="px-2 pb-1">
          <TextInput
            value={editing?.text ?? ''}
            onChangeText={(text) => setEditing((e) => (e ? { ...e, text } : e))}
            multiline
            autoFocus
            placeholderTextColor={colors.textSubtle}
            className="rounded-field border border-border bg-surface-2 px-4 py-3 text-text"
            style={{ fontFamily: fonts.regular, fontSize: 16, minHeight: 110, maxHeight: 280, textAlignVertical: 'top' }}
          />
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button label={t('common.cancel')} variant="secondary" onPress={() => setEditing(null)} />
            </View>
            <View className="flex-1">
              <Button label={t('common.save')} onPress={saveEdit} />
            </View>
          </View>
        </View>
      </Sheet>

      <PickerSheet
        visible={sheet === 'persona'}
        title={t('chat.choosePersona')}
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
  index,
  onLongPress,
}: {
  message: StChatMessage;
  charAvatar?: string;
  /** True for the actively-streaming bubble: content comes from `streamingSession`, not `message`. */
  plain?: boolean;
  index: number;
  onLongPress?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const text = currentSwipeText(message);
  const isUser = message.is_user;
  const isHidden = message.is_system === true;
  const reasoning = message.extra?.reasoning;
  const time = shortTime(message.gen_finished || message.send_date);

  const image = message.extra?.image;
  const bubble = (
    <Pressable
      onLongPress={() => onLongPress?.(index)}
      delayLongPress={350}
      className={`rounded-3xl px-4 py-2.5 ${isUser ? 'bg-user-bubble' : 'bg-char-bubble'} ${isHidden ? 'opacity-50' : ''}`}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: 200, height: 200, borderRadius: 14, marginBottom: text ? 8 : 0 }} resizeMode="cover" />
      ) : null}
      {plain ? (
        <StreamingBubbleContent />
      ) : (
        <>
          {!isUser && reasoning ? <ReasoningBlock text={reasoning} /> : null}
          <RichText text={text || ' '} />
        </>
      )}
    </Pressable>
  );

  if (isUser) {
    return (
      <View className="mb-3 max-w-[86%] self-end">
        {bubble}
        {!!time && (
          <AppText variant="caption" color="subtle" style={{ marginRight: 6, marginTop: 3, textAlign: 'right' }}>
            {time}
          </AppText>
        )}
      </View>
    );
  }

  return (
    <View className="mb-3 max-w-[92%] flex-row gap-2 self-start">
      {charAvatar ? <Avatar avatar={charAvatar} name={message.name} size={30} /> : null}
      <View className="flex-1">
        <AppText variant="label" color="muted" numberOfLines={1} style={{ marginLeft: 4, marginBottom: 3 }}>
          {message.name}
          {isHidden ? `  ·  ${t('chat.hidden')}` : ''}
        </AppText>
        {bubble}
        {!!time && (
          <AppText variant="caption" color="subtle" style={{ marginLeft: 4, marginTop: 3 }}>
            {time}
          </AppText>
        )}
      </View>
    </View>
  );
});

