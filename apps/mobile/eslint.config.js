// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-verify/*'],
  },
  {
    rules: {
      // The React Compiler "immutability" rule flags `sharedValue.value = ...`, but mutating a
      // Reanimated shared value via `.value` is its intended API — a false positive on this stack.
      'react-hooks/immutability': 'off',
      // We use setState-in-effect only for idiomatic prop->state sync (sheet form resets) and
      // mount gating (Sheet enter/exit animation). These are intentional and safe.
      'react-hooks/set-state-in-effect': 'off',
      // i18next's documented setup is `i18n.use(initReactI18next).init(...)`; the named-export
      // caution is noise for this API.
      'import/no-named-as-default-member': 'off',
    },
  },
]);
