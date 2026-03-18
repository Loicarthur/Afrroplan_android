/**
 * Page d'accueil AfroPlan - Client (Version Vitrine Premium)
 * Design modernisé avec Lucide & Style shadcn
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { 
  Bell, 
  Search, 
  ChevronRight, 
  MapPin, 
  ArrowRight, 
  Clock, 
  Instagram, 
  Linkedin, 
  MessageSquareText,
  Sparkles,
  TrendingUp,
  Map as MapIcon
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Location from 'expo-location';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/use-app-store';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Shadows, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { AuthGuardModal, SalonCard } from '@/components/ui';
import SearchFlowModal from '@/components/SearchFlowModal';
import LanguageSelector from '@/components/LanguageSelector';
import NotificationModal from '@/components/NotificationModal';
import FeedbackModal from '@/components/FeedbackModal';
import RatingModal from '@/components/RatingModal';
import { useSalonsInfinite, usePopularSalonsQuery } from '@/hooks/use-salons-query';
import { HAIRSTYLE_CATEGORIES } from '@/constants/hairstyleCategories';
import { bookingService } from '@/services/booking.service';
import { reviewService } from '@/services/review.service';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

const ALL_STYLES = HAIRSTYLE_CATEGORIES.map((cat) => ({
  id: cat.id,
  name: cat.title,
  image: cat.styles[0]?.image,
}));

const TIPS_AND_INSPIRATION = [
  { id: '1', title: 'Comment entretenir ses tresses ?', category: 'Conseils', image: require('../../assets/images/entretien_cheveux.jpg'), readTime: '3 min' },
  { id: '2', title: 'Les tendances coiffures 2024', category: 'Tendances', image: require('../../assets/images/Photo_tendance.jpg'), readTime: '5 min' },
  { id: '3', title: 'Routine capillaire cheveux crépus', category: 'Tutoriel', image: require('../../assets/images/routine_capilaire.jpg'), readTime: '4 min' },
];

function SectionHeader({ title, icon: Icon, onSeeAll, seeAllLabel }: { title: string; icon?: any; onSeeAll?: () => void; seeAllLabel?: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {Icon && <Icon size={20} color="#191919" style={{ marginRight: 8 }} />}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={[styles.seeAll, { color: colors.textSecondary }]}>{seeAllLabel ?? 'Voir tout'}</Text>
          <ChevronRight size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { profile, isAuthenticated, user } = useAuth();
  const { favoriteIds, toggleFavorite, loadFavorites } = useAppStore();
  const { t } = useLanguage();

  const [showAllStyles, setShowAllStyles] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // States pour la sollicitation d'avis automatique
  const [pendingReviewBooking, setPendingReviewBooking] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Data Fetching
  const { 
    data: salonsData, 
    refetch: refetchSalons, 
    isRefetching: refreshing 
  } = useSalonsInfinite();
  
  const { data: popularSalons = [] } = usePopularSalonsQuery(6);

  const salons = salonsData?.pages.flatMap(page => page.data) || [];
  const featuredSalons = salons.filter(s => s.is_verified).slice(0, 5);

  const fetchActiveBookingsCount = useCallback(async () => {
    if (isAuthenticated && user?.id) {
      try {
        const response = await bookingService.getClientBookings(user.id);
        setActiveBookingsCount(response.data.filter(b => b.status === 'pending' || b.status === 'confirmed').length);
      } catch (e) {}
    }
  }, [isAuthenticated, user?.id]);

  const checkPendingReviews = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await bookingService.getClientBookings(user.id);
      // Chercher une réservation terminée depuis plus de 5 min sans avis (max 2 relances)
      const toPrompt = response.data.find(b => 
        b.status === 'completed' && 
        (b.review_prompt_count || 0) < 2
      );
      
      if (toPrompt) {
        // Vérifier si un avis existe déjà pour ce salon par ce client
        const hasReviewed = await reviewService.hasClientReviewed(user.id, toPrompt.salon_id);
        if (!hasReviewed) {
          // Mettre à jour le compteur de relances
          await supabase
            .from('bookings')
            .update({ 
              review_prompt_count: (toPrompt.review_prompt_count || 0) + 1,
              last_review_prompt_at: new Date().toISOString()
            })
            .eq('id', toPrompt.id);

          setPendingReviewBooking(toPrompt);
          setShowRatingModal(true);
        }
      }
    } catch (e) {
      console.error('Erreur checkPendingReviews:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadFavorites(user.id);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => setLocationStatus(status))
      .catch(() => setLocationStatus('denied'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActiveBookingsCount();
      refetchSalons();
      checkPendingReviews();
    }, [fetchActiveBookingsCount, refetchSalons, checkPendingReviews])
  );

  const handleRequestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationStatus(status);
      if (status === 'granted') {
        router.push({ pathname: '/(tabs)/explore', params: { view: 'map' } });
      }
    } catch (e) {
      console.error('Location error:', e);
    }
  };

  const handleToggleFavorite = async (salonId: string) => {
    if (!isAuthenticated) { setShowAuthModal(true); return; }
    if (!user?.id) return;
    toggleFavorite(user.id, salonId);
  };

  const handleSearch = (filters: any) => {
    router.push({
      pathname: '/(tabs)/explore',
      params: { 
        category: filters.hairstyle,
        city: filters.city,
      }
    });
  };

  const onRefresh = () => {
    refetchSalons();
    if (isAuthenticated && user?.id) {
      loadFavorites(user.id);
      fetchActiveBookingsCount();
    }
  };

  const displayedStyles = showAllStyles ? ALL_STYLES : ALL_STYLES.slice(0, 6);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <SearchFlowModal visible={searchModalVisible} onClose={() => setSearchModalVisible(false)} onSearch={handleSearch} />
      <NotificationModal visible={notificationModalVisible} onClose={() => setNotificationModalVisible(false)} />
      
      {pendingReviewBooking && (
        <RatingModal 
          visible={showRatingModal} 
          onClose={() => setShowRatingModal(false)}
          bookingId={pendingReviewBooking.id}
          salonId={pendingReviewBooking.salon_id}
          salonName={pendingReviewBooking.salon?.name || 'le salon'}
          onSuccess={() => {
            setShowRatingModal(false);
            fetchActiveBookingsCount();
          }}
        />
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />}
      >
        {/* Modern Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.logoWrapper}>
                <Image 
                  source={require('../../assets/images/logo_afroplan.png')} 
                  style={styles.logoImage} 
                  contentFit="contain" 
                />
              </View>
              
              {isAuthenticated && (
                <View style={styles.greetingBox}>
                  <Text style={[styles.helloText, { color: colors.textSecondary }]}>{t('home.hello')},</Text>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {profile?.full_name ? profile.full_name.split(' ')[0] : t('profile.user')}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.headerRight}>
              {!isAuthenticated ? (
                <View style={styles.authRow}>
                  <LanguageSelector compact />
                  <TouchableOpacity 
                    style={[styles.loginBtn, { backgroundColor: '#191919' }]} 
                    onPress={() => router.push('/(auth)/login')}
                  >
                    <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.iconBtn, { backgroundColor: colors.backgroundSecondary }]} 
                  onPress={() => setNotificationModalVisible(true)}
                >
                  <Bell size={22} color="#191919" strokeWidth={2} />
                  {activeBookingsCount > 0 && <View style={styles.notifBadge} />}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Search Bar - High End */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.searchSection}>
          <TouchableOpacity 
            style={[styles.searchBar, Shadows.md]} 
            onPress={() => setSearchModalVisible(true)}
            activeOpacity={0.9}
          >
            <View style={styles.searchInner}>
              <View style={styles.searchIconBox}>
                <Search size={20} color="#FFF" strokeWidth={2.5} />
              </View>
              <View style={styles.searchTexts}>
                <Text style={styles.searchTitle}>Envie d'une nouvelle tête ?</Text>
                <Text style={styles.searchSub}>{t('home.searchSubtitle')}</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#BBB" />
          </TouchableOpacity>
        </Animated.View>

        {/* Location Prompt */}
        {locationStatus !== 'granted' && (
          <Animated.View entering={FadeIn.delay(300)} style={styles.locationBannerBox}>
            <TouchableOpacity 
              style={[styles.locationBanner, { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]} 
              onPress={handleRequestLocation}
            >
              <View style={[styles.locIconCircle, { backgroundColor: '#191919' }]}>
                <MapPin size={18} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locTitle, { color: '#191919' }]}>Autour de vous 📍</Text>
                <Text style={[styles.locSub, { color: '#666' }]}>Activez la localisation pour voir les salons proches.</Text>
              </View>
              <ArrowRight size={16} color="#191919" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Featured Salons */}
        {featuredSalons.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title={t('home.featured')} 
              icon={Sparkles}
              onSeeAll={() => router.push('/(tabs)/explore')} 
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {featuredSalons.map(s => (
                <SalonCard 
                  key={s.id} 
                  salon={s} 
                  variant="featured" 
                  isFavorite={favoriteIds.includes(s.id)} 
                  onFavoritePress={() => handleToggleFavorite(s.id)} 
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories Grid */}
        <View style={styles.section}>
          <SectionHeader 
            title={t('home.hairstyleCategories')} 
            onSeeAll={() => setShowAllStyles(!showAllStyles)} 
            seeAllLabel={showAllStyles ? t('home.seeLess') : t('common.seeAll')} 
          />
          <View style={styles.categoriesGrid}>
            {displayedStyles.map((style) => (
              <TouchableOpacity 
                key={style.id} 
                style={styles.categoryCard} 
                onPress={() => router.push(`/category-styles/${style.id}`)}
                activeOpacity={0.8}
              >
                <Image source={style.image} style={styles.categoryImg} contentFit="cover" />
                <LinearGradient 
                  colors={['transparent', 'rgba(0,0,0,0.7)']} 
                  style={styles.categoryOverlay}
                >
                  <Text style={styles.categoryName} numberOfLines={1}>{style.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Popular Salons */}
        {popularSalons.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title={t('home.popularSalons')} 
              icon={TrendingUp}
              onSeeAll={() => router.push('/(tabs)/explore')} 
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {popularSalons.map(s => (
                <SalonCard 
                  key={s.id} 
                  salon={s} 
                  variant="default" 
                  isFavorite={favoriteIds.includes(s.id)} 
                  onFavoritePress={() => handleToggleFavorite(s.id)} 
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Discover Nearby */}
        {salons.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title={t('home.nearbyCoiffeurs')} 
              icon={MapIcon}
              onSeeAll={() => router.push('/(tabs)/explore')} 
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {salons.slice(0, 6).map(s => (
                <SalonCard 
                  key={s.id} 
                  salon={s} 
                  variant="default" 
                  isFavorite={favoriteIds.includes(s.id)} 
                  onFavoritePress={() => handleToggleFavorite(s.id)} 
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tips & Inspiration */}
        <View style={styles.section}>
          <SectionHeader title={t('home.tipsAndInspiration')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {TIPS_AND_INSPIRATION.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.tipCard, { backgroundColor: colors.card }]} activeOpacity={0.9}>
                <Image source={item.image} style={styles.tipImg} contentFit="cover" />
                <View style={styles.tipBody}>
                  <View style={styles.tipTag}><Text style={styles.tipTagText}>{item.category}</Text></View>
                  <Text style={[styles.tipTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.tipMeta}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={[styles.tipMetaText, { color: colors.textMuted }]}>{item.readTime} de lecture</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Final Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.footerInfo}>
            <Image 
              source={require('../../assets/images/logo_afroplan.png')} 
              style={styles.footerLogo} 
              contentFit="contain" 
            />
            <Text style={styles.footerTagline}>L'excellence de la coiffure afro à portée de main.</Text>
          </View>

          <View style={styles.footerSocials}>
            <TouchableOpacity 
              style={[styles.socialBtn, { backgroundColor: '#191919' }]} 
              onPress={() => Linking.openURL('https://www.instagram.com/afro._plan')}
            >
              <Instagram size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.socialBtn, { backgroundColor: '#191919' }]} 
              onPress={() => Linking.openURL('https://www.linkedin.com/company/afro-plan')}
            >
              <Linkedin size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/terms' as any)}><Text style={styles.fLink}>CGU</Text></TouchableOpacity>
            <View style={styles.fDot} />
            <TouchableOpacity onPress={() => router.push('/privacy-policy' as any)}><Text style={styles.fLink}>Confidentialité</Text></TouchableOpacity>
            <View style={styles.fDot} />
            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@afroplan.com')}><Text style={styles.fLink}>Aide</Text></TouchableOpacity>
          </View>
          
          <Text style={styles.copy}>© 2024 AfroPlan. All rights reserved.</Text>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      <AuthGuardModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <FeedbackModal visible={feedbackModalVisible} onClose={() => setFeedbackModalVisible(false)} />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, Shadows.lg]} 
        onPress={() => setFeedbackModalVisible(true)}
      >
        <MessageSquareText size={24} color="#FFF" strokeWidth={2} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrapper: { width: 70, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: '85%', height: '85%' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  authRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loginBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  loginBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetingBox: { 
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: 4,
    marginTop: 12
  },
  helloText: { 
    fontSize: 11, 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    opacity: 0.5,
    letterSpacing: 0.5
  },
  userName: { 
    fontSize: 15, 
    fontWeight: '800', 
    letterSpacing: -0.2,
    marginTop: -2
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFF' },

  // Search
  searchSection: { paddingHorizontal: 20, marginBottom: 12 },
  searchBar: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  searchInner: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  searchIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#191919', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  searchTexts: { flex: 1 },
  searchTitle: { fontSize: 15, fontWeight: '800', color: '#191919' },
  searchSub: { fontSize: 12, color: '#888', marginTop: 2 },

  // Location
  locationBannerBox: { paddingHorizontal: 20, marginBottom: 20 },
  locationBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, gap: 12, borderWidth: 1 },
  locIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  locTitle: { fontSize: 14, fontWeight: '700' },
  locSub: { fontSize: 11, marginTop: 1 },

  // Sections
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAll: { fontSize: 13, fontWeight: '700' },
  horizontalScroll: { paddingRight: 20, gap: 16 },

  // Categories
  categoriesGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12,
    justifyContent: 'flex-start'
  },
  categoryCard: { 
    width: (width - 64) / 3, 
    aspectRatio: 1, // Carré parfait
    borderRadius: 20, 
    overflow: 'hidden',
    backgroundColor: '#F0F0F0'
  },
  categoryImg: { width: '100%', height: '100%' },
  categoryOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'flex-end', 
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)' 
  },
  categoryName: { 
    color: '#FFF', 
    fontSize: 11, 
    fontWeight: '900', 
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  // Tips
  tipCard: { width: 280, borderRadius: 24, overflow: 'hidden', marginRight: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  tipImg: { width: '100%', height: 160 },
  tipBody: { padding: 16 },
  tipTag: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  tipTagText: { fontSize: 10, fontWeight: '800', color: '#191919', textTransform: 'uppercase' },
  tipTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, lineHeight: 22 },
  tipMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipMetaText: { fontSize: 12, fontWeight: '500' },

  // Footer
  footer: { padding: 40, alignItems: 'center', borderTopWidth: 1, marginTop: 40 },
  footerInfo: { alignItems: 'center', marginBottom: 24 },
  footerLogo: { width: 100, height: 60, borderRadius: 30, marginBottom: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE' },
  footerTagline: { fontSize: 13, color: '#888', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 20 },
  footerSocials: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  socialBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  fLink: { fontSize: 13, fontWeight: '700', color: '#191919' },
  fDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#DDD' },
  copy: { fontSize: 11, color: '#BBB' },

  // FAB
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#191919', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
});
