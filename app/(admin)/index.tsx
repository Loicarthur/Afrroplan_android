/**
 * Dashboard Admin AfroPlan - Version Premium
 * Pilotage des revenus (18,99€) et suivi des salons payants
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  TrendingUp, 
  Users, 
  Store, 
  CreditCard, 
  ShieldCheck, 
  ChevronRight,
  BarChart3,
  Calendar,
  Settings,
  AlertCircle,
  Star,
  LogOut,
  ArrowLeft
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Shadows, BorderRadius, FontSizes } from '@/constants/theme';
import { adminService, AdminStats } from '@/services/admin.service';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signOut } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminService.getGlobalStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const StatCard = ({ title, value, icon: Icon, color, subValue }: { title: string, value: string | number, icon: any, color: string, subValue?: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <Icon size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
      {subValue && <Text style={[styles.statSub, { color: '#16A34A' }]}>{subValue}</Text>}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#191919" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Pilotage AfroPlan</Text>
              <Text style={[styles.title, { color: colors.text }]}>Dashboard Admin</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.headerBtn, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => router.replace('/(tabs)')}
              >
                <ArrowLeft size={20} color="#191919" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={signOut}
              >
                <LogOut size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* REVENUS RÉCURRENTS (MRR) - Focus 18,99€ */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <LinearGradient
            colors={['#191919', '#4A4A4A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.mrrCard, Shadows.md]}
          >
            <View>
              <Text style={styles.mrrLabel}>Revenus Mensuels (MRR)</Text>
              <Text style={styles.mrrValue}>{(stats?.subscribersCount || 0) * 18.99} €</Text>
              <Text style={styles.mrrSub}>Basé sur l&apos;abonnement unique Pro</Text>
            </View>
            <View style={styles.mrrIconBox}>
              <BarChart3 size={40} color="rgba(255,255,255,0.2)" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* STATS RAPIDES */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Salons Payants" 
            value={stats?.subscribersCount || 0} 
            icon={CreditCard} 
            color="#191919" 
            subValue={`+${(stats?.subscribersCount || 0)} ce mois`}
          />
          <StatCard 
            title="Salons Actifs" 
            value={stats?.activeSalons || 0} 
            icon={Store} 
            color="#16A34A" 
            subValue={`${stats?.totalSalons} au total`}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Clients" 
            value={stats?.totalClients || 0} 
            icon={Users} 
            color="#2563EB" 
          />
          <StatCard 
            title="Note Moyenne" 
            value="4.8" 
            icon={Star} 
            color="#FFB800" 
          />
        </View>

        {/* ACTIONS DE GESTION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gestion & Sécurité</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(admin)/salons')}>
              <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}><ShieldCheck size={20} color="#16A34A" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionName, { color: colors.text }]}>Vérification des Salons</Text>
                <Text style={styles.actionDesc}>Pièces d'identité en attente</Text>
              </View>
              <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>3</Text></View>
              <ChevronRight size={18} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(admin)/users')}>
              <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}><Users size={20} color="#2563EB" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionName, { color: colors.text }]}>Gestion Utilisateurs</Text>
                <Text style={styles.actionDesc}>Clients et Coiffeurs inscrits</Text>
              </View>
              <ChevronRight size={18} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(admin)/bookings')}>
              <View style={[styles.actionIcon, { backgroundColor: '#F5F5F5' }]}><Calendar size={20} color="#191919" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionName, { color: colors.text }]}>Suivi Réservations</Text>
                <Text style={styles.actionDesc}>Historique global des RDV</Text>
              </View>
              <ChevronRight size={18} color="#CCC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* DERNIERS PAIEMENTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Salons ayant payé</Text>
            <TouchableOpacity><Text style={{ color: '#191919', fontWeight: '700', fontSize: 13 }}>Voir tout</Text></TouchableOpacity>
          </View>
          
          <View style={[styles.paymentsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.paymentRow, i < 3 && { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }]}>
                <View style={styles.payAvatar}><Store size={18} color="#666" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.paySalonName, { color: colors.text }]}>Salon Elégance {i}</Text>
                  <Text style={styles.payDate}>Payé le 12/03/2024</Text>
                </View>
                <Text style={styles.payAmount}>18,99 €</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 30 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  welcomeText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  mrrCard: { padding: 24, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mrrLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  mrrValue: { color: '#FFF', fontSize: 36, fontWeight: '900', marginTop: 4 },
  mrrSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  mrrIconBox: { opacity: 0.8 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  statSub: { fontSize: 10, fontWeight: '700', marginTop: 4 },

  actionsList: { gap: 12 },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionName: { fontSize: 15, fontWeight: '700', marginLeft: 12 },
  actionDesc: { fontSize: 12, opacity: 0.5, marginLeft: 12, marginTop: 2 },
  actionBadge: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginRight: 10 },
  actionBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  paymentsCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  payAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  paySalonName: { fontSize: 14, fontWeight: '700' },
  payDate: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  payAmount: { fontSize: 15, fontWeight: '800', color: '#191919' },
});
