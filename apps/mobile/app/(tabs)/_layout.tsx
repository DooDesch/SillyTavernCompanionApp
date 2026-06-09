import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Icon, type IconName } from '@/theme/icons';
import { colors } from '@/theme/tokens';
import { useBottomInset } from '@/theme/insets';
import { haptics } from '@/theme/haptics';

const TAB_ICON: Record<string, IconName> = {
  chats: 'chats',
  characters: 'characters',
  settings: 'settings',
};

// Minimal structural type for the bits of react-navigation's tab-bar props we use
// (avoids pulling @react-navigation/bottom-tabs in as a direct dependency just for the type).
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

/**
 * Custom tab bar — react-navigation's default bar wasn't applying the bottom safe-area inset on
 * this setup, so the labels collided with the system nav bar. We render it ourselves and pad by a
 * reliable bottom inset.
 */
function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const bottom = useBottomInset(12);
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 8,
        paddingBottom: bottom,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key]!;
        const label = typeof options.title === 'string' ? options.title : route.name;
        const tint = focused ? colors.accent : colors.textSubtle;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={() => {
              haptics.selection();
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 }}
          >
            <Icon name={TAB_ICON[route.name] ?? 'chats'} size={22} color={tint} />
            <AppText variant="caption" style={{ color: tint, fontSize: 11 }}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      // "Chats" (recent conversations) is the landing tab, like SillyTavern's home page.
      // Each screen renders its own in-content header for a more designed, large-title feel.
      initialRouteName="chats"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats') }} />
      <Tabs.Screen name="characters" options={{ title: t('tabs.characters') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
