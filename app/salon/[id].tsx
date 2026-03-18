/**
 * Page de détail d'un salon AfroPlan - Design Style shadcn / Lucide
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  ArrowLeft, 
  Share2, 
  Heart, 
  Star, 
  CheckCircle2, 
  Phone as PhoneIcon, 
  Navigation, 
  Lock, 
  Clock, 
  Check,
  MapPin,
  Info,
  MessageSquare,
  Calendar,
  User
} from 'lucide-react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSalon, useFavorite } from '@/hooks';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui';
import { Service } from '@/types';
import { HAIRSTYLE_CATEGORIES } from '@/constants/hairstyleCategories';

const { width } = Dimensions.get('window');

const DAYS_MAP: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

function Rating({ value, count, showValue = false, showCount = false }: { value: number; count?: number; showValue?: boolean; showCount?: boolean }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Si le salon est nouveau (pas de note), on affiche 3 étoiles colorées sur 5 par défaut (boost visuel)
  const effectiveRating = value > 0 ? value : 3;
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.ratingContainer}>
      <View style={{ flexDirection: 'row', gap: 2, marginRight: 4 }}>
        {stars.map((s) => (
          <Star 
            key={s} 
            size={14} 
            color="#FFB800" 
            fill={s <= Math.round(effectiveRating) ? "#FFB800" : "transparent"} 
          />
        ))}
      </View>
      {showValue && value > 0 && (
        <Text style={[styles.ratingValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
      )}
      {showCount && count !== undefined && count > 0 && (
        <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>({count})</Text>
      )}
    </View>
  );
}

export default function SalonDetailScreen() {
  const { id, service: preselectService } = useLocalSearchParams<{ id: string; service?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user } = useAuth();
  const { t, language } = useLanguage();
  
  const { salon, isLoading } = useSalon(id || '');
  const { isFavorite, toggleFavorite, isToggling } = useFavorite(user?.id || '', id || '');

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [hasBooking, setHasBooking] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'services' | 'reviews' | 'about'>('services');

  useEffect(() => {
    const init = async () => {
      if (user?.id && id) {
        try {
          const { bookingService } = await import('@/services/booking.service');
          const response = await bookingService.getClientBookings(user.id);
          const userHasPaid = response.data.some(b => 
            b.salon_id === id && 
            (b.payment_status === 'partial' || b.payment_status === 'completed')
          );
          setHasBooking(userHasPaid);
        } catch (e) {
          setHasBooking(false);
        }
      }
    };
    init();
  }, [user?.id, id]);

  useEffect(() => {
    if (salon?.services && preselectService && selectedServices.length === 0) {
      const target = salon.services.find(s => s.name.toLowerCase() === preselectService.toLowerCase());
      if (target) setSelectedServices([target]);
    }
  }, [salon, preselectService]);

  const groupedServices = useMemo(() => {
    if (!salon?.services) return {};
    return salon.services.reduce((acc: Record<string, Service[]>, s: Service) => {
      const cat = s.category || 'Autres';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {});
  }, [salon?.services]);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => 
      prev.find(s => s.id === service.id) 
        ? prev.filter(s => s.id !== service.id) 
        : [...prev, service]
    );
  };

  const handleShare = async () => {
    if (!salon) return;
    try {
      const message = language === 'fr' 
        ? `Découvre le salon "${salon.name}" sur AfroPlan ! C'est le top pour se coiffer à ${salon.city}.`
        : `Check out "${salon.name}" on AfroPlan! Great place for hair in ${salon.city}.`;
      
      const url = `https://afroplan.com/salon/${salon.id}`;
      
      await Share.share({
        message: `${message}\n${url}`,
        url: url,
        title: salon.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleBook = () => {
    if ((salon as any)?.is_today_blocked) {
      Alert.alert(t('common.attention'), language === 'fr' ? "Ce salon est exceptionnellement fermé aujourd'hui." : 'This salon is exceptionally closed today.');
      return;
    }
    if (!isAuthenticated) {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredMessage'), [
        { text: t('common.cancel') },
        { text: t('auth.login'), onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    if (selectedServices.length === 0) {
      Alert.alert(t('common.attention'), language === 'fr' ? 'Veuillez sélectionner au moins une prestation.' : 'Please select at least one service.');
      return;
    }
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
    
    router.push({
      pathname: '/booking/[id]',
      params: { 
        id, 
        serviceId: selectedServices.map(s => s.id).join(','), 
        serviceName: selectedServices.map(s => s.name).join(', '), 
        servicePrice: totalPrice.toString(), 
        serviceDuration: totalDuration.toString() 
      }
    });
  };

  if (isLoading || !salon) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#191919" />
      </View>
    );
  }

  const imageUri = salon.cover_image_url || salon.image_url || (salon.photos && salon.photos[0]) || 'https://via.placeholder.com/600x400';
  const finalImageUri = typeof imageUri === 'string' 
    ? `${imageUri}${imageUri.includes('?') ? '&' : '?'}v=${Date.now()}` 
    : imageUri;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
        {/* 1. Header Immersif */}
        <View style={styles.headerPhoto}>
          <Image 
            source={finalImageUri} 
            style={styles.coverImage} 
            contentFit="cover" 
            transition={300}
          />
          <LinearGradient 
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']} 
            style={StyleSheet.absoluteFill} 
          />
          
          <SafeAreaView style={styles.headerButtons} edges={['top']}>
            <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
              <ArrowLeft size={22} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
            
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.roundButton} onPress={handleShare}>
                <Share2 size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.roundButton} 
                onPress={async () => {
                  if (!isAuthenticated) { router.push('/(auth)/login'); return; }
                  try { await toggleFavorite(); } catch (e) {}
                }}
                disabled={isToggling}
              >
                <Heart 
                  size={22} 
                  color={isFavorite ? "#EF4444" : "#FFF"} 
                  fill={isFavorite ? "#EF4444" : "transparent"}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* 2. Infos principales */}
        <View style={[styles.mainInfo, { backgroundColor: colors.background }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.salonName, { color: colors.text }]}>{salon.name}</Text>
            {salon.is_verified && <CheckCircle2 size={20} color={colors.success} strokeWidth={2.5} />}
          </View>
          
          <View style={styles.metaRow}>
            <Rating value={salon.rating} count={salon.reviews_count} showValue showCount />
            <View style={styles.dotSeparator} />
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.cityText, { color: colors.textSecondary }]}>{salon.city}</Text>
          </View>
          
          {/* Galerie / Portfolio */}
          {(salon.gallery && salon.gallery.length > 0) || (salon.photos && salon.photos.length > 0) ? (
            <View style={styles.vitrineSection}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>{t('salon.gallery')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitrineScroll}>
                {(salon.gallery || []).map((img: any) => (
                  <TouchableOpacity key={img.id} style={styles.vitrineThumb} activeOpacity={0.9}>
                    <Image source={{ uri: img.image_url }} style={styles.vitrineImg} contentFit="cover" />
                  </TouchableOpacity>
                ))}
                {(salon.photos || []).filter((p: string) => !salon.gallery?.some((g: any) => g.image_url === p)).map((photo: string, idx: number) => (
                  <TouchableOpacity key={`photo-${idx}`} style={styles.vitrineThumb} activeOpacity={0.9}>
                    <Image source={{ uri: photo }} style={styles.vitrineImg} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Actions rapides */}
          <View style={styles.quickActions}>
            {hasBooking ? (
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary }]} 
                  onPress={() => Linking.openURL(`tel:${salon.phone}`)}
                >
                  <PhoneIcon size={18} color="#191919" strokeWidth={2} />
                  <Text style={[styles.actionBtnText, { color: '#191919' }]}>{t('salon.call')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary }]} 
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${salon.address} ${salon.city}`)}
                >
                  <Navigation size={18} color="#191919" strokeWidth={2} />
                  <Text style={[styles.actionBtnText, { color: '#191919' }]}>{t('salon.directions')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.restrictedBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Lock size={16} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.restrictedText, { color: colors.textSecondary }]}>
                  {language === 'fr' ? "Réservez pour débloquer le contact et l'itinéraire" : 'Book to unlock contact and directions'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 3. Onglets (Sticky via stickyHeaderIndices) */}
        <View style={[styles.tabContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {[
            { id: 'services', label: t('salon.services') },
            { id: 'reviews', label: t('salon.reviews') },
            { id: 'about', label: t('salon.about') },
          ].map((tTab) => (
            <TouchableOpacity 
              key={tTab.id} 
              style={[styles.tabItem, activeDetailTab === tTab.id && { borderBottomColor: '#191919' }]} 
              onPress={() => setActiveDetailTab(tTab.id as any)}
            >
              <Text style={[styles.tabLabel, { color: activeDetailTab === tTab.id ? '#191919' : colors.textMuted }]}>
                {tTab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Contenu des onglets */}
        <View style={styles.tabContent}>
          {activeDetailTab === 'services' && (
            <View>
              {Object.entries(groupedServices).map(([cat, svcs]) => (
                <View key={cat} style={styles.catSection}>
                  <Text style={[styles.catHeader, { color: colors.text }]}>{cat}</Text>
                  <View style={styles.servicesGrid}>
                    {svcs.map(s => {
                      const isSelected = selectedServices.some(x => x.id === s.id);
                      
                      const catalogImg = HAIRSTYLE_CATEGORIES.flatMap(c => c.styles).find(cs => 
                        s.name.toLowerCase().includes(cs.name.toLowerCase()) || 
                        cs.name.toLowerCase().includes(s.name.toLowerCase())
                      )?.image;
                      
                      return (
                        <TouchableOpacity 
                          key={s.id} 
                          style={[
                            styles.svcCard, 
                            { 
                              backgroundColor: colors.card, 
                              borderColor: isSelected ? '#191919' : colors.border,
                              borderWidth: isSelected ? 2 : 1
                            }
                          ]} 
                          onPress={() => toggleService(s)}
                          activeOpacity={0.8}
                        >
                          <Image 
                            source={s.image_url || catalogImg || 'https://via.placeholder.com/300'} 
                            style={styles.svcImg} 
                            contentFit="cover" 
                          />
                          <View style={styles.svcInfo}>
                            <Text style={[styles.svcName, { color: colors.text }]} numberOfLines={2}>{s.name}</Text>
                            <View style={styles.svcBottomRow}>
                              <Text style={[styles.svcPrice, { color: '#191919' }]}>{s.price}€</Text>
                              <View style={styles.svcDuration}>
                                <Clock size={12} color={colors.textMuted} />
                                <Text style={styles.svcDurationText}>{s.duration_minutes} min</Text>
                              </View>
                            </View>
                          </View>
                          {isSelected && (
                            <View style={[styles.selectionBadge, { backgroundColor: '#191919' }]}>
                              <Check size={14} color="#FFF" strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              {Object.keys(groupedServices).length === 0 && (
                <View style={styles.emptyState}>
                  <Clock size={48} color={colors.textMuted} strokeWidth={1.5} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Aucun service disponible pour le moment.</Text>
                </View>
              )}
            </View>
          )}

          {activeDetailTab === 'reviews' && (
            <View style={styles.reviewsContainer}>
              <View style={styles.reviewsHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('salon.reviews')}</Text>
                <Rating value={salon.rating} count={salon.reviews_count} showValue />
              </View>
              
              {salon.reviews && salon.reviews.length > 0 ? (
                salon.reviews.map((review: any) => (
                  <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerInfo}>
                        <View style={[styles.reviewerAvatar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          {review.client?.avatar_url ? (
                            <Image source={{ uri: review.client.avatar_url }} style={styles.reviewerImg} contentFit="cover" />
                          ) : (
                            <User size={16} color={colors.textMuted} />
                          )}
                        </View>
                        <View>
                          <Text style={[styles.reviewerName, { color: colors.text }]}>
                            {review.client?.full_name || t('profile.user')}
                          </Text>
                          <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                            {new Date(review.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Rating value={review.rating} />
                    </View>
                    <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{review.comment}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <MessageSquare size={48} color={colors.textMuted} strokeWidth={1.5} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12, fontWeight: '500' }}>{t('salon.noReviews')}</Text>
                </View>
              )}
            </View>
          )}

          {activeDetailTab === 'about' && (
            <View style={styles.aboutContainer}>
              {/* Description */}
              <View style={styles.aboutSection}>
                <View style={styles.aboutHeader}>
                  <Info size={20} color="#191919" strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('salon.about')}</Text>
                </View>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {salon.description || "Bienvenue dans notre salon ! Nous mettons notre expertise au service de votre beauté."}
                </Text>
              </View>
              
              {/* Horaires d'ouverture */}
              <View style={styles.aboutSection}>
                <View style={styles.aboutHeader}>
                  <Calendar size={20} color="#191919" strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Horaires d'ouverture</Text>
                </View>
                <View style={[styles.hoursGrid, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayKey) => {
                    const hours = (salon.opening_hours as any)?.[dayKey];
                    if (!hours) return null;
                    return (
                      <View key={dayKey} style={styles.hourRow}>
                        <Text style={[styles.hourDay, { color: colors.text }]}>{DAYS_MAP[dayKey] || dayKey}</Text>
                        <Text style={[styles.hourValue, { color: hours.closed ? colors.error : colors.textSecondary }]}>
                          {hours.closed ? 'Fermé' : `${hours.open} - ${hours.close}`}
                        </Text>
                      </View>
                    );
                  })}
                  {!salon.opening_hours && (
                    <Text style={{ color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', padding: 10 }}>
                      Horaires non renseignés
                    </Text>
                  )}
                </View>
              </View>

              {/* Localisation */}
              <View style={styles.aboutSection}>
                <View style={styles.aboutHeader}>
                  <MapPin size={20} color="#191919" strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Localisation</Text>
                </View>
                <View style={[styles.locationBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.addressText, { color: colors.text }]}>{salon.address}</Text>
                  <Text style={[styles.cityTextLarge, { color: colors.textSecondary }]}>{salon.postal_code} {salon.city}</Text>
                  <TouchableOpacity 
                    style={styles.mapAction} 
                    onPress={() => {
                      if (!hasBooking) {
                        Alert.alert(
                          language === 'fr' ? "Accès restreint" : "Restricted access",
                          language === 'fr' 
                            ? "Veuillez réserver et payer l'acompte pour débloquer l'itinéraire complet."
                            : "Please book and pay the deposit to unlock the full directions."
                        );
                        return;
                      }
                      Linking.openURL(`https://maps.google.com/?q=${salon.address} ${salon.city}`);
                    }}
                  >
                    <Navigation size={16} color={colors.primary} />
                    <Text style={[styles.mapActionText, { color: colors.primary }]}>Voir sur la carte</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Footer Flottant */}
      <View style={[styles.floatingFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.footerInfo}>
          <Text style={[styles.footerCount, { color: colors.textMuted }]}>
            {selectedServices.length} {t('salon.selectedServices')}
          </Text>
          <Text style={[styles.footerPrice, { color: '#191919' }]}>
            {selectedServices.reduce((sum, s) => sum + s.price, 0)}€
          </Text>
        </View>
        <Button 
          title={t('booking.book')} 
          onPress={handleBook} 
          style={styles.bookButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerPhoto: { width: '100%', height: 300 },
  coverImage: { width: '100%', height: '100%' },
  headerButtons: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16 
  },
  roundButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  mainInfo: { 
    padding: 24, 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    marginTop: -32,
    zIndex: 5
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  salonName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 6 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingValue: { fontWeight: '700', fontSize: 15 },
  ratingCount: { fontSize: 13 },
  dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CCC', marginHorizontal: 4 },
  cityText: { fontSize: 14, fontWeight: '500' },
  quickActions: { marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8, 
    paddingVertical: 12, 
    borderRadius: BorderRadius.lg,
  },
  actionBtnText: { fontWeight: '700', fontSize: 14 },
  restrictedBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: BorderRadius.lg, 
    borderWidth: 1, 
    gap: 10, 
  },
  restrictedText: { fontSize: 13, fontWeight: '500', flex: 1 },
  vitrineSection: { marginVertical: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  vitrineScroll: { gap: 12 },
  vitrineThumb: { 
    width: 160, 
    height: 160, 
    borderRadius: 24, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEE'
  },
  vitrineImg: { width: '100%', height: '100%' },
  tabContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 24, 
    borderBottomWidth: 1,
    zIndex: 10
  },
  tabItem: { 
    paddingVertical: 16, 
    marginRight: 32,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabLabel: { fontSize: 15, fontWeight: '700' },
  tabContent: { padding: 24 },
  catSection: { marginBottom: 32 },
  catHeader: { fontSize: 18, fontWeight: '800', marginBottom: 20, letterSpacing: -0.3 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  svcCard: { 
    width: (width - 60) / 2, 
    borderRadius: 24, 
    overflow: 'hidden', 
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  svcImg: { width: '100%', height: 130 },
  svcInfo: { padding: 14 },
  svcName: { fontSize: 14, fontWeight: '700', marginBottom: 8, height: 36 },
  svcBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  svcPrice: { fontSize: 16, fontWeight: '800' },
  svcDuration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  svcDurationText: { fontSize: 11, color: '#999', fontWeight: '500' },
  selectionBadge: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF'
  },
  floatingFooter: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 24, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    flexDirection: 'row', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    ...Shadows.lg 
  },
  footerInfo: { flex: 1 },
  footerCount: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  footerPrice: { fontSize: 24, fontWeight: '900' },
  bookButton: { flex: 1.5, height: 56 },
  aboutContainer: { gap: 24 },
  aboutSection: { gap: 12 },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  description: { fontSize: 15, lineHeight: 24, fontWeight: '400' },
  hoursGrid: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hourDay: { fontSize: 14, fontWeight: '700' },
  hourValue: { fontSize: 14, fontWeight: '500' },
  locationBox: { borderRadius: 20, borderWidth: 1, padding: 20 },
  addressText: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cityTextLarge: { fontSize: 14, fontWeight: '500', marginBottom: 16 },
  mapAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapActionText: { fontSize: 14, fontWeight: '700' },
  reviewsContainer: { gap: 20 },
  reviewsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reviewCard: { padding: 20, borderRadius: 24, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reviewerImg: { width: '100%', height: '100%' },
  reviewerName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  reviewText: { fontSize: 14, lineHeight: 22 },
  reviewDate: { fontSize: 12, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
});
