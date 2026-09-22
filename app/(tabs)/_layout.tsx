import { Tabs } from 'expo-router';
import { View } from 'react-native';
import type { ColorValue } from 'react-native';

import { palette } from '@/src/theme';

const c = palette.dark;

type Shape = 'triangle' | 'circle' | 'square';

function TabIcon({ shape, color }: { shape: Shape; color: ColorValue }) {
  if (shape === 'circle') {
    return <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: color }} />;
  }
  if (shape === 'square') {
    return <View style={{ width: 18, height: 18, backgroundColor: color }} />;
  }
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 11,
        borderRightWidth: 11,
        borderBottomWidth: 19,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
  );
}

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
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Exercise',
          tabBarIcon: ({ color }) => <TabIcon shape="triangle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Food',
          tabBarIcon: ({ color }) => <TabIcon shape="circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon shape="square" color={color} />,
        }}
      />
    </Tabs>
  );
}
