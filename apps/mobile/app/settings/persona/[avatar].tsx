import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { PERSONA_POSITIONS, deleteUserAvatar } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useProfiles } from '@/stores/profilesStore';
import { useConnectionProfiles } from '@/hooks/useConnectionProfiles';
import { syncDefaultPersona, syncPersonaDelete, syncPersonaUpsert } from '@/lib/sync';
import { uploadPersonaImage } from '@/lib/personaImage';
import { Avatar } from '@/components/Avatar';
import { SegmentedRow, TextAreaRow, ToggleRow } from '@/components/form/rows';
import { AppText, Button, EmptyState, Field, IconButton, SliderRow } from '@/components/ui';
import { colors } from '@/theme/tokens';

interface Draft {
  name: string;
  description: string;
  position: number;
  depth: number;
  role: number;
}

/**
 * Per-persona editor (issue #12): name, description, prompt position (the desktop
 * persona_description_positions select), depth+role for in-chat injection, default-persona
 * toggle, picture replacement (overwrite_name upload) and deletion.
 */
export default function PersonaEditorScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { avatar } = useLocalSearchParams<{ avatar: string }>();
  const avatarId = typeof avatar === 'string' ? avatar : '';
  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const activePersonaAvatar = useProfiles((s) => s.activePersonaAvatar);
  const setActivePersona = useProfiles((s) => s.setActivePersona);
  const { personas, defaultPersonaAvatar, isLoading } = useConnectionProfiles();

  const persona = personas.find((p) => p.avatar === avatarId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgVersion, setImgVersion] = useState(0);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Seed the draft once per persona (state-from-previous-render pattern); later refetches
  // must not clobber in-progress edits.
  if (persona && seededFor !== avatarId) {
    setSeededFor(avatarId);
    setDraft({
      name: persona.name,
      description: persona.description,
      // The desktop migrates the deprecated AFTER_CHAR position to IN_PROMPT on load.
      position: persona.position === PERSONA_POSITIONS.AFTER_CHAR ? PERSONA_POSITIONS.IN_PROMPT : persona.position,
      depth: persona.depth,
      role: persona.role,
    });
  }

  const dirty = useMemo(() => {
    if (!persona || !draft) return false;
    return (
      draft.name !== persona.name ||
      draft.description !== persona.description ||
      draft.position !== persona.position ||
      draft.depth !== persona.depth ||
      draft.role !== persona.role
    );
  }, [persona, draft]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['settings'] });

  const positionOptions = [
    { value: PERSONA_POSITIONS.NONE, label: t('personas.positionNone') },
    { value: PERSONA_POSITIONS.IN_PROMPT, label: t('personas.positionInPrompt') },
    { value: PERSONA_POSITIONS.TOP_AN, label: t('personas.positionTopAn') },
    { value: PERSONA_POSITIONS.BOTTOM_AN, label: t('personas.positionBottomAn') },
    { value: PERSONA_POSITIONS.AT_DEPTH, label: t('personas.positionAtDepth') },
  ];

  const roleOptions = [
    { value: 0, label: t('personas.roleSystem') },
    { value: 1, label: t('personas.roleUser') },
    { value: 2, label: t('personas.roleAssistant') },
  ];

  const doSave = async () => {
    if (!client || !draft || !dirty || saving) return;
    setSaving(true);
    try {
      const ok = await syncPersonaUpsert(client, avatarId, {
        name: draft.name.trim() || persona?.name || '',
        description: draft.description,
        position: draft.position,
        depth: draft.depth,
        role: draft.role,
      });
      if (!ok) {
        Alert.alert(t('common.error'), t('personas.saveFailed'));
        return;
      }
      invalidate();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const toggleDefault = async (on: boolean) => {
    if (!client || busy) return;
    setBusy(true);
    try {
      const ok = await syncDefaultPersona(client, on ? avatarId : null);
      if (ok) invalidate();
      else Alert.alert(t('common.error'), t('personas.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const changePicture = async () => {
    if (!client || busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3], // desktop avatar crop aspect (512x768)
      quality: 0.9,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setBusy(true);
    try {
      const ok = await uploadPersonaImage(
        client,
        { base64: asset.base64, mime: asset.mimeType ?? 'image/jpeg', width: asset.width, height: asset.height },
        avatarId,
      );
      if (ok) {
        setImgVersion((v) => v + 1); // bust the thumbnail cache
        invalidate();
      } else {
        Alert.alert(t('common.error'), t('personas.uploadFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  const doDelete = () => {
    if (!client) return;
    Alert.alert(t('personas.deleteTitle'), t('personas.deleteConfirm', { name: persona?.name ?? avatarId }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const fileOk = await deleteUserAvatar(client, avatarId);
            const settingsOk = await syncPersonaDelete(client, avatarId);
            if (!fileOk && !settingsOk) {
              Alert.alert(t('common.error'), t('personas.deleteFailed'));
              return;
            }
            if (activePersonaAvatar === avatarId) setActivePersona(undefined);
            invalidate();
            router.back();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center gap-1 border-b border-border bg-surface px-1 pb-2"
      >
        <IconButton name="back" size="lg" accessibilityLabel={t('a11y.back')} haptic={false} onPress={() => router.back()} />
        <View className="flex-1">
          <AppText variant="h2" numberOfLines={1}>
            {persona?.name ?? t('personas.title')}
          </AppText>
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {avatarId}
          </AppText>
        </View>
      </View>

      {!persona || !draft ? (
        <EmptyState icon="user" title={isLoading ? t('common.loading') : t('personas.notFound')} />
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Picture */}
            <View className="mb-4 flex-row items-center gap-4">
              <Avatar avatar={avatarId} name={draft.name} type="persona" size={72} cacheKey={imgVersion} />
              <View className="flex-1">
                <Button
                  label={t('personas.changePicture')}
                  variant="secondary"
                  leftIcon="camera"
                  loading={busy}
                  onPress={() => void changePicture()}
                />
              </View>
            </View>

            <View className="mb-3">
              <Field
                label={t('personas.name')}
                value={draft.name}
                onChangeText={(name) => setDraft((d) => (d ? { ...d, name } : d))}
                placeholder={t('personas.namePlaceholder')}
              />
            </View>

            <TextAreaRow
              label={t('personas.description')}
              hint={t('personas.descriptionPlaceholder')}
              value={draft.description}
              onChange={(description) => setDraft((d) => (d ? { ...d, description } : d))}
            />

            <SegmentedRow
              label={t('personas.position')}
              value={draft.position}
              options={positionOptions}
              onChange={(v) => setDraft((d) => (d ? { ...d, position: Number(v) } : d))}
            />

            {draft.position === PERSONA_POSITIONS.AT_DEPTH ? (
              <>
                <SliderRow
                  label={t('personas.depth')}
                  value={draft.depth}
                  min={0}
                  max={20}
                  step={1}
                  hardMax={9999}
                  onChange={(depth) => setDraft((d) => (d ? { ...d, depth } : d))}
                />
                <SegmentedRow
                  label={t('personas.role')}
                  value={draft.role}
                  options={roleOptions}
                  onChange={(v) => setDraft((d) => (d ? { ...d, role: Number(v) } : d))}
                />
              </>
            ) : null}

            <ToggleRow
              label={t('personas.defaultPersona')}
              hint={t('personas.defaultPersonaHint')}
              value={defaultPersonaAvatar === avatarId}
              onChange={(on) => void toggleDefault(on)}
            />

            <View className="mt-4">
              <Button label={t('personas.deletePersona')} variant="danger" leftIcon="delete" onPress={doDelete} />
            </View>
          </ScrollView>

          <View
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="flex-row gap-2 border-t border-border bg-surface px-4 pt-3"
          >
            <View className="flex-1">
              <Button label={t('common.cancel')} variant="secondary" onPress={() => router.back()} />
            </View>
            <View className="flex-1">
              <Button
                label={saving ? t('common.saving') : t('common.save')}
                loading={saving}
                disabled={!dirty || !client}
                onPress={() => void doSave()}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}
