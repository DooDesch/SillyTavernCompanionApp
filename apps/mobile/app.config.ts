import type { ExpoConfig } from 'expo/config';

/**
 * Native configuration. The two non-negotiable bits for a LAN companion app:
 *  - Local-network access (iOS prompts for it on any access to a private IP, e.g. the subnet scan)
 *  - Cleartext HTTP to RFC1918 addresses (SillyTavern is http:// on the LAN by default)
 *
 * `NSAllowsLocalNetworking` permits http to local hosts without opening up arbitrary cleartext
 * (App-Store friendly, and tighter than NSAllowsArbitraryLoads).
 */
const config: ExpoConfig = {
  name: 'SillyTavern Companion',
  slug: 'sillytavern-companion',
  scheme: 'stcompanion',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'de.tiretask.stcompanion',
    infoPlist: {
      NSLocalNetworkUsageDescription:
        'Sucht im lokalen WLAN nach deiner laufenden SillyTavern-Instanz, um sich zu verbinden.',
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
    },
  },
  android: {
    package: 'de.tiretask.stcompanion',
    permissions: ['android.permission.INTERNET'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    [
      'expo-image-picker',
      {
        photosPermission: 'Erlaubt das Anhängen von Bildern an Nachrichten (für Vision-Modelle).',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Allow http:// to the LAN. A network_security_config.xml scoped to RFC1918 would be
          // tighter; usesCleartextTraffic is the pragmatic v1 default.
          usesCleartextTraffic: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
