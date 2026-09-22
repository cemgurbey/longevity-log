import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Chip, PrimaryButton, Screen, useThemeColors } from '@/src/ui';
import { getRecentFoodLogs, insertFoodLog } from '@/src/db';
import type { FoodLog } from '@/src/db';
import { FoodFormFields, emptyFoodForm, parseFoodForm } from '@/src/food-form';
import type { FoodFormValue } from '@/src/food-form';

export default function LogMealScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [form, setForm] = useState<FoodFormValue>(emptyFoodForm);
  const [recent, setRecent] = useState<FoodLog[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setForm(emptyFoodForm());
      (async () => {
        const rows = await getRecentFoodLogs(db);
        if (alive) setRecent(rows);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  /** Fill the whole form from a previous entry (everything except the date). */
  function applyRecent(f: FoodLog) {
    setForm((prev) => ({
      ...prev,
      name: f.name,
      grams: f.grams != null ? String(f.grams) : '',
    }));
  }

  async function save() {
    if (saving) return;
    const parsed = parseFoodForm(form);
    if (!parsed) {
      Alert.alert('Missing food', 'Enter a food name or pick a recent one.');
      return;
    }
    setSaving(true);
    try {
      await insertFoodLog(db, parsed);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {recent.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Recent foods
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                {recent.map((entry) => (
                  <Chip
                    key={entry.name}
                    label={entry.name}
                    selected={form.name.trim().toLowerCase() === entry.name.toLowerCase()}
                    onPress={() => applyRecent(entry)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <FoodFormFields value={form} onChange={setForm} />

        <PrimaryButton title={saving ? 'Saving…' : 'Save food'} onPress={save} disabled={saving} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}
