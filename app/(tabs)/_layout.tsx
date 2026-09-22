import { Tabs } from 'expo-router';

import { palette } from '@/src/theme';

const c = palette.dark;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.sub,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
        },
        headerStyle: {
          backgroundColor: c.bg,
        },
        headerTintColor: c.text,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen name="workouts" options={{ title: 'Exercise' }} />
      <Tabs.Screen name="meals" options={{ title: 'Food' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
    </Tabs>
  );
}
