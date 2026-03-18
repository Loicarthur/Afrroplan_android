/**
 * Page Avis Salon - AfroPlan
 * Affichage des avis clients réels pour le coiffeur
 * Design modernisé shadcn / Lucide
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Star, 
  ChevronLeft, 
  MessageSquare, 
  User, 
  Scissors, 
  Calendar,
  TrendingUp
} from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { reviewService } from '@/services/review.service';
import { salonService } from '@/services/salon.service';
import { ReviewWithDetails } from '@/types';

const { width } = Dimensions.get('window');

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          color={star <= rating ? "#FFB800" : "#E5E5EA"}
          fill={star <= rating ? "#FFB800" : "transparent"}
        />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ average: 0, count: 0 });

  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (salon) {
        setStats({ average: salon.rating, count: salon.reviews_count });
        
        // Charger les avis réels depuis Supabase
        const { data, error } = await (await import('@/lib/supabase')).supabase
          .from('reviews')
          .select('*, booking:bookings(*, service:services(*)), client:profiles(*)')
          .eq('salon_id', salon.id)
          .order('created_at', { ascending: false });
        
        if (data) setReviews(data as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#191919" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#191919" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Avis Clients</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />}
        contentContainerStyle={styles.content}
      >
        {/* Summary Card - High End */}
        <Animated.View entering={FadeInUp.duration(600)} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryLeft}>
            <Text style={[styles.averageScore, { color: colors.text }]}>{stats.average.toFixed(1)}</Text>
            <StarRating rating={Math.round(stats.average)} size={20} />
            <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>Basé sur {stats.count} avis</Text>
          </View>
          <View style={styles.summaryRight}>
            <View style={styles.trendBox}>
              <TrendingUp size={16} color="#16A34A" />
              <Text style={styles.trendText}>Votre salon est bien noté !</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <MessageSquare size={18} color="#191919" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Derniers commentaires</Text>
        </View>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={48} color="#CCC" strokeWidth={1.5} />
            <Text style={styles.emptyText}>Aucun avis pour le moment.</Text>
          </View>
        ) : (
          reviews.map((review, index) => (
            <Animated.View 
              key={review.id} 
              entering={FadeInUp.delay(index * 100).duration(500)}
              style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.clientAvatar}>
                  <User size={20} color="#666" />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={[styles.clientName, { color: colors.text }]}>
                    {(review as any).client?.full_name || 'Client anonyme'}
                  </Text>
                  <StarRating rating={review.rating} />
                </View>
                <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                  {new Date(review.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>

              <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
                {review.comment || "Aucun commentaire laissé."}
              </Text>

              {/* Détails de la prestation */}
              <View style={styles.reviewFooter}>
                <View style={[styles.serviceBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Scissors size={12} color="#666" />
                  <Text style={styles.serviceText} numberOfLines={1}>
                    {(review as any).booking?.service?.name || 'Prestation'}
                  </Text>
                </View>
                <View style={styles.dot} />
                <View style={styles.dateBadge}>
                  <Calendar size={12} color="#999" />
                  <Text style={styles.footerDate}>RDV le {new Date((review as any).booking?.booking_date).toLocaleDateString('fr-FR')}</Text>
                </View>
              </View>
            </Animated.View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  content: { padding: 20 },
  
  summaryCard: {
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    ...Shadows.md
  },
  summaryLeft: { alignItems: 'center', flex: 1 },
  averageScore: { fontSize: 48, fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  reviewCount: { fontSize: 13, marginTop: 8, opacity: 0.6 },
  
  summaryRight: { flex: 1.2, paddingLeft: 20 },
  trendBox: { backgroundColor: '#F0FDF4', padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  trendText: { color: '#16A34A', fontSize: 12, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },

  reviewCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  clientInfo: { flex: 1, marginLeft: 12 },
  clientName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  reviewDate: { fontSize: 12, fontWeight: '500' },
  
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 15, lineHeight: 22, fontWeight: '400', marginBottom: 16 },
  
  reviewFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  serviceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  serviceText: { fontSize: 12, fontWeight: '600', color: '#666', maxWidth: 120 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#DDD', marginHorizontal: 10 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerDate: { fontSize: 12, color: '#999', fontWeight: '500' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15, fontWeight: '500' },
});
