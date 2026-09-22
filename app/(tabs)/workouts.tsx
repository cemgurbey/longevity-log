import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, EmptyState, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { formatDate, getExerciseLogs, summarizeExerciseLog } from '@/src/db';
import type { ExerciseLog } from '@/src/db';

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
              <Pressable
                key={e.id}
                onPress={() => router.push({ pathname: '/edit-workout/[id]', params: { id: String(e.id) } })}
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
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
