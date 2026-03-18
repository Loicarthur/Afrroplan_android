/**
 * Page des réservations - Espace Coiffeur AfroPlan
 * Version MVP : Gestion réactive, contact direct et agenda chronologique
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Timer,
  HelpCircle,
  Calendar,
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MessageSquare, 
  User, 
  ShieldCheck,
  ChevronRight,
  MoreVertical,
  Phone,
  Navigation,
  CheckCircle,
  Scissors
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui';
import { bookingService } from '@/services/booking.service';
import { salonService } from '@/services/salon.service';
import { messageService } from '@/services/message.service';
import { BookingWithDetails } from '@/types';

export default function CoiffeurReservationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'all'>('today');
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  
  // Modal d'annulation
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const formatDateFr = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const fetchBookings = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (!salon) {
        setLoading(false);
        return;
      }
      const response = await bookingService.getSalonBookings(salon.id, undefined, undefined, 1);
      // On demande jusqu'à 100 éléments si possible via une ruse de pagination ou simplement en acceptant le flux
      // Pour le dashboard, on va se contenter de trier et filtrer ce qu'on reçoit.
      
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        fetchBookings();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, isAuthLoading, fetchBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  const handleConfirm = async (booking: BookingWithDetails) => {
    const isPartial = booking.payment_method !== 'full' && booking.payment_status !== 'completed';
    const alertMsg = isPartial 
      ? "Voulez-vous valider cette réservation ?\n\n⚠️ Note : Le client n'a payé que l'acompte. N'oubliez pas de récupérer le reste du paiement sur place."
      : "Voulez-vous valider cette réservation ? Le client sera immédiatement notifié.";

    Alert.alert(
      "Confirmer le rendez-vous",
      alertMsg,
      [
        { text: "Annuler", style: 'cancel' },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              await bookingService.confirmBooking(booking.id);
              
              // Envoyer le message automatique d'acceptation
              if (booking.client_id) {
                const acceptMsg = "votre rendez vous a été bien accepté, pensez à arriver 10 min avant le debut de votre rendez vous si possible s'il vous plait. A tout à lheure!";
                await messageService.sendMessage(booking.id, user?.id || '', 'client', acceptMsg);
              }

              fetchBookings();
            } catch (error) {
              Alert.alert("Erreur", "Impossible de confirmer le RDV.");
            }
          },
        },
      ]
    );
  };

  const handleComplete = async (booking: BookingWithDetails) => {
    const isPartial = booking.payment_method !== 'full' && booking.payment_status !== 'completed';
    const alertMsg = isPartial
      ? "Confirmez-vous que la prestation est terminée ?\n\n⚠️ Rappel : Seul l'acompte a été payé via l'app. Assurez-vous d'avoir encaissé le reste auprès du client."
      : "Confirmez-vous que la prestation est terminée ? Cela finalisera la transaction.";

    Alert.alert(
      "Prestation terminée",
      alertMsg,
      [
        { text: "Annuler", style: 'cancel' },
        {
          text: "Terminer",
          onPress: async () => {
            try {
              await bookingService.completeBooking(booking.id);
              fetchBookings();
            } catch (error) {
              Alert.alert("Erreur", "Impossible de clôturer la prestation.");
            }
          },
        },
      ]
    );
  };

  const handleCallClient = (phone?: string) => {
    if (!phone) {
      Alert.alert("Erreur", "Le numéro de téléphone n'est pas disponible.");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleNoShow = async (bookingId: string) => {
    Alert.alert(
      'Signaler une absence',
      'Confirmez-vous que le client ne s\'est pas présenté ? L\'intégralité de son paiement en ligne vous sera reversé.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer l\'absence', 
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingService.reportNoShow(bookingId);
              fetchBookings();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de signaler l\'absence.');
            }
          }
        }
      ]
    );
  };

  const openCancelModal = (bookingId: string) => {
    setSelectedBookingForCancel(bookingId);
    setIsCancelModalVisible(true);
  };

  const handleCancelByCoiffeur = async () => {
    if (!selectedBookingForCancel || !cancelReason.trim()) {
      Alert.alert("Attention", "Veuillez indiquer un motif d'annulation.");
      return;
    }
    setIsSubmittingCancel(true);
    try {
      await bookingService.cancelBookingByCoiffeur(selectedBookingForCancel, cancelReason);
      setIsCancelModalVisible(false);
      setSelectedBookingForCancel(null);
      setCancelReason('');
      fetchBookings();
      Alert.alert("Succès", "Rendez-vous annulé.");
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'annuler.");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Helper pour comparer avec maintenant
    const isPast = (date: string, time: string) => {
      const bDateTime = new Date(`${date}T${time}`);
      return bDateTime < now;
    };

    let result = bookings;
    if (activeTab === 'today') {
      // Aujourd'hui : Seulement ce qui n'est pas encore passé
      result = bookings.filter(b => b.booking_date === todayStr && b.status !== 'cancelled' && !isPast(b.booking_date, b.start_time));
    } else if (activeTab === 'pending') {
      // En attente : Seulement les futurs RDV en attente
      result = bookings.filter(b => b.status === 'pending' && !isPast(b.booking_date, b.start_time));
    } else {
      // Historique : Tout ce qui est passé OU terminé OU annulé
      result = bookings.filter(b => isPast(b.booking_date, b.start_time) || b.status === 'completed' || b.status === 'cancelled');
    }

    // Tri chronologique
    return result.sort((a, b) => {
      const dateTimeA = new Date(`${a.booking_date}T${a.start_time}`).getTime();
      const dateTimeB = new Date(`${b.booking_date}T${b.start_time}`).getTime();
      return activeTab === 'today' ? dateTimeA - dateTimeB : dateTimeB - dateTimeA;
    });
  }, [bookings, activeTab]);

  const getStatusConfig = (status: string, date?: string, time?: string) => {
    const now = new Date();
    const isBookingPast = date && time ? new Date(`${date}T${time}`) < now : false;

    if (status === 'pending' && isBookingPast) {
      return { color: '#666', label: 'Expiré', icon: AlertCircle, bg: '#F3F4F6' };
    }

    switch (status) {
      case 'confirmed': return { color: '#16A34A', label: 'Confirmé', icon: CheckCircle2, bg: '#DCFCE7' };
      case 'pending': return { color: '#2563EB', label: 'En attente', icon: Timer, bg: '#DBEAFE' };
      case 'completed': return { color: '#666', label: 'Terminé', icon: CheckCircle, bg: '#F3F4F6' };
      case 'cancelled': return { color: '#EF4444', label: 'Annulé', icon: XCircle, bg: '#FEE2E2' };
      case 'no_show': return { color: '#EF4444', label: 'No-Show', icon: AlertCircle, bg: '#FEE2E2' };
      default: return { color: '#666', label: status, icon: HelpCircle, bg: '#F3F4F6' };
    }
  };

  if (isAuthLoading || (loading && !refreshing)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#191919" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Tab Bar Moderne */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {[
          { id: 'today', label: 'Aujourd\'hui' },
          { id: 'pending', label: 'En attente' },
          { id: 'all', label: 'Historique' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && { borderBottomColor: '#191919' }]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.id ? '#191919' : '#888' }]}>
              {tab.label}
            </Text>
            {tab.id === 'pending' && bookings.filter(b => b.status === 'pending').length > 0 && (
              <View style={styles.badge} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Calendar size={48} color="#CCC" strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun rendez-vous</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'today' ? "Rien de prévu pour le moment aujourd'hui." : "Votre liste est vide."}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => {
            const status = getStatusConfig(booking.status, booking.booking_date, booking.start_time);
            return (
              <View key={booking.id} style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Header du Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.dateInfo}>
                    <Text style={styles.dateText}>{formatDateFr(booking.booking_date)}</Text>
                    <View style={styles.timeRow}>
                      <Clock size={14} color="#191919" strokeWidth={2.5} />
                      <Text style={styles.timeText}>{booking.start_time.substring(0, 5)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <status.icon size={12} color={status.color} strokeWidth={2.5} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                {/* Info Client */}
                <View style={styles.clientSection}>
                  <View style={[styles.clientAvatar, { overflow: 'hidden', borderColor: booking.attendee_photo_url ? colors.primary : 'transparent', borderWidth: booking.attendee_photo_url ? 2 : 0 }]}>
                    {booking.attendee_photo_url ? (
                      <Image 
                        source={{ uri: booking.attendee_photo_url }} 
                        style={{ width: '100%', height: '100%' }} 
                        contentFit="cover" 
                      />
                    ) : booking.client?.avatar_url ? (
                      <Image 
                        source={{ uri: booking.client.avatar_url }} 
                        style={{ width: '100%', height: '100%' }} 
                        contentFit="cover" 
                      />
                    ) : (
                      <User size={20} color="#666" />
                    )}
                  </View>
                  <View style={styles.clientDetails}>
                    <Text style={[styles.clientName, { color: colors.text }]}>
                      {booking.client?.full_name || booking.manual_client_name || 'Client'}
                      {booking.attendee_photo_url && <Text style={{ fontSize: 10, color: colors.primary }}> (Photo jointe)</Text>}
                    </Text>
                    <Text style={styles.serviceName}>{booking.service?.name || 'Prestation'}</Text>
                    {booking.client_hair_type && (
                      <View style={[styles.hairTypeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                        <Scissors size={10} color={colors.textSecondary} />
                        <Text style={[styles.hairTypeBadgeText, { color: colors.textSecondary }]}>
                          Type {booking.client_hair_type}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.priceInfo}>
                    <Text style={styles.totalPrice}>{booking.total_price}€</Text>
                    <View style={[
                      styles.paymentBadge, 
                      { backgroundColor: (booking.payment_method === 'full' || booking.payment_status === 'completed') ? '#DCFCE7' : '#FEF9C3' }
                    ]}>
                      <Text style={[
                        styles.paymentBadgeText, 
                        { color: (booking.payment_method === 'full' || booking.payment_status === 'completed') ? '#16A34A' : '#A16207' }
                      ]}>
                        {(booking.payment_method === 'full' || booking.payment_status === 'completed') ? 'TOTAL PAYÉ' : 'ACOMPTE PAYÉ'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Interaction Bar (Call, Chat, GPS) */}
                {(booking.status === 'confirmed' || booking.status === 'pending') && (
                  <View style={styles.interactionRow}>
                    <TouchableOpacity 
                      style={[styles.interactionBtn, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => handleCallClient(booking.client?.phone)}
                    >
                      <Phone size={18} color="#191919" />
                      <Text style={styles.interactionBtnText}>Appeler</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.interactionBtn, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => router.push({ pathname: '/chat/[bookingId]', params: { bookingId: booking.id } })}
                    >
                      <MessageSquare size={18} color="#191919" />
                      <Text style={styles.interactionBtnText}>Chat</Text>
                    </TouchableOpacity>

                    {booking.service_location === 'domicile' && (
                       <TouchableOpacity 
                        style={[styles.interactionBtn, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => Linking.openURL(`maps://0,0?q=${booking.client?.address || ''}`)}
                       >
                         <Navigation size={18} color="#191919" />
                         <Text style={styles.interactionBtnText}>GPS</Text>
                       </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Main Actions */}
                <View style={styles.cardActions}>
                  {booking.status === 'pending' && (
                    <TouchableOpacity 
                      style={[styles.mainActionBtn, { backgroundColor: '#191919' }]} 
                      onPress={() => handleConfirm(booking)}
                    >
                      <CheckCircle2 size={18} color="#FFF" />
                      <Text style={styles.mainActionText}>Confirmer le RDV</Text>
                    </TouchableOpacity>
                  )}

                  {booking.status === 'confirmed' && (
                    <TouchableOpacity 
                      style={[styles.mainActionBtn, { backgroundColor: '#16A34A' }]} 
                      onPress={() => handleComplete(booking)}
                    >
                      <CheckCircle size={18} color="#FFF" />
                      <Text style={styles.mainActionText}>Terminer la prestation</Text>
                    </TouchableOpacity>
                  )}
                  
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <TouchableOpacity 
                      style={styles.moreBtn}
                      onPress={() => {
                        Alert.alert(
                          "Actions secondaires",
                          "Choisissez une option :",
                          [
                            { text: "Signaler No-Show", onPress: () => handleNoShow(booking.id) },
                            { text: "Annuler le RDV", style: 'destructive', onPress: () => openCancelModal(booking.id) },
                            { text: "Fermer", style: 'cancel' }
                          ]
                        );
                      }}
                    >
                      <MoreVertical size={22} color="#888" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Annulation */}
      <Modal visible={isCancelModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Motif d'annulation</Text>
              <TouchableOpacity onPress={() => setIsCancelModalVisible(false)}>
                <XCircle size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Expliquez brièvement pourquoi vous annulez..."
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            
            <Button 
              title="Confirmer l'annulation" 
              onPress={handleCancelByCoiffeur} 
              loading={isSubmittingCancel} 
              style={{ backgroundColor: '#EF4444' }} 
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
  tab: { 
    paddingVertical: 16, 
    marginRight: 24, 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center'
  },
  tabText: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  badge: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginLeft: 4, marginTop: -8 },
  
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  bookingCard: { 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 3 }
    })
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  dateInfo: { flex: 1 },
  dateText: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  timeText: { fontSize: 20, fontWeight: '900', color: '#191919', letterSpacing: -0.5 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  
  clientSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  clientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  clientDetails: { flex: 1, marginLeft: 12 },
  clientName: { fontSize: 16, fontWeight: '800' },
  serviceName: { fontSize: 14, color: '#666', marginTop: 2 },
  
  hairTypeBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginTop: 6,
    alignSelf: 'flex-start'
  },
  hairTypeBadgeText: { fontSize: 10, fontWeight: '800' },

  priceInfo: { alignItems: 'flex-end' },
  totalPrice: { fontSize: 18, fontWeight: '900', color: '#191919' },
  paymentBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  paymentBadgeText: { fontSize: 9, fontWeight: '900' },

  interactionRow: { flexDirection: 'row', gap: 8, marginBottom: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  interactionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12 },
  interactionBtnText: { fontSize: 12, fontWeight: '800', color: '#191919' },
  
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mainActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 16 },
  mainActionText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  moreBtn: { width: 44, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F9F9F9' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F9F9F9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', opacity: 0.6, paddingHorizontal: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  reasonInput: { borderWidth: 1, borderRadius: 16, padding: 16, height: 120, textAlignVertical: 'top', marginBottom: 24, fontSize: 15 },
});
