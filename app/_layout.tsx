import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SQLiteProvider } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/src/db';
import { palette } from '@/src/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

const c = palette.dark;

function RootLayoutNav() {
  return (
    <SQLiteProvider databaseName="longevity.db" onInit={migrateDbIfNeeded}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.bg },
            headerTintColor: c.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: c.bg },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="log-workout" options={{ presentation: 'modal', title: 'Log exercise' }} />
          <Stack.Screen name="log-meal" options={{ presentation: 'modal', title: 'Log food' }} />
          <Stack.Screen name="edit-workout/[id]" options={{ presentation: 'modal', title: 'Edit exercise' }} />
          <Stack.Screen name="edit-meal/[id]" options={{ presentation: 'modal', title: 'Edit food' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
