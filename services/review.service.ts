/**
 * Service pour la gestion des avis
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Review, ReviewInsert, ReviewWithClient, ReviewWithDetails } from '@/types';

const checkSupabaseConfig = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase non configure.');
  }
};

export const reviewService = {
  /**
   * Creer un nouvel avis
   */
  async createReview(review: ReviewInsert): Promise<Review> {
    try {
      checkSupabaseConfig();
      const { data, error } = await supabase
        .from('reviews')
        .upsert(review, { onConflict: 'client_id,salon_id' })
        .select()
        .single();

      if (error) throw error;

      // Mettre a jour la note moyenne du salon
      await this.updateSalonRating(review.salon_id);

      return data;
    } catch (error) {
      console.error('Error in createReview:', error);
      throw error;
    }
  },

  /**
   * Mettre a jour un avis
   */
  async updateReview(
    id: string,
    updates: { rating?: number; comment?: string }
  ): Promise<Review> {
    try {
      checkSupabaseConfig();
      const { data, error } = await supabase
        .from('reviews')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Mettre a jour la note moyenne du salon
      await this.updateSalonRating(data.salon_id);

      return data;
    } catch (error) {
      console.error('Error in updateReview:', error);
      throw error;
    }
  },

  /**
   * Supprimer un avis
   */
  async deleteReview(id: string): Promise<void> {
    try {
      checkSupabaseConfig();
      // Recuperer le salon_id avant de supprimer
      const { data: review } = await supabase
        .from('reviews')
        .select('salon_id')
        .eq('id', id)
        .single();

      const { error } = await supabase.from('reviews').delete().eq('id', id);

      if (error) throw error;

      // Mettre a jour la note moyenne du salon
      if (review) {
        await this.updateSalonRating(review.salon_id);
      }
    } catch (error) {
      console.error('Error in deleteReview:', error);
      throw error;
    }
  },

  /**
   * Recuperer les avis d'un client
   */
  async getClientReviews(clientId: string): Promise<ReviewWithDetails[]> {
    try {
      checkSupabaseConfig();
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          *,
          salon:salons(*),
          booking:bookings(*)
        `
        )
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in getClientReviews:', error);
      return [];
    }
  },

  /**
   * Verifier si un client a deja laisse un avis pour un salon
   */
  async hasClientReviewed(clientId: string, salonId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('client_id', clientId)
        .eq('salon_id', salonId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error in hasClientReviewed:', error);
      return false;
    }
  },

  /**
   * Mettre a jour la note moyenne d'un salon
   */
  async updateSalonRating(salonId: string): Promise<void> {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('salon_id', salonId);

      if (error) throw error;

      if (!reviews || reviews.length === 0) {
        await supabase
          .from('salons')
          .update({ rating: 0, reviews_count: 0 })
          .eq('id', salonId);
        return;
      }

      const averageRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await supabase
        .from('salons')
        .update({
          rating: Math.round(averageRating * 10) / 10,
          reviews_count: reviews.length,
        })
        .eq('id', salonId);
    } catch (error) {
      console.error('Error in updateSalonRating:', error);
    }
  },
};
