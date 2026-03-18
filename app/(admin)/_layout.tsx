import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdminLayout() {
  const { profile, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (!isLoading && (!profile || profile.role !== 'admin')) {
      // Redirection si l'utilisateur n'est pas admin
      router.replace('/');
    }
  }, [profile, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Si pas admin et plus en chargement, l'useEffect s'occupe de la redirection
  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#191919', // Noir profond pour l'admin
        },
        headerTintColor: '#f9f8f8',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'Gestion Utilisateurs',
        }}
      />
      <Stack.Screen
        name="salons"
        options={{
          title: 'Modération Salons',
        }}
      />
      <Stack.Screen
        name="bookings"
        options={{
          title: 'Flux Réservations',
        }}
      />
    </Stack>
  );
}
