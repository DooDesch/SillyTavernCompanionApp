import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Modal, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';
import { addScreenOffListener } from '../../modules/screen-state';
import { usePrefs } from '@/stores/prefsStore';
import { AppText, Button } from '@/components/ui';
import { Icon } from '@/theme/icons';
import { colors } from '@/theme/tokens';

/**
 * Optional app lock: biometric prompt with system fallback to the device credential
 * (PIN/pattern/password). Locks on cold start and WHEN THE PHONE LOCKS (screen off,
 * via the local screen-state module) - that's the default. Optionally also after a
 * configurable time in the background (appLockTimer + appLockMinutes).
 *
 * Rendered inside an RN Modal - a Modal is its own native window, so the lock stacks ABOVE
 * any open bottom sheet (which also lives in a Modal); a plain absolute View would sit under
 * it. Until prefs hydrate we show an opaque brand cover instead of flashing content.
 */
export function LockGate() {
  const { t } = useTranslation();
  const appLock = usePrefs((s) => s.appLock);
  const appLockTimer = usePrefs((s) => s.appLockTimer);
  const appLockMinutes = usePrefs((s) => s.appLockMinutes);
  const hydrated = usePrefs((s) => s.hydrated);
  const [locked, setLocked] = useState<boolean | null>(null); // null until prefs known
  // The device-credential fallback opens a separate activity, which backgrounds the app -
  // without this guard a slow PIN entry would re-arm the relock timer mid-authentication.
  const authBusy = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    if (hydrated && locked === null) setLocked(appLock);
  }, [hydrated, appLock, locked]);

  const tryUnlock = useCallback(async () => {
    if (authBusy.current) return;
    authBusy.current = true;
    try {
      // Defensive: if every credential was removed while the pref is on, let the user in
      // rather than bricking the app (authenticateAsync would fail forever).
      const enrolled = await LocalAuthentication.getEnrolledLevelAsync().catch(
        () => LocalAuthentication.SecurityLevel.NONE,
      );
      if (enrolled === LocalAuthentication.SecurityLevel.NONE) {
        setLocked(false);
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.prompt'),
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });
      if (res.success) {
        backgroundedAt.current = null;
        setLocked(false);
      }
    } catch {
      // stay locked; the button retries
    } finally {
      authBusy.current = false;
    }
  }, [t]);

  // DEFAULT relock: the phone locked (display off). Fires even in the foreground (power
  // button) - phone locked means app locked. The auth prompt itself never turns the screen
  // off, so no authBusy guard is needed here.
  useEffect(() => {
    if (!appLock) return;
    return addScreenOffListener(() => {
      Keyboard.dismiss();
      backgroundedAt.current = null;
      setLocked(true);
    });
  }, [appLock]);

  // OPTIONAL relock: more than appLockMinutes in the background (app switching).
  useEffect(() => {
    if (!appLock || !appLockTimer) return;
    const relockAfterMs = Math.max(1, appLockMinutes) * 60_000;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && !authBusy.current) {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        if (backgroundedAt.current && Date.now() - backgroundedAt.current > relockAfterMs) {
          Keyboard.dismiss();
          setLocked(true);
        }
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [appLock, appLockTimer, appLockMinutes]);

  // Auto-prompt when the lock screen appears, deferred a tick: prompting synchronously on
  // the foreground transition races the activity on older Android versions.
  useEffect(() => {
    if (locked !== true) return;
    const timer = setTimeout(() => void tryUnlock(), 250);
    return () => clearTimeout(timer);
  }, [locked, tryUnlock]);

  if (hydrated && (locked === false || !appLock)) return null;

  return (
    <Modal visible transparent={false} statusBarTranslucent animationType="none">
      <View style={{ flex: 1, backgroundColor: colors.bg }} className="items-center justify-center px-10">
        {hydrated && locked ? (
          <>
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-surface-2">
              <Icon name="lock" size={34} color={colors.accent} />
            </View>
            <AppText variant="h2" style={{ marginTop: 20 }}>
              {t('lock.title')}
            </AppText>
            <AppText variant="body" color="muted" style={{ marginTop: 6, textAlign: 'center' }}>
              {t('lock.subtitle')}
            </AppText>
            <View className="mt-8 w-full">
              <Button label={t('lock.unlock')} leftIcon="lock" onPress={() => void tryUnlock()} />
            </View>
          </>
        ) : null /* pre-hydration: opaque brand cover, no content flash */}
      </View>
    </Modal>
  );
}
