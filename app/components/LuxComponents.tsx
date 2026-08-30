import { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, shadowGold } from '../utils/theme';

/** 金色分隔線 (豪華點綴) */
export function GoldDivider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.dividerRow, style]}>
    <View style={styles.dividerLine} />
    <View style={styles.dividerDiamond} />
    <View style={styles.dividerLine} />
  </View>;
}

/** 豪華頁面標題 */
export function LuxHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        {icon ? <Text style={styles.titleIcon}>{icon}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <GoldDivider style={{ marginTop: 10 }} />
    </View>
  );
}

/** 豪華卡片 (金框 + 石晶點綴) */
export function LuxCard({ children, style, gold }: { children: ReactNode; style?: ViewStyle; gold?: boolean }) {
  return (
    <View style={[styles.card, gold && styles.cardGold, shadowGold, style]}>
      {gold ? <View style={styles.cardCornerTL} /> : null}
      {gold ? <View style={styles.cardCornerBR} /> : null}
      {children}
    </View>
  );
}

/** 金色按鈕 */
export function GoldButton({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <View style={[styles.goldBtn, disabled && { opacity: 0.4 }]}>
      <Text style={styles.goldBtnText}>{title}</Text>
    </View>
  );
}

/** 五行色標籤 */
export function WuxingTag({ label, bg }: { label: string; bg?: string }) {
  return <View style={[styles.tag, bg ? { backgroundColor: bg } : null]}><Text style={styles.tagText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.25)' },
  dividerDiamond: { width: 6, height: 6, backgroundColor: colors.gold, marginHorizontal: 8, transform: [{ rotate: '45deg' }] },
  headerBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleIcon: { fontSize: 24, marginRight: 8 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: colors.textDim, fontSize: 14, marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  cardGold: { borderColor: colors.borderGold, backgroundColor: colors.cardGold },
  cardCornerTL: { position: 'absolute', top: 6, left: 6, width: 12, height: 12, borderTopWidth: 2, borderLeftWidth: 2, borderColor: colors.gold, borderTopLeftRadius: 4 },
  cardCornerBR: { position: 'absolute', bottom: 6, right: 6, width: 12, height: 12, borderBottomWidth: 2, borderRightWidth: 2, borderColor: colors.gold, borderBottomRightRadius: 4 },
  goldBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  goldBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  tag: { backgroundColor: colors.cardLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  tagText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
});