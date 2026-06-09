import { Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Fullscreen image viewer: shows an image `contain`-fit on a black backdrop so the whole picture is
 * visible (not cropped). Tap anywhere or the ✕ to close.
 */
export function ImageViewerModal({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri?: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible && !!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black" onPress={onClose}>
        {uri ? (
          <Image source={{ uri }} style={{ flex: 1, width: '100%', height: '100%' }} resizeMode="contain" />
        ) : null}
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: insets.top + 8, right: 16 }}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/15 active:opacity-70"
        >
          <Text className="text-xl text-white">✕</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
