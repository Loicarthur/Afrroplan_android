/**
 * Hook pour la gestion des salons
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { salonService } from '@/services';
import { cacheService } from '@/services/cache.service';
import { Salon, SalonFilters } from '@/types';

export function useSalons(filters?: SalonFilters) {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const filtersRef = useRef(filters);
  const filtersString = JSON.stringify(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filtersString]);

  // Charger le cache au démarrage
  useEffect(() => {
    const loadCache = async () => {
      // Uniquement pour la recherche par défaut (sans filtres complexes)
      if (!filters || (Object.keys(filters).length === 0)) {
        const cachedData = await cacheService.get('all_salons');
        if (cachedData) {
          setSalons(cachedData.data);
          setTotal(cachedData.total);
          setIsLoading(false); // On affiche le cache tout de suite
        }
      }
    };
    loadCache();
  }, [filtersString]);

  const fetchSalons = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await salonService.getSalons(pageNum, filtersRef.current);
      const newData = reset ? response.data : [...salons, ...response.data];
      
      setSalons(newData);
      setHasMore(response.hasMore);
      setTotal(response.total);
      setPage(pageNum);

      // Mettre en cache si c'est la première page par défaut
      if (pageNum === 1 && (!filtersRef.current || Object.keys(filtersRef.current).length === 0)) {
        await cacheService.set('all_salons', response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  }, [salons]);

  useEffect(() => {
    fetchSalons(1, true);
  }, [filtersString]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchSalons(page + 1);
    }
  };

  const refresh = () => {
    fetchSalons(1, true);
  };

  return { salons, isLoading, error, hasMore, total, loadMore, refresh };
}

export function useSalon(id: string) {
  const [salon, setSalon] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalon = async () => {
      if (!id) return;
      
      // Essayer le cache spécifique au salon
      const cachedSalon = await cacheService.get(`salon_${id}`);
      if (cachedSalon) {
        setSalon(cachedSalon);
        setIsLoading(false);
      }

      try {
        const data = await salonService.getSalonById(id);
        setSalon(data);
        await cacheService.set(`salon_${id}`, data, 1000 * 60 * 30); // Cache 30 min pour un salon
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSalon();
  }, [id]);

  return { salon, isLoading, error };
}

export function usePopularSalons(limit: number = 6) {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalons = async () => {
      const cached = await cacheService.get('popular_salons');
      if (cached) {
        setSalons(cached);
        setIsLoading(false);
      }

      try {
        const data = await salonService.getPopularSalons(limit);
        setSalons(data);
        await cacheService.set('popular_salons', data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSalons();
  }, [limit]);

  return { salons, isLoading, error };
}

export function useCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const cached = await cacheService.get('categories');
      if (cached) {
        setCategories(cached);
        setIsLoading(false);
      }

      try {
        const data = await salonService.getCategories();
        setCategories(data);
        await cacheService.set('categories', data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return { categories, isLoading, error };
}

export function useSalonsByCategory(categorySlug: string) {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchSalons = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    if (!categorySlug) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await salonService.getSalonsByCategory(categorySlug, pageNum);
      setSalons((prev) => (reset ? response.data : [...prev, ...response.data]));
      setHasMore(response.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    fetchSalons(1, true);
  }, [fetchSalons]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchSalons(page + 1);
    }
  };

  return { salons, isLoading, error, hasMore, loadMore };
}
