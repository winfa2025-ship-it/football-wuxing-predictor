import AsyncStorage from '@react-native-async-storage/async-storage';
import { Favorite } from './types';

const KEY = 'wuxing_favorites';

export async function getFavorites(): Promise<Favorite[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export async function toggleFavorite(fav: Favorite): Promise<Favorite[]> {
  try {
    let list = await getFavorites();
    const idx = list.findIndex(f => f.id === fav.id);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.unshift(fav);
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
    return list;
  } catch { return await getFavorites(); }
}

export async function isFavorite(id: number): Promise<boolean> {
  const list = await getFavorites();
  return list.some(f => f.id === id);
}

export async function removeFavorite(id: number): Promise<Favorite[]> {
  let list = await getFavorites();
  list = list.filter(f => f.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  return list;
}