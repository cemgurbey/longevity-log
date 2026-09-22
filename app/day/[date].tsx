import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, EmptyState, Muted, Screen, useThemeColors } from '@/src/ui';
import { formatDate, getExerciseLogsByDate, getFoodLogsByDate, summarizeExerciseLog } from '@/src/db';
import type { ExerciseLog, FoodLog } from '@/src/db';

export default function DayScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [foods, setFoods] = useState<FoodLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [ex, fo] = await Promise.all([
          getExerciseLogsByDate(db, date),
          getFoodLogsByDate(db, date),
        ]);
        if (alive) {
          setExercises(ex);
          setFoods(fo);
        }
      })();
      return () => {
        alive = false;
      };
    }, [db, date]),
  );

  const empty = exercises.length === 0 && foods.length === 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: formatDate(date) }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {empty && <EmptyState message="Nothing logged this day." />}

        {exercises.length > 0 && (
          <Card>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
              Exercises
            </Text>
            {exercises.map((e) => (
              <Pressable
                key={e.id}
                onPress={() =>
                  router.push({ pathname: '/edit-workout/[id]', params: { id: String(e.id) } })
                }
                style={({ pressed }) => ({
                  paddingVertical: 7,
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{e.exercise}</Text>
                <Muted>{summarizeExerciseLog(e)}</Muted>
              </Pressable>
            ))}
          </Card>
        )}

        {foods.length > 0 && (
          <Card>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
              Foods
            </Text>
            {foods.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => router.push({ pathname: '/edit-meal/[id]', params: { id: String(f.id) } })}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 7,
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <Text style={{ color: c.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{f.name}</Text>
                <Muted>{f.grams != null ? `${f.grams} g` : ''}</Muted>
              </Pressable>
            ))}
          </Card>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
