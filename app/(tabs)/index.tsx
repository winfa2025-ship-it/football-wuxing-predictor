import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Fixture } from '../utils/types';
import { colors, shadow, shadowGold } from '../utils/theme';
import { LuxHeader, GoldDivider, LuxCard } from '../components/LuxComponents';
import { getFavorites, toggleFavorite } from '../utils/favorites';
import { Ionicons } from '@expo/vector-icons';

export default function TodayScreen() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadFixtures = async () => {
    try {
      const res = await api.getFixtures();
      setFixtures(res.data || []);
      const favs = await getFavorites();
      setFavorites(favs.map(f => f.id));
    } catch (err) {
      console.log('加載失敗，使用演示數據');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadFixtures(); }, []);

  const onToggleFav = useCallback(async (f: Fixture) => {
    await toggleFavorite({
      id: f.id,
      homeTeam: f.home?.team?.name || '',
      awayTeam: f.away?.team?.name || '',
      league: f.league?.name,
      date: f.date,
      status: f.status,
      minute: f.minute,
      homeGoals: f.home?.goals,
      awayGoals: f.away?.goals,
      savedAt: Date.now(),
    });
    const favs = await getFavorites();
    setFavorites(favs.map(x => x.id));
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={styles.center} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFixtures(); }} tintColor={colors.primary} />}
    >
      <LuxHeader icon="📅" title="今日賽事" subtitle="AI + 風水命理 · 每日精準預測" />

      {fixtures.length === 0 && <Text style={styles.empty}>今日暫無賽事</Text>}

      {fixtures.map((f, i) => (
        <TouchableOpacity
          key={f.id}
          style={styles.cardWrap}
          onPress={() => router.push(`/prediction/${f.id}`)}
          activeOpacity={0.8}
        >
          <LuxCard gold={i === 0} style={styles.card}>
            <View style={styles.leagueRow}>
              <View style={styles.leagueLeft}>
                <Text style={[styles.leagueName, i === 0 && { color: colors.goldLight }]}>{f.league?.name} {f.league?.season}</Text>
              </View>
              <View style={styles.badgeRow}>
                <Text style={f.status === 'live' ? styles.liveBadge : styles.timeBadge}>
                  {f.status === 'live' ? '● 進行中' : f.minute || '未開始'}
                </Text>
                <TouchableOpacity onPress={() => onToggleFav(f)} hitSlop={8}>
                  <Ionicons name={favorites.includes(f.id) ? 'star' : 'star-outline'} size={20} color={favorites.includes(f.id) ? colors.primary : colors.textFaint} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.matchRow}>
              <Text style={styles.teamName}>{f.home?.team?.name}</Text>
              <View style={styles.scoreWrap}>
                <View style={styles.scoreLine} />
                <Text style={styles.score}>{(f.home?.goals ?? '-')} : {(f.away?.goals ?? '-')}</Text>
                <View style={styles.scoreLine} />
              </View>
              <Text style={[styles.teamName, styles.away]}>{f.away?.team?.name}</Text>
            </View>

            <GoldDivider style={{ marginVertical: 12 }} />
            <View style={styles.footer}>
              <Text style={styles.predHint}>點擊查看 AI 預測與風水分析 →</Text>
            </View>
          </LuxCard>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  cardWrap: { marginHorizontal: 16, marginVertical: 6 },
  card: { marginBottom: 0 },
  leagueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  leagueLeft: { flexDirection: 'row', alignItems: 'center' },
  leagueName: { color: colors.textDim, fontSize: 13 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: { color: colors.danger, fontSize: 12, fontWeight: 'bold' },
  timeBadge: { color: colors.textDim, fontSize: 12 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamName: { color: colors.text, fontSize: 18, fontWeight: '700', flex: 1 },
  away: { textAlign: 'right' },
  scoreWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  scoreLine: { width: 12, height: 1, backgroundColor: colors.goldDeep },
  score: { color: colors.primary, fontSize: 26, fontWeight: '900', marginHorizontal: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  predHint: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 60, fontSize: 16 },
});
