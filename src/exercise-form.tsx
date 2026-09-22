import { Text, View } from 'react-native';

import { Chip, DateField, Field, useThemeColors } from './ui';
import { todayLocal } from './db';
import type { ExerciseLog, WeightUnit } from './db';

/** String-based form state; parsed to numbers only on save. */
export interface ExerciseFormValue {
  date: string;
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
  unit: WeightUnit;
  duration: string;
  distance: string;
}

export function emptyExerciseForm(): ExerciseFormValue {
  return {
    date: todayLocal(),
    exercise: '',
    sets: '',
    reps: '',
    weight: '',
    unit: 'kg',
    duration: '',
    distance: '',
  };
}

export function exerciseToFormValue(e: ExerciseLog): ExerciseFormValue {
  return {
    date: e.date,
    exercise: e.exercise,
    sets: e.sets != null ? String(e.sets) : '',
    reps: e.reps != null ? String(e.reps) : '',
    weight: e.weight != null ? String(e.weight) : '',
    unit: e.weight_unit ?? 'kg',
    duration: e.duration_min != null ? String(e.duration_min) : '',
    distance: e.distance_m != null ? String(e.distance_m) : '',
  };
}

const toNum = (s: string): number | null => (s.trim() === '' ? null : parseFloat(s));

function toInt(s: string): number | null {
  if (s.trim() === '') return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

/** Validates and converts form state into a log row (without id). Returns null when invalid. */
export function parseExerciseForm(v: ExerciseFormValue): Omit<ExerciseLog, 'id'> | null {
  const exercise = v.exercise.trim();
  if (!exercise) return null;
  const weight = toNum(v.weight);
  return {
    date: v.date,
    exercise,
    sets: toInt(v.sets),
    reps: toInt(v.reps),
    weight,
    weight_unit: weight != null ? v.unit : null,
    duration_min: toNum(v.duration),
    distance_m: toNum(v.distance),
  };
}

const UNITS: WeightUnit[] = ['kg', 'lb'];

/** Controlled exercise fields, shared by the log and edit screens. */
export function ExerciseFormFields({
  value,
  onChange,
}: {
  value: ExerciseFormValue;
  onChange: (v: ExerciseFormValue) => void;
}) {
  const c = useThemeColors();
  const set = (patch: Partial<ExerciseFormValue>) => onChange({ ...value, ...patch });

  return (
    <View>
      <DateField value={value.date} onChange={(date) => set({ date })} />

      <Field
        label="Exercise"
        value={value.exercise}
        onChangeText={(exercise) => set({ exercise })}
        placeholder="e.g. Squat"
        autoCapitalize="words"
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Sets"
            value={value.sets}
            onChangeText={(t) => set({ sets: t.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad"
            placeholder="5"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Reps"
            value={value.reps}
            onChangeText={(t) => set({ reps: t.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad"
            placeholder="5"
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Weight"
            value={value.weight}
            onChangeText={(t) => set({ weight: t.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            placeholder="165"
          />
        </View>
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>Unit</Text>
          <View style={{ flexDirection: 'row' }}>
            {UNITS.map((u) => (
              <Chip key={u} label={u} selected={value.unit === u} onPress={() => set({ unit: u })} />
            ))}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Duration (min)"
            value={value.duration}
            onChangeText={(t) => set({ duration: t.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            placeholder="30"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Distance (m)"
            value={value.distance}
            onChangeText={(t) => set({ distance: t.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            placeholder="800"
          />
        </View>
      </View>
    </View>
  );
}
