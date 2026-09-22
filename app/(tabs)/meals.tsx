import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, EmptyState, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { formatDate, getFoodLogs } from '@/src/db';
import type { FoodLog } from '@/src/db';

export default function MealsScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [logs, setLogs] = useState<FoodLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const rows = await getFoodLogs(db);
        if (alive) setLogs(rows);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  const groups = useMemo(() => {
    const map = new Map<string, FoodLog[]>();
    for (const l of logs) {
      const arr = map.get(l.date) ?? [];
      arr.push(l);
      map.set(l.date, arr);
    }
    return [...map.entries()];
  }, [logs]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>Food</Title>
        <PrimaryButton title="Log food" onPress={() => router.push('/log-meal')} />
        <View style={{ height: 12 }} />
        {groups.length === 0 && <EmptyState message="No foods logged yet." />}
        {groups.map(([date, entries]) => (
          <Card key={date}>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>
              {formatDate(date)}
            </Text>
            {entries.map((f) => (
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
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
