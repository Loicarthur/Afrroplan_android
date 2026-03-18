/**
 * Page de réservation AfroPlan - Design Style shadcn / Lucide
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  AlertCircle, 
  RefreshCcw,
  Check,
  ChevronLeft,
  Info,
  ShieldCheck
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSalon } from '@/hooks/use-salons';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui';
import { PaymentMethod } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { salonService } from '@/services/salon.service';

import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera, User } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type TimeSlot = {
  start: string;
  end: string;
};

export default function BookingScreen() {
  const params = useLocalSearchParams<{
    id: string;
    serviceId: string;
    serviceName: string;
    servicePrice: string;
    serviceDuration: string;
    requiresExtensions: string;
    extensionsIncluded: string;
  }>();

  const { 
    id, 
    serviceName, 
    servicePrice, 
    serviceDuration,
    requiresExtensions,
    extensionsIncluded
  } = params;

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { salon: hookSalon, isLoading: loadingSalon } = useSalon(id || '');
  const [localSalon, setLocalSalon] = useState<any>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('deposit');
  const [selectedHairType, setSelectedHairType] = useState<string | null>(null);
  const [providesExtensions, setProvidesExtensions] = useState(false);
  const [extensionsQty, setExtensionsQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const HAIR_TYPES = ['3A', '3B', '3C', '4A', '4B', '4C'];
  const [specificAvailabilities, setSpecificAvailabilities] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Recherche du service détaillée (pour les mèches)
  const serviceDetail = localSalon?.services?.find((s: any) => 
    s.id === params.serviceId || 
    (params.serviceId?.includes(s.id)) ||
    s.name.toLowerCase() === serviceName?.toLowerCase()
  );

  const isRequiresExtensions = serviceDetail?.requires_extensions || serviceDetail?.allows_extensions || (requiresExtensions === 'true');
  const isExtensionsIncluded = serviceDetail?.extensions_included || (extensionsIncluded === 'true');

  useEffect(() => {
    if (hookSalon) {
      setLocalSalon(hookSalon);
    }
  }, [hookSalon]);

  // Initialisation intelligente du choix des mèches selon les règles de la coiffeuse
  useEffect(() => {
    if (serviceDetail) {
      if (serviceDetail.coiffeur_provides_extensions && !serviceDetail.client_can_bring_extensions) {
        setProvidesExtensions(true);
      } else {
        setProvidesExtensions(false);
      }
    }
  }, [serviceDetail]);

  const basePrice = parseFloat(servicePrice || '0');
  const duration = parseInt(serviceDuration || '60', 10);
  const unitExtensionPrice = serviceDetail?.extensions_price || 0;
  
  const totalPriceWithPossibleExtensions = providesExtensions 
    ? basePrice + (unitExtensionPrice * extensionsQty) 
    : basePrice;

  const fetchSpecificAvailabilities = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const dateStr = selectedDate.toLocaleDateString('en-CA');
      const freshSalonPromise = !localSalon ? salonService.getSalonById(id) : Promise.resolve(localSalon);
      const [freshSalon] = await Promise.all([freshSalonPromise]);

      if (freshSalon && !localSalon) {
        setLocalSalon(freshSalon);
      }

      const ownerId = freshSalon?.owner_id || localSalon?.owner_id;
      if (ownerId) {
        const { data } = await supabase
          .from('coiffeur_availability')
          .select('*')
          .eq('coiffeur_id', ownerId)
          .eq('specific_date', dateStr);
        
        setSpecificAvailabilities(data || []);
      }
    } catch (e) {
      console.error('Erreur chargement indisponibilités:', e);
    } finally {
      setRefreshing(false);
    }
  }, [selectedDate, id, localSalon]);

  useEffect(() => {
    fetchSpecificAvailabilities();
  }, [fetchSpecificAvailabilities]);

  const getPaymentDetails = () => {
    const depositAmount = Math.round(totalPriceWithPossibleExtensions * 0.20);
    switch (paymentMethod) {
      case 'full':
        return {
          amountNow: totalPriceWithPossibleExtensions,
          amountLater: 0,
          label: t('checkout.fullPayment'),
          description: t('checkout.payFull'),
        };
      case 'deposit':
      default:
        return {
          amountNow: depositAmount,
          amountLater: totalPriceWithPossibleExtensions - depositAmount,
          label: t('checkout.depositOnly'),
          description: t('checkout.depositInfo'),
        };
    }
  };

  const paymentDetails = getPaymentDetails();

  const getAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  const getAvailableSlots = (): TimeSlot[] => {
    const isDayBlocked = specificAvailabilities.some(
      a => !a.is_available && 
      (a.start_time <= '00:00' || a.start_time === '00:00:00') && 
      (a.end_time >= '23:59' || a.end_time === '23:59:00' || a.end_time >= '23:59:59')
    );
    if (isDayBlocked) return [];

    const slots: TimeSlot[] = [];
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const selectedDayName = days[selectedDate.getDay()];
    
    let openingHours = localSalon?.opening_hours;
    if (typeof openingHours === 'string') {
      try { openingHours = JSON.parse(openingHours); } catch (e) { openingHours = null; }
    }
    
    const schedule = openingHours ? (openingHours as any)[selectedDayName] : null;

    if (!schedule || schedule.active === false || schedule.active === 'false' || schedule.closed === true || schedule.closed === 'true') {
      return [];
    }

    const openTime = schedule.start || schedule.open;
    const closeTime = schedule.end || schedule.close;
    
    if (!openTime || !closeTime || (openTime === '00:00' && closeTime === '00:00')) {
      return [];
    }

    const [startH, startM] = openTime.split(':').map(Number);
    const [endH, endM] = closeTime.split(':').map(Number);

    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let hour = startH; hour <= endH; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === startH && minute < startM) continue;
        const slotEndMinutes = hour * 60 + minute + duration;
        const closingMinutes = endH * 60 + endM;
        if (slotEndMinutes > closingMinutes) continue;

        const startStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endHourCalc = Math.floor(slotEndMinutes / 60);
        const endMinCalc = slotEndMinutes % 60;
        const endStr = `${endHourCalc.toString().padStart(2, '0')}:${endMinCalc.toString().padStart(2, '0')}`;

        const isSlotBlocked = specificAvailabilities.some(
          a => !a.is_available && (
            (startStr >= a.start_time && startStr < a.end_time) ||
            (endStr > a.start_time && endStr <= a.end_time) ||
            (startStr <= a.start_time && endStr >= a.end_time)
          )
        );
        if (isSlotBlocked) continue;

        if (isToday) {
          const slotDate = new Date(now);
          slotDate.setHours(hour, minute, 0, 0);
          const limitDate = new Date(now);
          limitDate.setMinutes(now.getMinutes() + 30);
          if (slotDate < limitDate) continue;
        }

        slots.push({ start: startStr, end: endStr });
      }
    }
    return slots;
  };

  const timeSlots = getAvailableSlots();

  const formatDate = (date: Date) => {
    const days = language === 'fr' ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = language === 'fr' ? ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
    };
  };

  const handleConfirmBooking = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (!selectedSlot) {
      Alert.alert(t('common.error'), language === 'fr' ? 'Veuillez sélectionner un créneau horaire' : 'Please select a time slot');
      return;
    }

    setIsSubmitting(true);
    try {
      const todayStr = selectedDate.toLocaleDateString('en-CA');
      const startDateTime = `${selectedSlot.start}:00`;
      const endDateTime = `${selectedSlot.end}:00`;

      if (!params.serviceId) throw new Error('Informations du service manquantes');

      const firstServiceId = params.serviceId.includes(',') ? params.serviceId.split(',')[0] : params.serviceId;
      const bookingNotes = params.serviceId.includes(',') ? `Prestations sélectionnées: ${serviceName}` : null;

      const bookingPayload: any = {
        salon_id: id,
        service_id: firstServiceId,
        client_id: user.id,
        booking_date: todayStr,
        start_time: startDateTime,
        end_time: endDateTime,
        total_price: totalPriceWithPossibleExtensions,
        status: 'pending',
        payment_method: paymentMethod,
        service_location: 'salon',
        notes: bookingNotes,
        client_hair_type: selectedHairType,
        provides_extensions: providesExtensions, 
        extensions_quantity: providesExtensions ? extensionsQty : 0,
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select()
        .single();

      if (bookingError) throw bookingError;
      if (!booking) throw new Error('Erreur de création de réservation');

      router.push({
        pathname: '/checkout',
        params: {
          bookingId: booking.id,
          salonId: id,
          salonName: localSalon?.name || '',
          salonImage: localSalon?.image_url || '',
          serviceName: serviceName || '',
          servicePrice: (totalPriceWithPossibleExtensions * 100).toString(),
          duration: duration.toString(),
          paymentType: paymentMethod,
          date: todayStr,
          time: selectedSlot.start,
        }
      });
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('common.errorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingSalon) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#191919" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ 
        headerTitle: t('booking.title'),
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        )
      }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Résumé du Service */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{serviceName}</Text>
              <View style={styles.cardMetaRow}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.cardMetaText, { color: colors.textSecondary }]}>{duration} min</Text>
              </View>
            </View>
            <Text style={[styles.cardPrice, { color: '#191919' }]}>{basePrice}€</Text>
          </View>

          {isRequiresExtensions && (
            <View style={[styles.extensionBadge, { backgroundColor: isExtensionsIncluded ? '#F0FDF4' : '#FFFBEB' }]}>
              {isExtensionsIncluded ? (
                <Check size={14} color="#16A34A" />
              ) : (
                <Info size={14} color="#D97706" />
              )}
              <Text style={[styles.extensionBadgeText, { color: isExtensionsIncluded ? '#166534' : '#92400E' }]}>
                {isExtensionsIncluded ? t('service.extensionsNoteIncluded') : t('service.extensionsNoteNotIncluded')}
              </Text>
            </View>
          )}
        </View>

        {/* TYPE DE CHEVEUX (FACULTATIF) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Votre type de cheveux (Optionnel)</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary, marginBottom: 16 }]}>
            Si vous le connaissez, cela aide le professionnel à se préparer.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hairTypeGrid}>
            {HAIR_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.hairTypeBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedHairType === type && styles.hairTypeBtnSelected,
                ]}
                onPress={() => setSelectedHairType(selectedHairType === type ? null : type)}
                activeOpacity={0.8}
              >
                <Text style={[styles.hairTypeText, selectedHairType === type && styles.textWhite]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* MÈCHES (EXTENSIONS) */}
        {isRequiresExtensions && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mèches (Extensions)</Text>
            <View style={styles.extensionsContainer}>
              {serviceDetail?.client_can_bring_extensions && (
                <TouchableOpacity 
                  style={[
                    styles.extensionOption, 
                    { backgroundColor: colors.card, borderColor: colors.border },
                    !providesExtensions && styles.extensionOptionSelected
                  ]}
                  onPress={() => setProvidesExtensions(false)}
                >
                  <View style={[styles.radio, !providesExtensions && styles.radioActive]}>
                    {!providesExtensions && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.extensionTitle, { color: colors.text }]}>Je viens avec mes mèches</Text>
                    <Text style={styles.extensionSub}>Prix prestation seule : {basePrice}€</Text>
                  </View>
                </TouchableOpacity>
              )}

              {serviceDetail?.coiffeur_provides_extensions && (
                <TouchableOpacity 
                  style={[
                    styles.extensionOption, 
                    { backgroundColor: colors.card, borderColor: colors.border },
                    providesExtensions && styles.extensionOptionSelected
                  ]}
                  onPress={() => setProvidesExtensions(true)}
                >
                  <View style={[styles.radio, providesExtensions && styles.radioActive]}>
                    {providesExtensions && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.extensionTitle, { color: colors.text }]}>Fournies par le salon</Text>
                    <Text style={styles.extensionSub}>Supplément : +{unitExtensionPrice}€ / paquet</Text>
                  </View>
                </TouchableOpacity>
              )}

              {providesExtensions && serviceDetail?.coiffeur_provides_extensions && (
                <View style={styles.qtyContainer}>
                  <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Quantité de paquets :</Text>
                  <View style={styles.qtyPicker}>
                    <TouchableOpacity 
                      style={[styles.qtyBtn, { borderColor: colors.border }]} 
                      onPress={() => setExtensionsQty(Math.max(1, extensionsQty - 1))}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.qtyValue, { color: colors.text }]}>{extensionsQty}</Text>
                    <TouchableOpacity 
                      style={[styles.qtyBtn, { borderColor: colors.border }]} 
                      onPress={() => setExtensionsQty(extensionsQty + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Sélection Date */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Sélectionner une date' : 'Select a date'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesGrid}>
            {availableDates.map((date, index) => {
              const formatted = formatDate(date);
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateBtn,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isSelected && styles.dateBtnSelected,
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dateDay, isSelected && styles.textWhite]}>{formatted.day}</Text>
                  <Text style={[styles.dateNum, isSelected && styles.textWhite]}>{formatted.date}</Text>
                  <Text style={[styles.dateMonth, isSelected && styles.textWhite]}>{formatted.month}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Sélection Créneau */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Créneaux disponibles' : 'Available slots'}</Text>
            <TouchableOpacity onPress={fetchSpecificAvailabilities} disabled={refreshing}>
              <RefreshCcw size={18} color={refreshing ? colors.textMuted : colors.primary} />
            </TouchableOpacity>
          </View>
          
          {timeSlots.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AlertCircle size={32} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {language === 'fr' ? 'Aucun créneau disponible pour cette date' : 'No slots available for this date'}
              </Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {timeSlots.map((slot, index) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.slotBtn,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSelected && styles.slotBtnSelected,
                    ]}
                    onPress={() => setSelectedSlot(slot)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.slotText, isSelected && styles.textWhite]}>{slot.start}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Mode de paiement */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('checkout.paymentMethod')}</Text>
          
          <TouchableOpacity
            style={[
              styles.payOption,
              { backgroundColor: colors.card, borderColor: colors.border },
              paymentMethod === 'deposit' && styles.payOptionSelected,
            ]}
            onPress={() => setPaymentMethod('deposit')}
            activeOpacity={0.8}
          >
            <View style={styles.payOptionLeft}>
              <View style={[styles.radio, paymentMethod === 'deposit' && styles.radioActive]}>
                {paymentMethod === 'deposit' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.payOptionInfo}>
                <Text style={[styles.payOptionTitle, { color: colors.text }]}>{t('checkout.depositOnly')}</Text>
                <Text style={[styles.payOptionDesc, { color: colors.textSecondary }]}>
                  {language === 'fr' 
                    ? `Payez ${paymentDetails.amountNow}€ maintenant, le reste au salon` 
                    : `Pay ${paymentDetails.amountNow}€ now, the rest at the salon`}
                </Text>
              </View>
            </View>
            <View style={styles.payOptionBadge}>
              <Text style={styles.payOptionBadgeText}>20%</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.payOption,
              { backgroundColor: colors.card, borderColor: colors.border },
              paymentMethod === 'full' && styles.payOptionSelected,
            ]}
            onPress={() => setPaymentMethod('full')}
            activeOpacity={0.8}
          >
            <View style={styles.payOptionLeft}>
              <View style={[styles.radio, paymentMethod === 'full' && styles.radioActive]}>
                {paymentMethod === 'full' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.payOptionInfo}>
                <Text style={[styles.payOptionTitle, { color: colors.text }]}>{t('checkout.fullPayment')}</Text>
                <Text style={[styles.payOptionDesc, { color: colors.textSecondary }]}>{t('checkout.payFull')}</Text>
              </View>
            </View>
            <CreditCard size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Récapitulatif Final */}
        <View style={[styles.summaryBox, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{language === 'fr' ? 'Prix Prestation' : 'Service Price'}</Text>
            <Text style={[styles.summaryPrice, { color: colors.text }]}>{basePrice}€</Text>
          </View>
          {providesExtensions && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{language === 'fr' ? 'Supplément Mèches' : 'Extensions Price'}</Text>
              <Text style={[styles.summaryPrice, { color: colors.text }]}>+{extensionsPrice}€</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{language === 'fr' ? 'A payer maintenant' : 'Pay Now'}</Text>
            <Text style={[styles.summaryPriceBold, { color: '#191919' }]}>{paymentDetails.amountNow}€</Text>
          </View>
          
          <View style={styles.secureBadge}>
            <ShieldCheck size={14} color="#16A34A" />
            <Text style={styles.secureText}>{t('checkout.secure')}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer Bouton */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={isSubmitting ? '...' : `${t('common.confirm')} • ${paymentDetails.amountNow}€`}
          onPress={handleConfirmBooking}
          disabled={!selectedSlot || isSubmitting}
          loading={isSubmitting}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBack: { padding: 8, marginLeft: -8 },
  scrollContent: { padding: 20 },
  
  // Card Service
  card: { 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1.5,
    marginBottom: 32,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 }
    })
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { flex: 1, paddingRight: 12 },
  cardTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { fontSize: 14, fontWeight: '500' },
  cardPrice: { fontSize: 24, fontWeight: '900' },
  extensionBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, borderRadius: 12 },
  extensionBadgeText: { fontSize: 13, fontWeight: '600' },

  // Sections
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 16 },
  
  // Date Selection
  datesGrid: { gap: 12, paddingRight: 20 },
  dateBtn: { 
    width: 70, 
    height: 90, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 4
  },
  dateBtnSelected: { backgroundColor: '#191919', borderColor: '#191919' },
  dateDay: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', opacity: 0.6 },
  dateNum: { fontSize: 22, fontWeight: '800' },
  dateMonth: { fontSize: 12, fontWeight: '600' },
  textWhite: { color: '#FFF' },

  // Time Slots
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: { 
    width: (width - 70) / 4, 
    height: 48, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  slotBtnSelected: { backgroundColor: '#191919', borderColor: '#191919' },
  slotText: { fontSize: 15, fontWeight: '700' },
  emptyBox: { padding: 40, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', fontWeight: '500', lineHeight: 20 },

  // Payment Options
  payOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 18, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    marginBottom: 12 
  },
  payOptionSelected: { borderColor: '#191919', backgroundColor: '#F9F9F9' },
  payOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#191919' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#191919' },
  payOptionInfo: { flex: 1 },
  payOptionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  payOptionDesc: { fontSize: 13, fontWeight: '500' },
  payOptionBadge: { backgroundColor: '#191919', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  payOptionBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  // Summary
  summaryBox: { padding: 24, borderRadius: 24, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 15, fontWeight: '500' },
  summaryPrice: { fontSize: 16, fontWeight: '700' },
  summaryPriceBold: { fontSize: 24, fontWeight: '900' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  secureText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  // Footer
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 24, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24, 
    borderTopWidth: 1 
  },
  sectionSub: { fontSize: 13, lineHeight: 18 },
  attendeePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  attendeePhotoBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderStyle: 'dashed', position: 'relative' },
  attendeeImg: { width: '100%', height: '100%', borderRadius: 40 },
  attendeePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#191919', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  attendeeLabel: { fontSize: 14, fontWeight: '700' },

  // Hair Type Styles
  hairTypeGrid: { gap: 10, paddingRight: 20 },
  hairTypeBtn: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    borderWidth: 1.5, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  hairTypeBtnSelected: { backgroundColor: '#191919', borderColor: '#191919' },
  hairTypeText: { fontSize: 16, fontWeight: '800' },

  // Extensions Styles
  extensionsContainer: { gap: 12 },
  extensionOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1.5 
  },
  extensionOptionSelected: { borderColor: '#191919', backgroundColor: '#F9F9F9' },
  extensionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  extensionSub: { fontSize: 12, color: '#888', fontWeight: '500' },

  // Quantity Styles
  qtyContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  qtyLabel: { fontSize: 14, fontWeight: '700' },
  qtyPicker: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    borderWidth: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  qtyBtnText: { fontSize: 20, fontWeight: '600' },
  qtyValue: { fontSize: 18, fontWeight: '800', minWidth: 20, textAlign: 'center' },
});
