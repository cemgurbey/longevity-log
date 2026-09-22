import type { SQLiteDatabase } from 'expo-sqlite';

export type WeightUnit = 'kg' | 'lb';

export interface ExerciseLog {
  id: number;
  date: string; // YYYY-MM-DD in local time
  exercise: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  weight_unit: WeightUnit | null;
  duration_min: number | null;
  distance_m: number | null;
}

export interface FoodLog {
  id: number;
  date: string; // YYYY-MM-DD in local time
  name: string;
  grams: number | null;
}

/** Per-100g nutrition reference for a food. All macro amounts are grams per 100 g. */
export interface FoodNutrition {
  id: number;
  name: string;
  default_grams: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  omega3_g: number | null;
  vitamins: string | null;
  minerals: string | null;
}

const DB_VERSION = 3;

/** [name, typical serving in grams] seeds for the nutrition reference table. */
const SEED_NUTRITION_FOODS: [string, number][] = [
  ['Pumpkin seeds', 30],
  ['Oatmeal', 40],
  ['Chia seeds', 15],
  ['Flax seeds', 15],
  ['Hemp hearts', 30],
  ['Bourguignon cubes', 150],
  ['Eggs', 60],
  ['Banana', 120],
  ['Avocado', 100],
  ['Carrot', 60],
  ['Lemon', 30],
  ['Beetroots', 100],
  ['Mini pepper', 30],
  ['Radish', 20],
  ['Mint', 5],
  ['Parsley', 10],
  ['Olive oil', 15],
  ['Ginger', 10],
  ['Quinoa', 50],
  ['Almonds', 30],
  ['Walnuts', 30],
  ['Spring mix salad', 50],
  ['Hazelnuts', 30],
  ['Cashews', 30],
  ['Brazil nuts', 15],
  ['Yogurt 4% fat', 200],
  ['Milk 3.8% fat', 250],
  ['Salmon', 150],
  ['Potatoes', 200],
  ['Asparagus', 100],
  ['Chickpeas', 100],
  ['Red lentil', 50],
  ['Coconut milk', 100],
  ['Coconut water', 250],
  ['Firm tofu', 150],
  ['Coffee', 250],
  ['Chicken breast', 150],
  ['Chicken thighs', 150],
];

