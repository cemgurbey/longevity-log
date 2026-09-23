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

const DB_VERSION = 5;

/**
 * Researched per-100g values:
 * [name, protein_g, carbs_g, sugar_g, fiber_g, fat_g, saturated_fat_g, omega3_g, vitamins, minerals]
 */
type NutritionSeedValues = [
  string,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  string | null,
  string | null,
];

/** [name, typical serving in grams] seeds for the nutrition reference table. */
const SEED_NUTRITION_FOODS: [string, number][] = [
  ['Pumpkin seeds', 100],
  ['Oatmeal', 100],
  ['Chia seeds', 100],
  ['Flax seeds', 100],
  ['Hemp hearts', 100],
  ['Bourguignon cubes', 100],
  ['Eggs', 100],
  ['Banana', 100],
  ['Avocado', 100],
  ['Carrot', 100],
  ['Lemon', 100],
  ['Beetroots', 100],
  ['Mini pepper', 100],
  ['Radish', 100],
  ['Mint', 100],
  ['Parsley', 100],
  ['Olive oil', 100],
  ['Ginger', 100],
  ['Quinoa', 100],
  ['Almonds', 100],
  ['Walnuts', 100],
  ['Spring mix salad', 100],
  ['Hazelnuts', 100],
  ['Cashews', 100],
  ['Brazil nuts', 100],
  ['Yogurt 4% fat', 100],
  ['Milk 3.8% fat', 100],
  ['Salmon', 100],
  ['Potatoes', 100],
  ['Asparagus', 100],
  ['Chickpeas', 100],
  ['Red lentil', 100],
  ['Coconut milk', 100],
  ['Coconut water', 100],
  ['Firm tofu', 100],
  ['Coffee', 100],
  ['Chicken breast', 100],
  ['Chicken thighs', 100],
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

  if (current < 4) {
    // v4 fills the researched per-100g nutrition values (USDA-based, 2026-09-22)
    // and adds tomato. COALESCE preserves any values the user entered already.
    await db.runAsync(
      'INSERT OR IGNORE INTO food_nutrition (name, default_grams) VALUES (?, ?)',
      'Tomato',
      100,
    );
    const VALUES: NutritionSeedValues[] = [
      ['Pumpkin seeds', 30.2, 10.7, 1.4, 6.0, 49.1, 8.7, 0.1, 'E 2.2mg', 'Mg 592mg; Fe 8.8mg; Zn 7.8mg; Cu 1.3mg; Mn 4.5mg'],
      ['Oatmeal', 16.0, 67.0, 1.4, 9.8, 6.3, 1.1, 0.1, 'Thiamin 0.7mg', 'Mn 3.6mg; Mg 148mg; P 474mg; K 350mg; Fe 4.2mg'],
      ['Chia seeds', 16.5, 42.1, null, 34.4, 30.7, 3.3, 17.8, 'Niacin 8.8mg', 'Ca 631mg; Mg 335mg; Mn 2.7mg; Se 55.2mcg; Fe 7.7mg'],
      ['Flax seeds', 18.3, 28.9, 1.6, 27.3, 42.2, 3.7, 22.8, 'Thiamin 1.6mg', 'Mg 392mg; K 813mg; Fe 5.7mg; Zn 4.3mg; P 642mg'],
      ['Hemp hearts', 31.6, 8.7, 1.5, 4.0, 48.8, 4.6, 8.7, 'Niacin 9.2mg', 'Mg 700mg; Mn 7.6mg; P 1650mg; Zn 9.9mg; Cu 1.6mg'],
      ['Bourguignon cubes', 19.0, 0.4, 0.0, 0.0, 11.6, 4.8, 0.0, 'B12 5.0mcg; B6 0.38mg; Niacin 3.4mg', 'Fe 2.5mg; P 200mg; K 340mg; Zn 7.4mg; Se 33mcg'],
      ['Eggs', 12.6, 0.7, 0.4, 0.0, 9.5, 3.1, 0.1, 'A 180mcg; B12 1.0mcg; Folate 71mcg', 'P 184mg; Se 31mcg; K 132mg'],
      ['Banana', 1.1, 22.8, 12.2, 2.6, 0.3, 0.1, 0.0, 'C 8.7mg; B6 0.37mg', 'K 358mg; Mg 27mg'],
      ['Avocado', 2.0, 8.5, 0.7, 6.7, 14.7, 2.1, 0.1, 'C 10.0mg; E 2.07mg; K 21.0mcg', 'K 485mg; Mg 29mg'],
      ['Carrot', 0.9, 9.6, 4.7, 2.8, 0.2, 0.0, 0.0, 'A 835mcg; C 5.9mg; K 13.2mcg', 'K 320mg; Mg 12mg'],
      ['Lemon', 1.1, 9.3, 2.5, 2.8, 0.3, 0.0, 0.0, 'C 53.0mg', 'K 138mg; Ca 26mg; Fe 0.6mg'],
      ['Beetroots', 1.6, 9.6, 6.8, 2.8, 0.2, 0.0, 0.0, 'C 4.9mg; Folate 109mcg', 'K 325mg; Mg 23mg; Fe 0.8mg; Mn 0.3mg'],
      ['Mini pepper', 1.0, 6.0, 4.2, 2.1, 0.3, 0.0, 0.1, 'C 127.7mg; A 157mcg; E 1.7mg; K 4.9mcg', 'K 211mg; Mg 12mg'],
      ['Radish', 0.7, 3.4, 1.9, 1.6, 0.1, 0.0, 0.0, 'C 14.8mg; B9 25mcg', 'K 233mg; Ca 25mg; Mg 10mg'],
      ['Mint', 3.3, 8.4, null, 6.8, 0.7, 0.2, 0.3, 'A 203mcg; C 13.3mg; B9 105mcg', 'K 458mg; Fe 11.9mg; Ca 199mg'],
      ['Parsley', 3.0, 6.3, 0.9, 3.3, 0.8, 0.1, 0.0, 'C 133mg; A 421mcg; K 1640mcg; Folate 152mcg', 'K 554mg; Fe 6.2mg'],
      ['Olive oil', 0.0, 0.0, 0.0, 0.0, 100.0, 13.8, 0.8, 'E 14mg; K 60mcg', null],
      ['Ginger', 1.8, 17.8, 1.7, 2.0, 0.8, 0.2, 0.0, 'C 5mg; B6 0.16mg; E 0.26mg', 'K 415mg; Mg 43mg; Fe 0.6mg'],
      ['Quinoa', 14.1, 64.2, 0.0, 7.0, 6.1, 0.7, 0.3, 'Folate 184mcg; B6 0.5mg; E 2.4mg', 'Mg 197mg; P 457mg; K 563mg'],
      ['Almonds', 21.2, 21.5, 4.4, 12.5, 49.9, 3.8, 0.0, 'E 25.6mg', 'K 733mg; Mg 270mg; Ca 269mg; Fe 3.7mg; Zn 3.1mg'],
      ['Walnuts', 15.4, 13.9, 2.6, 6.8, 66.1, 6.1, 9.2, 'B6 0.54mg; Folate 99mcg', 'Mn 3.5mg; Cu 1.6mg; Mg 160mg'],
      ['Spring mix salad', 1.5, 3.2, 0.9, 2.0, 0.2, 0.0, null, 'C 10.1mg', 'Fe 1.2mg; Ca 48mg; K 291mg; P 31mg'],
      ['Hazelnuts', 15.0, 16.7, 4.3, 9.7, 60.8, 4.5, 0.1, 'E 15.0mg; Folate 113mcg', 'Mn 6.2mg; Cu 1.7mg; Mg 163mg; Fe 4.7mg'],
      ['Cashews', 18.2, 30.2, 5.9, 3.3, 43.9, 7.8, 0.1, 'K 34mcg; B6 0.42mg', 'Cu 2.2mg; Mg 292mg; Fe 6.7mg; Zn 5.8mg'],
      ['Brazil nuts', 14.3, 11.7, 2.3, 7.5, 67.1, 16.1, 0.0, 'E 5.7mg', 'Se 1917mcg; Mg 376mg; Cu 1.7mg; Zn 4.1mg; K 659mg'],
      ['Yogurt 4% fat', 3.5, 4.7, 4.7, 0.0, 3.3, 2.1, null, 'A 27mcg; B12 0.37mcg; B2 0.14mg', 'Ca 121mg; P 95mg; K 155mg'],
      ['Milk 3.8% fat', 3.3, 4.6, 4.8, 0.0, 3.2, 1.9, null, 'A 32mcg; D 0.96mcg; B12 0.54mcg; B2 0.14mg', 'Ca 123mg; P 101mg; K 150mg'],
      ['Salmon', 20.4, 0.0, 0.0, 0.0, 13.4, 3.1, 2.1, 'B12 3.2mcg; D 11mcg; B3 8.7mg; B6 0.64mg', 'P 240mg; K 363mg; Se 24mcg'],
      ['Potatoes', 2.3, 18.0, 0.5, 0.0, 0.4, 0.0, null, 'C 11mg; Niacin 1.5mg; B6 0.2mg', 'K 450mg; Mg 26mg; P 55mg'],
      ['Asparagus', 2.2, 3.9, 1.9, 2.1, 0.1, 0.0, null, 'Folate 52mcg; C 5.6mg; K 41.6mcg', 'K 202mg; Fe 1.1mg; Cu 0.2mg'],
      ['Chickpeas', 8.9, 27.4, 4.8, 7.6, 2.6, 0.3, 0.0, 'Folate 172mcg; B6 0.1mg', 'Fe 2.9mg; Mg 48mg; P 168mg; K 291mg'],
      ['Red lentil', 23.9, 63.1, 0.0, 10.8, 2.2, 0.4, 0.3, 'Folate 204mcg; B1 0.5mg; B6 0.4mg', 'Fe 7.4mg; Mn 1.7mg; Zn 3.6mg'],
      ['Coconut milk', 2.0, 2.8, null, null, 21.3, 18.9, null, 'C 1.0mg; Folate 14mcg', 'Fe 3.3mg; Mg 46mg; P 96mg; K 220mg'],
      ['Coconut water', 0.2, 4.2, 3.9, 0.0, 0.0, 0.0, 0.0, 'C 9.9mg', 'K 165mg; Mn 0.2mg; Ca 7mg'],
      ['Firm tofu', 9.0, 2.9, 0.6, 0.9, 4.2, 0.8, null, 'B1 0.06mg; B2 0.06mg; Folate 19mcg', 'Ca 201mg; Fe 1.6mg; Mg 37mg; K 148mg'],
      ['Coffee', 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, null, 'B2 0.08mg; B3 0.19mg; B5 0.25mg', 'K 49mg; Ca 2mg'],
      ['Chicken breast', 22.5, 0.0, 0.0, 0.0, 2.6, 0.6, 0.0, 'B3 10mg; B6 0.7mg', 'Se 17.8mcg; P 185mg; K 220mg'],
      ['Chicken thighs', 19.7, 0.0, 0.0, 0.0, 4.1, 1.1, 0.0, 'B12 0.5mcg', 'Se 21.3mcg; Zn 2.1mg; P 189mg; Fe 1.1mg'],
      ['Tomato', 0.9, 3.9, 2.6, 1.2, 0.2, 0.0, 0.0, 'C 13.7mg; A 42mcg; E 0.54mg; K 7.9mcg', 'K 237mg; Mg 11mg'],
    ];
    for (const [name, protein, carbs, sugar, fiber, fat, sat, omega3, vitamins, minerals] of VALUES) {
      await db.runAsync(
        `UPDATE food_nutrition SET
           protein_g = COALESCE(protein_g, ?), carbs_g = COALESCE(carbs_g, ?),
           sugar_g = COALESCE(sugar_g, ?), fiber_g = COALESCE(fiber_g, ?),
           fat_g = COALESCE(fat_g, ?), saturated_fat_g = COALESCE(saturated_fat_g, ?),
           omega3_g = COALESCE(omega3_g, ?),
           vitamins = COALESCE(vitamins, ?), minerals = COALESCE(minerals, ?)
         WHERE name = ?`,
        protein,
        carbs,
        sugar,
        fiber,
        fat,
        sat,
        omega3,
        vitamins,
        minerals,
        name,
      );
    }
  }

  if (current < 5) {
    // v5 normalizes all default servings to 100 g so foods are directly
    // comparable when quick-added.
    await db.runAsync('UPDATE food_nutrition SET default_grams = 100');
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
