/**
 * Page Messages - Espace Coiffeur AfroPlan
 * Liste des conversations avec les clients
 * Design modernisé shadcn / Lucide
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  MessageSquare, 
  ChevronRight, 
  Search,
  ChevronLeft,
  User,
  Clock
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { bookingService } from '@/services/booking.service';
import { salonService } from '@/services/salon.service';
import { BookingWithDetails } from '@/types';

export default function CoiffeurMessagesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<BookingWithDetails[]>([]);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (salon) {
        const response = await bookingService.getSalonBookings(salon.id);
        // Trier par date de création (plus récent en haut)
        const sorted = response.data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setConversations(sorted);
      }
    } catch (error) {
      console.error('Error fetching salon conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        fetchConversations();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, isAuthLoading, fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const renderConversation = ({ item, index }: { item: BookingWithDetails, index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 50).duration(400)}>
      <TouchableOpacity
        style={[styles.conversationCard, { backgroundColor: colors.background }]}
        onPress={() => router.push({
          pathname: '/chat/[bookingId]',
          params: { bookingId: item.id },
        })}
        activeOpacity={0.6}
      >
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
            <User size={24} color="#666" />
          </View>
          {item.status === 'confirmed' && (
            <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
              {item.client?.full_name || 'Client'}
            </Text>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
          
          <Text style={[styles.serviceLabel, { color: '#191919' }]} numberOfLines={1}>
            {item.service?.name || 'Prestation'}
          </Text>
          
          <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.notes || "Cliquez pour envoyer un message..."}
          </Text>
        </View>
        
        <ChevronRight size={18} color="#CCC" strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );

  if (isAuthLoading || (loading && !refreshing)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#191919" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Premium */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#191919" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages Clients</Text>
        <View style={{ width: 44 }} />
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MessageSquare size={48} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun message</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Les discussions avec vos clients apparaîtront ici dès qu'ils auront réservé une prestation.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  listContent: {
    paddingBottom: 40,
  },
  conversationCard: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  serviceLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    marginHorizontal: 20,
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
});
