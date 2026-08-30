import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Fixture, Favorite } from '../utils/types';
import { getFavorites, toggleFavorite } from '../utils/favorites';
import { useLiveScores } from '../hooks/useLiveScores';
import { colors } from '../utils/theme';
import { LuxHeader, LuxCard, GoldDivider } from '../components/LuxComponents';
import BettingBars from '../components/BettingBars';
import { Ionicons } from '@expo/vector-icons';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const liveScores = useLiveScores();

  const load = useCallback(async () => {
    try {
      const [favs, res] = await Promise.all([getFavorites(), api.getFixtures().catch(() => null)]);
      setFavorites(favs);
      setFixtures(res?.data || []);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 合併即時比分到收藏
  useEffect(() => {
    if (liveScores.length) {
      const map = new Map(liveScores.map(f => [f.id, f]));
      setFixtures(prev => {
        const merged = [...prev];
        for (let i = 0; i < merged.length; i++) {
          const lv = map.get(merged[i].id);
          if (lv) merged[i] = lv;
        }
        return merged;
      });
    }
  }, [liveScores]);

  // 合併 fixtures 的即時數據到收藏 (顯示比分/狀態)
  const merged: Favorite[] = favorites.map(fav => {
    const fx = fixtures.find(f => f.id === fav.id);
    if (fx) {
      return {
        ...fav,
        status: fx.status,
        minute: fx.minute,
        homeGoals: fx.home?.goals,
        awayGoals: fx.away?.goals,
      };
    }
    return fav;
  });

  const remove = async (id: number) => {
    const next = await toggleFavorite({ id } as Favorite);
    setFavorites(await getFavorites());
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={styles.center} />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <LuxHeader icon="⭐" title="我的收藏" subtitle="自選場次一目了然，長按可移除" />

      {merged.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyText}>尚未收藏任何場次</Text>
          <Text style={styles.emptySub}>在「今日賽事」或「AI預測」中點擊星標即可收藏</Text>
        </View>
      ) : (
        merged.map(fav => {
          const fx = fixtures.find(f => f.id === fav.id);
          return (
            <TouchableOpacity key={fav.id} style={styles.cardWrap} onPress={() => router.push(`/prediction/${fav.id}`)} activeOpacity={0.8}>
              <LuxCard gold style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.league}>{fav.league || fx?.league?.name || ''}</Text>
                  <View style={styles.badgeRow}>
                    {fav.status === 'live' && <Text style={styles.liveBadge}>● 進行中 {fav.minute || ''}</Text>}
                    {fav.status === 'finished' && <Text style={styles.finBadge}>完場</Text>}
                    <TouchableOpacity onPress={() => remove(fav.id)} hitSlop={8}>
                      <Ionicons name="star" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.matchRow}>
                  <Text style={styles.teamName}>{fav.homeTeam}</Text>
                  <Text style={styles.score}>
                    {(fav.homeGoals ?? fx?.home?.goals ?? '-')} : {(fav.awayGoals ?? fx?.away?.goals ?? '-')}
                  </Text>
                  <Text style={[styles.teamName, styles.away]}>{fav.awayTeam}</Text>
                </View>

                <GoldDivider style={{ marginVertical: 10 }} />
                <BettingBars
                  betting={fx?.betting}
                  compact
                  homeName={fav.homeTeam}
                  awayName={fav.awayTeam}
                />
                <Text style={styles.hint}>點擊查看 AI 預測與分析 →</Text>
              </LuxCard>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  cardWrap: { marginHorizontal: 16, marginVertical: 6 },
  card: { marginBottom: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  league: { color: colors.textDim, fontSize: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: { color: colors.danger, fontSize: 11, fontWeight: 'bold' },
  finBadge: { color: colors.textDim, fontSize: 11 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamName: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 },
  away: { textAlign: 'right' },
  score: { color: colors.primary, fontSize: 20, fontWeight: '900', marginHorizontal: 12 },
  hint: { color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 44 },
  emptyText: { color: colors.textDim, fontSize: 16, marginTop: 12 },
  emptySub: { color: colors.textFaint, fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 30 },
});