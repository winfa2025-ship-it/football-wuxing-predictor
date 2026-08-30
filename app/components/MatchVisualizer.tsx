import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import Svg, { Rect, Line, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, wuxingColors } from '../utils/theme';
import { playGoalEvent, playTick, playFullTime, playKickoff } from '../utils/soundManager';

/**
 * 即時足球動畫視覺化組件
 * 
 * 功能:
 * - 動態球場 (SVG)
 * - 足球隨比賽流向移動 + 旋轉
 * - 攻勢方向 (控球率影響)
 * - 進球慶祝動畫
 * - 即時走勢指示
 */

// 足球 SVG (無需定位,由父層 Animated.View 控制)
function BallIcon({ size = 30, color = '#fff' }) {
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
      <Path
        d={`M${size/2} ${size*0.12} L${size*0.65} ${size*0.22} L${size*0.58} ${size*0.4} L${size*0.42} ${size*0.4} L${size*0.35} ${size*0.22} Z`}
        fill="#222"
      />
      <Path
        d={`M${size/2} ${size*0.5} L${size*0.72} ${size*0.55} L${size*0.62} ${size*0.75} L${size*0.38} ${size*0.75} L${size*0.28} ${size*0.55} Z`}
        fill="#222"
      />
    </Svg>
  );
}

