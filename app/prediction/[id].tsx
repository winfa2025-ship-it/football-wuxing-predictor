import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../utils/api';
import { DailyPrediction, MatchHistory, HistoricMatch } from '../utils/types';
import { colors, shadow, wuxingColors } from '../utils/theme';
import BettingBars from '../components/BettingBars';
import { LuxCard, GoldDivider } from '../components/LuxComponents';
import { Ionicons } from '@expo/vector-icons';
import { getFavorites, toggleFavorite } from '../utils/favorites';

export default function PredictionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [prediction, setPrediction] = useState<DailyPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<MatchHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    getFavorites().then(favs => setIsFav(favs.some(f => Number(f.id) === Number(id))));
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getTodayPredictions();
        const found = (res.data || []).find(p => String(p.fixtureId) === String(id));
        if (found) setPrediction(found);
      } catch { } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.getMatchHistory(String(id));
        if (res?.data) setHistory(res.data);
      } catch { } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [id]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={styles.center} />;

  if (!prediction) return <Text style={styles.notFound}>找不到該場賽事預測</Text>;

  const c = prediction.consensus;
  const conf = c?.confidence || 60;

  return (
    <ScrollView style={styles.container}>
      {/* 賽事頭部 */}
      <View style={styles.header}>
        <Pressable style={styles.favBtn} onPress={async () => {
          await toggleFavorite({
            id: Number(id),
            homeTeam: prediction.homeTeam,
            awayTeam: prediction.awayTeam,
            league: prediction.league,
            date: prediction.date,
            savedAt: Date.now(),
          });
          setIsFav(favs => !favs);
        }} hitSlop={8}>
          <Ionicons name={isFav ? 'star' : 'star-outline'} size={26} color={isFav ? colors.primary : colors.textFaint} />
        </Pressable>
        <Text style={styles.leagueName}>{prediction.league} · {new Date(prediction.date).toLocaleDateString('zh-HK')}</Text>
        <View style={styles.matchRow}>
          <Text style={styles.teamName}>{prediction.homeTeam}</Text>
          <View style={styles.scoreBox}><Text style={styles.scoreText}>{c?.expectedGoals?.home} : {c?.expectedGoals?.away}</Text></View>
          <Text style={styles.teamName}>{prediction.awayTeam}</Text>
        </View>
        <Text style={styles.headerPred}>AI綜合預測：{c?.winner}</Text>
      </View>

      {/* 信心度 */}
      <View style={[styles.card, shadow]}>
        <Text style={styles.cardTitle}>📈 共識信心度</Text>
        <View style={styles.confBar}>
          <View style={[styles.confFill, { width: `${conf}%` }]} />
        </View>
        <Text style={styles.confValue}>{conf}%</Text>
        <View style={styles.voteBar}>
          <View style={[styles.voteHome, { flex: c?.homeVotes }]} />
          <View style={[styles.voteDraw, { flex: c?.drawVotes }]} />
          <View style={[styles.voteAway, { flex: c?.awayVotes }]} />
        </View>
        <Text style={styles.voteText}>Agent表決：主 {c?.homeVotes}% · 和 {c?.drawVotes}% · 客 {c?.awayVotes}%</Text>
      </View>

      {/* 投注建議 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 投注預測建議</Text>
        <View style={styles.betGrid}>
          <View style={styles.betItem}><Text style={styles.betLabel}>勝平負</Text><Text style={styles.betVal}>{c?.winner}</Text></View>
          <View style={styles.betItem}><Text style={styles.betLabel}>大細 2.5</Text><Text style={styles.betVal}>{Number(c?.overUnder?.over) > 50 ? '大球' : '小球'}</Text></View>
          <View style={styles.betItem}><Text style={styles.betLabel}>總球數</Text><Text style={styles.betVal}>{c?.totalGoals === '中' ? '中庸' : c?.totalGoals}</Text></View>
          <View style={styles.betItem}><Text style={styles.betLabel}>波膽</Text><Text style={styles.betVal}>{c?.correctScore?.[0]?.score}</Text></View>
        </View>
      </View>

      {/* 全球投注比例 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌍 全球即時博彩投注比例</Text>
        <Text style={styles.betSub}>各地玩家即時投注資金分布（貼近真實市場）</Text>
        <BettingBars betting={prediction.betting} homeName={prediction.homeTeam} awayName={prediction.awayTeam} />
          <View style={styles.betTipBox}>
          <Text style={styles.betTip}>💡 風水提示：投注比例反映市場資金流向，若與 AI 共識方向一致可提高信心；相反則需謹慎。</Text>
        </View>
      </View>

      {/* 波膽詳情 */}
      {c?.correctScore?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎲 最可能波膽</Text>
          {c.correctScore.map((s, i) => (
            <View key={i} style={styles.csRow}>
              <Text style={styles.csScore}>{s.score}</Text>
              <View style={styles.csProbBar}><View style={[styles.csProbFill, { width: `${Number(s.prob) * 5}%` }]} /></View>
              <Text style={styles.csProbText}>{s.prob}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* 風水分析 */}
      {prediction.agentResults?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>☯ 風水命理深度分析</Text>
          {prediction.agentResults.map((a, i) => (
            <View key={i} style={styles.agentBlock}>
              <View style={styles.agentHeader}>
                <Text style={styles.agentTitle}>{a.agentName}</Text>
                <View style={[styles.votePill, { backgroundColor: a.personalVote.pick === '主勝' ? colors.jade : a.personalVote.pick === '客勝' ? colors.danger : colors.gold }]}>
                  <Text style={styles.votePillText}>{a.personalVote.pick}</Text>
                </View>
              </View>
              <Text style={styles.agentAnalysis}>{a.analysis}</Text>
            </View>
          ))}
        </View>
      )}
      <HistorySection
        history={history}
        loading={historyLoading}
        homeTeam={prediction.homeTeam}
        awayTeam={prediction.awayTeam}
        expandedEvent={expandedEvent}
        onToggleEvent={setExpandedEvent}
      />
    </ScrollView>
  );
}

function HistorySection({ history, loading, homeTeam, awayTeam, expandedEvent, onToggleEvent }: {
  history: MatchHistory | null;
  loading: boolean;
  homeTeam: string;
  awayTeam: string;
  expandedEvent: number | null;
  onToggleEvent: (id: number | null) => void;
}) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📜 過往歷史數據</Text>
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      </View>
    );
  }
  if (!history) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📜 過往歷史數據</Text>
        <Text style={styles.hintText}>暫時無法載入歷史數據</Text>
      </View>
    );
  }

  const h = history.h2h;
  const total = h.total || 1;
  const homePct = Math.round((h.homeWins / total) * 100);
  const drawPct = Math.round((h.draws / total) * 100);
  const awayPct = 100 - homePct - drawPct;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📜 過往歷史數據</Text>
      {history.source === 'mock' && <Text style={styles.sourceTag}>模擬數據演示</Text>}

      {/* 頭對頭統計 */}
      <Text style={styles.sectionLabel}>⚔️ 頭對頭對賽（近 {h.total} 場）</Text>
      <Text style={styles.h2hTitle}>{homeTeam} vs {awayTeam}</Text>
      <View style={styles.h2hBar}>
        <View style={[styles.h2hFill, { flex: h.homeWins, backgroundColor: colors.jade }]} />
        <View style={[styles.h2hFill, { flex: h.draws, backgroundColor: colors.gold }]} />
        <View style={[styles.h2hFill, { flex: h.awayWins, backgroundColor: colors.danger }]} />
      </View>
      <View style={styles.h2hStatsRow}>
        <Text style={styles.h2hStat}><Text style={{ color: colors.jade }}>{homeTeam}</Text> 勝 {h.homeWins}</Text>
        <Text style={styles.h2hStat}><Text style={{ color: colors.gold }}>和</Text> {h.draws}</Text>
        <Text style={styles.h2hStat}><Text style={{ color: colors.danger }}>{awayTeam}</Text> 勝 {h.awayWins}</Text>
      </View>
      <Text style={styles.h2hGoalLine}>累計進球　{homeTeam} {h.goals.home} - {h.goals.away} {awayTeam}</Text>

      {/* 近期狀態 */}
      <Text style={styles.sectionLabel}>📊 近期狀態（近 5 場）</Text>
      {history.recent.map((r, i) => (
        <View key={i} style={styles.recentBlock}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTeam}>{r.teamName}</Text>
            <Text style={styles.recentRecord}>{r.wins}勝 {r.draws}和 {r.losses}負</Text>
          </View>
          <View style={styles.formRow}>
            {r.form.map((f, j) => (
              <View key={j} style={[styles.formBadge, { backgroundColor: f === 'W' ? colors.jade : f === 'D' ? colors.gold : colors.danger }]}>
                <Text style={styles.formBadgeText}>{f}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.recentGoals}>進 {r.goals.for} 球／失 {r.goals.against} 球</Text>
        </View>
      ))}

      {/* 過往對賽詳細表 */}
      <Text style={styles.sectionLabel}>🕐 對賽詳細紀錄（逐場）</Text>
      {h.list.map((m, i) => (
        <MatchRow
          key={i}
          match={m}
          expanded={expandedEvent === m.id}
          onToggle={() => onToggleEvent(expandedEvent === m.id ? null : m.id)}
        />
      ))}
    </View>
  );
}

