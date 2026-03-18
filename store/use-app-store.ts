import { create } from 'zustand';
import { favoriteService } from '@/services/favorite.service';

interface AppState {
  favoriteIds: string[];
  isLoadingFavorites: boolean;
  
  // Actions
  setFavorites: (ids: string[]) => void;
  toggleFavorite: (userId: string, salonId: string) => Promise<void>;
  loadFavorites: (userId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  favoriteIds: [],
  isLoadingFavorites: false,

  setFavorites: (favoriteIds) => set({ favoriteIds }),

  loadFavorites: async (userId: string) => {
    if (!userId) return;
    set({ isLoadingFavorites: true });
    try {
      const ids = await favoriteService.getFavoriteIds(userId);
      set({ favoriteIds: ids });
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      set({ isLoadingFavorites: false });
    }
  },

  toggleFavorite: async (userId: string, salonId: string) => {
    if (!userId) return;
    
    const { favoriteIds } = get();
    const isFavorite = favoriteIds.includes(salonId);
    
    // Optimistic UI update
    const newFavoriteIds = isFavorite 
      ? favoriteIds.filter(id => id !== salonId)
      : [...favoriteIds, salonId];
      
    set({ favoriteIds: newFavoriteIds });

    try {
      await favoriteService.toggleFavorite(userId, salonId);
    } catch (error) {
      // Revert in case of failure
      set({ favoriteIds });
      console.error('Error toggling favorite:', error);
    }
  },
}));