export default function MatchVisualizer({ 
  homeTeam, awayTeam,
  homeScore = 0, awayScore = 0,
  possessionHome = 50,
  status = 'not_started',
  minute = '',
  homeColor = '#2E7D32',
  awayColor = '#D32F2F',
  attackDirection = 1, // 1 = 主隊攻, -1 = 客隊攻
  live = false,
}: {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  possessionHome?: number;
  status?: string;
  minute?: string;
  homeColor?: string;
  awayColor?: string;
  attackDirection?: number;
  live?: boolean;
}) {
  // 動畫引擎
  const ballX = useRef(new Animated.Value(0)).current;  // -1(主隊龍門) 到 1(客隊龍門)
  const ballRotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const goalAnim = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  // 比分變化 -> 觸發進球慶祝動畫 + 進球音效
  const prevScoreRef = useRef(`${homeScore}-${awayScore}`);
  useEffect(() => {
    const key = `${homeScore}-${awayScore}`;
    if (prevScoreRef.current !== key) {
      // 判斷哪隊進球並播放對應音效
      const prev = prevScoreRef.current.split('-').map(Number);
      if (homeScore > prev[0]) playGoalEvent(true);
      else if (awayScore > prev[1]) playGoalEvent(false);
      // 進球了! GOAL 動畫 + 漣漪
      Animated.parallel([
        Animated.sequence([
          Animated.timing(goalAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(goalAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ripple, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(ripple, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
      ]).start();
    }
    prevScoreRef.current = key;
  }, [homeScore, awayScore]);

  // 分鐘推進 -> 滴答聲
  const prevMinuteRef = useRef(minute);
  useEffect(() => {
    if (live && minute && minute !== prevMinuteRef.current) {
      playTick();
    }
    prevMinuteRef.current = minute;
  }, [minute, live]);

  // 完場哨聲
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === 'live' && status === 'finished') {
      playFullTime();
    }
    prevStatusRef.current = status;
  }, [status]);

  // 控球率分配
  const possession = Math.max(20, Math.min(80, possessionHome));

  // 足球移動動畫 (模擬攻勢)
  useEffect(() => {
    const loop = () => {
      if (!live) {
        // 未開始：足球置中
        Animated.timing(ballX, { toValue: 0, duration: 500, useNativeDriver: true }).start();
        return;
      }
      Animated.sequence([
        // 向當前攻方向移動
        Animated.timing(ballX, { toValue: attackDirection * 0.85, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        // 稍作停留
        Animated.delay(400),
        // 回中
        Animated.timing(ballX, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(300),
      ]).start(({ finished }) => { if (finished) loop(); });
    };
    loop();
    return () => ballX.stopAnimation();
  }, [live, attackDirection]);

  // 足球旋轉
  useEffect(() => {
    const spin = Animated.loop(Animated.timing(ballRotate, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.linear }));
    spin.start();
    return () => spin.stop();
  }, []);

  // 呼吸脈動 (進行中)
  useEffect(() => {
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]));
    if (live) breathe.start();
    return () => breathe.stop();
  }, [live]);

  // 開賽瞬間 -> 開賽哨聲 + 觀眾歡呼
  const prevLiveRef = useRef(live);
  useEffect(() => {
    if (live && !prevLiveRef.current) {
      playKickoff();
    }
    prevLiveRef.current = live;
  }, [live]);

  // 球場座標 (200x200)
  const WIDTH = 220;
  const HEIGHT = 180;

  // 轉換 ballX[-1,1] -> 螢幕 x (保持在球場內)
  const ballScreenX = ballX.interpolate({ inputRange: [-1, 1], outputRange: [12, WIDTH - 40] });
  const spinDeg = ballRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Goal 文字縮放
  const goalScale = goalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.4] });
  const goalOpacity = goalAnim;
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.3, 0] });

  // 球場脈動光
  const fieldGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: ['rgba(46,204,113,0.05)', 'rgba(46,204,113,0.15)'] });

  return (
    <View style={styles.container}>
      {/* 球場 */}
      <View style={styles.fieldWrap}>
        <Animated.View style={{ position: 'absolute', backgroundColor: fieldGlow, width: WIDTH, height: HEIGHT, borderRadius: 16 }} />
        <Svg width={WIDTH} height={HEIGHT}>
          <Defs>
            <LinearGradient id="grass" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#1a4d2e" />
              <Stop offset="100%" stopColor="#144024" />
            </LinearGradient>
          </Defs>
          {/* 草地 */}
          <Rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="12" fill="url(#grass)" />
          {/* 邊界線 */}
          <Rect x="10" y="10" width={WIDTH-20} height={HEIGHT-20} rx="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          {/* 中線 */}
          <Line x1={WIDTH/2} y1="10" x2={WIDTH/2} y2={HEIGHT-10} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          {/* 中圈 */}
          <Circle cx={WIDTH/2} cy={HEIGHT/2} r="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <Circle cx={WIDTH/2} cy={HEIGHT/2} r="2" fill="#fff" />
          {/* 禁區 - 左 (主隊龍門) */}
          <Rect x="10" y={HEIGHT/2-25} width="28" height="50" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <Rect x="10" y={HEIGHT/2-12} width="14" height="24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          {/* 禁區 - 右 (客隊龍門) */}
          <Rect x={WIDTH-38} y={HEIGHT/2-25} width="28" height="50" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <Rect x={WIDTH-24} y={HEIGHT/2-12} width="14" height="24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />

          {/* 攻勢方向箭頭 (指向主隊龍門=左/朝向客隊龍門=右) */}
          {live && (
            <Path
              d={attackDirection === 1
                // 主隊攻(向左): 箭頭朝左
                ? `M ${WIDTH/2+10} ${HEIGHT-30} L ${WIDTH/2-10} ${HEIGHT-30} L ${WIDTH/2-14} ${HEIGHT-26} L ${WIDTH/2-10} ${HEIGHT-34} Z`
                // 客隊攻(向右): 箭頭朝右
                : `M ${WIDTH/2-10} ${HEIGHT-30} L ${WIDTH/2+10} ${HEIGHT-30} L ${WIDTH/2+14} ${HEIGHT-26} L ${WIDTH/2+10} ${HEIGHT-34} Z`}
              fill="rgba(245,197,24,0.85)"
            />
          )}
        </Svg>

        {/* 進球漣漪 */}
        <Animated.View style={{
          position: 'absolute', top: HEIGHT/2 - 40, left: 0, right: 0,
          alignItems: 'center', transform: [{ scale: rippleScale }], opacity: rippleOpacity,
        }}>
          <View style={styles.rippleCircle} />
        </Animated.View>

        {/* 足球 */}
        <Animated.View style={{ position: 'absolute', top: HEIGHT/2 - 15, left: ballScreenX, transform: [{ rotate: spinDeg }] }}>
          <BallIcon size={30} />
        </Animated.View>

        {/* 進球慶祝 */}
        <Animated.View style={{
          position: 'absolute', top: HEIGHT/2 - 60, left: 0, right: 0,
          alignItems: 'center', transform: [{ scale: goalScale }], opacity: goalOpacity,
        }}>
          <Text style={[styles.goalText, { color: colors.gold }]}>⚽ GOAL!</Text>
        </Animated.View>
      </View>

      {/* 比數板 */}
      <View style={styles.scoreRow}>
        <View style={[styles.teamSide, { borderTopColor: homeColor }]}>
          <Text style={styles.teamName} numberOfLines={1}>{homeTeam}</Text>
          <Animated.Text style={[styles.score, { transform: [{ scale: goalScale }] }]}>{homeScore}</Animated.Text>
        </View>
        <View style={styles.clockBox}>
          <Text style={styles.clock}>{minute ? `第 ${String(minute).replace("'", '')} 分鐘` : status === 'finished' ? '完場' : '未開始'}</Text>
        </View>
        <View style={[styles.teamSide, { borderTopColor: awayColor }]}>
          <Animated.Text style={[styles.score, { transform: [{ scale: goalScale }] }]}>{awayScore}</Animated.Text>
          <Text style={styles.teamName} numberOfLines={1}>{awayTeam}</Text>
        </View>
      </View>

      {/* 控球率 */}
      <View style={styles.possessionRow}>
        <Text style={styles.possessionText}>{possession}%</Text>
        <View style={styles.possessionBar}>
          <View style={[styles.possessionFill, { width: `${possession}%`, backgroundColor: homeColor }]} />
        </View>
        <Text style={styles.possessionText}>{100 - possession}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
  fieldWrap: { width: 220, height: 180, alignItems: 'center', justifyContent: 'center', borderRadius: 16, overflow: 'hidden' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 14 },
  teamSide: { flex: 1, alignItems: 'center', borderTopWidth: 3 },
  teamName: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  score: { color: colors.text, fontSize: 28, fontWeight: 'bold' },
  clockBox: { paddingHorizontal: 14 },
  clock: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  possessionRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 12 },
  possessionText: { color: colors.textDim, fontSize: 12, width: 38, textAlign: 'center' },
  possessionBar: { flex: 1, height: 8, backgroundColor: colors.cardLight, borderRadius: 4, overflow: 'hidden', marginHorizontal: 4 },
  possessionFill: { height: '100%', borderRadius: 4 },
  goalText: { fontSize: 34, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 6 },
  rippleCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.15)' },
});
