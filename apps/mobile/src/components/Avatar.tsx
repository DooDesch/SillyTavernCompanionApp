import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useConnection } from '@/stores/connectionStore';
import { fonts } from '@/theme/tokens';

// Deterministic, on-brand fallback tints derived from the name (no external gradient dep).
const FALLBACK_TINTS = ['#2A2140', '#1F2A44', '#23303A', '#3A2433', '#2C2A45', '#243A33'];

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_TINTS[h % FALLBACK_TINTS.length]!;
}

/** Character/user avatar from ST's `/thumbnail` endpoint, with an initial-letter fallback. */
export function Avatar({
  avatar,
  name,
  size = 48,
  ring = false,
  type = 'avatar',
  cacheKey,
}: {
  avatar: string;
  name: string;
  size?: number;
  ring?: boolean;
  /** Thumbnail kind: 'avatar' = character, 'persona' = user avatar (User Avatars dir). */
  type?: 'avatar' | 'persona';
  /** Bump to bust the image cache after replacing the underlying file. */
  cacheKey?: string | number;
}) {
  const baseUrl = useConnection((s) => s.instance?.baseUrl);
  const [failed, setFailed] = useState(false);
  const uri = baseUrl
    ? `${baseUrl}/thumbnail?type=${type}&file=${encodeURIComponent(avatar)}${cacheKey != null ? `&v=${encodeURIComponent(String(cacheKey))}` : ''}`
    : undefined;
  const radius = size / 2;
  const ringStyle = ring ? { borderWidth: 2, borderColor: '#7C5CFF' } : null;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={[{ width: size, height: size, borderRadius: radius }, ringStyle]}
      />
    );
  }

  return (
    <View
      style={[{ width: size, height: size, borderRadius: radius, backgroundColor: tintFor(name) }, ringStyle]}
      className="items-center justify-center"
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: size * 0.4, color: '#F5F5F7' }}>
        {name.trim().slice(0, 1).toUpperCase() || '?'}
      </Text>
    </View>
  );
}
