import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { api } from '../utils/api';
import { Fixture } from '../utils/types';
import { useLiveScores } from '../hooks/useLiveScores';
import ChatPanel from '../components/ChatPanel';
import { LuxHeader } from '../components/LuxComponents';
import { colors } from '../utils/theme';

export default function ChatScreen() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusId, setFocusId] = useState<number | undefined>(undefined);

  const liveScores = useLiveScores();

  useEffect(() => { api.getFixtures().then(r => setFixtures(r.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (liveScores.length) {
      setFixtures(prev => {
        const map = new Map(prev.map(f => [f.id, f]));
        liveScores.forEach(f => map.set(f.id, f));
        return Array.from(map.values());
      });
    }
  }, [liveScores]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={styles.center} />;

  const focusMatch = fixtures.find(f => f.id === focusId);

  return (
    <SafeAreaView style={styles.container}>
      {/* 焦點賽事選擇 */}
      <View style={styles.matchBar}>
        <LuxHeader icon="💬" title="智能對話" subtitle="隨時向 AI 代理人查詢比賽進程" />
        <Text style={styles.matchBarTitle}>🎯 焦點場次（可選）</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          <TouchableOpacity
            style={[styles.matchChip, focusId === undefined && styles.matchChipActive]}
            onPress={() => setFocusId(undefined)}
          >
            <Text style={[styles.matchChipText, focusId === undefined && { color: '#000' }]}>全部</Text>
          </TouchableOpacity>
          {fixtures.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.matchChip, focusId === f.id && styles.matchChipActive]}
              onPress={() => setFocusId(f.id)}
            >
              <Text style={[styles.matchChipText, focusId === f.id && { color: '#000' }]}>
                {f.status === 'live' ? '🔴 ' : ''}{f.home?.team?.name} vs {f.away?.team?.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ChatPanel
        focusTeam={focusMatch?.home?.team?.name}
        matchId={focusMatch?.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  matchBar: { paddingHorizontal: 16, paddingTop: 12 },
  matchBarTitle: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  matchChip: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, marginRight: 8 },
  matchChipActive: { backgroundColor: colors.primary },
  matchChipText: { color: colors.text, fontSize: 12 },
});
