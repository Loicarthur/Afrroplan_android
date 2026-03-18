/**
 * Service pour la gestion des reservations
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { notificationService } from './notification.service';
import {
  Booking,
  BookingInsert,
  BookingUpdate,
  BookingWithDetails,
  PaginatedResponse,
} from '@/types';

const BOOKINGS_PER_PAGE = 10;

const checkSupabaseConfig = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase non configure. Veuillez creer un fichier .env avec vos identifiants Supabase. ' +
      'Consultez .env.example pour le format.'
    );
  }
};

export const bookingService = {
  /**
   * Creer une nouvelle reservation
   */
  async createBooking(booking: BookingInsert): Promise<Booking> {
    try {
      checkSupabaseConfig();
      const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in createBooking:', error);
      throw error;
    }
  },

  /**
   * Recuperer les reservations d'un client
   */
  async getClientBookings(
    clientId: string,
    status?: Booking['status'],
    page: number = 1
  ): Promise<PaginatedResponse<BookingWithDetails>> {
    try {
      checkSupabaseConfig();
      let query = supabase
        .from('bookings')
        .select(
          `
          *,
          salon:salons(*),
          service:services(*),
          coiffeur:profiles!bookings_coiffeur_id_fkey(*),
          promotion:promotions(*)
        `,
          { count: 'exact' }
        )
        .eq('client_id', clientId)
        .order('booking_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const from = (page - 1) * BOOKINGS_PER_PAGE;
      const to = from + BOOKINGS_PER_PAGE - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / BOOKINGS_PER_PAGE),
        hasMore: page * BOOKINGS_PER_PAGE < (count || 0),
      };
    } catch (error) {
      console.error('Error in getClientBookings:', error);
      return { data: [], total: 0, page, totalPages: 0, hasMore: false };
    }
  },

  /**
   * Recuperer les reservations d'un salon (pour les coiffeurs)
   */
  async getSalonBookings(
    salonId: string,
    status?: Booking['status'],
    date?: string,
    page: number = 1
  ): Promise<PaginatedResponse<BookingWithDetails>> {
    try {
      checkSupabaseConfig();
      let query = supabase
        .from('bookings')
        .select(
          `
          *,
          client:profiles!bookings_client_id_fkey(*),
          service:services(*),
          promotion:promotions(*)
        `,
          { count: 'exact' }
        )
        .eq('salon_id', salonId)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (status) query = query.eq('status', status);
      if (date) query = query.eq('booking_date', date);

      const from = (page - 1) * BOOKINGS_PER_PAGE;
      const to = from + BOOKINGS_PER_PAGE - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / BOOKINGS_PER_PAGE),
        hasMore: page * BOOKINGS_PER_PAGE < (count || 0),
      };
    } catch (error) {
      console.error('Error in getSalonBookings:', error);
      return { data: [], total: 0, page, totalPages: 0, hasMore: false };
    }
  },

  /**
   * Recuperer une reservation par son ID
   */
  async getBookingById(id: string): Promise<BookingWithDetails | null> {
    try {
      checkSupabaseConfig();
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          *,
          salon:salons(*),
          service:services(*),
          client:profiles!bookings_client_id_fkey(*),
          coiffeur:profiles!bookings_coiffeur_id_fkey(*),
          promotion:promotions(*)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getBookingById:', error);
      return null;
    }
  },

  /**
   * Mettre a jour le statut d'une reservation
   */
  async updateBookingStatus(
    id: string,
    status: Booking['status']
  ): Promise<Booking> {
    try {
      checkSupabaseConfig();
      const { data, error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notifier le client du changement de statut
      if (data) {
        if (status === 'confirmed' && data.client_id) {
          await notificationService.createNotification({
            user_id: data.client_id,
            title: 'Rendez-vous confirmé !',
            message: `Votre coiffeur a validé votre rendez-vous du ${data.booking_date}.`,
            type: 'booking_confirmed',
            booking_id: data.id,
          });
        } else if (status === 'completed' && data.client_id) {
          await notificationService.createNotification({
            user_id: data.client_id,
            title: 'Prestation terminée',
            message: `Merci de votre visite ! N'hésitez pas à laisser un avis.`,
            type: 'system',
            booking_id: data.id,
          });
        }
      }

      return data;
    } catch (error) {
      console.error('Error in updateBookingStatus:', error);
      throw error;
    }
  },

  /**
   * Signaler qu'un client ne s'est pas présenté (No-Show)
   */
  async reportNoShow(id: string): Promise<Booking> {
    try {
      checkSupabaseConfig();
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'no_show', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notifier le client de son absence signalée
      if (data) {
        await notificationService.createNotification({
          user_id: data.client_id,
          title: 'Absence signalée',
          message: `Votre absence au rendez-vous du ${data.booking_date} a été signalée par le coiffeur.`,
          type: 'system',
          booking_id: data.id,
        });
      }

      return data;
    } catch (error) {
      console.error('Error in reportNoShow:', error);
      throw error;
    }
  },

  /**
   * Annuler une reservation par le coiffeur avec un motif
   */
  async cancelBookingByCoiffeur(id: string, reason: string): Promise<Booking> {
    try {
      checkSupabaseConfig();
      
      // 1. Vérifier la date
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('status, booking_date, start_time, client_id')
        .eq('id', id)
        .single();

      if (fetchError || !booking) throw new Error('Rendez-vous introuvable.');

      const now = new Date();
      const [h, m] = (booking.start_time || '00:00').split(':').map(Number);
      const bookingDateTime = new Date(booking.booking_date);
      bookingDateTime.setHours(h, m, 0, 0);

      if (bookingDateTime < now) throw new Error('Impossible d\'annuler : ce rendez-vous est déjà passé.');

      // 2. Mettre à jour le statut du rendez-vous
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled', 
          notes: `Annulation coiffeur : ${reason}`,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 3. Notifier le client
      if (data) {
        await notificationService.createNotification({
          user_id: data.client_id,
          title: 'Rendez-vous annulé',
          message: `Votre coiffeur a annulé le RDV du ${data.booking_date}. Motif : ${reason}`,
          type: 'booking_cancelled',
          booking_id: data.id,
        });
      }

      return data;
    } catch (error) {
      console.error('Error in cancelBookingByCoiffeur:', error);
      throw error;
    }
  },

  /**
   * Annuler une reservation par le client
   */
  async cancelBooking(id: string): Promise<Booking> {
    try {
      checkSupabaseConfig();
      
      // 1. Vérifier le statut et la date
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('status, payment_method, booking_date, start_time')
        .eq('id', id)
        .single();

      if (fetchError || !booking) throw new Error('Rendez-vous introuvable.');

      const now = new Date();
      const [h, m] = (booking.start_time || '00:00').split(':').map(Number);
      const bookingDateTime = new Date(booking.booking_date);
      bookingDateTime.setHours(h, m, 0, 0);

      if (bookingDateTime < now) throw new Error('Ce rendez-vous est déjà passé et ne peut plus être annulé.');
      if (booking.status === 'confirmed' || booking.status === 'completed') throw new Error('Ce rendez-vous est déjà confirmé ou terminé et ne peut plus être annulé directement.');

      // Détermination du remboursement (Règle 48h)
      const diffInHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      let refundStatus = diffInHours >= 48 ? 'full_refund_requested' : 'funds_to_coiffeur';

      // 2. Mettre à jour le statut en 'cancelled'
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled', 
          updated_at: new Date().toISOString(),
          // @ts-ignore
          refund_status: refundStatus
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Annulation impossible : Le rendez-vous n\'existe plus.');

      return data;
    } catch (error) {
      console.error('Error in cancelBooking:', error);
      throw error;
    }
  },

  /**
   * Confirmer une reservation
   */
  async confirmBooking(id: string): Promise<Booking> {
    return this.updateBookingStatus(id, 'confirmed');
  },

  /**
   * Marquer une reservation comme terminee
   */
  async completeBooking(id: string): Promise<Booking> {
    return this.updateBookingStatus(id, 'completed');
  },

  /**
   * Verifier la disponibilite d'un creneau
   */
  async checkAvailability(
    salonId: string,
    date: string,
    startTime: string,
    endTime: string,
    coiffeurId?: string
  ): Promise<boolean> {
    try {
      checkSupabaseConfig();
      let query = supabase
        .from('bookings')
        .select('id')
        .eq('salon_id', salonId)
        .eq('booking_date', date)
        .in('status', ['pending', 'confirmed'])
        .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

      if (coiffeurId) query = query.eq('coiffeur_id', coiffeurId);

      const { data, error } = await query;
      if (error) throw error;

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error in checkAvailability:', error);
      return false;
    }
  },

  /**
   * Recuperer les creneaux disponibles pour une date
   */
  async getAvailableSlots(
    salonId: string,
    date: string,
    serviceDurationMinutes: number
  ): Promise<string[]> {
    try {
      checkSupabaseConfig();
      // 1. Recuperer les informations du salon et du propriétaire (coiffeur)
      const { data: salon } = await supabase
        .from('salons')
        .select('opening_hours, owner_id')
        .eq('id', salonId)
        .single();

      if (!salon?.opening_hours) return [];

      // 2. Vérifier si le coiffeur a bloqué sa journée
      const { data: specificAvailabilities } = await supabase
        .from('coiffeur_availability')
        .select('*')
        .eq('coiffeur_id', salon.owner_id)
        .eq('specific_date', date);

      const isDayBlocked = specificAvailabilities?.some(
        a => !a.is_available && a.start_time <= '00:00' && a.end_time >= '23:59'
      );

      if (isDayBlocked) return [];

      // 3. Recuperer les reservations existantes
      const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('salon_id', salonId)
        .eq('booking_date', date)
        .in('status', ['pending', 'confirmed']);

      // 4. Calculer les creneaux disponibles
      const slots: string[] = [];
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      const openingHours = (salon.opening_hours as Record<string, any>) || {};
      const daySchedule = openingHours[dayOfWeek];

      if (!daySchedule || daySchedule.isClosed || daySchedule.closed) return [];

      const openTime = daySchedule.open;
      const closeTime = daySchedule.close;
      if (!openTime || !closeTime) return [];

      let currentTime = openTime;
      while (currentTime < closeTime) {
        const [hours, minutes] = currentTime.split(':').map(Number);
        const endMinutes = hours * 60 + minutes + serviceDurationMinutes;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

        if (endTime <= closeTime) {
          const isSlotUnavailable = specificAvailabilities?.some(
            a => !a.is_available && (
              (currentTime >= a.start_time && currentTime < a.end_time) ||
              (endTime > a.start_time && endTime <= a.end_time) ||
              (currentTime <= a.start_time && endTime >= a.end_time)
            )
          );

          const isBooked = bookings?.some(
            (b) => b.start_time < endTime && b.end_time > currentTime
          );

          if (!isSlotUnavailable && !isBooked) slots.push(currentTime);
        }

        const nextMinutes = hours * 60 + minutes + 30;
        const nextHours = Math.floor(nextMinutes / 60);
        const nextMins = nextMinutes % 60;
        currentTime = `${String(nextHours).padStart(2, '0')}:${String(nextMins).padStart(2, '0')}`;
      }

      return slots;
    } catch (error) {
      console.error('Error in getAvailableSlots:', error);
      return [];
    }
  },

  /**
   * Recuperer les reservations a venir d'un client
   */
  async getUpcomingBookings(clientId: string, limit: number = 5): Promise<BookingWithDetails[]> {
    try {
      checkSupabaseConfig();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          *,
          salon:salons(*),
          service:services(*),
          promotion:promotions(*)
        `
        )
        .eq('client_id', clientId)
        .gte('booking_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in getUpcomingBookings:', error);
      return [];
    }
  },
};
