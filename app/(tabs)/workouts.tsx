import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, EmptyState, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { formatDate, getSetsForWorkout, getWorkouts } from '@/src/db';
import type { Workout, WorkoutSet } from '@/src/db';

function summarizeWorkout(w: Workout, sets: WorkoutSet[] | undefined): string {
  if (!sets) return 'tap to view';
  if (w.kind === 'swim') {
    const d = sets[0]?.distance_m;
    const t = sets[0]?.duration_min;
    const parts = [d ? `${Math.round(d)} m` : null, t ? `${Math.round(t)} min` : null].filter(
      (p): p is string => p !== null,
    );
    return parts.length > 0 ? parts.join(' · ') : 'Swim';
  }
  const n = sets.length;
  const vol = sets.reduce((a, s) => a + (s.reps ?? 0) * (s.weight_kg ?? 0), 0);
  return `${n} set${n === 1 ? '' : 's'} · ${Math.round(vol).toLocaleString()} kg`;
}

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [setsCache, setSetsCache] = useState<Record<number, WorkoutSet[]>>({});

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const ws = await getWorkouts(db);
        if (alive) setWorkouts(ws);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  async function toggle(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!setsCache[id]) {
      const s = await getSetsForWorkout(db, id);
      setSetsCache((prev) => ({ ...prev, [id]: s }));
    }
  }

  return (
    <Screen>
      <FlatList
        data={workouts}
        keyExtractor={(w) => String(w.id)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Title>Workouts</Title>
            <PrimaryButton title="+ Log workout" onPress={() => router.push('/log-workout')} />
            <View style={{ height: 12 }} />
          </>
        }
        ListEmptyComponent={<EmptyState message="No workouts yet. Log your first one above." />}
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          const sets = setsCache[item.id];
          return (
            <Card>
              <Pressable onPress={() => toggle(item.id)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
                    <Muted>
                      {formatDate(item.date)} · {item.kind === 'swim' ? 'Swim' : 'Lift'} · {summarizeWorkout(item, sets)}
                    </Muted>
                  </View>
                  <Text style={{ color: c.sub, fontSize: 18 }}>{expanded ? '▾' : '▸'}</Text>
                </View>
              </Pressable>
              {expanded && (
                <View
                  style={{
                    marginTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: c.border,
                    paddingTop: 8,
                  }}>
                  {!sets && <Muted>Loading…</Muted>}
                  {sets?.map((s) => (
                    <Text key={s.id} style={{ color: c.text, fontSize: 14, paddingVertical: 3 }}>
                      {item.kind === 'swim'
                        ? `🏊 ${s.distance_m ? `${Math.round(s.distance_m)} m` : ''}${
                            s.duration_min ? ` in ${Math.round(s.duration_min)} min` : ''
                          }`
                        : `${s.exercise}: ${s.reps ?? '–'} reps × ${s.weight_kg ?? '–'} kg`}
                    </Text>
                  ))}
                </View>
              )}
            </Card>
          );
        }}
      />
    </Screen>
  );
}
