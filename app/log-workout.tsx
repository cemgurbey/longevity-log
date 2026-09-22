import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, Chip, Field, Muted, PrimaryButton, Screen, useThemeColors } from '@/src/ui';
import { insertSet, insertWorkout, todayLocal } from '@/src/db';
import type { WorkoutKind } from '@/src/db';
import type { ThemeColors } from '@/src/theme';

interface Template {
  id: string;
  label: string;
  kind: WorkoutKind;
  exercises: string[];
}

const TEMPLATES: Template[] = [
  { id: 'a', label: 'Lift Day A', kind: 'lift', exercises: ['Squat', 'Bench Press', 'Pull-up'] },
  { id: 'b', label: 'Lift Day B', kind: 'lift', exercises: ['Deadlift', 'Overhead Press', 'Core'] },
  { id: 'swim', label: 'Swim', kind: 'swim', exercises: [] },
  { id: 'custom', label: 'Custom', kind: 'lift', exercises: [] },
];

interface LiftSetForm {
  reps: string;
  weight: string;
}

interface ExerciseForm {
  name: string;
  sets: LiftSetForm[];
}

const blankSet = (): LiftSetForm => ({ reps: '', weight: '' });

function SetInput({
  value,
  onChangeText,
  placeholder,
  c,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  c: ThemeColors;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      placeholderTextColor={c.sub}
      style={{
        flex: 1,
        backgroundColor: c.bg,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 15,
        color: c.text,
      }}
    />
  );
}

export default function LogWorkoutScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [templateId, setTemplateId] = useState('a');
  const [name, setName] = useState('Lift Day A');
  const [kind, setKind] = useState<WorkoutKind>('lift');
  const [exercises, setExercises] = useState<ExerciseForm[]>([
    { name: 'Squat', sets: [blankSet()] },
    { name: 'Bench Press', sets: [blankSet()] },
    { name: 'Pull-up', sets: [blankSet()] },
  ]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  function applyTemplate(t: Template) {
    setTemplateId(t.id);
    setKind(t.kind);
    setName(t.id === 'custom' ? 'Custom workout' : t.label);
    setExercises(t.exercises.map((e) => ({ name: e, sets: [blankSet()] })));
  }

  function updateSet(exIdx: number, setIdx: number, patch: Partial<LiftSetForm>) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) }
          : e,
      ),
    );
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((e, i) => (i === exIdx ? { ...e, sets: [...e.sets, blankSet()] } : e)),
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e,
      ),
    );
  }

  function addExercise() {
    const n = newExerciseName.trim();
    if (!n) return;
    setExercises((prev) => [...prev, { name: n, sets: [blankSet()] }]);
    setNewExerciseName('');
  }

  function removeExercise(exIdx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      if (kind === 'swim') {
        const d = parseFloat(distance);
        if (!d || d <= 0) {
          Alert.alert('Missing distance', 'Enter the swim distance in metres.');
          setSaving(false);
          return;
        }
        const id = await insertWorkout(db, {
          date: todayLocal(),
          kind,
          name: name.trim() || 'Swim',
        });
        await insertSet(db, {
          workout_id: id,
          exercise: 'Swim',
          set_no: 1,
          reps: null,
          weight_kg: null,
          distance_m: d,
          duration_min: parseFloat(duration) || null,
        });
      } else {
        const filled = exercises
          .map((e) => ({
            name: e.name.trim(),
            sets: e.sets.filter((s) => parseInt(s.reps, 10) > 0),
          }))
          .filter((e) => e.name.length > 0 && e.sets.length > 0);
        if (filled.length === 0) {
          Alert.alert('Nothing to save', 'Add at least one set with reps.');
          setSaving(false);
          return;
        }
        const id = await insertWorkout(db, {
          date: todayLocal(),
          kind,
          name: name.trim() || 'Workout',
        });
        for (const e of filled) {
          let n = 1;
          for (const s of e.sets) {
            await insertSet(db, {
              workout_id: id,
              exercise: e.name,
              set_no: n++,
              reps: parseInt(s.reps, 10),
              weight_kg: s.weight.trim() === '' ? 0 : parseFloat(s.weight) || 0,
              distance_m: null,
              duration_min: null,
            });
          }
        }
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {TEMPLATES.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              selected={templateId === t.id}
              onPress={() => applyTemplate(t)}
            />
          ))}
        </View>

        <Field label="Workout name" value={name} onChangeText={setName} placeholder="e.g. Lift Day A" />

        {kind === 'swim' ? (
          <Card>
            <Field
              label="Distance (m)"
              value={distance}
              onChangeText={(t) => setDistance(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="e.g. 1500"
            />
            <Field
              label="Duration (min)"
              value={duration}
              onChangeText={(t) => setDuration(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="e.g. 40"
            />
          </Card>
        ) : (
          <>
            {exercises.map((e, exIdx) => (
              <Card key={`${e.name}-${exIdx}`}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{e.name}</Text>
                  <Pressable onPress={() => removeExercise(exIdx)} hitSlop={10}>
                    <Text style={{ color: c.danger, fontSize: 14, fontWeight: '600' }}>Remove</Text>
                  </Pressable>
                </View>
                {e.sets.map((s, setIdx) => (
                  <View key={setIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: c.sub, width: 44, fontSize: 14, fontWeight: '600' }}>
                      Set {setIdx + 1}
                    </Text>
                    <SetInput
                      value={s.reps}
                      onChangeText={(t) => updateSet(exIdx, setIdx, { reps: t.replace(/[^0-9]/g, '') })}
                      placeholder="reps"
                      c={c}
                    />
                    <Text style={{ color: c.sub, marginHorizontal: 6 }}>×</Text>
                    <SetInput
                      value={s.weight}
                      onChangeText={(t) => updateSet(exIdx, setIdx, { weight: t.replace(/[^0-9.]/g, '') })}
                      placeholder="kg"
                      c={c}
                    />
                    <Pressable onPress={() => removeSet(exIdx, setIdx)} hitSlop={8} style={{ marginLeft: 8 }}>
                      <Text style={{ color: c.danger, fontSize: 18 }}>−</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={() => addSet(exIdx)} hitSlop={6}>
                  <Text style={{ color: c.accent, fontWeight: '700', fontSize: 14 }}>+ Add set</Text>
                </Pressable>
              </Card>
            ))}

            <Card>
              <Field
                label="New exercise"
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                placeholder="e.g. Bulgarian split squat"
              />
              <Pressable onPress={addExercise} hitSlop={6}>
                <Text style={{ color: c.accent, fontWeight: '700', fontSize: 15 }}>+ Add exercise</Text>
              </Pressable>
            </Card>
          </>
        )}

        <Muted>Saved to today&apos;s date.</Muted>
        <PrimaryButton title={saving ? 'Saving…' : 'Save workout'} onPress={save} disabled={saving} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}
