/**
 * Dashboard Coiffeur AfroPlan
 * Design modernisé shadcn / Lucide avec système de publication
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
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { 
  Bell, 
  TrendingUp, 
  ShieldCheck, 
  Scissors, 
  ImageIcon, 
  Wallet, 
  Star, 
  Store, 
  Rocket, 
  PlusCircle, 
  Users, 
  ChevronRight, 
  X, 
  Info,
  ArrowRight,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  Calendar,
  Clock,
  FileText
} from 'lucide-react-native';
import { Image } from 'expo-image';
import Animated, { FadeInUp, FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui';
import { salonService } from '@/services/salon.service';
import { bookingService } from '@/services/booking.service';
import { paymentService } from '@/services/payment.service';
import { supabase } from '@/lib/supabase';
import NotificationModal from '@/components/NotificationModal';
import FeedbackModal from '@/components/FeedbackModal';

import { HAIRSTYLE_CATEGORIES } from '@/constants/hairstyleCategories';

const { width, height } = Dimensions.get('window');

export default function CoiffeurDashboard() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, profile, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const [refreshing, setRefreshing] = useState(false);
  const [loadingSalon, setLoadingSalon] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [salon, setSalon] = useState<any>(null);
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [allTimeStats, setAllTimeStats] = useState<any>(null);
  const [revenueStats, setRevenueStats] = useState<any>({
    daily: 0,
    weekly: 0,
    monthly: 0,
    total: 0,
    dailyNet: 0,
    weeklyNet: 0,
    monthlyNet: 0,
    totalNet: 0,
  });
  
  // Modals & States
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [salonServices, setSalonServices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Formulaire RDV Manuel
  const [manualClientName, setManualClientName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualServiceId, setManualServiceId] = useState('');
  const [manualServiceName, setManualServiceName] = useState('');
  const [manualDuration, setManualDuration] = useState('60');
  const [manualDate, setManualDate] = useState(new Date().toLocaleDateString('fr-FR'));
  const [manualTime, setManualTime] = useState('14:00');
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // Calculer intelligemment le prochain créneau disponible
  const suggestNextSlot = (bookings: any[]) => {
    const now = new Date();
    let startTime = new Date();
    startTime.setMinutes(Math.ceil(startTime.getMinutes() / 15) * 15, 0, 0);

    if (bookings && bookings.length > 0) {
      const lastBooking = [...bookings]
        .filter(b => b.status !== 'cancelled')
        .sort((a, b) => b.end_time.localeCompare(a.end_time))[0];

      if (lastBooking) {
        const [hours, minutes] = lastBooking.end_time.split(':').map(Number);
        const lastEnd = new Date();
        lastEnd.setHours(hours, minutes, 0, 0);
        lastEnd.setMinutes(lastEnd.getMinutes() + 15);
        if (lastEnd > startTime) startTime = lastEnd;
      }
    }
    return `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
  };

  const handleStyleSelect = (styleName: string) => {
    setManualServiceName(styleName);
    
    // Vérifier si le coiffeur propose déjà ce service pour auto-remplir
    const existingService = salonServices.find(s => s.name.toLowerCase() === styleName.toLowerCase());
    if (existingService) {
      setManualServiceId(existingService.id);
      setManualPrice(existingService.price.toString());
      setManualDuration(existingService.duration_minutes.toString());
    } else {
      setManualServiceId('');
      setManualPrice('0');
      setManualDuration('60');
    }
    
    setManualTime(suggestNextSlot(todayBookings));
  };

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      const salonData = await salonService.getSalonByOwnerId(user.id, user.email);
      
      if (salonData) {
        setSalon(salonData);

        // Charger les services du salon pour le RDV Manuel
        salonService.getSalonServices(salonData.id).then(services => {
          setSalonServices(services || []);
        });
        
        setAllTimeStats(prev => prev || {
          totalRevenue: 0,
          weeklyRevenue: 0,
          weeklyBookingsCount: 0,
          averageRating: salonData.rating || 0,
        });

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        Promise.all([
          salonService.getSalonById(salonData.id).catch(() => null),
          bookingService.getSalonBookings(salonData.id, undefined, todayStr).catch(() => ({ data: [] })),
          salonService.getSalonStats(salonData.id).catch(() => null),
          paymentService.getDetailedRevenueStats(salonData.id).catch(() => null),
          // On récupère TOUTES les réservations confirmées/terminées pour l'historique complet
          supabase.from('bookings')
            .select('*, client:profiles!bookings_client_id_fkey(*), service:services(*)')
            .eq('salon_id', salonData.id)
            .in('status', ['confirmed', 'completed'])
            .order('booking_date', { ascending: false })
            .order('start_time', { ascending: false })
            .limit(1000)
        ]).then(([fullSalonRes, bookingsRes, statsRes, revenueRes, historyRes]) => {
          if (fullSalonRes) setSalon(fullSalonRes);
          if (bookingsRes) setTodayBookings(bookingsRes.data || []);
          if (statsRes) setAllTimeStats(statsRes);
          if (revenueRes) setRevenueStats(revenueRes);
          // @ts-ignore
          if (historyRes?.data) setTransactions(historyRes.data || []);
        });

      } else {
        setSalon(null);
      }
    } catch (error) {
      console.error('DASHBOARD ERROR:', error);
    } finally {
      setLoadingSalon(false);
      setRefreshing(false);
    }
  };

  const exportHistoryToPDF = async () => {
    if (transactions.length === 0) {
      Alert.alert('Info', 'Aucune transaction à exporter.');
      return;
    }

    setIsExporting(true);
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #191919; padding-bottom: 10px; }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .subtitle { font-size: 14px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #f5f5f5; text-align: left; padding: 12px; border-bottom: 1px solid #ddd; font-size: 12px; }
              td { padding: 12px; border-bottom: 1px solid #eee; font-size: 12px; }
              .total-row { background-color: #fafafa; font-weight: bold; }
              .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
              .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
              .badge-paid { background-color: #dcfce7; color: #16a34a; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Rapport de Gains AfroPlan</div>
              <div class="subtitle">Salon : ${salon?.name || 'Mon Salon'} | Date : ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>CLIENT</th>
                  <th>PRESTATION</th>
                  <th>MONTANT NET</th>
                  <th>STATUT</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(tx => `
                  <tr>
                    <td>${new Date(tx.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>${tx.client?.full_name || tx.manual_client_name || 'Client'}</td>
                    <td>${tx.service?.name || tx.notes?.replace('RDV Manuel: ', '') || 'Prestation'}</td>
                    <td>${(tx.total_price || 0).toFixed(2)} €</td>
                    <td><span class="badge badge-paid">PAYÉ</span></td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right;">TOTAL GÉNÉRAL</td>
                  <td colspan="2">${transactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0).toFixed(2)} €</td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
              Généré automatiquement par AfroPlan Pro - Le partenaire de votre réussite coiffure.
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({
        html: htmlContent,
      });
      
    } catch (error: any) {
      console.error('CRITICAL PDF Export error:', error);
      Alert.alert('Erreur', "Impossible de générer le PDF de comptabilité.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveManualBooking = async () => {
    if (!manualClientName.trim() || !manualServiceName.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom du client et choisir une prestation.');
      return;
    }

    setIsSavingBooking(true);
    try {
      // Parsing de date ultra-robuste
      let isoDate;
      const dateParts = manualDate.split(/[\/\-]/); // Gère les / et les -
      if (dateParts.length === 3) {
        // On s'assure d'avoir YYYY-MM-DD
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
        isoDate = `${year}-${month}-${day}`;
      } else {
        isoDate = new Date().toISOString().split('T')[0];
      }

      // Calcul de l'heure de fin basée sur la durée
      const [h, m] = manualTime.split(':').map(Number);
      const durationNum = parseInt(manualDuration) || 60;
      const endTimeDate = new Date();
      endTimeDate.setHours(h, m + durationNum, 0, 0);
      const endTimeStr = `${String(endTimeDate.getHours()).padStart(2, '0')}:${String(endTimeDate.getMinutes()).padStart(2, '0')}:00`;

      const { error } = await supabase.from('bookings').insert({
        salon_id: salon.id,
        service_id: manualServiceId || null,
        client_id: null, // Pas de compte client AfroPlan pour un RDV manuel
        manual_client_name: manualClientName.trim(), // On utilise la nouvelle colonne
        booking_date: isoDate,
        start_time: `${manualTime}:00`,
        end_time: endTimeStr,
        status: 'confirmed',
        payment_status: 'completed',
        notes: `RDV Manuel: ${manualServiceName}`,
        source: 'manual',
        total_price: parseFloat(manualPrice || '0'),
      });

      if (error) throw error;

      Alert.alert('Succès', 'Rendez-vous enregistré !');
      setBookingModalVisible(false);
      setManualClientName('');
      setManualServiceId('');
      setManualServiceName('');
      setManualPrice('');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Save manual booking error:', err);
      Alert.alert('Erreur', err.message || 'Impossible d\'enregistrer le rendez-vous.');
    } finally {
      setIsSavingBooking(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?.id) {
        fetchDashboardData();
      } else if (!isAuthenticated) {
        setLoadingSalon(false);
      }
    }, [isAuthenticated, user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLastMinuteBoost = () => {
    Alert.alert(
      'Boost de dernière minute 🚀',
      'Voulez-vous activer une promotion flash de -15% sur tous vos services pour les prochaines 4 heures ? Cela aidera à remplir vos créneaux vides.',
      [
        { text: 'Plus tard', style: 'cancel' },
        { 
          text: 'Activer le Boost', 
          onPress: async () => {
            Alert.alert('Boost activé !', 'Votre promotion est en ligne et vos clients favoris ont été notifiés.');
          }
        }
      ]
    );
  };

  const handleSwitchToClient = async () => {
    await AsyncStorage.setItem('@afroplan_selected_role', 'client');
    router.replace('/(tabs)');
  };

  const pendingBookingsCount = todayBookings.filter(b => b.status === 'pending').length;
  const activeTodayCount = todayBookings.filter(b => b.status !== 'cancelled').length;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerClientStyle}>
            <View style={styles.logoWrapperClientStyle}>
              <Image source={require('@/assets/images/logo_afroplan.png')} style={styles.logoImageClientStyle} contentFit="contain" />
            </View>
            <TouchableOpacity style={styles.loginButtonClientStyle} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginButtonTextClientStyle}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroSectionClientStyle}>
            <Image 
              source={require('@/assets/images/Photo_accueil_coiffeur.jpg')} 
              style={styles.heroImageClientStyle}
              contentFit="cover"
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroOverlayClientStyle}>
              <View style={styles.proBadgeClientStyle}>
                <Text style={styles.proBadgeTextClientStyle}>POUR LES PROFESSIONNELS</Text>
              </View>
              <Text style={styles.heroTitleClientStyle}>Vivez de votre{"\n"}passion coiffure.</Text>
            </View>
          </View>

          <View style={styles.searchSectionClientStyle}>
            <TouchableOpacity style={styles.mainActionContainerClientStyle} onPress={() => router.push('/(auth)/register')}>
              <View style={styles.actionIconContainerClientStyle}>
                <Rocket size={24} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextContainerClientStyle}>
                <Text style={styles.actionTitleClientStyle}>Prêt à digitaliser votre salon ?</Text>
                <Text style={styles.actionSubtitleClientStyle}>Ouvrez votre compte Pro gratuitement en 2 min</Text>
              </View>
              <ChevronRight size={20} color="#808080" />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionClientStyle}>
            <Text style={styles.sectionTitleClientStyle}>Pourquoi AfroPlan Pro ?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollClientStyle}>
              <View style={[styles.benefitCardClientStyle, Shadows.sm]}>
                <View style={[styles.benefitIconWrapperClientStyle, { backgroundColor: '#8B5CF620' }]}>
                  <TrendingUp size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.benefitTitleClientStyle}>Visibilité boostée</Text>
                <Text style={styles.benefitDescClientStyle}>Soyez vu par des milliers de clients locaux chaque jour.</Text>
              </View>

              <View style={[styles.benefitCardClientStyle, Shadows.sm]}>
                <View style={[styles.benefitIconWrapperClientStyle, { backgroundColor: '#22C55E20' }]}>
                  <ShieldCheck size={24} color="#22C55E" />
                </View>
                <Text style={styles.benefitTitleClientStyle}>Acomptes garantis</Text>
                <Text style={styles.benefitDescClientStyle}>Finis les rendez-vous non honorés. Encaissez des acomptes.</Text>
              </View>

              <View style={[styles.benefitCardClientStyle, Shadows.sm]}>
                <View style={[styles.benefitIconWrapperClientStyle, { backgroundColor: '#3B82F620' }]}>
                  <Calendar size={24} color="#3B82F6" />
                </View>
                <Text style={styles.benefitTitleClientStyle}>Gestion 24h/24</Text>
                <Text style={styles.benefitDescClientStyle}>Vos clients réservent même pendant que vous dormez.</Text>
              </View>
            </ScrollView>
          </View>

          <View style={styles.footerModern}>
            <View style={styles.footerDivider} />
            <Text style={[styles.footerHeadline, { color: colors.text }]}>Restons connectés</Text>
            <View style={styles.socialGridModern}>
              <TouchableOpacity 
                style={[styles.socialButtonModern, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => Linking.openURL('https://www.instagram.com/afro._plan')}
              >
                <Store size={20} color={colors.text} />
                <Text style={[styles.socialLabelModern, { color: colors.text }]}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButtonModern, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => Linking.openURL('https://www.linkedin.com/company/afro-plan')}
              >
                <Users size={20} color={colors.text} />
                <Text style={[styles.socialLabelModern, { color: colors.text }]}>LinkedIn</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.footerBrandFinal}>
              <Image source={require('@/assets/images/logo_afroplan.png')} style={styles.footerLogoTiny} contentFit="contain" />
              <Text style={styles.footerBrandTextFinal}>AFROPLAN PRO</Text>
            </View>
            <Text style={styles.footerFinalCopyright}>© 2024 TOUS DROITS RÉSERVÉS</Text>
          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loadingSalon && !salon) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#191919" />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Initialisation...</Text>
      </View>
    );
  }

  if (!salon) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <Store size={80} color="#191919" />
          <Text style={[styles.userName, { textAlign: 'center', marginTop: 20 }]}>Prêt à vous lancer ?</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>Configurez votre vitrine pour attirer des clients.</Text>
          <Button title="Créer mon salon" onPress={() => router.push('/(coiffeur)/salon')} style={{ marginTop: 30, width: '100%' }} />
          <TouchableOpacity onPress={handleSwitchToClient} style={{ marginTop: 20 }}>
            <Text style={{ color: '#191919', fontWeight: '600' }}>Passer en mode client</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const dashboardStats = {
    todayBookings: activeTodayCount,
    pendingBookings: pendingBookingsCount,
    monthlyRevenue: Math.max(revenueStats.monthly / 100, (allTimeStats?.monthlyRevenue || 0)),
    dailyRevenue: revenueStats.daily / 100,
    averageRating: allTimeStats?.averageRating || 0,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />}
      >
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Tableau de bord</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{salon?.name || profile?.full_name}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => setNotificationModalVisible(true)}
            >
              <Bell size={22} color="#191919" />
              {dashboardStats.pendingBookings > 0 && <View style={styles.badge} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Performance Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={[styles.businessCard, { backgroundColor: '#191919' }]}>
          <View style={styles.businessHeader}>
            <View>
              <Text style={styles.businessLabel}>Revenu du mois</Text>
              <Text style={styles.businessValue}>{dashboardStats.monthlyRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
                Aujourd'hui : +{dashboardStats.dailyRevenue.toFixed(2)} €
              </Text>
            </View>
            <View style={styles.growthBadge}>
              <TrendingUp size={14} color="#22C55E" />
              <Text style={styles.growthText}>Activité en hausse</Text>
            </View>
          </View>
          <View style={styles.footerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{allTimeStats?.weeklyBookingsCount || 0}</Text>
              <Text style={styles.statLabel}>RDV/sem</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{dashboardStats.todayBookings}</Text>
              <Text style={styles.statLabel}>Aujourd'hui</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{dashboardStats.averageRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Note</Text>
            </View>
          </View>
        </Animated.View>

        {/* Revenue Protection */}
        <Animated.View entering={FadeInDown.delay(300)} style={[styles.transparencyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.transparencyHeader}>
            <ShieldCheck size={20} color="#22C55E" />
            <Text style={[styles.transparencyTitle, { color: colors.text }]}>Revenus 100% protégés</Text>
            <TouchableOpacity onPress={() => setWalletModalVisible(true)}>
              <Text style={{ color: '#191919', fontSize: 12, fontWeight: '700' }}>Détails</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 28, marginTop: -8, lineHeight: 16 }}>
            Vous encaissez la totalité de vos prestations. En cas d'absence, l'acompte de 20% vous reste acquis.
          </Text>
        </Animated.View>

        {/* Management Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gestion de mon activité</Text>
          <View style={styles.managementGrid}>
            <TouchableOpacity style={[styles.mgmtItem, { backgroundColor: colors.card }]} onPress={() => router.push('/(coiffeur)/services' as any)}>
              <View style={[styles.mgmtIcon, { backgroundColor: '#F5F5F5' }]}><Scissors size={24} color="#191919" /></View>
              <Text style={[styles.mgmtText, { color: colors.text }]}>Services</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.mgmtItem, { backgroundColor: colors.card }]} onPress={() => router.push('/(coiffeur)/portfolio' as any)}>
              <View style={[styles.mgmtIcon, { backgroundColor: '#F5F5F5' }]}><ImageIcon size={24} color="#191919" /></View>
              <Text style={[styles.mgmtText, { color: colors.text }]}>Portfolio</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.mgmtItem, { backgroundColor: colors.card }]} onPress={() => setWalletModalVisible(true)}>
              <View style={[styles.mgmtIcon, { backgroundColor: '#F5F5F5' }]}><Wallet size={24} color="#191919" /></View>
              <Text style={[styles.mgmtText, { color: colors.text }]}>Portefeuille</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.mgmtItem, { backgroundColor: colors.card }]} onPress={() => router.push('/(salon)/reviews' as any)}>
              <View style={[styles.mgmtIcon, { backgroundColor: '#F5F5F5' }]}><Star size={24} color="#191919" /></View>
              <Text style={[styles.mgmtText, { color: colors.text }]}>Avis</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions Rapides</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.proActionButton, { backgroundColor: '#F9F9F9' }]} onPress={handleLastMinuteBoost}>
              <Rocket size={24} color="#191919" />
              <Text style={styles.proActionText}>Boost Flash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.proActionButton, { backgroundColor: '#F9F9F9' }]} onPress={() => setBookingModalVisible(true)}>
              <PlusCircle size={24} color="#191919" />
              <Text style={styles.proActionText}>RDV Manuel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mode Client */}
        <TouchableOpacity style={[styles.switchCard, { backgroundColor: '#F5F5F5' }]} onPress={handleSwitchToClient}>
          <Users size={24} color="#191919" />
          <View style={styles.switchContent}>
            <Text style={[styles.switchTitle, { color: colors.text }]}>Passer en mode client</Text>
            <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>Réservez une prestation pour vous</Text>
          </View>
          <ChevronRight size={20} color="#BBB" />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODALS */}
      <NotificationModal visible={notificationModalVisible} onClose={() => setNotificationModalVisible(false)} />
      <FeedbackModal visible={feedbackModalVisible} onClose={() => setFeedbackModalVisible(false)} />

      {/* ── RDV MANUEL MODAL ── */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau RDV Manuel</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Nom du client</Text>
                <TextInput 
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Ex: Marie Koné"
                  value={manualClientName}
                  onChangeText={setManualClientName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>1. Choisir une catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                  {HAIRSTYLE_CATEGORIES.map((cat) => (
                    <TouchableOpacity 
                      key={cat.id} 
                      style={[
                        styles.categoryMiniCard, 
                        { backgroundColor: selectedCategory?.id === cat.id ? '#191919' : colors.backgroundSecondary }
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setManualServiceName(''); // Reset style choice
                      }}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>{cat.emoji}</Text>
                      <Text style={[styles.categoryMiniText, { color: selectedCategory?.id === cat.id ? '#FFF' : colors.text }]}>
                        {cat.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {selectedCategory && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>2. Choisir le style ({selectedCategory.title})</Text>
                  <View style={styles.stylesGrid}>
                    {selectedCategory.styles.map((style: any) => (
                      <TouchableOpacity 
                        key={style.id} 
                        style={[
                          styles.styleOptionCard, 
                          { 
                            backgroundColor: manualServiceName === style.name ? '#191919' : colors.card,
                            borderColor: manualServiceName === style.name ? '#191919' : colors.border
                          }
                        ]}
                        onPress={() => handleStyleSelect(style.name)}
                      >
                        <Text style={[styles.styleOptionText, { color: manualServiceName === style.name ? '#FFF' : colors.text }]}>
                          {style.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Détails de la prestation</Text>
                <TextInput 
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Nom ou précision (ex: Longueur dos)"
                  value={manualServiceName}
                  onChangeText={setManualServiceName}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Prix (€)</Text>
                  <TextInput 
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="45"
                    keyboardType="numeric"
                    value={manualPrice}
                    onChangeText={setManualPrice}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Durée (min)</Text>
                  <TextInput 
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="60"
                    keyboardType="numeric"
                    value={manualDuration}
                    onChangeText={setManualDuration}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                  <TextInput 
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="DD/MM/YYYY"
                    value={manualDate}
                    onChangeText={setManualDate}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Heure (Suggérée)</Text>
                  <TextInput 
                    style={[styles.input, { color: colors.text, borderColor: colors.border, fontWeight: '800' }]}
                    placeholder="14:00"
                    value={manualTime}
                    onChangeText={setManualTime}
                  />
                </View>
              </View>

              <View style={styles.infoRow}>
                <Info size={16} color={colors.textMuted} />
                <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>
                  Le rendez-vous sera ajouté à votre planning d'aujourd'hui. Les RDV manuels sont considérés comme payés sur place.
                </Text>
              </View>

              <Button 
                title={isSavingBooking ? "Enregistrement..." : "Enregistrer le RDV"} 
                onPress={handleSaveManualBooking}
                loading={isSavingBooking}
                style={{ marginTop: 20 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── PORTEFEUILLE MODAL ── */}
      <Modal
        visible={walletModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWalletModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mon Portefeuille</Text>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.balanceBox, { backgroundColor: '#191919' }]}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceValue}>
                {(revenueStats.totalNet / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </Text>
              <TouchableOpacity 
                style={styles.payoutButton}
                onPress={() => Alert.alert('Virement', 'Demande de virement envoyée vers votre RIB.')}
              >
                <Text style={styles.payoutButtonText}>Demander un virement</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Info size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Les virements sont effectués sous 48h ouvrées vers votre compte Stripe Connect.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.historyAction, { borderColor: colors.border }]}
              onPress={() => {
                setWalletModalVisible(false);
                setHistoryModalVisible(true);
              }}
            >
              <CreditCard size={20} color={colors.text} />
              <Text style={[styles.historyActionText, { color: colors.text }]}>Historique des transactions</Text>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── HISTORIQUE MODAL ── */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, height: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Historique</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity onPress={exportHistoryToPDF} disabled={isExporting}>
                  <FileText size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.historySummary}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total CA</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{(revenueStats.total / 100).toFixed(2)}€</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net Coiffeur</Text>
                  <Text style={[styles.summaryValue, { color: '#22C55E' }]}>{(revenueStats.totalNet / 100).toFixed(2)}€</Text>
                </View>
              </View>

              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Détails par journée</Text>
              
              {transactions.length === 0 ? (
                <View style={styles.emptyTransactions}>
                  <CreditCard size={48} color="#EEE" />
                  <Text style={{ color: colors.textMuted, marginTop: 12 }}>Aucune transaction trouvée.</Text>
                </View>
              ) : (
                (() => {
                  // Groupement par date
                  const groups: Record<string, any[]> = {};
                  transactions.forEach(tx => {
                    const date = new Date(tx.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(tx);
                  });

                  return Object.entries(groups).map(([date, items]) => (
                    <View key={date} style={styles.dateGroup}>
                      <View style={[styles.dateHeader, { backgroundColor: colors.backgroundSecondary }]}>
                        <Text style={[styles.dateHeaderText, { color: colors.textSecondary }]}>{date}</Text>
                        <Text style={[styles.dateHeaderTotal, { color: colors.text }]}>
                          {(items.reduce((sum, i) => sum + (i.total_price || 0), 0)).toFixed(2)}€
                        </Text>
                      </View>
                      {items.map((tx, idx) => (
                        <View key={tx.id || idx} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
                          <View style={styles.txIcon}>
                            <ArrowRight size={16} color="#22C55E" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.txName, { color: colors.text }]}>
                              {tx.client?.full_name || tx.manual_client_name || 'Client'}
                            </Text>
                            <Text style={styles.txTime}>{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                          <Text style={[styles.txAmount, { color: colors.text }]}>+{(tx.total_price || 0).toFixed(2)}€</Text>
                        </View>
                      ))}
                    </View>
                  ));
                })()
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.floatingFeedback, Shadows.lg]} onPress={() => setFeedbackModalVisible(true)}>
        <MessageSquare size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dashboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { width: 48, height: 32, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  appLogo: { width: '85%', height: '85%' },
  headerDividerVertical: { width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.1)' },
  avatarWrapper: { position: 'relative' },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#FFF' },
  greeting: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  userName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 12 },
  headerIconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF' },
  
  businessCard: { margin: 20, padding: 24, borderRadius: 32 },
  businessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  businessLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 4 },
  businessValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  growthBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  growthText: { color: '#22C55E', fontSize: 11, fontWeight: '800' },
  footerStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, textTransform: 'uppercase', fontWeight: '700' },
  statDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  
  transparencyCard: { marginHorizontal: 20, marginBottom: 32, padding: 20, borderRadius: 24, borderWidth: 1 },
  transparencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  transparencyTitle: { fontSize: 15, fontWeight: '800' },
  
  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16, letterSpacing: -0.3 },
  managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mgmtItem: { width: (width - 52) / 2, padding: 20, borderRadius: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  mgmtIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mgmtText: { fontSize: 14, fontWeight: '700' },
  
  actionRow: { flexDirection: 'row', gap: 12 },
  proActionButton: { flex: 1, height: 100, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  proActionText: { fontSize: 13, fontWeight: '800' },
  
  switchCard: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24 },
  switchContent: { flex: 1, marginLeft: 16 },
  switchTitle: { fontSize: 16, fontWeight: '800' },
  switchSubtitle: { fontSize: 13, marginTop: 2 },

  floatingFeedback: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#191919', alignItems: 'center', justifyContent: 'center', zIndex: 999 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: height * 0.9 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalSectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 24, marginBottom: 16 },

  balanceBox: { padding: 24, borderRadius: 24, alignItems: 'center', gap: 8 },
  balanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  balanceValue: { color: '#FFF', fontSize: 36, fontWeight: '900' },
  payoutButton: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  payoutButtonText: { color: '#191919', fontWeight: '800', fontSize: 14 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, paddingHorizontal: 8 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },

  historyAction: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 1, marginTop: 24, gap: 12 },
  historyActionText: { flex: 1, fontSize: 14, fontWeight: '700' },

  historySummary: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, backgroundColor: '#F9F9F9', gap: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '900' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#DDD' },

  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  txName: { fontSize: 15, fontWeight: '700' },
  txDate: { fontSize: 12, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '800' },
  emptyTransactions: { alignItems: 'center', paddingVertical: 40, opacity: 0.5 },

  // Manual Booking Styles
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  categoryMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  categoryMiniText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  styleOptionCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  styleOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceMiniCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  serviceMiniText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Client landing style components (keep for reference if needed)
  headerClientStyle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoWrapperClientStyle: { width: 80, height: 40, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  logoImageClientStyle: { width: '85%', height: '85%' },
  loginButtonClientStyle: { backgroundColor: '#191919', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  loginButtonTextClientStyle: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  heroSectionClientStyle: { height: 260, marginHorizontal: 20, borderRadius: 32, overflow: 'hidden', marginTop: 10 },
  heroImageClientStyle: { width: '100%', height: '100%' },
  heroOverlayClientStyle: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, justifyContent: 'flex-end' },
  proBadgeClientStyle: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  proBadgeTextClientStyle: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitleClientStyle: { color: '#FFF', fontSize: 28, fontWeight: '900', lineHeight: 34 },
  searchSectionClientStyle: { paddingHorizontal: 20, marginTop: 24 },
  mainActionContainerClientStyle: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F0F0F0', ...Shadows.md },
  actionIconContainerClientStyle: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#191919', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionTextContainerClientStyle: { flex: 1 },
  actionTitleClientStyle: { fontSize: 15, fontWeight: '800' },
  actionSubtitleClientStyle: { fontSize: 12, color: '#888', marginTop: 2 },
  sectionClientStyle: { marginTop: 32, paddingHorizontal: 20 },
  sectionTitleClientStyle: { fontSize: 20, fontWeight: '900', marginBottom: 16 },
  horizontalScrollClientStyle: { paddingRight: 20, gap: 12 },
  benefitCardClientStyle: { width: 220, backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginRight: 4, borderWidth: 1, borderColor: '#F0F0F0' },
  benefitIconWrapperClientStyle: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  benefitTitleClientStyle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  benefitDescClientStyle: { fontSize: 12, color: '#666', lineHeight: 18 },
  footerModern: { marginTop: 40, paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  footerDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', width: '100%', marginBottom: 32 },
  footerHeadline: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  socialGridModern: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  socialButtonModern: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 10, minWidth: 140 },
  socialLabelModern: { fontSize: 14, fontWeight: '700' },
  footerBrandFinal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 },
  footerLogoTiny: { width: 48, height: 28, borderRadius: 14 },
  footerBrandTextFinal: { fontSize: 14, fontWeight: '900', letterSpacing: 1, color: '#191919' },
  footerFinalCopyright: { fontSize: 10, color: '#AAA', fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
});
