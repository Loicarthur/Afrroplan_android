import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Shadows, BorderRadius, FontSizes } from '@/constants/theme';
import { adminService } from '@/services/admin.service';

type Period = 'all' | 'today' | 'week' | 'month';

export default function AdminBookings() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      const now = new Date();
      if (period === 'today') {
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
      } else if (period === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        startDate = lastWeek.toISOString().split('T')[0];
      } else if (period === 'month') {
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        startDate = lastMonth.toISOString().split('T')[0];
      }

      const { data } = await adminService.getAllBookings(1, 100, {
        startDate,
        endDate,
        status: statusFilter
      });
      setBookings(data || []);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les réservations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusBadge = (status: string) => {
    let color = '#757575';
    switch(status) {
      case 'completed': color = colors.success; break;
      case 'confirmed': color = '#2196F3'; break;
      case 'pending': color = '#FF9800'; break;
      case 'cancelled': color = '#f44336'; break;
    }
    return (
      <View style={[styles.badge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.badgeText, { color }]}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const formatDateFr = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const renderBookingItem = ({ item }: { item: any }) => (
    <View style={[styles.bookingCard, { backgroundColor: colors.card }, Shadows.small]}>
      <View style={styles.bookingHeader}>
        <View style={styles.serviceInfo}>
          <Text style={[styles.serviceName, { color: colors.text }]}>{item.service?.name}</Text>
          <Text style={[styles.salonName, { color: colors.textSecondary }]}>{item.salon?.name}</Text>
        </View>
        <Text style={[styles.price, { color: colors.primary }]}>{item.total_price} €</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.text }]}>{item.client?.full_name || 'Client Inconnu'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.text }]}>
            {formatDateFr(item.booking_date)} à {item.start_time}
          </Text>
        </View>
      </View>

      <View style={styles.bookingFooter}>
        {getStatusBadge(item.status)}
        <Text style={[styles.dateInfo, { color: colors.textSecondary }]}>
          Créé le {formatDateFr(item.created_at.split('T')[0])}
        </Text>
      </View>
    </View>
  );

  const FilterTab = ({ label, value, active, onPress }: any) => (
    <TouchableOpacity 
      style={[
        styles.filterTab, 
        { backgroundColor: active ? colors.primary : colors.card },
        Shadows.small
      ]}
      onPress={onPress}
    >
      <Text style={[styles.filterTabText, { color: active ? '#FFF' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barre de Filtres */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <FilterTab label="Tous" active={period === 'all'} onPress={() => setPeriod('all')} />
          <FilterTab label="Aujourd'hui" active={period === 'today'} onPress={() => setPeriod('today')} />
          <FilterTab label="7 derniers jours" active={period === 'week'} onPress={() => setPeriod('week')} />
          <FilterTab label="30 derniers jours" active={period === 'month'} onPress={() => setPeriod('month')} />
        </ScrollView>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
            <TouchableOpacity 
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[
                styles.statusChip, 
                { borderColor: statusFilter === s ? colors.primary : colors.border },
                statusFilter === s && { backgroundColor: colors.primary + '10' }
              ]}
            >
              <Text style={[
                styles.statusChipText, 
                { color: statusFilter === s ? colors.primary : colors.textSecondary }
              ]}>
                {s === 'all' ? 'Tous statuts' : s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={50} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune réservation pour cette période</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar: { paddingVertical: 10, backgroundColor: 'transparent' },
  filterScroll: { paddingHorizontal: 15, gap: 10, marginBottom: 10 },
  statusScroll: { paddingHorizontal: 15, gap: 8 },
  filterTab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: BorderRadius.full },
  filterTabText: { fontSize: 13, fontWeight: '600' },
  statusChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: BorderRadius.md, borderWidth: 1 },
  statusChipText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
  listContent: { padding: 15 },
  bookingCard: { borderRadius: BorderRadius.lg, padding: 15, marginBottom: 15 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  serviceInfo: { flex: 1, gap: 2 },
  serviceName: { fontSize: FontSizes.md, fontWeight: 'bold' },
  salonName: { fontSize: FontSizes.sm },
  price: { fontSize: FontSizes.md, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 10 },
  bookingDetails: { gap: 8, marginBottom: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: FontSizes.sm },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  dateInfo: { fontSize: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyText: { textAlign: 'center', fontSize: FontSizes.md },
});
