import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const ICONS = {
  workouts: '🏋️',
  meals: '🍽️',
  dashboard: '📊',
} as const;

function TabIcon({ name }: { name: keyof typeof ICONS }) {
  return <Text style={{ fontSize: 22 }}>{ICONS[name]}</Text>;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      }}>
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: () => <TabIcon name="workouts" />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: () => <TabIcon name="meals" />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: () => <TabIcon name="dashboard" />,
        }}
      />
    </Tabs>
  );
}
