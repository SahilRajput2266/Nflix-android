import AsyncStorage from '@react-native-async-storage/async-storage';

const WATCHLIST_KEY = '@nflix_watchlist';
const HISTORY_KEY = '@nflix_history';

export async function getWatchlist() {
  try {
    const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('getWatchlist error:', err);
    return [];
  }
}

export async function toggleWatchlist(item) {
  try {
    const list = await getWatchlist();
    const existsIndex = list.findIndex((x) => x.id === item.id);
    let updated;
    if (existsIndex >= 0) {
      updated = list.filter((x) => x.id !== item.id);
    } else {
      updated = [item, ...list];
    }
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('toggleWatchlist error:', err);
    return [];
  }
}

export async function isInWatchlist(id) {
  const list = await getWatchlist();
  return list.some((x) => x.id === id);
}

export async function recordHistory(item, season = 1, episode = 1) {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    const filtered = history.filter((x) => x.id !== item.id);
    const updated = [
      {
        ...item,
        lastSeason: season,
        lastEpisode: episode,
        watchedAt: Date.now()
      },
      ...filtered
    ].slice(0, 20);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('recordHistory error:', err);
    return [];
  }
}

export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}
