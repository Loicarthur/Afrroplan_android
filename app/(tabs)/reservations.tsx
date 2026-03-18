/**
 * Page Reservations Client - AfroPlan
 * Liste des rendez-vous du client avec statuts et accès au chat
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Timer, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  MessageSquare, 
  Navigation, 
  Phone, 
  AlertCircle,
  ChevronRight,
  Search,
  Star,
  Lock
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { bookingService } from '@/services/booking.service';
import { reviewService } from '@/services/review.service';
import { BookingWithDetails, Booking } from '@/types';
import RatingModal from '@/components/RatingModal';

export default function ClientReservationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { t, language } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // States pour les avis
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<BookingWithDetails | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);

  const fetchBookings = React.useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const response = await bookingService.getClientBookings(user.id);
      const data = response.data;
      setBookings(data);

      // Vérifier quels bookings ont déjà un avis
      const reviews = await reviewService.getClientReviews(user.id);
      const reviewedIds = reviews.map(r => r.booking_id);
      setReviewedBookingIds(reviewedIds);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        fetchBookings();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, isAuthLoading, fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleOpenRating = (booking: BookingWithDetails) => {
    setSelectedBookingForReview(booking);
    setRatingModalVisible(true);
  };

  const handleCallSalon = (phone: string | null) => {
    if (!phone) {
      Alert.alert(t('booking.unavailable'), t('booking.noPhone'));
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleGetDirections = (salon: BookingWithDetails['salon']) => {
    if (!salon?.address || !salon?.city) {
      Alert.alert(t('booking.unavailable'), t('booking.incompleteAddress'));
      return;
    }
    const query = encodeURIComponent(`${salon.address}, ${salon.postal_code || ''} ${salon.city}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
    });
    
    if (url) {
      Linking.openURL(url);
    }
  };

  if (isAuthLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.emptyState}>
          <Calendar size={60} color={colors.textMuted} strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('booking.myReservations')}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('booking.loginMessage')}
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: Booking['status'], booking?: BookingWithDetails) => {
    if (booking && status === 'pending') {
      const bDateTime = getBookingDateTime(booking.booking_date, booking.start_time);
      if (bDateTime < now) return colors.textMuted; 
    }
    switch (status) {
      case 'confirmed': return colors.success;
      case 'pending': return colors.warning;
      case 'completed': return colors.textMuted;
      case 'cancelled': return colors.error;
      default: return colors.textMuted;
    }
  };

  const getStatusLabel = (status: Booking['status'], booking?: BookingWithDetails) => {
    if (booking && status === 'pending') {
      const bDateTime = getBookingDateTime(booking.booking_date, booking.start_time);
      if (bDateTime < now) return language === 'fr' ? 'Expiré' : 'Expired';
    }
    switch (status) {
      case 'confirmed': return t('booking.confirmed');
      case 'pending': return t('booking.pending');
      case 'completed': return t('booking.completed');
      case 'cancelled': return t('booking.cancelled');
      default: return '?';
    }
  };

  const getStatusIcon = (status: Booking['status'], booking?: BookingWithDetails) => {
    const size = 14;
    if (booking && status === 'pending') {
      const bDateTime = getBookingDateTime(booking.booking_date, booking.start_time);
      if (bDateTime < now) return <AlertCircle size={size} color={colors.textMuted} />;
    }
    switch (status) {
      case 'confirmed': return <CheckCircle2 size={size} color={getStatusColor(status)} />;
      case 'pending': return <Timer size={size} color={getStatusColor(status)} />;
      case 'completed': return <CheckCircle size={size} color={getStatusColor(status)} />;
      case 'cancelled': return <XCircle size={size} color={getStatusColor(status)} />;
      default: return <HelpCircle size={size} color={getStatusColor(status)} />;
    }
  };

  const handleCancelBooking = (booking: BookingWithDetails) => {
    if (booking.status === 'confirmed' && booking.payment_method === 'deposit') {
      Alert.alert(
        t('booking.cancelImpossible'),
        t('booking.cancelImpossibleMessage')
      );
      return;
    }

    if (booking.status === 'confirmed' && booking.payment_method === 'full') {
      Alert.alert(
        t('booking.cancelAndRefund'),
        `${t('booking.cancelPenaltyMessage')}\n\n${t('booking.amountPaid')} : ${booking.total_price}€\n${t('booking.cancelFee')} (20%) : ${(booking.total_price * 0.2).toFixed(2)}€\n${t('booking.amountRefunded')} : ${(booking.total_price * 0.8).toFixed(2)}€\n\n${language === 'fr' ? 'Voulez-vous continuer ?' : 'Do you want to continue?'}`,
        [
          { text: t('booking.keepAppt'), style: 'cancel' },
          { 
            text: t('booking.confirmCancel'), 
            style: 'destructive', 
            onPress: () => {
              Alert.alert(t('common.success'), `${t('booking.cancelSuccess')} ${t('booking.cancelRefundProcessing')}`);
            } 
          }
        ]
      );
      return;
    }

    if (booking.status === 'pending') {
      Alert.alert(
        t('booking.cancelAppt'),
        t('booking.cancelConfirmMessage'),
        [
          { text: language === 'fr' ? 'Non' : 'No', style: 'cancel' },
          { 
            text: language === 'fr' ? 'Oui, annuler' : 'Yes, cancel', 
            style: 'destructive', 
            onPress: async () => {
              try {
                setBookings(prev => prev.filter(b => b.id !== booking.id));
                await bookingService.cancelBooking(booking.id);
                Alert.alert(t('common.success'), t('booking.cancelFinalSuccess'));
                await fetchBookings();
              } catch (error) {
                console.error('Error deleting booking:', error);
                Alert.alert(t('common.error'), t('booking.deleteError'));
                await fetchBookings();
              }
            } 
          }
        ]
      );
      return;
    }

    Alert.alert('Info', t('booking.noEdit'));
  };

  const now = new Date();

  // Helper pour construire une date locale sans soucis de fuseau horaire UTC
  const getBookingDateTime = (dateStr: string, timeStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    return new Date(y, m - 1, d, h, min);
  };

  const upcomingBookings = bookings.filter(b => {
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    const bDateTime = getBookingDateTime(b.booking_date, b.start_time);
    return bDateTime > now;
  });

  const pastBookings = bookings.filter(b => {
    if (b.status === 'cancelled' || b.status === 'completed') return true;
    const bDateTime = getBookingDateTime(b.booking_date, b.start_time);
    return bDateTime <= now;
  });

  const displayedBookings = filter === 'upcoming' ? upcomingBookings : pastBookings;

  const formatDateFr = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const renderBooking = ({ item }: { item: BookingWithDetails }) => (
    <View style={[styles.bookingCard, { backgroundColor: colors.card }, Shadows.md]}>
      <TouchableOpacity 
        style={styles.bookingHeader}
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: '/chat/[bookingId]',
          params: { bookingId: item.id },
        })}
      >
        <Image 
          source={{ uri: item.salon?.cover_image_url || item.salon?.image_url || 'https://via.placeholder.com/200' }} 
          style={styles.salonImage} 
          contentFit="cover" 
        />
        <View style={styles.bookingInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.salonName, { color: colors.text }]} numberOfLines={1}>
              {item.salon?.name || 'Salon'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, item) + '12' }]}>
              {getStatusIcon(item.status, item)}
              <Text style={[styles.statusText, { color: getStatusColor(item.status, item) }]}>
                {getStatusLabel(item.status, item)}
              </Text>
            </View>
          </View>
          <Text style={[styles.serviceName, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.service?.name || 'Service'}
          </Text>
          <View style={styles.dateTimeContainer}>
            <Calendar size={12} color={colors.textMuted} />
            <Text style={[styles.dateSmall, { color: colors.textMuted }]}>
              {formatDateFr(item.booking_date)}
            </Text>
            <Clock size={12} color={colors.textMuted} style={{ marginLeft: 8 }} />
            <Text style={[styles.dateSmall, { color: colors.textMuted }]}>
              {item.start_time.substring(0, 5)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.bookingFooter, { borderTopColor: colors.border + '50' }]}>
        <Text style={[styles.priceText, { color: colors.text }]}>
          {item.total_price} <Text style={styles.currencyText}>EUR</Text>
        </Text>
        
        <View style={styles.footerActions}>
          {item.status === 'completed' && !reviewedBookingIds.includes(item.id) && (
            <TouchableOpacity
              style={[styles.rateButton, { backgroundColor: '#FFB800' }]}
              onPress={() => handleOpenRating(item)}
            >
              <Star size={16} color="#FFF" fill="#FFF" />
              <Text style={styles.chatButtonText}>Avis</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: '/chat/[bookingId]',
              params: { bookingId: item.id },
            })}
          >
            <MessageSquare size={16} color="#FFF" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {item.status === 'completed' && reviewedBookingIds.includes(item.id) && (
        <View style={[styles.reviewedBox, { backgroundColor: '#F0FDF4' }]}>
          <CheckCircle2 size={14} color="#16A34A" />
          <Text style={[styles.reviewedText, { color: '#16A34A' }]}>
            Vous avez déjà laissé un avis. Merci !
          </Text>
        </View>
      )}

      {item.status === 'cancelled' && item.notes?.includes('Annulation coiffeur') && (
        <View style={[styles.reasonBox, { backgroundColor: colors.error + '08' }]}>
          <AlertCircle size={14} color={colors.error} />
          <Text style={[styles.reasonText, { color: colors.error }]}>
            {item.notes.replace('Annulation coiffeur : ', `${t('booking.cancelReason')} : `)}
          </Text>
        </View>
      )}

      {(item.status === 'confirmed' || item.status === 'completed' || (item.status === 'pending' && item.payment_status !== 'pending')) && (
        <View style={styles.cardActions}>
          {item.status === 'pending' && item.payment_status === 'pending' ? (
            <View style={[styles.lockedPaymentBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Lock size={14} color={colors.textMuted} />
              <Text style={[styles.lockedPaymentText, { color: colors.textSecondary }]}>
                {language === 'fr' ? "Payez l'acompte pour débloquer le contact" : "Pay deposit to unlock contact"}
              </Text>
            </View>
          ) : (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => handleGetDirections(item.salon)}
              >
                <Navigation size={14} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  {t('salon.directions')}
                </Text>
              </TouchableOpacity>

              {item.salon?.phone && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => handleCallSalon(item.salon.phone)}
                >
                  <Phone size={14} color={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>
                    {t('salon.call')}
                  </Text>
                </TouchableOpacity>
              )}

              {item.status === 'pending' && (() => {
                const [h, m] = item.start_time.split(':').map(Number);
                const bDateTime = new Date(item.booking_date);
                bDateTime.setHours(h, m, 0, 0);
                const isPast = bDateTime < now;

                if (isPast) return null;

                return (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                    onPress={() => handleCancelBooking(item as any)}
                  >
                    <XCircle size={14} color={colors.error} />
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      {language === 'fr' ? 'Annuler' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('booking.myReservations')}</Text>
          <View style={styles.logoWrapper}>
            <Image source={require('@/assets/images/logo_afroplan.png')} style={styles.logoImage} contentFit="contain" />
          </View>
        </View>
      </View>

      {/* Filter Tabs - Premium Style */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'upcoming' && { backgroundColor: colors.card },
          ]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[
            styles.filterTabText,
            { color: filter === 'upcoming' ? colors.primary : colors.textMuted },
          ]}>
            {t('booking.upcoming')}
            <Text style={{ opacity: 0.5 }}> • {upcomingBookings.length}</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'past' && { backgroundColor: colors.card },
          ]}
          onPress={() => setFilter('past')}
        >
          <Text style={[
            styles.filterTabText,
            { color: filter === 'past' ? colors.primary : colors.textMuted },
          ]}>
            {t('booking.past')}
            <Text style={{ opacity: 0.5 }}> • {pastBookings.length}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : displayedBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Search size={60} color={colors.textMuted} strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {filter === 'upcoming' ? t('booking.noUpcoming') : t('booking.noPast')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('booking.discoverSalonsMessage')}
          </Text>
          {filter === 'upcoming' && (
            <TouchableOpacity
              style={[styles.exploreButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.exploreButtonText}>{t('booking.exploreSalons')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayedBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modale d'avis */}
      <RatingModal
        visible={ratingModalVisible}
        onClose={() => {
          setRatingModalVisible(false);
          setSelectedBookingForReview(null);
        }}
        bookingId={selectedBookingForReview?.id || ''}
        salonId={selectedBookingForReview?.salon_id || ''}
        salonName={selectedBookingForReview?.salon?.name || 'le salon'}
        onSuccess={fetchBookings}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoWrapper: {
    width: 60,
    height: 36,
    borderRadius: 18, // Rend le cadre oval
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  filterRow: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  bookingCard: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  bookingHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  salonImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  salonName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSmall: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  chatButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  reviewedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 8,
  },
  reviewedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lockedPaymentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  lockedPaymentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 8,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
    opacity: 0.6,
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  exploreButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
