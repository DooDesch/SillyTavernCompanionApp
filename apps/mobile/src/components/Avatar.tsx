import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useConnection } from '@/stores/connectionStore';

/** Character avatar from ST's `/thumbnail` endpoint, with an initial-letter fallback. */
export function Avatar({ avatar, name, size = 48 }: { avatar: string; name: string; size?: number }) {
  const baseUrl = useConnection((s) => s.instance?.baseUrl);
  const [failed, setFailed] = useState(false);
  const uri = baseUrl ? `${baseUrl}/thumbnail?type=avatar&file=${encodeURIComponent(avatar)}` : undefined;
  const radius = size / 2;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius }}
        className="bg-char"
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: radius }}
      className="items-center justify-center bg-char"
    >
      <Text className="text-lg font-bold text-white">{name.trim().slice(0, 1).toUpperCase() || '?'}</Text>
    </View>
  );
}
