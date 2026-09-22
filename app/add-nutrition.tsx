import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { FormScreen, FormScrollView, PrimaryButton } from '@/src/ui';
import { insertNutrition } from '@/src/db';
import { NutritionFormFields, emptyNutritionForm, parseNutritionForm } from '@/src/nutrition-form';
import type { NutritionFormValue } from '@/src/nutrition-form';

export default function AddNutritionScreen() {
  const db = useSQLiteContext();
  const [form, setForm] = useState<NutritionFormValue>(emptyNutritionForm);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    const parsed = parseNutritionForm(form);
    if (!parsed) {
      Alert.alert('Missing food', 'Enter a food name.');
      return;
    }
    setSaving(true);
    try {
      await insertNutrition(db, parsed);
      router.back();
    } catch {
      Alert.alert('Could not save', 'This food is already in the list.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen>
      <FormScrollView>
        <NutritionFormFields value={form} onChange={setForm} />
        <PrimaryButton title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} />
        <View style={{ height: 32 }} />
      </FormScrollView>
    </FormScreen>
  );
}
