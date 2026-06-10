import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import i18n from '@/i18n';

/**
 * Read-aloud notification with a Stop action - the pragmatic take on "media controls":
 * a real Android MediaSession would need a custom native module (expo has none), and TTS
 * only runs while the JS process lives anyway, so a sticky local notification whose action
 * fires back into JS covers the lockscreen/notification-shade use case.
 */
const CHANNEL_ID = 'tts';
const CATEGORY_ID = 'tts-controls';
const ACTION_STOP = 'stop';
const NOTIFICATION_ID = 'tts-playing';

let initialized = false;
let onStop: (() => void) | null = null;

async function ensureSetup(): Promise<boolean> {
  if (!initialized) {
    initialized = true;
    Notifications.setNotificationHandler({
      // Silent while the app is open (the in-app bar is visible there); listed in the shade.
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Text-to-Speech',
        importance: Notifications.AndroidImportance.LOW,
        sound: undefined,
        vibrationPattern: [0],
        showBadge: false,
      }).catch(() => {});
    }
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: ACTION_STOP,
        buttonTitle: i18n.t('chat.stopReading'),
        options: { opensAppToForeground: false },
      },
    ]).catch(() => {});
    Notifications.addNotificationResponseReceivedListener((response) => {
      if (
        response.notification.request.identifier === NOTIFICATION_ID ||
        response.actionIdentifier === ACTION_STOP
      ) {
        onStop?.();
        void Notifications.dismissNotificationAsync(NOTIFICATION_ID).catch(() => {});
      }
    });
  }
  const perms = await Notifications.getPermissionsAsync().catch(() => null);
  if (perms?.granted) return true;
  const req = await Notifications.requestPermissionsAsync().catch(() => null);
  return !!req?.granted;
}

/** Show the "reading aloud" notification. `stop` is invoked from the notification action. */
export async function showTtsNotification(name: string, stop: () => void): Promise<void> {
  onStop = stop;
  const ok = await ensureSetup();
  if (!ok) return; // permission denied - TTS still works, just without the notification
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: i18n.t('chat.readingAloud'),
      body: name,
      categoryIdentifier: CATEGORY_ID,
      sticky: true,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: null,
  }).catch(() => {});
}

/** Remove the notification (playback finished or stopped in-app). */
export function hideTtsNotification(): void {
  onStop = null;
  void Notifications.dismissNotificationAsync(NOTIFICATION_ID).catch(() => {});
}
