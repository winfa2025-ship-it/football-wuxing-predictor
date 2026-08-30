import { View, Text, StyleSheet } from 'react-native';
import { BettingData } from '../utils/types';
import { colors } from '../utils/theme';

/** 三色比例條 (主/和/客) */
function TriBar({ home, draw, away, labels }: { home: number; draw: number; away: number; labels: [string, string, string] }) {
  return (
    <View style={styles.triBlock}>
      <View style={styles.triRow}>
        <Text style={styles.triLabel}>{labels[0]}</Text>
        <Text style={styles.triLabelCenter}>{labels[1]}</Text>
        <Text style={styles.triLabel}>{labels[2]}</Text>
      </View>
      <View style={styles.triBar}>
        <View style={[styles.triHome, { flex: Math.max(1, home) }]} />
        <View style={[styles.triDraw, { flex: Math.max(1, draw) }]} />
        <View style={[styles.triAway, { flex: Math.max(1, away) }]} />
      </View>
      <View style={styles.triRow}>
        <Text style={styles.triVal}>{home}%</Text>
        <Text style={styles.triValCenter}>{draw}%</Text>
        <Text style={styles.triVal}>{away}%</Text>
      </View>
    </View>
  );
}

/** 雙色比例條 (大/小 或 是/否) */
function DuoBar({ yes, no, yesLabel, noLabel, yesColor }: { yes: number; no: number; yesLabel: string; noLabel: string; yesColor: string }) {
  const total = yes + no;
  return (
    <View style={styles.duoBlock}>
      <View style={styles.duoRow}>
        <Text style={styles.duoYesLabel}>{yesLabel}</Text>
        <Text style={styles.duoNoLabel}>{noLabel}</Text>
      </View>
      <View style={styles.duoBar}>
        <View style={[styles.duoYes, { flex: Math.max(1, yes), backgroundColor: yesColor }]} />
        <View style={[styles.duoNo, { flex: Math.max(1, no) }]} />
      </View>
      <View style={styles.duoRow}>
        <Text style={[styles.duoVal, { color: yesColor }]}>{yes}%</Text>
        <Text style={styles.duoVal}>{no}%</Text>
      </View>
    </View>
  );
}

/** 全球投注比例整合卡片 */
export default function BettingBars({ betting, compact, homeName, awayName }: {
  betting?: BettingData;
  compact?: boolean;
  homeName?: string;
  awayName?: string;
}) {
  if (!betting?.markets) return null;
  const wdw = betting.markets.winDrawWin;
  const ou = betting.markets.overUnder?.[0];
  const btts = betting.markets.btts;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>🌍 全球投注比例</Text>
        {betting.updatedAt && !compact && <Text style={styles.time}>{new Date(betting.updatedAt).toLocaleTimeString('zh-HK')}</Text>}
      </View>

      <TriBar home={wdw?.home || 0} draw={wdw?.draw || 0} away={wdw?.away || 0}
        labels={[(homeName || '主').slice(0, 4), '和', (awayName || '客').slice(0, 4)]} />

      {ou && (
        <DuoBar yes={ou.over} no={ou.under} yesLabel={`大球 ${ou.line}`} noLabel={`小球 ${ou.line}`} yesColor={colors.secondary} />
      )}

      {btts && !compact && (
        <DuoBar yes={btts.yes} no={btts.no} yesLabel="兩隊入球 是" noLabel="兩隊入球 否" yesColor={colors.jade} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  wrapCompact: { marginTop: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: colors.text, fontSize: 13, fontWeight: 'bold' },
  time: { color: colors.textFaint, fontSize: 10 },
  triBlock: { marginBottom: 10 },
  triRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  triLabel: { color: colors.textDim, fontSize: 11, flex: 1, textAlign: 'center' },
  triLabelCenter: { color: colors.gold, fontSize: 11, flex: 1, textAlign: 'center' },
  triBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  triHome: { backgroundColor: colors.jade },
  triDraw: { backgroundColor: colors.gold },
  triAway: { backgroundColor: colors.danger },
  triVal: { color: colors.textDim, fontSize: 11, flex: 1, textAlign: 'center', marginTop: 2 },
  triValCenter: { color: colors.gold, fontSize: 11, flex: 1, textAlign: 'center', marginTop: 2 },
  duoBlock: { marginBottom: 10 },
  duoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  duoYesLabel: { color: colors.textDim, fontSize: 11 },
  duoNoLabel: { color: colors.textDim, fontSize: 11 },
  duoBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  duoYes: {},
  duoNo: { backgroundColor: colors.cardLight },
  duoVal: { color: colors.textDim, fontSize: 11, marginTop: 2 },
});