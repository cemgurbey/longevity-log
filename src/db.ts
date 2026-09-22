import type { SQLiteDatabase } from 'expo-sqlite';

export type WorkoutKind = 'lift' | 'swim';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Workout {
  id: number;
  date: string; // YYYY-MM-DD in local time
  kind: WorkoutKind;
  name: string;
}

export interface WorkoutSet {
  id: number;
  workout_id: number;
  exercise: string;
  set_no: number;
  reps: number | null;
  weight_kg: number | null;
  distance_m: number | null;
  duration_min: number | null;
}

export interface Meal {
  id: number;
  date: string; // YYYY-MM-DD in local time
  slot: MealSlot;
  name: string;
  description: string | null;
  protein_g: number | null;
  notes: string | null;
}

const DB_VERSION = 1;

/** Creates the schema on first run. Passed as `onInit` to SQLiteProvider. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= DB_VERSION) return;

  if (current === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES workouts(id),
        exercise TEXT NOT NULL,
        set_no INTEGER NOT NULL,
        reps INTEGER,
        weight_kg REAL,
        distance_m REAL,
        duration_min REAL
      );
      CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        slot TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        protein_g REAL,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
      CREATE INDEX IF NOT EXISTS idx_sets_workout ON sets(workout_id);
      CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
    `);
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

/** "2026-09-21" -> "Mon, Sep 21" */
export function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export async function insertWorkout(
  db: SQLiteDatabase,
  w: { date: string; kind: WorkoutKind; name: string },
): Promise<number> {
  const res = await db.runAsync('INSERT INTO workouts (date, kind, name) VALUES (?, ?, ?)', w.date, w.kind, w.name);
  return res.lastInsertRowId;
}

export async function insertSet(
  db: SQLiteDatabase,
  s: {
    workout_id: number;
    exercise: string;
    set_no: number;
    reps: number | null;
    weight_kg: number | null;
    distance_m: number | null;
    duration_min: number | null;
  },
): Promise<void> {
  await db.runAsync(
    'INSERT INTO sets (workout_id, exercise, set_no, reps, weight_kg, distance_m, duration_min) VALUES (?, ?, ?, ?, ?, ?, ?)',
    s.workout_id,
    s.exercise,
    s.set_no,
    s.reps,
    s.weight_kg,
    s.distance_m,
    s.duration_min,
  );
}

export async function getWorkouts(db: SQLiteDatabase, limit = 100): Promise<Workout[]> {
  return db.getAllAsync<Workout>(
    'SELECT id, date, kind, name FROM workouts ORDER BY date DESC, id DESC LIMIT ?',
    limit,
  );
}

export async function getSetsForWorkout(db: SQLiteDatabase, workoutId: number): Promise<WorkoutSet[]> {
  return db.getAllAsync<WorkoutSet>(
    'SELECT id, workout_id, exercise, set_no, reps, weight_kg, distance_m, duration_min FROM sets WHERE workout_id = ? ORDER BY set_no ASC, id ASC',
    workoutId,
  );
}

export async function insertMeal(db: SQLiteDatabase, m: Omit<Meal, 'id'>): Promise<number> {
  const res = await db.runAsync(
    'INSERT INTO meals (date, slot, name, description, protein_g, notes) VALUES (?, ?, ?, ?, ?, ?)',
    m.date,
    m.slot,
    m.name,
    m.description,
    m.protein_g,
    m.notes,
  );
  return res.lastInsertRowId;
}

export async function getMealsForDate(db: SQLiteDatabase, date: string): Promise<Meal[]> {
  return db.getAllAsync<Meal>(
    'SELECT id, date, slot, name, description, protein_g, notes FROM meals WHERE date = ? ORDER BY id ASC',
    date,
  );
}

export interface DayStats {
  date: string;
  workouts: number;
  liftVolumeKg: number;
  swimDistanceM: number;
  proteinG: number;
}

export async function getLast7DayStats(db: SQLiteDatabase): Promise<DayStats[]> {
  const since = daysAgoLocal(6);
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) dates.push(daysAgoLocal(i));

  const workoutCounts = await db.getAllAsync<{ date: string; n: number }>(
    'SELECT date, COUNT(*) AS n FROM workouts WHERE date >= ? GROUP BY date',
    since,
  );
  const volumes = await db.getAllAsync<{ date: string; v: number }>(
    `SELECT w.date AS date, SUM(s.reps * s.weight_kg) AS v
     FROM sets s JOIN workouts w ON w.id = s.workout_id
     WHERE w.date >= ? AND w.kind = 'lift' AND s.reps IS NOT NULL AND s.weight_kg IS NOT NULL
     GROUP BY w.date`,
    since,
  );
  const swimDistances = await db.getAllAsync<{ date: string; d: number }>(
    `SELECT w.date AS date, SUM(s.distance_m) AS d
     FROM sets s JOIN workouts w ON w.id = s.workout_id
     WHERE w.date >= ? AND w.kind = 'swim' AND s.distance_m IS NOT NULL
     GROUP BY w.date`,
    since,
  );
  const proteins = await db.getAllAsync<{ date: string; p: number }>(
    'SELECT date, SUM(protein_g) AS p FROM meals WHERE date >= ? GROUP BY date',
    since,
  );

  function rowsToMap<T extends { date: string }>(rows: T[], pick: (r: T) => number): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.date, pick(r) ?? 0);
    return m;
  }
  const workoutMap = rowsToMap(workoutCounts, (r) => r.n);
  const volumeMap = rowsToMap(volumes, (r) => r.v);
  const swimMap = rowsToMap(swimDistances, (r) => r.d);
  const proteinMap = rowsToMap(proteins, (r) => r.p);

  return dates.map((date) => ({
    date,
    workouts: workoutMap.get(date) ?? 0,
    liftVolumeKg: Math.round(volumeMap.get(date) ?? 0),
    swimDistanceM: Math.round(swimMap.get(date) ?? 0),
    proteinG: Math.round((proteinMap.get(date) ?? 0) * 10) / 10,
  }));
}

export async function exportAllData(db: SQLiteDatabase): Promise<object> {
  const workouts = await db.getAllAsync<Workout>(
    'SELECT id, date, kind, name FROM workouts ORDER BY date ASC, id ASC',
  );
  const sets = await db.getAllAsync<WorkoutSet>(
    'SELECT id, workout_id, exercise, set_no, reps, weight_kg, distance_m, duration_min FROM sets ORDER BY workout_id ASC, set_no ASC',
  );
  const meals = await db.getAllAsync<Meal>(
    'SELECT id, date, slot, name, description, protein_g, notes FROM meals ORDER BY date ASC, id ASC',
  );
  const setsByWorkout = new Map<number, WorkoutSet[]>();
  for (const s of sets) {
    const arr = setsByWorkout.get(s.workout_id) ?? [];
    arr.push(s);
    setsByWorkout.set(s.workout_id, arr);
  }
  return {
    app: 'longevity-log',
    version: 1,
    exported_at: new Date().toISOString(),
    workouts: workouts.map((w) => ({ ...w, sets: setsByWorkout.get(w.id) ?? [] })),
    meals,
  };
}
