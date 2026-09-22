import { View } from 'react-native';
import { Stack, router } from 'expo-router';

import { Muted, PrimaryButton, Screen, Title } from '@/src/ui';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Title>This screen doesn&apos;t exist.</Title>
        <Muted>Let&apos;s get you back on track.</Muted>
        <View style={{ height: 16 }} />
        <View style={{ width: '100%' }}>
          <PrimaryButton title="Go to home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </Screen>
  );
}
