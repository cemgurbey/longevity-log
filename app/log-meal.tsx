import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Chip, FormScreen, FormScrollView, PrimaryButton, useThemeColors } from '@/src/ui';
import { getAllNutrition, getRecentFoodLogs, insertFoodLog } from '@/src/db';
import { FoodFormFields, emptyFoodForm, parseFoodForm } from '@/src/food-form';
import type { FoodFormValue } from '@/src/food-form';

/** One quick-add chip: a food name plus the grams to pre-fill. */
interface QuickAddItem {
  name: string;
  grams: string;
}

export default function LogMealScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [form, setForm] = useState<FoodFormValue>(emptyFoodForm);
  const [recent, setRecent] = useState<QuickAddItem[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setForm(emptyFoodForm());
      (async () => {
        const [logs, nutrition] = await Promise.all([getRecentFoodLogs(db), getAllNutrition(db)]);
        // Recently logged foods first (with the user's own grams), then the
        // nutrition reference foods not yet logged (with default servings).
        const items: QuickAddItem[] = logs.map((f) => ({
          name: f.name,
          grams: f.grams != null ? String(f.grams) : '',
        }));
        const seen = new Set(logs.map((f) => f.name.toLowerCase()));
        for (const n of nutrition) {
          if (items.length >= 20) break;
          if (seen.has(n.name.toLowerCase())) continue;
          seen.add(n.name.toLowerCase());
          items.push({
            name: n.name,
            grams: n.default_grams != null ? String(n.default_grams) : '',
          });
        }
        if (alive) setRecent(items);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  /** Fill the whole form from a quick-add entry (everything except the date). */
  function applyRecent(f: QuickAddItem) {
    setForm((prev) => ({
      ...prev,
      name: f.name,
      grams: f.grams,
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
    <FormScreen>
      <FormScrollView>
        {recent.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Quick add
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
      </FormScrollView>
    </FormScreen>
  );
}