function MatchRow({ match, expanded, onToggle }: {
  match: HistoricMatch;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isHomeWin = match.home?.goals > match.away?.goals;
  const isDraw = match.home?.goals === match.away?.goals;
  const resultColor = isHomeWin ? colors.jade : isDraw ? colors.gold : colors.danger;
  const resultLabel = isHomeWin ? '主勝' : isDraw ? '和局' : '客勝';
  const dateStr = match.date ? new Date(match.date).toLocaleDateString('zh-HK') : '';

  return (
    <View style={styles.matchRowBox}>
      <Pressable style={styles.matchRowHead} onPress={onToggle}>
        <Text style={styles.matchDate}>{dateStr}</Text>
        <Text style={styles.matchTeams}>
          {match.home?.team?.name} <Text style={[styles.matchScore, { color: resultColor }]}>{match.home?.goals} : {match.away?.goals}</Text> {match.away?.team?.name}
        </Text>
        <View style={[styles.resultPill, { backgroundColor: resultColor }]}>
          <Text style={styles.resultPillText}>{resultLabel}</Text>
        </View>
        <Text style={styles.toggleIcon}>{expanded ? '▴' : '▾'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.matchBody}>
          {(match.events?.length === 0 || !match.events) ? (
            <Text style={styles.noEvent}>（無事件紀錄）</Text>
          ) : (
            match.events!.map((e, idx) => (
              <View key={idx} style={styles.eventRow}>
                <Text style={[styles.eventTime, { color: e.team === 'home' ? colors.jade : colors.danger }]}>{e.minute}'</Text>
                <Text style={styles.eventIcon}>
                  {e.type === 'goal' ? '⚽' : e.type === 'red_card' ? '🟥' : e.type === 'yellow_card' ? '🟨' : '🔁'}
                </Text>
                <Text style={[styles.eventDetail, { textAlign: e.team === 'home' ? 'left' : 'right', flex: 1 }]}>{e.detail}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  notFound: { color: colors.textDim, textAlign: 'center', marginTop: 80, fontSize: 16 },
  header: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16 },
  leagueName: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginBottom: 14 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamName: { color: colors.text, fontSize: 18, fontWeight: '700', flex: 1 },
  scoreBox: { marginHorizontal: 14, backgroundColor: colors.cardLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  scoreText: { color: colors.primary, fontSize: 22, fontWeight: 'bold' },
  headerPred: { color: colors.primary, fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 14 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 18, marginBottom: 16 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  confBar: { height: 12, backgroundColor: colors.cardLight, borderRadius: 6, overflow: 'hidden' },
  confFill: { height: '100%', backgroundColor: colors.jade, borderRadius: 6 },
  confValue: { color: colors.jade, fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginTop: 4 },
  voteBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 12 },
  voteHome: { backgroundColor: colors.jade },
  voteDraw: { backgroundColor: colors.gold },
  voteAway: { backgroundColor: colors.danger },
  voteText: { color: colors.textDim, fontSize: 12, marginTop: 6, textAlign: 'center' },
  betGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  betItem: { flexBasis: '47%', backgroundColor: colors.cardLight, borderRadius: 12, padding: 14, alignItems: 'center' },
  betLabel: { color: colors.textDim, fontSize: 11, marginBottom: 6 },
  betVal: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
  betSub: { color: colors.textDim, fontSize: 12, marginBottom: 12 },
  betTipBox: { backgroundColor: colors.cardLight, borderRadius: 10, padding: 12, marginTop: 12 },
  betTip: { color: colors.text, fontSize: 12, lineHeight: 18 },
  favBtn: { position: 'absolute', top: 4, right: 4, zIndex: 10 },
  csRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  csScore: { color: colors.text, fontSize: 16, fontWeight: 'bold', width: 50 },
  csProbBar: { flex: 1, height: 8, backgroundColor: colors.cardLight, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  csProbFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  csProbText: { color: colors.text, fontSize: 13, width: 50, textAlign: 'right' },
  agentBlock: { backgroundColor: colors.cardLight, borderRadius: 12, padding: 14, marginBottom: 10 },
  agentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  agentTitle: { color: colors.gold, fontSize: 15, fontWeight: '700' },
  votePill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 },
  votePillText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  agentAnalysis: { color: colors.text, fontSize: 13, lineHeight: 19 },

  // 歷史數據區塊
  sourceTag: { color: colors.gold, fontSize: 11, alignSelf: 'flex-start', backgroundColor: colors.cardLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 8 },
  sectionLabel: { color: colors.text, fontSize: 15, fontWeight: 'bold', marginTop: 8, marginBottom: 8 },
  h2hTitle: { color: colors.primary, fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  h2hBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 8 },
  h2hFill: { height: '100%' },
  h2hStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  h2hStat: { color: colors.text, fontSize: 13 },
  h2hGoalLine: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  recentBlock: { backgroundColor: colors.cardLight, borderRadius: 12, padding: 12, marginBottom: 10 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recentTeam: { color: colors.text, fontSize: 15, fontWeight: '700' },
  recentRecord: { color: colors.textDim, fontSize: 12 },
  formRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  formBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  formBadgeText: { color: '#000', fontSize: 13, fontWeight: 'bold' },
  recentGoals: { color: colors.textDim, fontSize: 12 },
  matchRowBox: { backgroundColor: colors.cardLight, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  matchRowHead: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  matchDate: { color: colors.textDim, fontSize: 11, width: 62 },
  matchTeams: { color: colors.text, fontSize: 13, flex: 1, textAlign: 'center' },
  matchScore: { fontSize: 15, fontWeight: 'bold' },
  resultPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  resultPillText: { color: '#000', fontSize: 11, fontWeight: 'bold' },
  toggleIcon: { color: colors.textDim, marginLeft: 8, fontSize: 14 },
  matchBody: { borderTopWidth: 1, borderTopColor: colors.border, padding: 12 },
  eventRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  eventTime: { fontSize: 12, fontWeight: 'bold', width: 40 },
  eventIcon: { fontSize: 13, marginRight: 6 },
  eventDetail: { color: colors.text, fontSize: 13 },
  noEvent: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  hintText: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginVertical: 8 },
});
