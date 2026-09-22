import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Chip, DateField, Field, PrimaryButton, Screen, useThemeColors } from '@/src/ui';
import { getRecentFoodLogs, insertFoodLog, todayLocal } from '@/src/db';
import type { FoodLog } from '@/src/db';

export default function LogMealScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [date, setDate] = useState(todayLocal());
  const [name, setName] = useState('');
  const [recent, setRecent] = useState<FoodLog[]>([]);
  const [grams, setGrams] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
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
    setName(f.name);
    setGrams(f.grams != null ? String(f.grams) : '');
  }

  async function save() {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Missing food', 'Enter a food name or pick a recent one.');
      return;
    }
    setSaving(true);
    try {
      await insertFoodLog(db, {
        date,
        name: trimmed,
        grams: grams.trim() === '' ? null : parseFloat(grams),
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
              Recent foods
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {recent.map((entry) => (
                <Chip
                  key={entry.name}
                  label={entry.name}
                  selected={name.trim().toLowerCase() === entry.name.toLowerCase()}
                  onPress={() => applyRecent(entry)}
                />
              ))}
            </View>
          </View>
        )}

        <Field
          label="Food"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Pumpkin seeds"
          autoCapitalize="words"
        />
        <Field
          label="Weight (g)"
          value={grams}
          onChangeText={(t) => setGrams(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="e.g. 30"
        />

        <PrimaryButton title={saving ? 'Saving…' : 'Save food'} onPress={save} disabled={saving} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}
