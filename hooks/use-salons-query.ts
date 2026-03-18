import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { salonService } from '@/services/salon.service';
import { SalonFilters } from '@/types';

/**
 * Hook pour recuperer les salons avec pagination infinie (React Query)
 */
export function useSalonsInfinite(filters?: SalonFilters) {
  return useInfiniteQuery({
    queryKey: ['salons', filters],
    queryFn: ({ pageParam = 1 }) => salonService.getSalons(pageParam, filters),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}

/**
 * Hook pour recuperer les salons populaires
 */
export function usePopularSalonsQuery(limit: number = 6) {
  return useQuery({
    queryKey: ['salons', 'popular', limit],
    queryFn: () => salonService.getPopularSalons(limit),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook pour recuperer un salon par son ID
 */
export function useSalonQuery(id: string) {
  return useQuery({
    queryKey: ['salon', id],
    queryFn: () => salonService.getSalonById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Hook pour les categories
 */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => salonService.getCategories(),
    staleTime: 1000 * 60 * 60 * 24, // 24 heures (donnees statiques)
  });
}
