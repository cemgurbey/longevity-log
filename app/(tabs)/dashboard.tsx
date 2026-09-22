import { useCallback, useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { exportAllData, formatDate, getLast7DayStats } from '@/src/db';
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

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const c = useThemeColors();
  const [stats, setStats] = useState<DayStats[]>([]);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const s = await getLast7DayStats(db);
        if (alive) setStats(s);
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  const totalExercises = stats.reduce((a, s) => a + s.exercises, 0);
  const totalVolume = stats.reduce((a, s) => a + s.volumeKg, 0);
  const totalDistance = stats.reduce((a, s) => a + s.distanceM, 0);
  const totalDuration = stats.reduce((a, s) => a + s.durationMin, 0);
  const totalFoods = stats.reduce((a, s) => a + s.foods, 0);

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
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Last 7 days</Text>
          <StatRow label="Exercises logged" value={String(totalExercises)} c={c} />
          <StatRow label="Volume lifted" value={`${totalVolume.toLocaleString()} kg`} c={c} />
          <StatRow label="Distance" value={`${totalDistance.toLocaleString()} m`} c={c} />
          <StatRow label="Active time" value={`${totalDuration.toLocaleString()} min`} c={c} />
          <StatRow label="Foods logged" value={String(totalFoods)} last c={c} />
        </Card>
        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
            Daily activity
          </Text>
          {stats.map((day) => (
            <View key={day.date} style={{ marginBottom: 12 }}>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 2 }}>
                {formatDate(day.date)}
              </Text>
              <Muted>{daySummary(day)}</Muted>
            </View>
          ))}
        </Card>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
