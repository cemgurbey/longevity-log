import { View } from 'react-native';

import { DateField, Field } from './ui';
import { todayLocal } from './db';
import type { FoodLog } from './db';

/** String-based form state; parsed to numbers only on save. */
export interface FoodFormValue {
  date: string;
  name: string;
  grams: string;
}

export function emptyFoodForm(): FoodFormValue {
  return { date: todayLocal(), name: '', grams: '' };
}

export function foodToFormValue(f: FoodLog): FoodFormValue {
  return {
    date: f.date,
    name: f.name,
    grams: f.grams != null ? String(f.grams) : '',
  };
}

/** Validates and converts form state into a log row (without id). Returns null when invalid. */
export function parseFoodForm(v: FoodFormValue): Omit<FoodLog, 'id'> | null {
  const name = v.name.trim();
  if (!name) return null;
  return {
    date: v.date,
    name,
    grams: v.grams.trim() === '' ? null : parseFloat(v.grams),
  };
}

/** Controlled food fields, shared by the log and edit screens. */
export function FoodFormFields({
  value,
  onChange,
}: {
  value: FoodFormValue;
  onChange: (v: FoodFormValue) => void;
}) {
  const set = (patch: Partial<FoodFormValue>) => onChange({ ...value, ...patch });

  return (
    <View>
      <DateField value={value.date} onChange={(date) => set({ date })} />
      <Field
        label="Food"
        value={value.name}
        onChangeText={(name) => set({ name })}
        placeholder="e.g. Pumpkin seeds"
        autoCapitalize="words"
      />
      <Field
        label="Weight (g)"
        value={value.grams}
        onChangeText={(t) => set({ grams: t.replace(/[^0-9.]/g, '') })}
        keyboardType="decimal-pad"
        placeholder="e.g. 30"
      />
    </View>
  );
}
