import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, EmptyState, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { formatDate, getExerciseLogs } from '@/src/db';
import type { ExerciseLog } from '@/src/db';

function summarize(e: ExerciseLog): string {
  const parts: string[] = [];
  if (e.sets != null && e.reps != null) parts.push(`${e.sets} x ${e.reps}`);
  else if (e.sets != null) parts.push(`${e.sets} sets`);
  else if (e.reps != null) parts.push(`${e.reps} reps`);
  if (e.weight != null) parts.push(`${e.weight} ${e.weight_unit ?? 'kg'}`);
  if (e.duration_min != null) parts.push(`${e.duration_min} min`);
  if (e.distance_m != null) parts.push(`${e.distance_m} m`);
  return parts.length > 0 ? parts.join('  ·  ') : 'Logged';
}

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const rows = await getExerciseLogs(db);
        if (alive) setLogs(rows);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  const groups = useMemo(() => {
    const map = new Map<string, ExerciseLog[]>();
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
        <Title>Exercise</Title>
        <PrimaryButton title="Log exercise" onPress={() => router.push('/log-workout')} />
        <View style={{ height: 12 }} />
        {groups.length === 0 && <EmptyState message="No exercises logged yet." />}
        {groups.map(([date, entries]) => (
          <Card key={date}>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>
              {formatDate(date)}
            </Text>
            {entries.map((e) => (
              <View
                key={e.id}
                style={{
                  paddingVertical: 7,
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                }}>
                <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{e.exercise}</Text>
                <Muted>{summarize(e)}</Muted>
              </View>
            ))}
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
