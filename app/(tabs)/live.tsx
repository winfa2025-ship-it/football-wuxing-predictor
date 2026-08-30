import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { Fixture } from '../utils/types';
import { useLiveScores, useInterval } from '../hooks/useLiveScores';
import { colors, shadow } from '../utils/theme';
import MatchVisualizer from '../components/MatchVisualizer';
import ChatPanel from '../components/ChatPanel';
import { LuxHeader } from '../components/LuxComponents';
import { playBeep, playKickoff, setSoundEnabled, isSoundEnabled } from '../utils/soundManager';
import { Ionicons } from '@expo/vector-icons';

// 簡單雜湊到顏色
function hashColor(name?: string) {
  const hues = ['#2E7D32', '#D32F2F', '#B8860B', '#1565C0', '#6a1b9a'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += (name as string).charCodeAt(i);
  return hues[hash % hues.length];
}

export default function LiveScreen() {
  const [liveFixtures, setLiveFixtures] = useState<Fixture[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [chatOpen, setChatOpen] = useState(false);
  const router = useRouter();

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playBeep(); // 開啟時播放提示音
  };

  const loadLive = async () => {
    try {
      const res = await api.getLive();
      setLiveFixtures(res.data || []);
      setLastUpdate(new Date());
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLive(); }, []);

  const liveScores = useLiveScores();
  useInterval(() => { loadLive(); }, 10000);
  useEffect(() => { if (liveScores.length) { setLiveFixtures(liveScores); setLastUpdate(new Date()); } }, [liveScores]);

  // 偵測新比賽開始 -> 播放開賽哨聲
  const prevLiveIds = useRef<number[]>([]);
  useEffect(() => {
    const nowIds = liveFixtures.filter(f => f.status === 'live').map(f => f.id);
    const prevIds = prevLiveIds.current;
    // 有新的 live 比賽且之前已有其他 live (避免初次載入就全響)
    const newOnes = nowIds.filter(id => !prevIds.includes(id));
    if (prevIds.length > 0 && newOnes.length > 0) {
      playKickoff();
    }
    prevLiveIds.current = nowIds;
  }, [liveFixtures]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={styles.center} />;

  const live = liveFixtures.filter(f => f.status === 'live');
  const rest = liveFixtures.filter(f => f.status !== 'live');
  const selected = live.find(f => f.id === selectedId) || live[0] || null;

  // 基於比分推導控球率與攻勢方向
  const deriveMatchState = (f: Fixture) => {
    if (!f) return { possession: 50, attack: 1, minute: '', homeScore: 0, awayScore: 0 };
    const homeGoals = f.home?.goals ?? 0;
    const awayGoals = f.away?.goals ?? 0;
    // 領先方或主隊推測攻勢
    let attack = 1;
    if (awayGoals > homeGoals) attack = -1;
    else if (awayGoals === homeGoals) attack = (f.id % 2 === 0 ? 1 : -1);
    // 控球率: 基於比分 + 隨時間輕微浮動
    const possession = Math.max(35, Math.min(65, 50 + (homeGoals - awayGoals) * 4));
    return {
      possession: possession + (Date.now() / 1000 % 6 - 3),
      attack,
      minute: f.minute || '',
      homeScore: homeGoals,
      awayScore: awayGoals,
    };
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <LuxHeader icon="⚡" title="即時比分" subtitle="WebSocket 即時更新" />
            {lastUpdate && <Text style={styles.headerSub}>上次更新 {lastUpdate.toLocaleTimeString('zh-HK')}</Text>}
          </View>
          <TouchableOpacity style={[styles.soundBtn, soundOn && styles.soundBtnOn]} onPress={toggleSound}>
            <Ionicons name={soundOn ? 'volume-high' : 'volume-mute'} size={20} color={soundOn ? '#000' : colors.textDim} />
            <Text style={[styles.soundBtnText, soundOn && { color: '#000' }]}>{soundOn ? '音效開' : '音效關'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 未開始時提示 */}
      {live.length === 0 && (
        <Text style={styles.noLive}>
          目前沒有進行中的賽事{' '}
          {rest.length > 0 ? '，下方為今日賽程' : ''}
        </Text>
      )}

      {/* 進行中場次切換 */}
      {live.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
          {live.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.selectorBtn, selectedId === f.id && styles.selectorBtnActive]}
              onPress={() => {
                if (selectedId !== f.id) playBeep(); // 切換比賽時播放切換訊號
                setSelectedId(f.id);
              }}
            >
              <Text style={[styles.selectorText, selectedId === f.id && styles.selectorTextActive]}>
                {f.home?.team?.name} vs {f.away?.team?.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 即時足球動畫 */}
      {selected && (() => {
        const s = deriveMatchState(selected);
        return (
          <View style={[styles.animCard, shadow]}>
            <MatchVisualizer
              homeTeam={selected.home?.team?.name || '主隊'}
              awayTeam={selected.away?.team?.name || '客隊'}
              homeScore={s.homeScore}
              awayScore={s.awayScore}
              possessionHome={Math.round(s.possession)}
              homeColor={hashColor(selected.home?.team?.name)}
              awayColor={hashColor(selected.away?.team?.name)}
              attackDirection={s.attack}
              status={selected.status}
              minute={s.minute}
              live={true}
            />
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => router.push(`/prediction/${selected.id}`)}
            >
              <Text style={styles.detailBtnText}>📊 查看AI預測與風水分析 →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chatBtn, chatOpen && styles.chatBtnActive]}
              onPress={() => { playBeep(); setChatOpen(o => !o); }}
            >
              <Ionicons name={chatOpen ? 'chatbox' : 'chatbox-outline'} size={18} color={chatOpen ? '#000' : colors.primary} />
              <Text style={[styles.chatBtnText, chatOpen && { color: '#000' }]}>
                {chatOpen ? '關閉對話' : '💬 即時查詢比賽進程'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* 內嵌 AI 對話面板 (查詢該場即時進程) */}
      {chatOpen && selected && (
        <View style={styles.chatPanelWrap}>
          <ChatPanel
            focusTeam={selected.home?.team?.name}
            matchId={selected.id}
            height={430}
          />
        </View>
      )}

      {/* 今日賽程 */}
      {rest.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 今日賽程</Text>
          {rest.map((f) => (
            <TouchableOpacity key={f.id} style={styles.schedRow} onPress={() => router.push(`/prediction/${f.id}`)}>
              <Text style={styles.schedTeam}>{f.home?.team?.name}</Text>
              <Text style={styles.schedVS}>VS</Text>
              <Text style={styles.schedTeam}>{f.away?.team?.name}</Text>
              <Text style={styles.schedTime}>
                {f.status === 'finished' ? '完場' : (f.minute || (f.date ? new Date(f.date).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }) : ''))}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { padding: 24, paddingTop: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  soundBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  soundBtnOn: { backgroundColor: colors.primary },
  soundBtnText: { color: colors.textDim, fontSize: 13, marginLeft: 6, fontWeight: '600' },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: 'bold' },
  headerSub: { color: colors.textDim, fontSize: 12, marginTop: 6 },
  noLive: { color: colors.textDim, textAlign: 'center', marginTop: 30, fontSize: 15 },
  selector: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  selectorBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, marginRight: 8 },
  selectorBtnActive: { backgroundColor: colors.primary },
  selectorText: { color: colors.textDim, fontSize: 12 },
  selectorTextActive: { color: '#000', fontWeight: 'bold' },
  animCard: { backgroundColor: colors.card, borderRadius: 20, margin: 16, padding: 20, alignItems: 'center' },
  detailBtn: { marginTop: 18, padding: 12, borderRadius: 24, backgroundColor: colors.cardLight, width: '100%', alignItems: 'center' },
  detailBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, padding: 12, borderRadius: 24, backgroundColor: colors.cardLight, width: '100%', gap: 6 },
  chatBtnActive: { backgroundColor: colors.primary },
  chatBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  chatPanelWrap: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  section: { padding: 16 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  schedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginVertical: 6 },
  schedTeam: { color: colors.text, flex: 1 },
  schedVS: { color: colors.primary, fontWeight: 'bold', marginHorizontal: 12 },
  schedTime: { color: colors.textDim, fontSize: 12 },
});
