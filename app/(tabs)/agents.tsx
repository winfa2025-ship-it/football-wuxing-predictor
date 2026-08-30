import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { api } from '../utils/api';
import { Commentary, DailyPrediction } from '../utils/types';
import { colors, shadow } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import { LuxHeader, LuxCard } from '../components/LuxComponents';

const AGENT_INFO = [
  { name: '紫微斗數師', icon: '🌟', role: '風水命理角度', color: colors.gold, desc: '以紫微斗數、五行生剋推算兩隊星曜氣數，看誰得時得勢。' },
  { name: '數據分析師', icon: '📊', role: '統計模型角度', color: colors.secondary, desc: '建立Poisson統計模型，分析近況、對戰、期望進球。' },
  { name: '奇門遁甲師', icon: '🧭', role: '時空能量角度', color: colors.jade, desc: '從開賽時辰、方位判斷吉凶，主隊若是得生門則勝算大。' },
  { name: '走地觀察員', icon: '👁️', role: '臨場狀態角度', color: '#9b59b6', desc: '即時比分滾動，分析比賽走勢與臨場狀態變化。' },
];

export default function AgentsScreen() {
  const { user, logout } = useAuth();
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [predictions, setPredictions] = useState<DailyPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [c, p] = await Promise.all([api.getCommentary(), api.getTodayPredictions()]);
      setCommentary(c.data || []);
      setPredictions(p.data || []);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={styles.center} />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <LuxHeader icon="👥" title="AI 預測代理人" subtitle="四位東方智慧 + 數據分析代理人協同作戰" />
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>登出</Text>
          </TouchableOpacity>
        </View>
        {user?.email && <Text style={styles.account}>👤 {user.email} · VIP</Text>}
      </View>

      {AGENT_INFO.map((agent, i) => (
        <View key={agent.name} style={[styles.agentCard, shadow]}>
          <View style={[styles.agentIcon, { backgroundColor: agent.color }]}>
            <Text style={styles.agentIconText}>{agent.icon}</Text>
          </View>
          <View style={styles.agentBody}>
            <View style={styles.agentTop}>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text style={[styles.agentRole, { color: agent.color }]}>{agent.role}</Text>
            </View>
            <Text style={styles.agentDesc}>{agent.desc}</Text>
            {commentary[i] && (
              <View style={styles.commentBox}>
                <Text style={styles.commentLabel}>💬 今日觀點</Text>
                <Text style={styles.commentText}>{commentary[i].text}</Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {predictions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ 今日代理人共識</Text>
          {predictions.map((p) => (
            <View key={p.fixtureId} style={styles.consensusCard}>
              <Text style={styles.consensusMatch}>{p.homeTeam} vs {p.awayTeam}</Text>
              <View style={styles.consensusRow}>
                <Text style={styles.consensusPick}>預測：{p.consensus?.winner}</Text>
                <Text style={styles.consensusConf}>信心 {p.consensus?.confidence}%</Text>
              </View>
              <View style={styles.voteBar}>
                <View style={[styles.voteHome, { flex: p.consensus?.homeVotes }]} />
                <View style={[styles.voteDraw, { flex: p.consensus?.drawVotes }]} />
                <View style={[styles.voteAway, { flex: p.consensus?.awayVotes }]} />
              </View>
              <Text style={styles.consensusVotes}>
                主 {p.consensus?.homeVotes}% · 和 {p.consensus?.drawVotes}% · 客 {p.consensus?.awayVotes}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { paddingRight: 16, paddingBottom: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { color: colors.text, fontSize: 26, fontWeight: 'bold' },
  headerSub: { color: colors.textDim, fontSize: 14, marginTop: 6 },
  logoutBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginTop: 20 },
  logoutBtnText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  account: { color: colors.textDim, fontSize: 12, marginTop: 8, paddingHorizontal: 20 },
  agentCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16 },
  agentIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  agentIconText: { fontSize: 24 },
  agentBody: { flex: 1, marginLeft: 12 },
  agentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  agentName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  agentRole: { fontSize: 12, fontWeight: '600' },
  agentDesc: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
  commentBox: { backgroundColor: colors.cardLight, borderRadius: 8, padding: 10, marginTop: 10 },
  commentLabel: { color: colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  commentText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  section: { padding: 16, marginTop: 8 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  consensusCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginVertical: 6 },
  consensusMatch: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  consensusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  consensusPick: { color: colors.primary, fontWeight: '700' },
  consensusConf: { color: colors.textDim },
  voteBar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden' },
  voteHome: { backgroundColor: colors.jade },
  voteDraw: { backgroundColor: colors.gold },
  voteAway: { backgroundColor: colors.danger },
  consensusVotes: { color: colors.textDim, fontSize: 12, marginTop: 6, textAlign: 'right' },
});
