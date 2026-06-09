import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

/**
 * Full-screen wrapper: paints the app background and applies safe-area insets on the
 * requested edges. Use `padded` for the standard 16px horizontal gutter.
 */
export function Screen({
  children,
  edges = ['top'],
  padded = false,
  className,
  style,
  ...rest
}: ViewProps & { children?: ReactNode; edges?: Edge[]; padded?: boolean }) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View {...rest} style={[{ flex: 1 }, style]} className={`${padded ? 'px-4' : ''} ${className ?? ''}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
