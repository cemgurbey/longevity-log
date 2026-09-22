import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { exportAllData, formatDate, getDayStats, toLocalDateString } from '@/src/db';
import type { DayStats } from '@/src/db';
import type { ThemeColors } from '@/src/theme';

function StatRow({
  label,
  value,
  last,
  c,
}: {
  label: string;
  value: string;
  last?: boolean;
  c: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}>
      <Text style={{ color: c.sub, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function daySummary(day: DayStats): string {
  const parts: string[] = [];
  if (day.exercises > 0) parts.push(`${day.exercises} exercise${day.exercises === 1 ? '' : 's'}`);
  if (day.volumeKg > 0) parts.push(`${day.volumeKg.toLocaleString()} kg lifted`);
  if (day.distanceM > 0) parts.push(`${day.distanceM.toLocaleString()} m`);
  if (day.durationMin > 0) parts.push(`${day.durationMin} min`);
  if (day.foods > 0) parts.push(`${day.foods} food${day.foods === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join('  ·  ') : 'Rest day';
}

/** "2026-09-22" -> "Sep 22" */
function shortDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Seven ISO dates ending today, newest first. */
function last7Dates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    dates.push(
      toLocalDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)),
    );
  }
  return dates;
}

/**
 * ISO dates for the selected week, newest first. The current week is the last
 * 7 days ending today; previous weeks are full Monday–Sunday calendar weeks.
 */
function weekDates(offset: number): string[] {
  if (offset === 0) return last7Dates();
  const today = new Date();
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - daysSinceMonday - offset * 7,
  );
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    dates.push(
      toLocalDateString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
    );
  }
  return dates;
}

function WeekNavButton({
  label,
  disabled,
  onPress,
  c,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  c: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      style={({ pressed }) => ({ padding: 6, opacity: disabled ? 0.25 : pressed ? 0.6 : 1 })}>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekStats, setWeekStats] = useState<DayStats[]>([]);
  const [last7Stats, setLast7Stats] = useState<DayStats[]>([]);
  const [sharing, setSharing] = useState(false);

  const dates = weekDates(weekOffset);
  const weekLabel = `${shortDate(dates[dates.length - 1]!)} – ${shortDate(dates[0]!)}`;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [w, l] = await Promise.all([
          getDayStats(db, weekDates(weekOffset)),
          getDayStats(db, last7Dates()),
        ]);
        if (alive) {
          setWeekStats(w);
          setLast7Stats(l);
        }
      })();
      return () => {
        alive = false;
      };
    }, [db, weekOffset]),
  );

  const totalExercises = last7Stats.reduce((a, s) => a + s.exercises, 0);
  const totalVolume = last7Stats.reduce((a, s) => a + s.volumeKg, 0);
  const totalDistance = last7Stats.reduce((a, s) => a + s.distanceM, 0);
  const totalDuration = last7Stats.reduce((a, s) => a + s.durationMin, 0);
  const totalFoods = last7Stats.reduce((a, s) => a + s.foods, 0);

  async function onExport() {
    if (sharing) return;
    setSharing(true);
    try {
      const data = await exportAllData(db);
      await Share.share({
        title: 'longevity-log export',
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      // share sheet dismissed or unavailable
    } finally {
      setSharing(false);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>Dashboard</Title>
        <PrimaryButton title={sharing ? 'Preparing…' : 'Export all data (JSON)'} onPress={onExport} disabled={sharing} />
        <View style={{ height: 12 }} />
        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
            Last 7 days
          </Text>
          <StatRow label="Exercises logged" value={String(totalExercises)} c={c} />
          <StatRow label="Volume lifted" value={`${totalVolume.toLocaleString()} kg`} c={c} />
          <StatRow label="Distance" value={`${totalDistance.toLocaleString()} m`} c={c} />
          <StatRow label="Active time" value={`${totalDuration.toLocaleString()} min`} c={c} />
          <StatRow label="Foods logged" value={String(totalFoods)} last c={c} />
        </Card>
        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
            Daily activity
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
            <WeekNavButton label="‹" c={c} onPress={() => setWeekOffset((o) => o + 1)} />
            <Text style={{ color: c.sub, fontSize: 14, fontWeight: '600' }}>{weekLabel}</Text>
            <WeekNavButton
              label="›"
              c={c}
              disabled={weekOffset === 0}
              onPress={() => setWeekOffset((o) => Math.max(0, o - 1))}
            />
          </View>
          {weekStats.map((day) => (
            <Pressable
              key={day.date}
              onPress={() => router.push({ pathname: '/day/[date]', params: { date: day.date } })}
              style={({ pressed }) => ({ marginBottom: 12, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 2 }}>
                {formatDate(day.date)}
              </Text>
              <Muted>{daySummary(day)}</Muted>
            </Pressable>
          ))}
        </Card>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
