import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../utils/api';
import { FengshuiAnalysis } from '../utils/types';
import { colors, shadow, wuxingColors } from '../utils/theme';

const PRESET_TEAMS = [
  { name: '曼城', city: '曼徹斯特', foundedYear: 1880, league: '英超' },
  { name: '利物浦', city: '利物浦', foundedYear: 1892, league: '英超' },
  { name: '阿仙奴', city: '倫敦', foundedYear: 1886, league: '英超' },
  { name: '皇家馬德里', city: '馬德里', foundedYear: 1902, league: '西甲' },
  { name: '巴塞隆拿', city: '巴塞隆拿', foundedYear: 1899, league: '西甲' },
  { name: '拜仁慕尼黑', city: '慕尼黑', foundedYear: 1900, league: '德甲' },
];

export default function FengshuiScreen() {
  const [homeIdx, setHomeIdx] = useState(0);
  const [awayIdx, setAwayIdx] = useState(1);
  const [result, setResult] = useState<FengshuiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const runFengshui = async () => {
    setLoading(true);
    try {
      const res = await api.fengshui({ home: PRESET_TEAMS[homeIdx], away: PRESET_TEAMS[awayIdx] });
      setResult(res.data);
    } catch (err) {
      console.log('風水計算失敗', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>☯ 風水命理運勢</Text>
        <Text style={styles.headerSub}>以五行生剋、流年氣場推算球隊運勢</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>選擇對陣隊伍</Text>
        <View style={styles.pickerRow}>
          <View style={styles.pickerCol}>
            <Text style={styles.pickerLabel}>主隊</Text>
            {PRESET_TEAMS.map((t, i) => (
              <TouchableOpacity key={t.name} style={[styles.teamBtn, homeIdx === i && styles.teamBtnActive]} onPress={() => setHomeIdx(i)}>
                <Text style={[styles.teamBtnText, homeIdx === i && styles.teamBtnTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.pickerCol}>
            <Text style={styles.pickerLabel}>客隊</Text>
            {PRESET_TEAMS.map((t, i) => (
              <TouchableOpacity key={t.name} style={[styles.teamBtn, awayIdx === i && styles.teamBtnActive]} onPress={() => setAwayIdx(i)}>
                <Text style={[styles.teamBtnText, awayIdx === i && styles.teamBtnTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.calcBtn, shadow]} onPress={runFengshui} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.calcBtnText}>🔥 開始推演</Text>}
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.resultSection}>
          <View style={styles.teamEnergyRow}>
            <View style={[styles.energyCard, { borderColor: wuxingColors[result.home.element] }]}>
              <Text style={styles.energyTeam}>{PRESET_TEAMS[homeIdx].name}</Text>
              <Text style={[styles.element, { color: wuxingColors[result.home.element] }]}>五行：{result.home.element}</Text>
              <Text style={styles.luck}>運勢指數：{result.home.luck}</Text>
              <Text style={styles.momentum}>{result.home.teamMomentum}</Text>
              <Text style={styles.dir}>吉位：{result.home.direction}</Text>
            </View>
            <View style={[styles.energyCard, { borderColor: wuxingColors[result.away.element] }]}>
              <Text style={styles.energyTeam}>{PRESET_TEAMS[awayIdx].name}</Text>
              <Text style={[styles.element, { color: wuxingColors[result.away.element] }]}>五行：{result.away.element}</Text>
              <Text style={styles.luck}>運勢指數：{result.away.luck}</Text>
              <Text style={styles.momentum}>{result.away.teamMomentum}</Text>
              <Text style={styles.dir}>吉位：{result.away.direction}</Text>
            </View>
          </View>

          <View style={styles.winSection}>
            <Text style={styles.winLabel}>風水推演勝率</Text>
            <View style={styles.probBar}>
              <View style={[styles.probHome, { flex: result.homeWin }]} />
              <View style={[styles.probDraw, { flex: result.draw }]} />
              <View style={[styles.probAway, { flex: result.awayWin }]} />
            </View>
            <View style={styles.probLabels}>
              <Text style={styles.probText}>主 {result.homeWin}%</Text>
              <Text style={styles.probText}>和 {result.draw}%</Text>
              <Text style={styles.probText}>客 {result.awayWin}%</Text>
            </View>
          </View>

          <View style={styles.analysisCard}>
            <Text style={styles.analysisTitle}>🗣️ 命理師分析</Text>
            <Text style={styles.analysisText}>{result.analysis}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, paddingTop: 16 },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: 'bold' },
  headerSub: { color: colors.textDim, fontSize: 14, marginTop: 6 },
  section: { padding: 16 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  pickerRow: { flexDirection: 'row', gap: 12 },
  pickerCol: { flex: 1 },
  pickerLabel: { color: colors.textDim, fontSize: 13, marginBottom: 8 },
  teamBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.card, marginBottom: 6 },
  teamBtnActive: { backgroundColor: colors.primary },
  teamBtnText: { color: colors.text },
  teamBtnTextActive: { color: '#000', fontWeight: 'bold' },
  calcBtn: { backgroundColor: colors.primary, borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  calcBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  resultSection: { padding: 16 },
  teamEnergyRow: { flexDirection: 'row', gap: 12 },
  energyCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 2 },
  energyTeam: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  element: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  luck: { color: colors.text, fontSize: 14, marginBottom: 4 },
  momentum: { color: colors.primary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  dir: { color: colors.textDim, fontSize: 12 },
  winSection: { marginTop: 20 },
  winLabel: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  probBar: { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden' },
  probHome: { backgroundColor: colors.jade },
  probDraw: { backgroundColor: colors.gold },
  probAway: { backgroundColor: colors.danger },
  probLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  probText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  analysisCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 20 },
  analysisTitle: { color: colors.primary, fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  analysisText: { color: colors.text, fontSize: 14, lineHeight: 22 },
});
