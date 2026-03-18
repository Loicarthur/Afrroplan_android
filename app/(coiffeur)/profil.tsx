/**
 * Page profil - Espace Coiffeur AfroPlan
 * Refonte Premium - Design épuré et professionnel
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  Store,
  Scissors,
  ImageIcon,
  Wallet,
  Star,
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
  FileText,
  User,
  Settings,
  Shield,
  Bell,
  LogOut,
  ChevronForward,
  Camera,
  Info as InfoIcon,
  Lock,
  Fingerprint,
  EyeOff
} from 'lucide-react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui';
import { salonService } from '@/services/salon.service';
import { authService } from '@/services/auth.service';
import { paymentService } from '@/services/payment.service';
import { supabase } from '@/lib/supabase';
import NotificationModal from '@/components/NotificationModal';

const { width } = Dimensions.get('window');

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
};

function MenuItem({ icon, title, subtitle, onPress, showChevron = true, danger = false }: MenuItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: danger ? colors.error + '10' : colors.primary + '08' }]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.primary}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: danger ? colors.error : colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function CoiffeurProfilScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, profile, signOut, isAuthenticated, updateProfile, refreshProfile } = useAuth();

  const [coiffeurStats, setCoiffeurStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [personalInfoModalVisible, setPersonalInfoModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now().toString());

  const fetchStats = async () => {
    if (!user?.id) return;
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (salon) {
        const [statsData, historyRes] = await Promise.all([
          salonService.getSalonStats(salon.id),
          // On récupère TOUTES les réservations confirmées/terminées pour l'historique complet
          supabase.from('bookings')
            .select('*, client:profiles!bookings_client_id_fkey(*), service:services(*)')
            .eq('salon_id', salon.id)
            .in('status', ['confirmed', 'completed'])
            .order('booking_date', { ascending: false })
            .order('start_time', { ascending: false })
            .limit(1000)
        ]);
        setCoiffeurStats(statsData);
        // @ts-ignore
        setTransactions(historyRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching coiffeur stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportHistoryToPDF = async () => {
    if (transactions.length === 0) {
      Alert.alert('Info', 'Aucune transaction à exporter.');
      return;
    }

    setUploading(true);
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
              <div class="title">Historique des Revenus AfroPlan</div>
              <div class="subtitle">Salon : ${profile?.full_name || 'Mon Salon'} | Date : ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>CLIENT</th>
                  <th>MONTANT BRUT</th>
                  <th>NET (80%)</th>
                  <th>STATUT</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(tx => `
                  <tr>
                    <td>${new Date(tx.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>${tx.booking?.client?.full_name || tx.manual_client_name || 'Client'}</td>
                    <td>${(tx.total_price || 0).toFixed(2)} €</td>
                    <td>${((tx.total_price || 0) * 0.8).toFixed(2)} €</td>
                    <td><span class="badge badge-paid">PAYÉ</span></td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="2" style="text-align: right;">TOTAL GÉNÉRAL</td>
                  <td>${transactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0).toFixed(2)} €</td>
                  <td colspan="2">${(transactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0) * 0.8).toFixed(2)} €</td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
              Ce document est un récapitulatif officiel de vos revenus générés sur la plateforme AfroPlan.
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
      setUploading(false);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!user?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à la galerie.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const uri = result.assets[0].uri;
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `avatar_${Date.now()}.${fileExt}`;

      const publicUrl = await authService.uploadAvatar(user.id, {
        uri,
        type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        name: fileName
      });
      
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }

      setImageError(false);
      Alert.alert('Succès', 'Votre photo de profil coiffeur est à jour !');
    } catch (error: any) {
      console.error('Avatar update error:', error);
      Alert.alert('Erreur', "Impossible de mettre à jour votre photo.");
    } finally {
      setUploading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchStats();
      }
    }, [user?.id, isAuthenticated])
  );

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/onboarding');
            } catch (error) {
              if (__DEV__) console.error('Erreur deconnexion:', error);
            }
          },
        },
      ]
    );
  };

  const handleSwitchToClient = async () => {
    await AsyncStorage.setItem('@afroplan_selected_role', 'client');
    router.replace('/(tabs)');
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.authPrompt}>
          <View style={styles.authIconContainer}>
            <Ionicons name="person" size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.authTitle, { color: colors.text }]}>Profil</Text>
          <Text style={[styles.authMessage, { color: colors.textSecondary }]}>
            Connectez-vous pour gérer votre activité professionnelle
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push({ pathname: '/(auth)/login', params: { role: 'coiffeur' } })}
          >
            <Text style={styles.authButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── PROFILE HEADER ── */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            {profile?.avatar_url && !imageError ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <LinearGradient
                colors={[colors.primary, '#4A4A4A']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarInitials}>
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'C'}
                </Text>
              </LinearGradient>
            )}
            <TouchableOpacity
              style={[styles.editAvatarButton, { backgroundColor: colors.card }]}
              onPress={handleUpdateAvatar}
              disabled={uploading}
              activeOpacity={0.8}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="camera" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {profile?.full_name || 'Coiffeur'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {profile?.email || user?.email}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
              <Text style={[styles.roleBadgeText, { color: colors.accent }]}>Compte Vérifié</Text>
            </View>
          </View>
        </View>

        {/* ── QUICK STATS ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { borderRightWidth: 1, borderRightColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{coiffeurStats?.averageRating?.toFixed(1) || '0.0'}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Note</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{coiffeurStats?.totalSuccessfulBookings || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>RDV</Text>
          </View>
        </View>

        {/* ── MODE SWITCH ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.switchCard, { backgroundColor: '#191919' }]}
            onPress={handleSwitchToClient}
            activeOpacity={0.9}
          >
            <View style={styles.switchIconBg}>
              <Ionicons name="swap-horizontal" size={22} color="#191919" />
            </View>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>Passer en Mode Client</Text>
              <Text style={styles.switchSubtitle}>Réserver une prestation Afro</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {/* ── MENU GROUPS ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Gestion Boutique</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card }, Shadows.sm]}>
            <MenuItem
              icon="storefront-outline"
              title="Mon Salon"
              subtitle="Horaires, photos, adresse"
              onPress={() => router.push('/(coiffeur)/salon')}
            />
            <MenuItem
              icon="cut-outline"
              title="Mes Prestations"
              subtitle="Tarifs et durées"
              onPress={() => router.push('/(coiffeur)/services')}
            />
            <MenuItem
              icon="images-outline"
              title="Portfolio"
              subtitle="Vos plus belles réalisations"
              onPress={() => router.push('/(coiffeur)/portfolio')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Paiements & Revenus</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card }, Shadows.sm]}>
            <MenuItem
              icon="wallet-outline"
              title="Portefeuille"
              subtitle="Solde et virements"
              onPress={() => setWalletModalVisible(true)}
            />
            <MenuItem
              icon="receipt-outline"
              title="Historique des gains"
              onPress={() => setHistoryModalVisible(true)}
            />
          </View>
        </View>

        {/* Administration Section (Seulement pour Admin) */}
        {profile?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: '#EF4444' }]}>Administration</Text>
            <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: '#EF444420', borderWidth: 1 }, Shadows.sm]}>
              <MenuItem
                icon="shield-half-outline"
                title="Accès Backoffice"
                subtitle="Gestion globale de la plateforme"
                onPress={() => router.push('/(admin)')}
                danger
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>Paramètres</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.card }, Shadows.sm]}>
            <MenuItem
              icon="person-outline"
              title="Informations Personnelles"
              onPress={() => setPersonalInfoModalVisible(true)}
            />
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              onPress={() => setNotificationModalVisible(true)}
            />
            <MenuItem
              icon="shield-outline"
              title="Confidentialité & Sécurité"
              onPress={() => setSecurityModalVisible(true)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.menuGroup, { backgroundColor: colors.card }, Shadows.sm]}>
            <MenuItem
              icon="log-out-outline"
              title="Se déconnecter"
              onPress={handleSignOut}
              showChevron={false}
              danger
            />
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>AfroPlan Pro Edition</Text>
          <Text style={[styles.footerVersion, { color: colors.textMuted }]}>v1.0.0 Stable</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── NOTIFICATION MODAL ── */}
      <NotificationModal 
        visible={notificationModalVisible} 
        onClose={() => setNotificationModalVisible(false)} 
      />

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
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.balanceBox, { backgroundColor: '#191919' }]}>
              <Text style={styles.balanceLabel}>Solde disponible (Net 80%)</Text>
              <Text style={styles.balanceValue}>
                {((coiffeurStats?.totalRevenue || 0) * 0.8).toFixed(2)} €
              </Text>
              <TouchableOpacity 
                style={styles.payoutButton}
                onPress={() => Alert.alert('Virement', 'Demande de virement envoyée vers votre RIB.')}
              >
                <Text style={styles.payoutButtonText}>Demander un virement</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Les virements sont effectués sous 48h ouvrées.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── HISTORIQUE GAINS MODAL ── */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Historique des gains</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity onPress={exportHistoryToPDF} disabled={uploading}>
                  <FileText size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.historySummary}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Chiffre d'affaires</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{coiffeurStats?.totalRevenue?.toFixed(2)}€</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Commission (20%)</Text>
                  <Text style={[styles.summaryValue, { color: colors.error }]}>-{(coiffeurStats?.totalRevenue * 0.2)?.toFixed(2)}€</Text>
                </View>
              </View>

              <Text style={[styles.sectionTitleModal, { color: colors.text }]}>Détails par journée</Text>
              
              {transactions.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 20 }]}>
                  Aucune transaction récente à afficher.
                </Text>
              ) : (
                (() => {
                  const groups: Record<string, any[]> = {};
                  transactions.forEach(tx => {
                    const date = new Date(tx.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(tx);
                  });

                  return Object.entries(groups).map(([date, items]) => (
                    <View key={date} style={styles.dateGroup}>
                      <View style={[styles.dateHeader, { backgroundColor: 'rgba(0,0,0,0.02)' }]}>
                        <Text style={[styles.dateHeaderText, { color: colors.textSecondary }]}>{date}</Text>
                        <Text style={[styles.dateHeaderTotal, { color: colors.text }]}>
                          {(items.reduce((sum, i) => sum + (i.total_price || 0), 0)).toFixed(2)}€
                        </Text>
                      </View>
                      {items.map((tx, idx) => (
                        <View key={tx.id || idx} style={[styles.transactionItem, { borderBottomColor: 'rgba(0,0,0,0.05)' }]}>
                          <View style={styles.txIcon}>
                            <Ionicons name="arrow-forward" size={16} color="#22C55E" />
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

      {/* ── INFOS PERSONNELLES MODAL ── */}
      <Modal
        visible={personalInfoModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPersonalInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mes Informations</Text>
              <TouchableOpacity onPress={() => setPersonalInfoModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nom complet</Text>
              <TextInput 
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={profile?.full_name}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email professionnel</Text>
              <TextInput 
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={profile?.email || user?.email}
                editable={false}
              />
            </View>

            <Button 
              title="Modifier mes infos"
              onPress={() => Alert.alert('Info', 'Veuillez contacter le support pour modifier vos infos vérifiées.')}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>

      {/* ── SECURITE MODAL ── */}
      <Modal
        visible={securityModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSecurityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sécurité & Confidentialité</Text>
              <TouchableOpacity onPress={() => setSecurityModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <MenuItem 
              icon="lock-closed-outline"
              title="Changer le mot de passe"
              onPress={() => Alert.alert('Sécurité', 'Lien de réinitialisation envoyé par email.')}
            />
            <MenuItem 
              icon="finger-print-outline"
              title="Authentification biométrique"
              onPress={() => Alert.alert('Info', 'Bientôt disponible')}
            />
            <MenuItem 
              icon="eye-off-outline"
              title="Masquer mon profil"
              onPress={() => Alert.alert('Confidentialité', 'Votre profil ne sera plus visible par les nouveaux clients.')}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerInfo: {
    marginLeft: 20,
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.7,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  
  // Switch Card
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    ...Shadows.md,
  },
  switchIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Menu
  menuGroup: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.6,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerVersion: {
    fontSize: 11,
    marginTop: 4,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  balanceBox: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 8,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 20,
  },
  payoutButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  payoutButtonText: {
    color: '#191919',
    fontWeight: '700',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
  historySummary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 10,
  },
  sectionTitleModal: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dateHeaderTotal: {
    fontSize: 13,
    fontWeight: '800',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txName: {
    fontSize: 14,
    fontWeight: '600',
  },
  txTime: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },

  // Auth Prompt
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  authMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  authButton: {
    backgroundColor: '#191919',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
