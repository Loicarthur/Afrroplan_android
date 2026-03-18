import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'afroplan_cache_';
const DEFAULT_EXPIRATION = 1000 * 60 * 60 * 24; // 24 heures

export const cacheService = {
  /**
   * Sauvegarde une donnée dans le cache
   */
  async set(key: string, data: any, expirationMs: number = DEFAULT_EXPIRATION) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expirationMs,
      };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`Error saving to cache (${key}):`, error);
    }
  },

  /**
   * Récupère une donnée du cache
   */
  async get(key: string) {
    try {
      const jsonValue = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!jsonValue) return null;

      const cacheData = JSON.parse(jsonValue);
      const isExpired = Date.now() - cacheData.timestamp > cacheData.expirationMs;

      if (isExpired) {
        // Optionnel: on peut supprimer si expiré, ou retourner quand même pour le SWR
        // await AsyncStorage.removeItem(CACHE_PREFIX + key);
        // return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error(`Error reading from cache (${key}):`, error);
      return null;
    }
  },

  /**
   * Supprime une clé du cache
   */
  async remove(key: string) {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.error(`Error removing from cache (${key}):`, error);
    }
  },

  /**
   * Vide tout le cache de l'application
   */
  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
};
