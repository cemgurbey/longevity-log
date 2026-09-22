import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Chip, FormScreen, KeyboardDoneBar, PrimaryButton, useThemeColors } from '@/src/ui';
import { getRecentExerciseLogs, insertExerciseLog } from '@/src/db';
import type { ExerciseLog } from '@/src/db';
import { ExerciseFormFields, emptyExerciseForm, parseExerciseForm } from '@/src/exercise-form';
import type { ExerciseFormValue } from '@/src/exercise-form';

export default function LogWorkoutScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [form, setForm] = useState<ExerciseFormValue>(emptyExerciseForm);
  const [recent, setRecent] = useState<ExerciseLog[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setForm(emptyExerciseForm());
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
    setForm((f) => ({
      ...f,
      exercise: e.exercise,
      sets: e.sets != null ? String(e.sets) : '',
      reps: e.reps != null ? String(e.reps) : '',
      weight: e.weight != null ? String(e.weight) : '',
      unit: e.weight_unit ?? f.unit,
      duration: e.duration_min != null ? String(e.duration_min) : '',
      distance: e.distance_m != null ? String(e.distance_m) : '',
    }));
  }

  async function save() {
    if (saving) return;
    const parsed = parseExerciseForm(form);
    if (!parsed) {
      Alert.alert('Missing exercise', 'Enter an exercise name or pick a recent one.');
      return;
    }
    setSaving(true);
    try {
      await insertExerciseLog(db, parsed);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen>
      <KeyboardDoneBar />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    selected={form.exercise.trim().toLowerCase() === entry.exercise.toLowerCase()}
                    onPress={() => applyRecent(entry)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <ExerciseFormFields value={form} onChange={setForm} />

        <PrimaryButton title={saving ? 'Saving…' : 'Save exercise'} onPress={save} disabled={saving} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </FormScreen>
  );
}
