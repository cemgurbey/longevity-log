import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { DangerButton, EmptyState, FormScreen, FormScrollView, Muted, PrimaryButton } from '@/src/ui';
import { deleteNutrition, getNutritionById, updateNutrition } from '@/src/db';
import { NutritionFormFields, nutritionToFormValue, parseNutritionForm } from '@/src/nutrition-form';
import type { NutritionFormValue } from '@/src/nutrition-form';

export default function EditNutritionScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const nutritionId = Number(id);
  const [form, setForm] = useState<NutritionFormValue | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const row = Number.isNaN(nutritionId) ? null : await getNutritionById(db, nutritionId);
        if (alive) {
          setForm(row ? nutritionToFormValue(row) : null);
          setLoaded(true);
        }
      })();
      return () => {
        alive = false;
      };
    }, [db, nutritionId]),
  );

  async function save() {
    if (saving || !form) return;
    const parsed = parseNutritionForm(form);
    if (!parsed) {
      Alert.alert('Missing food', 'Enter a food name.');
      return;
    }
    setSaving(true);
    try {
      await updateNutrition(db, { ...parsed, id: nutritionId });
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
          await deleteNutrition(db, nutritionId);
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
            <NutritionFormFields value={form} onChange={setForm} />
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
