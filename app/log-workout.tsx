import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Chip, DateField, Field, PrimaryButton, Screen, useThemeColors } from '@/src/ui';
import { getRecentExerciseLogs, insertExerciseLog, todayLocal } from '@/src/db';
import type { ExerciseLog, WeightUnit } from '@/src/db';

const UNITS: WeightUnit[] = ['kg', 'lb'];

export default function LogWorkoutScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [date, setDate] = useState(todayLocal());
  const [exercise, setExercise] = useState('');
  const [recent, setRecent] = useState<ExerciseLog[]>([]);
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const rows = await getRecentExerciseLogs(db);
        if (alive) setRecent(rows);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  /** Fill the whole form from a previous entry (everything except the date). */
  function applyRecent(e: ExerciseLog) {
    setExercise(e.exercise);
    setSets(e.sets != null ? String(e.sets) : '');
    setReps(e.reps != null ? String(e.reps) : '');
    setWeight(e.weight != null ? String(e.weight) : '');
    if (e.weight_unit) setUnit(e.weight_unit);
    setDuration(e.duration_min != null ? String(e.duration_min) : '');
    setDistance(e.distance_m != null ? String(e.distance_m) : '');
  }

  const toNum = (s: string): number | null => (s.trim() === '' ? null : parseFloat(s));
  const toInt = (s: string): number | null => {
    if (s.trim() === '') return null;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  };

  async function save() {
    if (saving) return;
    const name = exercise.trim();
    if (!name) {
      Alert.alert('Missing exercise', 'Enter an exercise name or pick a recent one.');
      return;
    }
    setSaving(true);
    try {
      const w = toNum(weight);
      await insertExerciseLog(db, {
        date,
        exercise: name,
        sets: toInt(sets),
        reps: toInt(reps),
        weight: w,
        weight_unit: w != null ? unit : null,
        duration_min: toNum(duration),
        distance_m: toNum(distance),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <DateField value={date} onChange={setDate} />

        {recent.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Recent exercises
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                {recent.map((entry) => (
                  <Chip
                    key={entry.exercise}
                    label={entry.exercise}
                    selected={exercise.trim().toLowerCase() === entry.exercise.toLowerCase()}
                    onPress={() => applyRecent(entry)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <Field
          label="Exercise"
          value={exercise}
          onChangeText={setExercise}
          placeholder="e.g. Squat"
          autoCapitalize="words"
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Sets"
              value={sets}
              onChangeText={(t) => setSets(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="5"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Reps"
              value={reps}
              onChangeText={(t) => setReps(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="5"
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Weight"
              value={weight}
              onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="165"
            />
          </View>
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>Unit</Text>
            <View style={{ flexDirection: 'row' }}>
              {UNITS.map((u) => (
                <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
              ))}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Duration (min)"
              value={duration}
              onChangeText={(t) => setDuration(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="30"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Distance (m)"
              value={distance}
              onChangeText={(t) => setDistance(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="800"
            />
          </View>
        </View>

        <PrimaryButton title={saving ? 'Saving…' : 'Save exercise'} onPress={save} disabled={saving} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}
