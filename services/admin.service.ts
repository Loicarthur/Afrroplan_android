import { supabase } from '@/lib/supabase';
import { Profile, Salon, Booking, Payment } from '@/types/database';

export interface AdminStats {
  totalUsers: number;
  totalClients: number;
  totalCoiffeurs: number;
  totalSalons: number;
  activeSalons: number;
  totalBookings: number;
  completedBookings: number;
  mrr: number;
  subscribersCount: number;
  subscribersByPlan: {
    free: number;
    starter: number;
    pro: number;
    premium: number;
  };
  totalRevenue: number;
  totalCommission: number;
}

export const adminService = {
  /**
   * Récupère les statistiques globales (Version Corrigée)
   */
  async getGlobalStats(): Promise<AdminStats> {

    try {
      // 1. Profils
      const { data: profiles, error: pError } = await supabase.from('profiles').select('role');
      if (pError) throw pError;
      
      const totalUsers = profiles.length;
      const totalClients = profiles.filter(p => p.role === 'client').length;
      const totalCoiffeurs = profiles.filter(p => p.role === 'coiffeur').length;

      // 2. Salons - SELECTION EXPLICITE DES COLONNES EXISTANTES
      const { data: salons, error: sError } = await supabase
        .from('salons')
        .select('id, is_active');
      
      if (sError) throw sError;
      const totalSalons = salons.length;
      const activeSalons = salons.filter(s => s.is_active).length;
      
      // 3. Abonnements (DEPUIS stripe_accounts UNIQUEMENT)
      const { data: subs, error: subError } = await supabase
        .from('stripe_accounts')
        .select('subscription_plan');
      
      const plans = {
        free: { price: 0, count: 0 },
        starter: { price: 19, count: 0 },
        pro: { price: 49, count: 0 },
        premium: { price: 99, count: 0 }
      };

      if (!subError && subs) {
        subs.forEach(s => {
          const p = s.subscription_plan as keyof typeof plans;
          if (plans[p]) plans[p].count++;
        });
      }

      const mrr = (plans.starter.count * plans.starter.price) + 
                  (plans.pro.count * plans.pro.price) + 
                  (plans.premium.count * plans.premium.price);

      // 4. Réservations
      const { data: bookings, error: bError } = await supabase.from('bookings').select('status, booking_date, start_time');
      if (bError) throw bError;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const activeBookings = bookings.filter(b => {
        const isActiveStatus = b.status === 'pending' || b.status === 'confirmed';
        if (!isActiveStatus) return false;
        
        const bookingDate = new Date(b.booking_date);
        const bookingDateTime = new Date(`${b.booking_date}T${b.start_time || '00:00'}:00`);
        
        if (bookingDate.getTime() > today) return true;
        if (bookingDate.getTime() === today) {
          const oneHourAfter = new Date(bookingDateTime.getTime() + 60 * 60 * 1000);
          return now < oneHourAfter;
        }
        return false;
      });

      return {
        totalUsers, totalClients, totalCoiffeurs,
        totalSalons, activeSalons,
        totalBookings: bookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        pendingBookingsCount: activeBookings.length, // Nouveau champ
        mrr,
        subscribersCount: plans.starter.count + plans.pro.count + plans.premium.count,
        subscribersByPlan: {
          free: plans.free.count,
          starter: plans.starter.count,
          pro: plans.pro.count,
          premium: plans.premium.count
        },
        totalRevenue: mrr,
        totalCommission: 0
      };
    } catch (error) {
      console.error('[AdminService V2] CRITICAL ERROR:', error);
      throw error;
    }
  },

  /**
   * Liste des utilisateurs
   */
  async getAllUsers(page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data, total: count || 0 };
  },

  /**
   * Liste des salons avec colonnes explicites
   */
  async getSalons() {
    const { data, error } = await supabase.from('salons').select(`
      id, name, city, address, image_url, is_verified, is_active, 
      is_suspended, suspension_reason, id_card_url, id_card_verso_url, owner_id,
      owner:profiles!salons_owner_id_fkey(full_name, email)
    `).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateSalonStatus(salonId: string, updates: any) {
    const { data, error } = await supabase.from('salons').update(updates).eq('id', salonId).select().single();
    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId: string, updates: any) {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  },

  async getAllBookings(page = 1, limit = 50, filters?: any) {
    let query = supabase.from('bookings').select('*, salon:salons(name), service:services(name), client:profiles!bookings_client_id_fkey(full_name, email)', { count: 'exact' });
    if (filters?.startDate) query = query.gte('booking_date', filters.startDate);
    if (filters?.endDate) query = query.lte('booking_date', filters.endDate);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    
    const { data, error, count } = await query.order('booking_date', { ascending: false }).range((page-1)*limit, (page*limit)-1);
    if (error) throw error;
    return { data, total: count || 0 };
  }
};
