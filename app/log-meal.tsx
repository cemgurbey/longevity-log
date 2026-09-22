import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Chip, DateField, Field, Muted, PrimaryButton, Screen, useThemeColors } from '@/src/ui';
import { getRecentFoodNames, insertFoodLog, todayLocal } from '@/src/db';

export default function LogMealScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [date, setDate] = useState(todayLocal());
  const [name, setName] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [grams, setGrams] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const names = await getRecentFoodNames(db);
        if (alive) setRecent(names);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

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
              {recent.map((food) => (
                <Chip
                  key={food}
                  label={food}
                  selected={name.trim().toLowerCase() === food.toLowerCase()}
                  onPress={() => setName(food)}
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

        <Muted>Protein is calculated later — just log what you ate.</Muted>
        <PrimaryButton title={saving ? 'Saving…' : 'Save food'} onPress={save} disabled={saving} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}