/** Creates / migrates the schema. Passed as `onInit` to SQLiteProvider. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= DB_VERSION) return;

  if (current < 2) {
    // v2 replaces the v1 template-based schema (workouts/sets/meals) with
    // free-form per-exercise and per-food logs.
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      DROP TABLE IF EXISTS sets;
      DROP TABLE IF EXISTS workouts;
      DROP TABLE IF EXISTS meals;
      CREATE TABLE IF NOT EXISTS exercise_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        exercise TEXT NOT NULL,
        sets INTEGER,
        reps INTEGER,
        weight REAL,
        weight_unit TEXT,
        duration_min REAL,
        distance_m REAL
      );
      CREATE TABLE IF NOT EXISTS food_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        grams REAL
      );
      CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON exercise_logs(date);
      CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);
    `);
  }

  if (current < 3) {
    // v3 adds the per-100g nutrition reference table, seeded with the user's
    // staple foods (names + typical serving sizes; values filled in by hand).
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS food_nutrition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        default_grams REAL,
        protein_g REAL,
        carbs_g REAL,
        sugar_g REAL,
        fiber_g REAL,
        fat_g REAL,
        saturated_fat_g REAL,
        omega3_g REAL,
        vitamins TEXT,
        minerals TEXT
      );
    `);
    for (const [name, defaultGrams] of SEED_NUTRITION_FOODS) {
      await db.runAsync(
        'INSERT OR IGNORE INTO food_nutrition (name, default_grams) VALUES (?, ?)',
        name,
        defaultGrams,
      );
    }
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocal(): string {
  return toLocalDateString(new Date());
}

export function daysAgoLocal(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
}

export function addDaysLocal(yyyyMmDd: string, n: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + n);
  return toLocalDateString(dt);
}

/** "2026-09-22" -> "Tue, Sep 22" */
export function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export async function insertExerciseLog(
  db: SQLiteDatabase,
  e: Omit<ExerciseLog, 'id'>,
): Promise<number> {
  const res = await db.runAsync(
    `INSERT INTO exercise_logs
       (date, exercise, sets, reps, weight, weight_unit, duration_min, distance_m)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    e.date,
    e.exercise,
    e.sets,
    e.reps,
    e.weight,
    e.weight_unit,
    e.duration_min,
    e.distance_m,
  );
  return res.lastInsertRowId;
}

export async function insertFoodLog(db: SQLiteDatabase, f: Omit<FoodLog, 'id'>): Promise<number> {
  const res = await db.runAsync('INSERT INTO food_logs (date, name, grams) VALUES (?, ?, ?)', f.date, f.name, f.grams);
  return res.lastInsertRowId;
}

export async function getExerciseLogs(db: SQLiteDatabase, limit = 500): Promise<ExerciseLog[]> {
  return db.getAllAsync<ExerciseLog>(
    `SELECT id, date, exercise, sets, reps, weight, weight_unit, duration_min, distance_m
     FROM exercise_logs ORDER BY date DESC, id DESC LIMIT ?`,
    limit,
  );
}

export async function getFoodLogs(db: SQLiteDatabase, limit = 500): Promise<FoodLog[]> {
  return db.getAllAsync<FoodLog>(
    'SELECT id, date, name, grams FROM food_logs ORDER BY date DESC, id DESC LIMIT ?',
    limit,
  );
}

export async function getExerciseLogById(db: SQLiteDatabase, id: number): Promise<ExerciseLog | null> {
  return db.getFirstAsync<ExerciseLog>(
    `SELECT id, date, exercise, sets, reps, weight, weight_unit, duration_min, distance_m
     FROM exercise_logs WHERE id = ?`,
    id,
  );
}

export async function updateExerciseLog(db: SQLiteDatabase, e: ExerciseLog): Promise<void> {
  await db.runAsync(
    `UPDATE exercise_logs
     SET date = ?, exercise = ?, sets = ?, reps = ?, weight = ?,
         weight_unit = ?, duration_min = ?, distance_m = ?
     WHERE id = ?`,
    e.date,
    e.exercise,
    e.sets,
    e.reps,
    e.weight,
    e.weight_unit,
    e.duration_min,
    e.distance_m,
    e.id,
  );
}

export async function deleteExerciseLog(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM exercise_logs WHERE id = ?', id);
}

export async function getFoodLogById(db: SQLiteDatabase, id: number): Promise<FoodLog | null> {
  return db.getFirstAsync<FoodLog>('SELECT id, date, name, grams FROM food_logs WHERE id = ?', id);
}

export async function updateFoodLog(db: SQLiteDatabase, f: FoodLog): Promise<void> {
  await db.runAsync('UPDATE food_logs SET date = ?, name = ?, grams = ? WHERE id = ?', f.date, f.name, f.grams, f.id);
}

export async function deleteFoodLog(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM food_logs WHERE id = ?', id);
}

export async function getExerciseLogsByDate(db: SQLiteDatabase, date: string): Promise<ExerciseLog[]> {
  return db.getAllAsync<ExerciseLog>(
    `SELECT id, date, exercise, sets, reps, weight, weight_unit, duration_min, distance_m
     FROM exercise_logs WHERE date = ? ORDER BY id DESC`,
    date,
  );
}

export async function getFoodLogsByDate(db: SQLiteDatabase, date: string): Promise<FoodLog[]> {
  return db.getAllAsync<FoodLog>(
    'SELECT id, date, name, grams FROM food_logs WHERE date = ? ORDER BY id DESC',
    date,
  );
}

/** One-line summary of an exercise entry, e.g. "5 x 5  ·  165 kg  ·  30 min". */
export function summarizeExerciseLog(e: ExerciseLog): string {
  const parts: string[] = [];
  if (e.sets != null && e.reps != null) parts.push(`${e.sets} x ${e.reps}`);
  else if (e.sets != null) parts.push(`${e.sets} sets`);
  else if (e.reps != null) parts.push(`${e.reps} reps`);
  if (e.weight != null) parts.push(`${e.weight} ${e.weight_unit ?? 'kg'}`);
  if (e.duration_min != null) parts.push(`${e.duration_min} min`);
  if (e.distance_m != null) parts.push(`${e.distance_m} m`);
  return parts.length > 0 ? parts.join('  ·  ') : 'Logged';
}

/** Most recent log per exercise name (for quick-add), newest first. */
export async function getRecentExerciseLogs(db: SQLiteDatabase, limit = 20): Promise<ExerciseLog[]> {
  return db.getAllAsync<ExerciseLog>(
    `SELECT id, date, exercise, sets, reps, weight, weight_unit, duration_min, distance_m
     FROM exercise_logs
     WHERE id IN (SELECT MAX(id) FROM exercise_logs GROUP BY exercise)
     ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

/** Most recent log per food name (for quick-add), newest first. */
export async function getRecentFoodLogs(db: SQLiteDatabase, limit = 20): Promise<FoodLog[]> {
  return db.getAllAsync<FoodLog>(
    `SELECT id, date, name, grams FROM food_logs
     WHERE id IN (SELECT MAX(id) FROM food_logs GROUP BY name)
     ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

const NUTRITION_COLUMNS =
  'id, name, default_grams, protein_g, carbs_g, sugar_g, fiber_g, fat_g, ' +
  'saturated_fat_g, omega3_g, vitamins, minerals';

/** All nutrition reference entries, alphabetical. */
export async function getAllNutrition(db: SQLiteDatabase): Promise<FoodNutrition[]> {
  return db.getAllAsync<FoodNutrition>(
    `SELECT ${NUTRITION_COLUMNS} FROM food_nutrition ORDER BY name ASC`,
  );
}

export async function getNutritionById(db: SQLiteDatabase, id: number): Promise<FoodNutrition | null> {
  const row = await db.getFirstAsync<FoodNutrition>(
    `SELECT ${NUTRITION_COLUMNS} FROM food_nutrition WHERE id = ?`,
    id,
  );
  return row ?? null;
}

export async function insertNutrition(
  db: SQLiteDatabase,
  n: Omit<FoodNutrition, 'id'>,
): Promise<number> {
  const res = await db.runAsync(
    `INSERT INTO food_nutrition
       (name, default_grams, protein_g, carbs_g, sugar_g, fiber_g, fat_g,
        saturated_fat_g, omega3_g, vitamins, minerals)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    n.name,
    n.default_grams,
    n.protein_g,
    n.carbs_g,
    n.sugar_g,
    n.fiber_g,
    n.fat_g,
    n.saturated_fat_g,
    n.omega3_g,
    n.vitamins,
    n.minerals,
  );
  return res.lastInsertRowId;
}

export async function updateNutrition(db: SQLiteDatabase, n: FoodNutrition): Promise<void> {
  await db.runAsync(
    `UPDATE food_nutrition SET
       name = ?, default_grams = ?, protein_g = ?, carbs_g = ?, sugar_g = ?,
       fiber_g = ?, fat_g = ?, saturated_fat_g = ?, omega3_g = ?,
       vitamins = ?, minerals = ?
     WHERE id = ?`,
    n.name,
    n.default_grams,
    n.protein_g,
    n.carbs_g,
    n.sugar_g,
    n.fiber_g,
    n.fat_g,
    n.saturated_fat_g,
    n.omega3_g,
    n.vitamins,
    n.minerals,
    n.id,
  );
}

export async function deleteNutrition(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM food_nutrition WHERE id = ?', id);
}

export interface DayStats {
  date: string;
  exercises: number;
  volumeKg: number;
  distanceM: number;
  durationMin: number;
  foods: number;
}

const LB_TO_KG = 0.45359237;

/** Stats for the given dates, returned in the same order. */
export async function getDayStats(db: SQLiteDatabase, dates: string[]): Promise<DayStats[]> {
  if (dates.length === 0) return [];
  const since = dates.reduce((a, b) => (a < b ? a : b));

  const exRows = await db.getAllAsync<{ date: string; n: number; vol: number; dist: number; dur: number }>(
    `SELECT date,
       COUNT(*) AS n,
       SUM(COALESCE(sets, 1) * COALESCE(reps, 0) * COALESCE(weight, 0) *
           CASE WHEN weight_unit = 'lb' THEN ${LB_TO_KG} ELSE 1 END) AS vol,
       SUM(COALESCE(distance_m, 0)) AS dist,
       SUM(COALESCE(duration_min, 0)) AS dur
     FROM exercise_logs WHERE date >= ? GROUP BY date`,
    since,
  );
  const foodRows = await db.getAllAsync<{ date: string; n: number }>(
    'SELECT date, COUNT(*) AS n FROM food_logs WHERE date >= ? GROUP BY date',
    since,
  );

  const exMap = new Map(exRows.map((r) => [r.date, r]));
  const foodMap = new Map(foodRows.map((r) => [r.date, r.n]));

  return dates.map((date) => {
    const e = exMap.get(date);
    return {
      date,
      exercises: e?.n ?? 0,
      volumeKg: Math.round(e?.vol ?? 0),
      distanceM: Math.round(e?.dist ?? 0),
      durationMin: Math.round(e?.dur ?? 0),
      foods: foodMap.get(date) ?? 0,
    };
  });
}

export async function exportAllData(db: SQLiteDatabase): Promise<object> {
  const exercise_logs = await db.getAllAsync<ExerciseLog>(
    `SELECT id, date, exercise, sets, reps, weight, weight_unit, duration_min, distance_m
     FROM exercise_logs ORDER BY date ASC, id ASC`,
  );
  const food_logs = await db.getAllAsync<FoodLog>(
    'SELECT id, date, name, grams FROM food_logs ORDER BY date ASC, id ASC',
  );
  return {
    app: 'longevity-log',
    version: 2,
    exported_at: new Date().toISOString(),
    exercise_logs,
    food_logs,
  };
}
