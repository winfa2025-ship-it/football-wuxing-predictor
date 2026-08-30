import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wuxing_auth_token';

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(KEY, token);
    else await AsyncStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
