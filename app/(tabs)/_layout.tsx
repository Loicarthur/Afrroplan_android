import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { 
  Compass,
  Search,
  Calendar,
  MessageSquare,
  Heart,
  User
} from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { bookingService } from '@/services/booking.service';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, isAuthenticated } = useAuth();
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await bookingService.getClientBookings(user.id);
          const now = new Date();
          
          const count = response.data.filter(b => {
            if (b.status === 'cancelled' || b.status === 'completed') return false;
            
            // Helper pour construire une date locale sans soucis de fuseau horaire UTC
            const [y, m, d] = b.booking_date.split('-').map(Number);
            const [h, min] = b.start_time.split(':').map(Number);
            const bDateTime = new Date(y, m - 1, d, h, min);
            
            return bDateTime > now;
          }).length;
          
          setActiveBookingsCount(count);
        } catch (e) {
          setActiveBookingsCount(0);
        }
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#191919',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 85,
          paddingTop: 8,
          paddingBottom: 25,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Compass size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, focused }) => (
            <Search size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'RDV',
          tabBarBadge: activeBookingsCount > 0 ? activeBookingsCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Calendar size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <MessageSquare size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ color, focused }) => (
            <Heart size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen name="styles" options={{ href: null }} />
    </Tabs>
  );
}
