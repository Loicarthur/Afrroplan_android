import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Shadows, BorderRadius, FontSizes } from '@/constants/theme';
import { adminService } from '@/services/admin.service';
import { Profile } from '@/types/database';

export default function AdminUsers() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'coiffeur' | 'admin'>('all');
  
  // Modal Actions
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminService.getAllUsers(1, 100); // 100 max pour simplifier ici
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des utilisateurs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleUpdateRole = async (userId: string, newRole: 'client' | 'coiffeur' | 'admin') => {
    try {
      await adminService.updateUserProfile(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setActionModalVisible(false);
      Alert.alert('Succès', 'Le rôle a été mis à jour.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le rôle.');
    }
  };

  const renderUserItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity 
      style={[styles.userCard, { backgroundColor: colors.card }, Shadows.small]}
      onPress={() => {
        setSelectedUser(item);
        setActionModalVisible(true);
      }}
    >
      <View style={styles.userMainInfo}>
        <Image
          source={item.avatar_url || 'https://via.placeholder.com/50'}
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.full_name || 'Sans nom'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
          <View style={styles.roleContainer}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
              <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                {item.role.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              Inscrit le {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'admin': return '#f44336';
      case 'coiffeur': return '#FF9800';
      default: return '#2196F3';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header & Filtres */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Rechercher (nom, email...)"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          {(['all', 'client', 'coiffeur', 'admin'] as const).map(role => (
            <TouchableOpacity
              key={role}
              onPress={() => setRoleFilter(role)}
              style={[
                styles.filterTab,
                roleFilter === role && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
              ]}
            >
              <Text style={[
                styles.filterTabText,
                { color: roleFilter === role ? colors.primary : colors.textSecondary }
              ]}>
                {role === 'all' ? 'Tous' : role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Liste */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.textSecondary }}>Aucun utilisateur trouvé</Text>
            </View>
          }
        />
      )}

      {/* Modal d'actions */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActionModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Modifier l'utilisateur</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{selectedUser?.email}</Text>
            </View>

            <View style={styles.actionSection}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Changer le rôle</Text>
              <View style={styles.roleOptions}>
                <TouchableOpacity 
                  style={[styles.roleOption, selectedUser?.role === 'client' && { borderColor: colors.primary, borderWidth: 2 }]}
                  onPress={() => selectedUser && handleUpdateRole(selectedUser.id, 'client')}
                >
                  <Text style={{ color: colors.text }}>Client</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleOption, selectedUser?.role === 'coiffeur' && { borderColor: colors.primary, borderWidth: 2 }]}
                  onPress={() => selectedUser && handleUpdateRole(selectedUser.id, 'coiffeur')}
                >
                  <Text style={{ color: colors.text }}>Coiffeur</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleOption, selectedUser?.role === 'admin' && { borderColor: colors.primary, borderWidth: 2 }]}
                  onPress={() => selectedUser && handleUpdateRole(selectedUser.id, 'admin')}
                >
                  <Text style={{ color: colors.text }}>Admin</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: FontSizes.md,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterTabText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
    paddingBottom: 40,
  },
  userCard: {
    borderRadius: BorderRadius.lg,
    padding: 15,
    marginBottom: 12,
  },
  userMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: FontSizes.sm,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 10,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: 25,
    paddingBottom: 40,
  },
  modalHeader: {
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: FontSizes.sm,
  },
  actionSection: {
    marginBottom: 25,
  },
  actionLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: 15,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  closeButton: {
    padding: 15,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: FontSizes.md,
  },
});
