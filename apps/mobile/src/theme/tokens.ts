import { Platform } from 'react-native';
import { palette, radii } from './palette';

/**
 * Runtime design tokens. Use these for the APIs that can't take a Tailwind className:
 * ActivityIndicator color, Switch trackColor, placeholderTextColor, StatusBar, Stack
 * header styling, Reanimated values, Feather icon colors, etc.
 *
 * className-land uses the same values via the semantic Tailwind colors (see tailwind.config.js),
 * both sourced from src/theme/palette.js.
 */
export const colors = palette;
export { radii };

/** 4pt spacing scale (documented subset actually used across the app). */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

/** Feather icon sizes. */
export const iconSize = { sm: 18, md: 22, lg: 26 } as const;

/** Generous hit area so visually-small controls still meet the 44pt touch target. */
export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 } as const;

/** Inter weight families (RN custom fonts are one family per weight — no synthetic bold). */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'bodyLg'
  | 'body'
  | 'label'
  | 'caption'
  | 'mono';

/** Type ramp (Inter). One source so every screen shares the same rhythm. */
export const typography: Record<
  TextVariant,
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }
> = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16, letterSpacing: 0.2 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19 },
};

/** Subtle elevation (RN 0.85 supports the boxShadow style prop on the new arch). */
export const shadow = {
  card: '0px 2px 10px rgba(0,0,0,0.35)',
  sheet: '0px -10px 36px rgba(0,0,0,0.5)',
} as const;
