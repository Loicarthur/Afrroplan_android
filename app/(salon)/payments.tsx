/**
 * Page Paiements Salon - AfroPlan
 * Historique des transactions et paiements groupés par jour
 * Design modernisé shadcn / Lucide
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Wallet, 
  ArrowUpRight, 
  TrendingUp, 
  Receipt, 
  History,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { paymentService } from '@/services/payment.service';
import { salonService } from '@/services/salon.service';

interface Transaction {
  id: string;
  clientName: string;
  serviceName: string;
  amount: number;
  commission: number;
  net: number;
  date: string;
  status: 'completed' | 'pending' | 'refunded';
}

export default function PaymentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    if (!user?.id) return;
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (salon) {
        setSalonId(salon.id);
        const [response, balance] = await Promise.all([
          paymentService.getSalonPayments(salon.id),
          paymentService.getSalonBalance(salon.id)
        ]);

        setAvailableBalance(balance / 100);

        const mapped: Transaction[] = response.data.map((p: any) => ({
          id: p.id,
          clientName: p.booking?.client?.full_name || 'Client',
          serviceName: p.booking?.service?.name || 'Prestation',
          amount: p.amount / 100,
          commission: (p.commission || 0) / 100,
          net: (p.salon_amount || 0) / 100,
          date: p.created_at.split('T')[0],
          status: p.status === 'completed' ? 'completed' : p.status === 'refunded' ? 'refunded' : 'pending',
        }));
        setTransactions(mapped);
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const total = mapped
          .filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.status === 'completed';
          })
          .reduce((sum, tx) => sum + tx.net, 0);
        setMonthlyTotal(total);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!salonId || availableBalance <= 0) return;

    Alert.alert(
      language === 'fr' ? 'Confirmer le virement' : 'Confirm Payout',
      language === 'fr' 
        ? `Souhaitez-vous virer ${availableBalance.toFixed(2)}€ sur votre compte bancaire ?`
        : `Do you want to payout ${availableBalance.toFixed(2)}€ to your bank account?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: language === 'fr' ? 'Confirmer' : 'Confirm', 
          onPress: async () => {
            setIsWithdrawing(true);
            try {
              await paymentService.withdrawFunds(salonId);
              Alert.alert(
                t('common.success'), 
                language === 'fr' 
                  ? 'Virement initié avec succès ! Les fonds arriveront sous 2 à 5 jours ouvrés.' 
                  : 'Payout initiated successfully! Funds will arrive in 2 to 5 business days.'
              );
              fetchTransactions();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message);
            } finally {
              setIsWithdrawing(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { date: string, dayName: string, items: Transaction[], dayTotal: number }> = {};
    
    const days = language === 'fr' 
      ? ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const dayName = days[d.getDay()];
      const key = tx.date;

      if (!groups[key]) {
        groups[key] = { date: tx.date, dayName, items: [], dayTotal: 0 };
      }
      groups[key].items.push(tx);
      if (tx.status === 'completed') {
        groups[key].dayTotal += tx.net;
      }
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, language]);

  const getStatusConfig = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return { color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle2 };
      case 'pending': return { color: '#F59E0B', bg: '#FEF3C7', icon: Clock };
      case 'refunded': return { color: '#EF4444', bg: '#FEE2E2', icon: XCircle };
      default: return { color: '#666', bg: '#F3F4F6', icon: Info };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#191919" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Historique des gains</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#191919" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />}
          contentContainerStyle={styles.content}
        >
          {/* Main Balance Card */}
          <View style={[styles.mainCard, { backgroundColor: '#191919' }, Shadows.md]}>
            <View style={styles.mainCardHeader}>
              <View style={styles.walletIconBox}>
                <Wallet size={20} color="#191919" />
              </View>
              <Text style={styles.mainCardLabel}>Solde disponible</Text>
            </View>
            <Text style={styles.mainCardAmount}>{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</Text>
            
            <TouchableOpacity 
              style={[styles.withdrawBtn, availableBalance <= 0 && { opacity: 0.5 }]}
              onPress={handleWithdraw}
              disabled={availableBalance <= 0 || isWithdrawing}
            >
              {isWithdrawing ? <ActivityIndicator size="small" color="#191919" /> : (
                <>
                  <Text style={styles.withdrawText}>Virer vers ma banque</Text>
                  <ArrowUpRight size={18} color="#191919" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: colors.backgroundSecondary }]}>
              <TrendingUp size={16} color="#16A34A" />
              <View>
                <Text style={styles.statLabel}>Ce mois-ci</Text>
                <Text style={styles.statValue}>{monthlyTotal.toFixed(2)} €</Text>
              </View>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.backgroundSecondary }]}>
              <Receipt size={16} color="#2563EB" />
              <View>
                <Text style={styles.statLabel}>Ventes (30j)</Text>
                <Text style={styles.statValue}>{transactions.filter(t => t.status === 'completed').length}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <History size={18} color="#191919" />
            <Text style={styles.sectionTitle}>Transactions récentes</Text>
          </View>

          {/* Transactions List */}
          {groupedTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Receipt size={48} color="#CCC" strokeWidth={1.5} />
              <Text style={styles.emptyText}>Aucune transaction pour le moment.</Text>
            </View>
          ) : (
            groupedTransactions.map((group) => (
              <View key={group.date} style={styles.dayGroup}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayTitle, { color: colors.text }]}>
                    {group.dayName} {new Date(group.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={styles.dayTotal}>+{group.dayTotal.toFixed(2)} €</Text>
                </View>

                {group.items.map((tx, idx) => {
                  const status = getStatusConfig(tx.status);
                  return (
                    <Animated.View key={tx.id} entering={FadeInUp.delay(idx * 50)}>
                      <View style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.txTop}>
                          <View style={styles.txInfo}>
                            <Text style={[styles.txClient, { color: colors.text }]}>{tx.clientName}</Text>
                            <Text style={styles.txService}>{tx.serviceName}</Text>
                          </View>
                          <View style={styles.txAmountBox}>
                            <Text style={[styles.txNet, { color: status.color }]}>+{tx.net.toFixed(2)} €</Text>
                            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                              <status.icon size={10} color={status.color} strokeWidth={3} />
                              <Text style={[styles.statusText, { color: status.color }]}>{tx.status}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.txFooter}>
                          <Info size={12} color="#999" />
                          <Text style={styles.txDetailText}>Paiement brut: {tx.amount}€ · Frais AfroPlan: -{tx.commission}€</Text>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  content: { padding: 20 },

  mainCard: { padding: 24, borderRadius: 32, marginBottom: 24 },
  mainCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  walletIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  mainCardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  mainCardAmount: { color: '#FFF', fontSize: 42, fontWeight: '900', marginBottom: 24 },
  withdrawBtn: { backgroundColor: '#FFF', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  withdrawText: { fontSize: 15, fontWeight: '800', color: '#191919' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statItem: { flex: 1, padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statLabel: { fontSize: 11, fontWeight: '600', opacity: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },

  dayGroup: { marginBottom: 24 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  dayTitle: { fontSize: 15, fontWeight: '700' },
  dayTotal: { fontSize: 14, fontWeight: '800', color: '#191919' },

  txCard: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 10 },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  txInfo: { flex: 1 },
  txClient: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  txService: { fontSize: 13, color: '#888' },
  txAmountBox: { alignItems: 'flex-end', gap: 6 },
  txNet: { fontSize: 16, fontWeight: '900' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  txFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  txDetailText: { fontSize: 11, color: '#999', fontWeight: '500' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15, fontWeight: '500' },
});
