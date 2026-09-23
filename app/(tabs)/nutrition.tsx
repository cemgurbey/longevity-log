import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, EmptyState, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { getAllNutrition } from '@/src/db';
import type { FoodNutrition } from '@/src/db';

function summarize(n: FoodNutrition): string | null {
  const parts: string[] = [];
  if (n.protein_g != null) parts.push(`${n.protein_g}g protein`);
  if (n.carbs_g != null) parts.push(`${n.carbs_g}g carbs`);
  if (n.fat_g != null) parts.push(`${n.fat_g}g fat`);
  if (parts.length === 0) return null;
  return `${parts.join(' · ')} per 100 g`;
}

export default function NutritionScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [foods, setFoods] = useState<FoodNutrition[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const rows = await getAllNutrition(db);
        if (alive) setFoods(rows);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>Nutrition</Title>
        <PrimaryButton title="Add food" onPress={() => router.push('/add-nutrition')} />
        <View style={{ height: 12 }} />
        {foods.length === 0 && <EmptyState message="No foods yet." />}
        {foods.length > 0 && (
          <Card>
            {foods.map((f, i) => {
              const summary = summarize(f);
              return (
                <Pressable
                  key={f.id}
                  onPress={() =>
                    router.push({ pathname: '/edit-nutrition/[id]', params: { id: String(f.id) } })
                  }
                  style={({ pressed }) => ({
                    paddingVertical: 9,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: c.border,
                    opacity: pressed ? 0.6 : 1,
                  })}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 3 }}>
                    {f.name}
                  </Text>
                  {summary != null ? (
                    <Muted>{summary}</Muted>
                  ) : (
                    <Muted>Add values</Muted>
                  )}
                </Pressable>
              );
            })}
          </Card>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
