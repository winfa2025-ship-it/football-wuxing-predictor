import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { DailyPrediction } from '../utils/types';
import { colors, shadow } from '../utils/theme';
import { LuxHeader, LuxCard, GoldDivider, WuxingTag } from '../components/LuxComponents';
import BettingBars from '../components/BettingBars';

export default function PredictionsScreen() {
  const [predictions, setPredictions] = useState<DailyPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadPredictions = async () => {
    try {
      const res = await api.getTodayPredictions();
      setPredictions(res.data || []);
    } catch {
      console.log('預測加載失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadPredictions(); }, []);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={styles.center} />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPredictions(); }} tintColor={colors.primary} />}
    >
      <LuxHeader icon="🤖" title="AI 每日預測" subtitle="AI 數據 + 風水命理 · 權重各 50%" />

      {predictions.length === 0 && <Text style={styles.empty}>今日暫無預測</Text>}

      {predictions.map((p) => {
        const c = p.consensus;
        const confidence = c?.confidence || 60;
        return (
          <TouchableOpacity key={p.fixtureId} style={styles.cardWrap} onPress={() => router.push(`/prediction/${p.fixtureId}`)} activeOpacity={0.8}>
            <LuxCard gold style={styles.card}>
              <View style={styles.badgeRow}>
                <View style={styles.confBadge}><Text style={styles.confText}>信心 {confidence}%</Text></View>
                <WuxingTag label={`預測：${c?.winner}`} />
              </View>

              <View style={styles.matchRow}>
                <Text style={styles.teamName}>{p.homeTeam}</Text>
                <Text style={styles.vs}>VS</Text>
                <Text style={styles.teamName}>{p.awayTeam}</Text>
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.expected}>期望比數：主 {c?.expectedGoals?.home} : {c?.expectedGoals?.away} 客</Text>
              </View>

              <View style={styles.betRow}>
                <View style={styles.betItem}>
                  <Text style={styles.betLabel}>大細 (2.5)</Text>
                  <Text style={styles.betValue}>{Number(c?.overUnder?.over) > 50 ? '大' : '小'}</Text>
                </View>
                <View style={styles.betItem}>
                  <Text style={styles.betLabel}>總球數</Text>
                  <Text style={styles.betValue}>{c?.totalGoals === '中' ? '中庸' : c?.totalGoals}</Text>
                </View>
                <View style={styles.betItem}>
                  <Text style={styles.betLabel}>波膽</Text>
                  <Text style={styles.betValue}>{c?.correctScore?.[0]?.score}</Text>
                </View>
              </View>

              <GoldDivider style={{ marginBottom: 10 }} />
              <View style={styles.confBar}>
                <View style={[styles.confFill, { width: `${confidence}%` }]} />
              </View>
              <Text style={styles.confLabel}>Agent 共識度 {confidence}%</Text>

              <BettingBars betting={p.betting} compact homeName={p.homeTeam} awayName={p.awayTeam} />
            </LuxCard>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  cardWrap: { marginHorizontal: 16, marginVertical: 6 },
  card: { marginBottom: 0 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  confBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  confText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  teamName: { color: colors.text, fontSize: 18, fontWeight: '700', flex: 1 },
  vs: { color: colors.textDim, marginHorizontal: 12 },
  scoreRow: { alignItems: 'center', marginBottom: 12 },
  expected: { color: colors.textDim, fontSize: 14 },
  betRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.cardLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  betItem: { alignItems: 'center' },
  betLabel: { color: colors.textDim, fontSize: 11, marginBottom: 4 },
  betValue: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
  confBar: { height: 6, backgroundColor: colors.cardLight, borderRadius: 3, overflow: 'hidden' },
  confFill: { height: '100%', backgroundColor: colors.jade, borderRadius: 3 },
  confLabel: { color: colors.textDim, fontSize: 10, marginTop: 4, textAlign: 'right' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 60, fontSize: 16 },
});