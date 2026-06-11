import { useState } from 'react';
import { Alert, Image, ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { deleteUserAvatar } from '@st/core';
import { useConnection } from '@/stores/connectionStore';
import { useProfiles } from '@/stores/profilesStore';
import { useConnectionProfiles } from '@/hooks/useConnectionProfiles';
import { syncPersonaToPc, syncPersonaUpsert } from '@/lib/sync';
import { newPersonaAvatarId, uploadPersonaImage, type PersonaImageSource } from '@/lib/personaImage';
import { PERSONA_DEFAULT_AVATAR_BASE64 } from '@/lib/personaDefaultAvatar';
import { Avatar } from '@/components/Avatar';
import { AppText, Badge, Button, Card, EmptyState, Field, IconButton, Sheet, SkeletonList } from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';

/**
 * Persona manager (issue #12): list every persona from power_user.personas, switch the
 * active one (same semantics as the settings-tab picker), create new personas (avatar
 * image upload + settings entry), and jump into the per-persona editor.
 */
export default function PersonasScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const client = useConnection((s) => s.client);
  const queryClient = useQueryClient();
  const syncToPc = useProfiles((s) => s.syncToPc);
  const { personas, activePersonaAvatar, defaultPersonaAvatar, setActivePersona, isLoading } =
    useConnectionProfiles();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [pickedImage, setPickedImage] = useState<(PersonaImageSource & { uri: string }) | null>(null);
  const [creating, setCreating] = useState(false);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['settings'] });

  // Avatar cache buster: a replaced persona picture keeps its filename, so the thumbnails
  // only refresh when the settings query refetches - key the image URL to that timestamp.
  const settingsUpdatedAt = queryClient.getQueryState(['settings', client?.baseUrl])?.dataUpdatedAt ?? 0;

  const onPickActive = (avatar: string) => {
    setActivePersona(avatar);
    if (syncToPc && client) {
      void syncPersonaToPc(client, avatar).then((ok) => {
        if (ok) invalidate();
      });
    }
  };

  const openEditor = (avatar: string) => {
    router.push({ pathname: '/settings/persona/[avatar]', params: { avatar } });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3], // desktop avatar crop aspect (512x768)
      quality: 0.9,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setPickedImage({
      uri: asset.uri,
      base64: asset.base64,
      mime: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    });
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setNewName('');
    setPickedImage(null);
  };

  const doCreate = async () => {
    const name = newName.trim();
    if (!client || !name || creating) return;
    setCreating(true);
    try {
      const avatarId = newPersonaAvatarId(name);
      const image: PersonaImageSource = pickedImage ?? { base64: PERSONA_DEFAULT_AVATAR_BASE64, mime: 'image/png' };
      const uploaded = await uploadPersonaImage(client, image, avatarId);
      if (!uploaded) {
        Alert.alert(t('common.error'), t('personas.uploadFailed'));
        return;
      }
      const ok = await syncPersonaUpsert(client, avatarId, { name });
      if (!ok) {
        // Best-effort rollback of the already-uploaded image so no orphan file lingers.
        await deleteUserAvatar(client, avatarId).catch(() => {});
        Alert.alert(t('common.error'), t('personas.createFailed'));
        return;
      }
      invalidate();
      closeCreate();
    } finally {
      setCreating(false);
    }
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
            {t('personas.title')}
          </AppText>
          <AppText variant="caption" color="muted">
            {t('settings.personasManageSubtitle')}
          </AppText>
        </View>
      </View>

      {isLoading ? (
        <SkeletonList count={4} />
      ) : personas.length === 0 ? (
        <EmptyState
          icon="user"
          title={t('personas.empty')}
          message={t('personas.emptyHint')}
          actionLabel={t('personas.newPersona')}
          actionIcon="plus"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}>
            {personas.map((p) => {
              const active = p.avatar === activePersonaAvatar;
              const isDefault = p.avatar === defaultPersonaAvatar;
              return (
                <Card
                  key={p.avatar}
                  onPress={() => onPickActive(p.avatar)}
                  className="mb-2 flex-row items-center gap-3 px-3 py-3"
                >
                  <Avatar avatar={p.avatar} name={p.name} type="persona" size={48} ring={active} cacheKey={settingsUpdatedAt} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <AppText variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {p.name}
                      </AppText>
                      {active ? <Icon name="check" size={16} color={colors.accent} /> : null}
                      {isDefault ? (
                        <View className="flex-row items-center gap-1">
                          <Icon name="star" size={13} color={colors.warning} />
                          <Badge label={t('personas.defaultBadge')} tone="warning" />
                        </View>
                      ) : null}
                    </View>
                    <AppText variant="caption" color={p.description ? 'muted' : 'subtle'} numberOfLines={1} style={{ marginTop: 2 }}>
                      {p.description || t('personas.noDescription')}
                    </AppText>
                  </View>
                  <IconButton
                    name="chevronRight"
                    size="sm"
                    accessibilityLabel={t('a11y.editPersona')}
                    haptic={false}
                    onPress={() => openEditor(p.avatar)}
                  />
                </Card>
              );
            })}
          </ScrollView>
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="border-t border-border bg-surface px-4 pt-3"
          >
            <Button label={t('personas.newPersona')} leftIcon="plus" onPress={() => setCreateOpen(true)} />
          </View>
        </>
      )}

      <Sheet visible={createOpen} onClose={closeCreate} title={t('personas.createTitle')}>
        <View className="px-2 pb-2 pt-1">
          <Field
            label={t('personas.name')}
            value={newName}
            onChangeText={setNewName}
            placeholder={t('personas.namePlaceholder')}
            autoFocus
          />
          <View className="mt-3 flex-row items-center gap-3">
            {pickedImage ? (
              <Image source={{ uri: pickedImage.uri }} style={{ width: 48, height: 48, borderRadius: 24 }} />
            ) : (
              <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-2">
                <Icon name="user" size={20} color={colors.textMuted} />
              </View>
            )}
            <View className="flex-1">
              <Button
                label={t('personas.pickImage')}
                variant="secondary"
                leftIcon="attach"
                onPress={() => void pickImage()}
              />
            </View>
          </View>
          <AppText variant="caption" color="subtle" style={{ marginTop: 6 }}>
            {t('personas.imageOptional')}
          </AppText>
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button label={t('common.cancel')} variant="secondary" onPress={closeCreate} />
            </View>
            <View className="flex-1">
              <Button
                label={t('personas.create')}
                loading={creating}
                disabled={!newName.trim() || !client}
                onPress={() => void doCreate()}
              />
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}
