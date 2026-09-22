# longevity-log

A personal workout and food log, built with Expo (SDK 57), React Native, TypeScript, and `expo-sqlite`. Dark mode only.

## What it does

- **Exercise tab** — log one exercise at a time: date (defaults to today), exercise name, sets, reps, weight (kg or lb), duration, and distance. Only the name is required; fill in whatever applies. Your 8 most recent exercises appear as quick-add chips.
- **Food tab** — log what you ate: date (defaults to today), food name, and weight in grams. Your 8 most recent foods appear as quick-add chips. Protein is calculated separately, later.
- **Dashboard** — last-7-day totals (exercises, volume lifted, distance, active time, foods logged), per-day activity, and JSON export of everything.

Data is stored locally in SQLite (`exercise_logs` and `food_logs` tables). No accounts, no cloud.

## Run it

`expo-sqlite` needs a development build — it does not run in Expo Go.

```bash
npm install
npx expo run:ios     # or: npx expo run:android
```

## Project layout

- `app/` — Expo Router screens (`(tabs)/` for the three tabs, `log-workout.tsx` / `log-meal.tsx` modals)
- `src/db.ts` — SQLite schema, migrations, and queries
- `src/ui.tsx` — shared dark-mode UI components
- `src/theme.ts` — color palette
