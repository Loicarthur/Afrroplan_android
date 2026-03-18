/**
 * Page de Checkout AfroPlan - Design Style shadcn / Lucide
 * Style type Apple Pay / Stripe pour une confiance maximale
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { 
  ShieldCheck, 
  ChevronLeft, 
  Calendar, 
  Clock, 
  CreditCard, 
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Shadows, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { DEPOSIT_RATE, paymentService } from '@/services/payment.service';
import { salonService } from '@/services/salon.service';
import { messageService } from '@/services/message.service';
import { Button } from '@/components/ui';

interface BookingDetails {
  salonName: string;
  salonImage: string;
  serviceName: string;
  servicePrice: number;
  salonId: string;
  bookingId: string;
  date: string;
  time: string;
  duration: number;
}

export default function CheckoutScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const params = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [isLoading, setIsLoading] = useState(false);
  const paymentType = (params.paymentType as 'deposit' | 'full') || 'deposit';

  const bookingDetails: BookingDetails = {
    salonName: params.salonName as string || 'Salon',
    salonImage: params.salonImage as string || 'https://via.placeholder.com/400',
    serviceName: params.serviceName as string || 'Service',
    servicePrice: parseInt(params.servicePrice as string) || 0,
    salonId: params.salonId as string || '',
    bookingId: params.bookingId as string || '',
    date: params.date as string || '',
    time: params.time as string || '',
    duration: parseInt(params.duration as string) || 60,
  };

  const depositAmount = Math.round(bookingDetails.servicePrice * DEPOSIT_RATE);
  const isFullPayment = paymentType === 'full';
  const payAmount = isFullPayment ? bookingDetails.servicePrice : depositAmount;
  const remainingAmount = isFullPayment ? 0 : bookingDetails.servicePrice - depositAmount;

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', options);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}`;
  };

  const handlePayment = async () => {
    if (!isAuthenticated) {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      if (!bookingDetails.bookingId || bookingDetails.bookingId === 'undefined') {
        throw new Error(t('checkout.idMissing'));
      }

      const response = await paymentService.createPaymentIntent(
        bookingDetails.bookingId,
        bookingDetails.servicePrice,
        bookingDetails.salonId,
        paymentType
      );
      
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: response.clientSecret,
        merchantDisplayName: 'AfroPlan',
        applePay: { merchantCountryCode: 'FR' },
        googlePay: { merchantCountryCode: 'FR', testEnv: true },
        appearance: {
          colors: {
            primary: '#191919',
            background: colors.background,
            componentBackground: colors.card,
            componentBorder: colors.border,
            componentDivider: colors.border,
            primaryText: colors.text,
            secondaryText: colors.textSecondary,
            componentText: colors.text,
            placeholderText: colors.textMuted,
          },
          shapes: { borderRadius: 12 },
        },
      });

      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          setIsLoading(false);
          return;
        }
        throw new Error(presentError.message);
      }

      try {
        const salon = await salonService.getSalonById(bookingDetails.salonId);
        if (salon && salon.owner_id) {
          const welcomeMsg = language === 'fr' 
            ? "Bonjour! Merci pour votre réservation, elle est en cours de confirmation."
            : "Hello! Thank you for your booking, it is currently being confirmed.";
          
          await messageService.sendMessage(bookingDetails.bookingId, salon.owner_id, 'coiffeur', welcomeMsg);
        }
      } catch (e) {}

      Alert.alert(
        t('checkout.paymentSuccess'),
        t('checkout.paymentSuccessDesc'),
        [{ text: t('checkout.viewBooking'), onPress: () => router.replace('/(tabs)/reservations') }]
      );
    } catch (error: any) {
      Alert.alert(t('checkout.paymentError'), error.message || t('checkout.paymentErrorDesc'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ 
        headerTitle: t('checkout.title'),
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.headerRight}>
            <ShieldCheck size={18} color="#16A34A" strokeWidth={2.5} />
          </View>
        )
      }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Salon Card */}
        <View style={[styles.salonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image 
            source={{ uri: bookingDetails.salonImage }} 
            style={styles.salonImg} 
            contentFit="cover" 
          />
          <View style={styles.salonInfo}>
            <Text style={[styles.salonName, { color: colors.text }]}>{bookingDetails.salonName}</Text>
            <View style={styles.serviceRow}>
              <CheckCircle2 size={14} color="#191919" strokeWidth={2.5} />
              <Text style={[styles.serviceName, { color: colors.textSecondary }]}>{bookingDetails.serviceName}</Text>
            </View>
          </View>
        </View>

        {/* Date & Time Recap */}
        <View style={styles.recapGrid}>
          <View style={[styles.recapItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Calendar size={18} color="#191919" />
            <View>
              <Text style={[styles.recapLabel, { color: colors.textMuted }]}>{language === 'fr' ? 'Date' : 'Date'}</Text>
              <Text style={[styles.recapValue, { color: colors.text }]}>{formatDate(bookingDetails.date)}</Text>
            </View>
          </View>
          <View style={[styles.recapItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Clock size={18} color="#191919" />
            <View>
              <Text style={[styles.recapLabel, { color: colors.textMuted }]}>{language === 'fr' ? 'Heure' : 'Time'}</Text>
              <Text style={[styles.recapValue, { color: colors.text }]}>{bookingDetails.time} • {formatDuration(bookingDetails.duration)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('checkout.priceDetail')}</Text>
          <View style={[styles.priceBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{t('checkout.servicePrice')}</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>{formatAmount(bookingDetails.servicePrice)}</Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.priceRowHighlight}>
              <View>
                <Text style={[styles.payNowLabel, { color: '#191919' }]}>
                  {isFullPayment ? t('checkout.fullPayment') : t('checkout.payDeposit')}
                </Text>
                {!isFullPayment && <Text style={styles.payNowSub}>{language === 'fr' ? 'Acompte de 20%' : '20% Deposit'}</Text>}
              </View>
              <Text style={[styles.payNowValue, { color: '#191919' }]}>{formatAmount(payAmount)}</Text>
            </View>

            {!isFullPayment && (
              <View style={styles.priceRowRemaining}>
                <Text style={[styles.remainingLabel, { color: colors.textMuted }]}>{t('checkout.remainingAtSalon')}</Text>
                <Text style={[styles.remainingValue, { color: colors.textMuted }]}>{formatAmount(remainingAmount)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Security Notice */}
        <View style={[styles.securityNotice, { backgroundColor: '#F0FDF4' }]}>
          <Lock size={16} color="#16A34A" strokeWidth={2.5} />
          <Text style={styles.securityText}>
            {language === 'fr' 
              ? 'Paiement 100% sécurisé via Stripe. Vos informations bancaires sont cryptées.' 
              : '100% secure payment via Stripe. Your bank details are encrypted.'}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer Bouton */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.footerTotalRow}>
          <View>
            <Text style={[styles.footerTotalLabel, { color: colors.textMuted }]}>{language === 'fr' ? 'Total à payer' : 'Total to pay'}</Text>
            <Text style={[styles.footerTotalValue, { color: colors.text }]}>{formatAmount(payAmount)}</Text>
          </View>
          <Button 
            title={isLoading ? '...' : t('checkout.confirm')} 
            onPress={handlePayment} 
            loading={isLoading}
            style={styles.payButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBack: { padding: 8, marginLeft: -8 },
  headerRight: { paddingRight: 8 },
  scrollContent: { padding: 20 },

  // Salon Card
  salonCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 24, 
    borderWidth: 1.5,
    marginBottom: 20,
  },
  salonImg: { width: 64, height: 64, borderRadius: 16 },
  salonInfo: { flex: 1, marginLeft: 16 },
  salonName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceName: { fontSize: 14, fontWeight: '600' },

  // Recap Grid
  recapGrid: { gap: 12, marginBottom: 32 },
  recapItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1.5,
    gap: 16
  },
  recapLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  recapValue: { fontSize: 15, fontWeight: '700' },

  // Price Section
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 16 },
  priceBox: { padding: 20, borderRadius: 24, borderWidth: 1.5 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 15, fontWeight: '500' },
  priceValue: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, marginVertical: 16, opacity: 0.5 },
  priceRowHighlight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payNowLabel: { fontSize: 16, fontWeight: '800' },
  payNowSub: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
  payNowValue: { fontSize: 22, fontWeight: '900' },
  priceRowRemaining: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  remainingLabel: { fontSize: 13, fontWeight: '500' },
  remainingValue: { fontSize: 13, fontWeight: '600' },

  // Security
  securityNotice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    gap: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7'
  },
  securityText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#166534', lineHeight: 18 },

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
  footerTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  footerTotalLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  footerTotalValue: { fontSize: 24, fontWeight: '900' },
  payButton: { flex: 1, height: 56 },
});
