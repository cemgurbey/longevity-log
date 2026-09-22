import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, Chip, Field, PrimaryButton, Screen, useThemeColors } from '@/src/ui';
import { insertMeal, todayLocal } from '@/src/db';
import type { MealSlot } from '@/src/db';

interface Preset {
  name: string;
  protein: number;
  description?: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Oatmeal seed breakfast',
    protein: 20,
    description: 'Oats, flax/chia/pumpkin seeds, banana, berries, peanut butter',
  },
  { name: '3 boiled eggs + salad', protein: 18 },
  { name: '3-4 eggs + salad', protein: 24 },
  {
    name: 'Chickpea/lentil + meat + quinoa',
    protein: 35,
    description: 'Meal prep with almonds and ginger',
  },
  { name: 'Oven salmon + veg', protein: 35 },
  {
    name: 'Yogurt + nuts snack',
    protein: 20,
    description: 'Yogurt, walnuts, hazelnuts, Brazil nuts, maple syrup',
  },
];

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

export default function LogMealScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [slot, setSlot] = useState<MealSlot>('breakfast');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [protein, setProtein] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function applyPreset(p: Preset) {
    setName(p.name);
    setProtein(String(p.protein));
    if (p.description) setDescription(p.description);
  }

  async function save() {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Missing name', 'Give the meal a name or pick a preset.');
      return;
    }
    setSaving(true);
    try {
      await insertMeal(db, {
        date: todayLocal(),
        slot,
        name: trimmed,
        description: description.trim() || null,
        protein_g: protein.trim() === '' ? null : parseFloat(protein) || null,
        notes: notes.trim() || null,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {SLOTS.map((s) => (
            <Chip key={s.id} label={s.label} selected={slot === s.id} onPress={() => setSlot(s.id)} />
          ))}
        </View>

        <Card>
          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
            ONE-TAP PRESETS
          </Text>
          {PRESETS.map((p, i) => (
            <Pressable
              key={p.name}
              onPress={() => applyPreset(p)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: i === PRESETS.length - 1 ? 0 : 1,
                borderBottomColor: c.border,
                opacity: pressed ? 0.6 : 1,
              })}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{p.name}</Text>
              <Text style={{ color: c.accent, fontSize: 14, fontWeight: '700' }}>{p.protein} g</Text>
            </Pressable>
          ))}
        </Card>

        <Field label="Meal name" value={name} onChangeText={setName} placeholder="e.g. Oven salmon + veg" />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What's in it?"
          multiline
        />
        <Field
          label="Protein (g)"
          value={protein}
          onChangeText={(t) => setProtein(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="e.g. 35"
        />
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

        <PrimaryButton title={saving ? 'Saving…' : 'Save meal'} onPress={save} disabled={saving} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}
