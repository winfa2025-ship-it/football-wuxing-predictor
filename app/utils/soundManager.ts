import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

/**
 * 足球即時系統聲音管理器
 * 
 * 集中管理所有足球事件音效 + 震動回饋
 * 
 * 音效:
 * - whistle.wav    開賽/中圈哨聲
 * - goal.wav       進球哨聲+觀眾歡呼
 * - halftime.wav   半場/完場長哨
 * - crowd.wav      觀眾歡呼
 * - kick.wav       踢球聲
 * - tick.wav       計時滴答
 * - beep.wav       直播切換訊號
 */

const SOUNDS = {
  whistle: require('../../assets/sounds/whistle.wav'),
  goal: require('../../assets/sounds/goal.wav'),
  halftime: require('../../assets/sounds/halftime.wav'),
  crowd: require('../../assets/sounds/crowd.wav'),
  kick: require('../../assets/sounds/kick.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  beep: require('../../assets/sounds/beep.wav'),
};

let soundObjects: Record<string, Audio.Sound | null> = {};
let enabled = true;
let initialized = false;

// 播放前先解鎖音頻 (iOS 靜音鍵覆蓋)
export async function initSoundSystem(enable: boolean = true): Promise<void> {
  enabled = enable;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true, // 關鍵! 讓聲音在靜音鍵下也能播出
    });
    initialized = true;
  } catch (e) {
    console.log('聲音系統初始化失敗:', e);
    initialized = true;
  }
}

// 播放單一音效
export async function playSound(name: keyof typeof SOUNDS, volume: number = 1.0): Promise<void> {
  if (!enabled || !initialized) return;
  try {
    // 重用已載入的 Sound 物件以減少延遲
    if (!soundObjects[name]) {
      const { sound } = await Audio.Sound.createAsync(SOUNDS[name], { shouldPlay: false });
      soundObjects[name] = sound;
    }
    const s = soundObjects[name];
    if (s) {
      try { await s.setVolumeAsync(volume); } catch {}
      try { await s.replayAsync(); } catch { /* 已在播放則忽略 */ }
    }
  } catch (e) {
    console.log(`音效 ${name} 播放失敗:`, e);
  }
}

// 停止所有音效
export async function stopAllSounds(): Promise<void> {
  for (const key of Object.keys(soundObjects)) {
    try { await soundObjects[key]?.stopAsync(); } catch {}
  }
}

// 釋放資源
export async function unloadSounds(): Promise<void> {
  for (const key of Object.keys(soundObjects)) {
    try { await soundObjects[key]?.unloadAsync(); } catch {}
  }
  soundObjects = {};
}

// ===== 高階足球事件音效 =====

// 開賽
export async function playKickoff(): Promise<void> {
  await playSound('whistle');
  await playSound('crowd', 0.5);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// 進球 (主/客)
export async function playGoalEvent(homeTeam: boolean): Promise<void> {
  await playSound('goal', 0.9);
  Haptics.notificationAsync(
    homeTeam ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
  );
}

// 半場 / 完場
export async function playHalftime(): Promise<void> {
  await playSound('halftime', 0.8);
  await playSound('crowd', 0.4);
}

// 完場哨聲
export async function playFullTime(): Promise<void> {
  await playSound('halftime', 1.0);
  await playSound('crowd', 0.7);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// 踢球 (防守/攻勢)
export async function playKick(): Promise<void> {
  await playSound('kick', 0.7);
}

// 計時滴答 (每分鐘更新)
export async function playTick(): Promise<void> {
  await playSound('tick', 0.4);
}

// 直播切換 / 新比賽加入
export async function playBeep(): Promise<void> {
  await playSound('beep', 0.5);
  Haptics.selectionAsync();
}

// 切換聲音開關
export function setSoundEnabled(enable: boolean): void {
  enabled = enable;
  if (!enable) stopAllSounds();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

// 開關狀態管理 (可與 App 設置同步)
export { enabled as soundEnabled };
