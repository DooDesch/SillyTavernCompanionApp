import { create } from 'zustand';
import { secrets } from '@/lib/storage';
import i18n, { deviceLanguage, type AppLanguage } from '@/i18n';

/** Language preference: 'system' follows the device, otherwise a forced 'de'/'en'. Persisted. */
export type LanguagePref = 'system' | AppLanguage;

const KEY_LANG = 'app.language';

function apply(pref: LanguagePref): void {
  const lng = pref === 'system' ? deviceLanguage() : pref;
  void i18n.changeLanguage(lng);
}

interface LocaleState {
  pref: LanguagePref;
  hydrate: () => Promise<void>;
  setLanguage: (pref: LanguagePref) => void;
}

export const useLocale = create<LocaleState>((set) => ({
  pref: 'system',
  hydrate: async () => {
    try {
      const stored = (await secrets.get(KEY_LANG)) as LanguagePref | null;
      if (stored === 'de' || stored === 'en' || stored === 'system') {
        set({ pref: stored });
        apply(stored);
      }
    } catch {
      // keep the device default
    }
  },
  setLanguage: (pref) => {
    set({ pref });
    apply(pref);
    void secrets.set(KEY_LANG, pref).catch(() => {});
  },
}));
