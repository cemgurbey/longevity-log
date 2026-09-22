import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { DangerButton, EmptyState, FormScreen, FormScrollView, Muted, PrimaryButton } from '@/src/ui';
import { deleteExerciseLog, getExerciseLogById, updateExerciseLog } from '@/src/db';
import { ExerciseFormFields, exerciseToFormValue, parseExerciseForm } from '@/src/exercise-form';
import type { ExerciseFormValue } from '@/src/exercise-form';

export default function EditWorkoutScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = Number(id);
  const [form, setForm] = useState<ExerciseFormValue | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const row = Number.isNaN(logId) ? null : await getExerciseLogById(db, logId);
        if (alive) {
          setForm(row ? exerciseToFormValue(row) : null);
          setLoaded(true);
        }
      })();
      return () => {
        alive = false;
      };
    }, [db, logId]),
  );

  async function save() {
    if (saving || !form) return;
    const parsed = parseExerciseForm(form);
    if (!parsed) {
      Alert.alert('Missing exercise', 'Enter an exercise name.');
      return;
    }
    setSaving(true);
    try {
      await updateExerciseLog(db, { ...parsed, id: logId });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete exercise', 'Delete this entry? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExerciseLog(db, logId);
          router.back();
        },
      },
    ]);
  }

  return (
    <FormScreen>
      <FormScrollView>
        {!loaded ? (
          <Muted>Loading…</Muted>
        ) : form == null ? (
          <EmptyState message="This entry no longer exists." />
        ) : (
          <View>
            <ExerciseFormFields value={form} onChange={setForm} />
            <PrimaryButton
              title={saving ? 'Saving…' : 'Save changes'}
              onPress={save}
              disabled={saving}
            />
            <DangerButton title="Delete entry" onPress={confirmDelete} />
            <View style={{ height: 32 }} />
          </View>
        )}
      </FormScrollView>
    </FormScreen>
  );
}
