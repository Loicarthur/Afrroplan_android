/**
 * Page Messages - Espace Client AfroPlan
 * Liste des conversations avec les salons
 * Design modernisé shadcn / Lucide
 */

import React, { useState } from 'react';
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
  Circle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { bookingService } from '@/services/booking.service';
import { BookingWithDetails } from '@/types';

export default function ClientMessagesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<BookingWithDetails[]>([]);

  const fetchConversations = React.useCallback(async () => {
    if (!user) return;
    try {
      const response = await bookingService.getClientBookings(user.id);
      // Trier par date de création décroissante
      const sorted = response.data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setConversations(sorted);
    } catch (error) {
      console.error('Error fetching client conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MessageSquare size={48} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Vos messages</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Connectez-vous pour discuter avec vos coiffeurs et suivre vos rendez-vous.
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: '#191919' }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <Image 
            source={{ uri: item.salon?.image_url || 'https://via.placeholder.com/100' }} 
            style={styles.avatar} 
            contentFit="cover" 
          />
          {item.status === 'confirmed' && (
            <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.salonName, { color: colors.text }]} numberOfLines={1}>
              {item.salon?.name || 'Salon'}
            </Text>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <Text style={[styles.serviceLabel, { color: '#666' }]} numberOfLines={1}>
            {item.service?.name}
          </Text>
          <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.notes || "Cliquez pour envoyer un message..."}
          </Text>
        </View>
        <ChevronRight size={18} color="#CCC" strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#191919" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoWrapper}>
            <Image source={require('@/assets/images/logo_afroplan.png')} style={styles.logoImage} contentFit="contain" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MessageSquare size={48} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune discussion</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Vos conversations apparaîtront ici après votre première réservation.
          </Text>
          <TouchableOpacity
            style={[styles.exploreButton, { backgroundColor: '#191919' }]}
            onPress={() => router.push('/')}
          >
            <Text style={styles.exploreButtonText}>Explorer les salons</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrapper: {
    width: 60,
    height: 36,
    borderRadius: 18, // Rend le cadre oval
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '85%',
    height: '85%',
  },
  headerTitle: {
    fontSize: 24,
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
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
  salonName: {
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
    fontWeight: '600',
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
    marginBottom: 32,
  },
  loginButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  exploreButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
