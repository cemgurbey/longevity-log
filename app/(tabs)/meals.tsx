import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, EmptyState, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { getMealsForDate, todayLocal } from '@/src/db';
import type { Meal, MealSlot } from '@/src/db';

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function MealsScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [meals, setMeals] = useState<Meal[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const ms = await getMealsForDate(db, todayLocal());
        if (alive) setMeals(ms);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  const total = meals.reduce((a, m) => a + (m.protein_g ?? 0), 0);
  const bySlot = SLOT_ORDER.map((slot) => ({
    slot,
    items: meals.filter((m) => m.slot === slot),
  })).filter((g) => g.items.length > 0);

  return (
    <Screen>
      <FlatList
        data={bySlot}
        keyExtractor={(g) => g.slot}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Title>Today&apos;s meals</Title>
            <Card>
              <Text style={{ color: c.text, fontSize: 28, fontWeight: '800' }}>
                {Math.round(total * 10) / 10} g
              </Text>
              <Muted>protein today · target 150 g</Muted>
            </Card>
            <PrimaryButton title="+ Log meal" onPress={() => router.push('/log-meal')} />
            <View style={{ height: 12 }} />
          </>
        }
        ListEmptyComponent={<EmptyState message="Nothing logged today yet." />}
        renderItem={({ item }) => (
          <Card>
            <Text
              style={{
                color: c.sub,
                fontSize: 13,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
              {SLOT_LABELS[item.slot]}
            </Text>
            {item.items.map((m) => (
              <View key={m.id} style={{ paddingVertical: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: c.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{m.name}</Text>
                  <Text style={{ color: c.accent, fontSize: 15, fontWeight: '700' }}>
                    {m.protein_g != null ? `${m.protein_g} g` : ''}
                  </Text>
                </View>
                {!!m.description && <Muted>{m.description}</Muted>}
              </View>
            ))}
          </Card>
        )}
      />
    </Screen>
  );
}
