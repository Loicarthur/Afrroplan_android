/**
 * Chat Screen - AfroPlan - Version Premium
 * Design style iMessage / shadcn avec Lucide
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { 
  Send, 
  Plus, 
  Camera, 
  ChevronLeft, 
  Calendar, 
  Clock, 
  Info,
  CheckCheck,
  MoreVertical,
  Scissors,
  User
} from 'lucide-react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInDown, FadeIn } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Shadows, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { bookingService, messageService, Message as DbMessage } from '@/services';
import { BookingWithDetails } from '@/types';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  isMe: boolean;
}

const mapDbToLocalMessage = (dbMsg: DbMessage, activeRole: string, salonName: string, clientName: string): Message => {
  return {
    id: dbMsg.id,
    text: dbMsg.content,
    senderId: dbMsg.sender_id,
    senderName: dbMsg.sender_type === 'coiffeur' ? salonName : clientName,
    timestamp: new Date(dbMsg.created_at),
    isMe: dbMsg.sender_type === activeRole,
  };
};

function BookingContextBanner({ booking }: { booking: BookingWithDetails }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const formatDateFr = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const imageUrl = booking.service?.image_url || booking.salon?.image_url || 'https://via.placeholder.com/150';

  return (
    <Animated.View 
      entering={FadeInDown.duration(400)}
      style={[styles.bannerContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
    >
      <Image source={{ uri: imageUrl }} style={styles.bannerImage} contentFit="cover" />
      <View style={styles.bannerInfo}>
        <Text style={[styles.bannerServiceTitle, { color: colors.text }]} numberOfLines={1}>
          {booking.service?.name || 'Prestation'}
        </Text>
        <View style={styles.bannerRow}>
          <Calendar size={12} color={colors.textMuted} />
          <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
            {formatDateFr(booking.booking_date)} à {booking.start_time.substring(0, 5)}
          </Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: booking.status === 'confirmed' ? '#DCFCE7' : '#FEF3C7' }]}>
        <Text style={[styles.statusText, { color: booking.status === 'confirmed' ? '#166534' : '#92400E' }]}>
          {booking.status === 'confirmed' ? 'Confirmé' : 'En attente'}
        </Text>
      </View>
    </Animated.View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isMe = message.isMe;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.messageBubbleContainer, isMe ? styles.messageBubbleRight : styles.messageBubbleLeft]}
    >
      <View style={[
        styles.bubble, 
        { 
          backgroundColor: isMe ? '#191919' : '#F2F2F7', 
          borderBottomRightRadius: isMe ? 4 : 20,
          borderBottomLeftRadius: isMe ? 20 : 4,
        }
      ]}>
        <Text style={[styles.msgText, { color: isMe ? '#FFF' : '#000' }]}>{message.text}</Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.5)' : '#8E8E93' }]}>
            {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isMe && <CheckCheck size={10} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />}
        </View>
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<string>('client');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let sub: any = null;
    const init = async () => {
      if (!bookingId || !user) return;
      try {
        const role = await AsyncStorage.getItem('@afroplan_selected_role') || 'client';
        setActiveRole(role);
        const data = await bookingService.getBookingById(bookingId);
        if (data) {
          setBooking(data);
          const dbMsgs = await messageService.getMessages(bookingId);
          setMessages(dbMsgs.map(m => mapDbToLocalMessage(m, role, data.salon?.name || 'Salon', data.client?.full_name || 'Client')));
          sub = messageService.subscribeToMessages(bookingId, (newM) => {
            setMessages(prev => prev.find(x => x.id === newM.id) ? prev : [...prev, mapDbToLocalMessage(newM, role, data.salon?.name || 'Salon', data.client?.full_name || 'Client')]);
          });
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    init();
    return () => sub?.unsubscribe();
  }, [bookingId, user?.id]);

  const send = async () => {
    if (!inputText.trim() || !user || !booking) return;
    const txt = inputText.trim();
    setInputText('');
    try {
      const role = activeRole as 'client' | 'coiffeur';
      const newM = await messageService.sendMessage(bookingId, user.id, role, txt);
      setMessages(prev => [...prev, mapDbToLocalMessage(newM, activeRole, booking.salon?.name || 'Salon', booking.client?.full_name || 'Client')]);
    } catch (e) { Alert.alert('Erreur', 'Envoi impossible'); }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/messages');
    }
  };

  if (loading || !booking) return <View style={styles.center}><ActivityIndicator color="#191919" /></View>;

  const otherPartyName = activeRole === 'coiffeur' ? booking.client?.full_name : booking.salon?.name;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          headerTitle: otherPartyName,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
              <ChevronLeft size={24} color="#191919" strokeWidth={2.5} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerBtn}>
              <MoreVertical size={20} color="#191919" />
            </TouchableOpacity>
          )
        }} 
      />
      
      <BookingContextBanner booking={booking} />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8, backgroundColor: colors.background }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickMsgs} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {(activeRole === 'coiffeur' ? ["À votre service !", "Prêt pour vous !", "Je vous attends."] : ["Je suis en route !", "Merci !", "Je serai un peu en retard."]).map(t => (
              <TouchableOpacity key={t} style={[styles.chip, { backgroundColor: colors.backgroundSecondary }]} onPress={() => setInputText(t)}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Plus size={24} color="#191919" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Camera size={24} color="#191919" />
            </TouchableOpacity>
            
            <View style={[styles.inputWrap, { backgroundColor: '#F2F2F7' }]}>
              <TextInput 
                style={[styles.textInput, { color: colors.text }]} 
                value={inputText} 
                onChangeText={setInputText} 
                placeholder="Message..." 
                multiline 
                placeholderTextColor="#8E8E93"
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.send, { backgroundColor: inputText.trim() ? '#191919' : '#E5E5EA' }]} 
              onPress={send}
              disabled={!inputText.trim()}
            >
              <Send size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBtn: { padding: 8 },
  
  // Banner styles
  bannerContainer: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  bannerImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  bannerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  bannerServiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Chat styles
  messageBubbleContainer: { marginVertical: 4, maxWidth: '80%' },
  messageBubbleRight: { alignSelf: 'flex-end' },
  messageBubbleLeft: { alignSelf: 'flex-start' },
  bubble: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20,
  },
  msgText: { fontSize: 16, lineHeight: 22 },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timeText: { fontSize: 10 },
  
  inputArea: { 
    borderTopWidth: 1, 
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
  },
  quickMsgs: { 
    marginBottom: 8,
  },
  chip: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 18, 
    marginRight: 8,
  },
  inputRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 12, 
    paddingBottom: 8,
    alignItems: 'center', 
    gap: 8 
  },
  actionBtn: {
    padding: 4,
  },
  inputWrap: { 
    flex: 1, 
    borderRadius: 20, 
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  textInput: { 
    fontSize: 16,
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
  },
  send: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
});
