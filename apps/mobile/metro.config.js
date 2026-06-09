// Expo's Metro config auto-detects the pnpm monorepo (watchFolders + nodeModulesPaths) since SDK 52,
// so no manual monorepo wiring is needed here — only the NativeWind transformer.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
