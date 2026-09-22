import { useCallback, useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Card, Muted, PrimaryButton, Screen, Title, useThemeColors } from '@/src/ui';
import { exportAllData, formatDate, getLast7DayStats } from '@/src/db';
import type { DayStats } from '@/src/db';
import type { ThemeColors } from '@/src/theme';

const PROTEIN_TARGET = 150;

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

function DayCard({ day, c }: { day: DayStats; c: ThemeColors }) {
  const barWidth = `${Math.round(Math.min(100, (day.proteinG / PROTEIN_TARGET) * 100))}%` as const;
  const activity = [
    day.workouts > 0 ? `${day.workouts} workout${day.workouts === 1 ? '' : 's'}` : null,
    day.liftVolumeKg > 0 ? `${day.liftVolumeKg.toLocaleString()} kg lifted` : null,
    day.swimDistanceM > 0 ? `${day.swimDistanceM.toLocaleString()} m swum` : null,
  ].filter((x): x is string => x !== null);

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{formatDate(day.date)}</Text>
        <Muted>
          {day.proteinG} / {PROTEIN_TARGET} g
        </Muted>
      </View>
      <View
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: c.border,
          overflow: 'hidden',
        }}>
        <View
          style={{
            height: '100%',
            width: barWidth,
            backgroundColor: day.proteinG >= PROTEIN_TARGET ? c.accent : '#f59e0b',
            borderRadius: 5,
          }}
        />
      </View>
      {activity.length > 0 && <Muted>{activity.join(' · ')}</Muted>}
    </View>
  );
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

  const totalWorkouts = stats.reduce((a, s) => a + s.workouts, 0);
  const totalVolume = stats.reduce((a, s) => a + s.liftVolumeKg, 0);
  const totalSwim = stats.reduce((a, s) => a + s.swimDistanceM, 0);
  const avgProtein = stats.length
    ? Math.round(stats.reduce((a, s) => a + s.proteinG, 0) / stats.length)
    : 0;

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
        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Last 7 days</Text>
          <StatRow label="Workouts" value={String(totalWorkouts)} c={c} />
          <StatRow label="Lift volume" value={`${totalVolume.toLocaleString()} kg`} c={c} />
          <StatRow label="Swim distance" value={`${totalSwim.toLocaleString()} m`} c={c} />
          <StatRow label="Avg protein" value={`${avgProtein} g/day`} last c={c} />
        </Card>
        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
            Protein vs {PROTEIN_TARGET} g target
          </Text>
          {stats.map((day) => (
            <DayCard key={day.date} day={day} c={c} />
          ))}
        </Card>
        <PrimaryButton title={sharing ? 'Preparing…' : 'Export all data (JSON)'} onPress={onExport} disabled={sharing} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
