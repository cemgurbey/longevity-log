import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { DangerButton, EmptyState, FormScreen, FormScrollView, Muted, PrimaryButton } from '@/src/ui';
import { deleteFoodLog, getFoodLogById, updateFoodLog } from '@/src/db';
import { FoodFormFields, foodToFormValue, parseFoodForm } from '@/src/food-form';
import type { FoodFormValue } from '@/src/food-form';

export default function EditMealScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = Number(id);
  const [form, setForm] = useState<FoodFormValue | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const row = Number.isNaN(logId) ? null : await getFoodLogById(db, logId);
        if (alive) {
          setForm(row ? foodToFormValue(row) : null);
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
    const parsed = parseFoodForm(form);
    if (!parsed) {
      Alert.alert('Missing food', 'Enter a food name.');
      return;
    }
    setSaving(true);
    try {
      await updateFoodLog(db, { ...parsed, id: logId });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete food', 'Delete this entry? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFoodLog(db, logId);
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
            <FoodFormFields value={form} onChange={setForm} />
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
