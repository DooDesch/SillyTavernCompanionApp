import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      // "Chats" (recent conversations) is the landing tab, like SillyTavern's home page.
      initialRouteName="chats"
      screenOptions={{
        headerStyle: { backgroundColor: '#15151c' },
        headerTintColor: '#ffffff',
        tabBarStyle: { backgroundColor: '#15151c', borderTopColor: '#2a2a36' },
        tabBarActiveTintColor: '#7c5cff',
        tabBarInactiveTintColor: '#8b8b9a',
        sceneStyle: { backgroundColor: '#0b0b0f' },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: t('tabs.chats'),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="characters"
        options={{
          title: t('tabs.characters'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-sharp" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
