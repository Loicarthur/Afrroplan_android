import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Shadows, BorderRadius, FontSizes } from '@/constants/theme';
import { adminService } from '@/services/admin.service';

const { width, height } = Dimensions.get('window');

export default function AdminSalons() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedIdCard, setSelectedIdCard] = useState<string | null>(null);
  const [suspensionModalVisible, setSuspensionModalVisible] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<any>(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  const fetchSalons = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSalons();
      setSalons(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les salons.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSalons();
  }, []);

  const toggleVerification = async (salonId: string, currentStatus: boolean) => {
    try {
      await adminService.updateSalonStatus(salonId, { is_verified: !currentStatus });
      setSalons(prev => prev.map(s => s.id === salonId ? { ...s, is_verified: !currentStatus } : s));
    } catch (error) {
      Alert.alert('Erreur', 'Action impossible.');
    }
  };

  const handleSuspension = async (salonToUpdate?: any) => {
    const salon = salonToUpdate || selectedSalon;
    if (!salon) return;
    try {
      const isCurrentlySuspended = salon.is_suspended;
      const updates = { 
        is_suspended: !isCurrentlySuspended,
        suspension_reason: !isCurrentlySuspended ? suspensionReason : null,
        is_active: !isCurrentlySuspended ? false : true
      };
      await adminService.updateSalonStatus(salon.id, updates);
      setSalons(prev => prev.map(s => s.id === salon.id ? { ...s, ...updates } : s));
      setSuspensionModalVisible(false);
      setSuspensionReason('');
      Alert.alert('Succès', isCurrentlySuspended ? 'Salon en ligne.' : 'Salon suspendu.');
    } catch (error) {
      Alert.alert('Erreur', 'Action impossible.');
    }
  };

  const renderSalonItem = ({ item }: { item: any }) => (
    <View style={[styles.compactCard, { backgroundColor: colors.card, borderColor: item.is_suspended ? colors.error : colors.border }]}>
      <View style={styles.mainRow}>
        <Image
          source={item.image_url || 'https://via.placeholder.com/100'}
          style={styles.compactImage}
          contentFit="cover"
        />
        <View style={styles.infoCol}>
          <Text style={[styles.salonName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.ownerName, { color: colors.textSecondary }]}>{item.owner?.full_name}</Text>
          <Text style={[styles.location, { color: colors.textMuted }]}>{item.city}</Text>
        </View>
        <View style={styles.statusCol}>
          <View style={[styles.miniStatus, { backgroundColor: item.is_active ? colors.success : (item.is_suspended ? colors.error : '#999') }]} />
          <Text style={[styles.statusText, { color: item.is_active ? colors.success : (item.is_suspended ? colors.error : '#999') }]}>
            {item.is_active ? 'Actif' : (item.is_suspended ? 'Suspendu' : 'Offline')}
          </Text>
        </View>
      </View>

      <View style={styles.compactDivider} />

      <View style={styles.actionsRow}>
        {/* IDs plus petits */}
        <View style={styles.idGroup}>
          <TouchableOpacity 
            style={[styles.idBtn, !item.id_card_url && { opacity: 0.3 }]} 
            onPress={() => item.id_card_url && setSelectedIdCard(item.id_card_url)}
          >
            <Ionicons name="card-outline" size={14} color={colors.primary} />
            <Text style={[styles.idText, { color: colors.primary }]}>R</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.idBtn, !item.id_card_verso_url && { opacity: 0.3 }]} 
            onPress={() => item.id_card_verso_url && setSelectedIdCard(item.id_card_verso_url)}
          >
            <Ionicons name="card-outline" size={14} color={colors.primary} />
            <Text style={[styles.idText, { color: colors.primary }]}>V</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.switchLabel}>Vérifié</Text>
          <Switch
            value={item.is_verified}
            onValueChange={() => toggleVerification(item.id, item.is_verified)}
            scaleX={0.7} scaleY={0.7}
            trackColor={{ false: '#767577', true: colors.success + '80' }}
            thumbColor={item.is_verified ? colors.success : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity 
          style={[styles.miniPauseBtn, { backgroundColor: item.is_suspended ? colors.success : colors.error }]}
          onPress={() => {
            if (item.is_suspended) handleSuspension(item);
            else { setSelectedSalon(item); setSuspensionModalVisible(true); }
          }}
        >
          <Ionicons name={item.is_suspended ? "play" : "pause"} size={12} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={salons}
        keyExtractor={(item) => item.id}
        renderItem={renderSalonItem}
        contentContainerStyle={styles.listContent}
        onRefresh={() => { setRefreshing(true); fetchSalons(); }}
        refreshing={refreshing}
      />

      <Modal visible={suspensionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Motif de pause</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Raison..."
              value={suspensionReason}
              onChangeText={setSuspensionReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSuspensionModalVisible(false)}>
                <Text style={{ color: colors.textSecondary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: colors.error }]} 
                onPress={() => handleSuspension()}
              >
                <Text style={styles.confirmBtnText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedIdCard} transparent animationType="fade">
        <TouchableOpacity style={styles.fullScreenOverlay} activeOpacity={1} onPress={() => setSelectedIdCard(null)}>
          <Image source={{ uri: selectedIdCard || '' }} style={styles.fullIdImage} contentFit="contain" />
          <TouchableOpacity style={styles.closeFullBtn} onPress={() => setSelectedIdCard(null)}>
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 10 },
  compactCard: { borderRadius: 12, marginBottom: 8, padding: 10, borderWidth: 1 },
  mainRow: { flexDirection: 'row', alignItems: 'center' },
  compactImage: { width: 44, height: 44, borderRadius: 8 },
  infoCol: { flex: 1, marginLeft: 12 },
  salonName: { fontSize: 14, fontWeight: '700' },
  ownerName: { fontSize: 11, marginTop: 1 },
  location: { fontSize: 10, marginTop: 1 },
  statusCol: { alignItems: 'flex-end', gap: 4 },
  miniStatus: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  compactDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idGroup: { flexDirection: 'row', gap: 8 },
  idBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  idText: { fontSize: 10, fontWeight: 'bold' },
  switchGroup: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: 10, fontWeight: '600', marginRight: -5 },
  miniPauseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 20, borderRadius: BorderRadius.xl },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  modalInput: { borderRadius: BorderRadius.md, padding: 12, height: 44, marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelBtn: { padding: 10 },
  confirmBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold' },

  fullScreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullIdImage: { width: width * 0.95, height: height * 0.7 },
  closeFullBtn: { position: 'absolute', top: 50, right: 20 },
});
