import { Text, View } from 'react-native';

import { Field, useThemeColors } from './ui';
import type { FoodNutrition } from './db';

/** String-based form state; parsed to numbers only on save. */
export interface NutritionFormValue {
  name: string;
  defaultGrams: string;
  protein: string;
  carbs: string;
  sugar: string;
  fiber: string;
  fat: string;
  saturatedFat: string;
  omega3: string;
  vitamins: string;
  minerals: string;
}

export function emptyNutritionForm(): NutritionFormValue {
  return {
    name: '',
    defaultGrams: '',
    protein: '',
    carbs: '',
    sugar: '',
    fiber: '',
    fat: '',
    saturatedFat: '',
    omega3: '',
    vitamins: '',
    minerals: '',
  };
}

const str = (v: number | null): string => (v != null ? String(v) : '');

export function nutritionToFormValue(n: FoodNutrition): NutritionFormValue {
  return {
    name: n.name,
    defaultGrams: str(n.default_grams),
    protein: str(n.protein_g),
    carbs: str(n.carbs_g),
    sugar: str(n.sugar_g),
    fiber: str(n.fiber_g),
    fat: str(n.fat_g),
    saturatedFat: str(n.saturated_fat_g),
    omega3: str(n.omega3_g),
    vitamins: n.vitamins ?? '',
    minerals: n.minerals ?? '',
  };
}

const toNum = (s: string): number | null => (s.trim() === '' ? null : parseFloat(s));
const toText = (s: string): string | null => (s.trim() === '' ? null : s.trim());

/** Validates and converts form state into a nutrition row (without id). Returns null when invalid. */
export function parseNutritionForm(v: NutritionFormValue): Omit<FoodNutrition, 'id'> | null {
  const name = v.name.trim();
  if (!name) return null;
  return {
    name,
    default_grams: toNum(v.defaultGrams),
    protein_g: toNum(v.protein),
    carbs_g: toNum(v.carbs),
    sugar_g: toNum(v.sugar),
    fiber_g: toNum(v.fiber),
    fat_g: toNum(v.fat),
    saturated_fat_g: toNum(v.saturatedFat),
    omega3_g: toNum(v.omega3),
    vitamins: toText(v.vitamins),
    minerals: toText(v.minerals),
  };
}

const numProps = {
  keyboardType: 'decimal-pad' as const,
};

/** Controlled nutrition fields, shared by the add and edit screens. All values are per 100 g. */
export function NutritionFormFields({
  value,
  onChange,
}: {
  value: NutritionFormValue;
  onChange: (v: NutritionFormValue) => void;
}) {
  const c = useThemeColors();
  const set = (patch: Partial<NutritionFormValue>) => onChange({ ...value, ...patch });
  const num = (key: keyof NutritionFormValue) => ({
    ...numProps,
    onChangeText: (t: string) => set({ [key]: t.replace(/[^0-9.]/g, '') } as Partial<NutritionFormValue>),
  });

  return (
    <View>
      <Field
        label="Food"
        value={value.name}
        onChangeText={(name) => set({ name })}
        placeholder="e.g. Pumpkin seeds"
        autoCapitalize="words"
      />
      <Field
        label="Default serving (g)"
        value={value.defaultGrams}
        placeholder="e.g. 30"
        {...num('defaultGrams')}
      />

      <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 6 }}>
        Per 100 g
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Protein (g)" value={value.protein} placeholder="0" {...num('protein')} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Carbs (g)" value={value.carbs} placeholder="0" {...num('carbs')} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Sugar (g)" value={value.sugar} placeholder="0" {...num('sugar')} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Fiber (g)" value={value.fiber} placeholder="0" {...num('fiber')} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Fat (g)" value={value.fat} placeholder="0" {...num('fat')} />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Saturated fat (g)"
            value={value.saturatedFat}
            placeholder="0"
            {...num('saturatedFat')}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Omega-3 (g)" value={value.omega3} placeholder="0" {...num('omega3')} />
        </View>
        <View style={{ flex: 1 }} />
      </View>

      <Field
        label="Vitamins"
        value={value.vitamins}
        onChangeText={(vitamins) => set({ vitamins })}
        placeholder="e.g. Vitamin C 20mg, D 5µg"
      />
      <Field
        label="Minerals"
        value={value.minerals}
        onChangeText={(minerals) => set({ minerals })}
        placeholder="e.g. Iron 2mg, Magnesium 30mg"
      />
    </View>
  );
}
