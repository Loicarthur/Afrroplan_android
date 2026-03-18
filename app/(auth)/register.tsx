/**
 * Page d'inscription AfroPlan - Version Premium
 * Design Immersif, Glassmorphism & Animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Scissors, 
  Phone,
  CheckCircle2
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { Button, Input } from '@/components/ui';

const { width, height } = Dimensions.get('window');
const SELECTED_ROLE_KEY = '@afroplan_selected_role';

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'client' | 'coiffeur'>('client');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const role = params.role || await AsyncStorage.getItem(SELECTED_ROLE_KEY);
      if (role === 'client' || role === 'coiffeur') setSelectedRole(role);
    };
    loadRole();
  }, [params.role]);

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      setErrors({
        fullName: !fullName ? "Requis" : "",
        email: !email ? "Requis" : "",
        phone: !phone ? "Requis" : "",
        password: !password ? "Requis" : "",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password, fullName, phone, selectedRole);
      try {
        await authService.sendOTP(phone);
        router.push({ pathname: '/(auth)/verify-otp', params: { phone } });
      } catch (e) {
        Alert.alert('Succès', 'Compte créé ! Veuillez vous connecter.');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('@/assets/images/afro_image2.jpg')} 
        style={styles.bgImage}
      >
        <LinearGradient
          colors={['rgba(25,25,25,0.6)', 'rgba(25,25,25,0.98)']}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Back Button */}
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <ArrowLeft size={24} color="#FFF" />
              </TouchableOpacity>

              {/* Header */}
              <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
                <Text style={styles.title}>Rejoindre l'aventure</Text>
                <Text style={styles.subtitle}>
                  {selectedRole === 'client' 
                    ? 'Le meilleur de la coiffure afro à portée de main' 
                    : 'Propulsez votre talent avec AfroPlan Pro'}
                </Text>
              </Animated.View>

              {/* Form Card */}
              <Animated.View entering={FadeInUp.delay(400)} style={styles.registerCard}>
                <View style={styles.form}>
                  <Input
                    placeholder="Nom complet"
                    value={fullName}
                    onChangeText={setFullName}
                    leftIcon={() => <User size={18} color="#999" />}
                    error={errors.fullName}
                    containerStyle={styles.inputCustom}
                  />

                  <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={() => <Mail size={18} color="#999" />}
                    error={errors.email}
                    containerStyle={styles.inputCustom}
                  />

                  <Input
                    placeholder="Téléphone"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    leftIcon={() => <Phone size={18} color="#999" />}
                    error={errors.phone}
                    containerStyle={styles.inputCustom}
                  />

                  <Input
                    placeholder="Mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    isPassword
                    leftIcon={() => <Lock size={18} color="#999" />}
                    error={errors.password}
                    containerStyle={styles.inputCustom}
                  />

                  <Button
                    title="S'inscrire"
                    onPress={handleRegister}
                    loading={isSubmitting}
                    fullWidth
                    style={styles.mainButton}
                  />
                </View>

                <Text style={styles.termsText}>
                  En continuant, vous acceptez nos <Text style={styles.linkText}>Conditions</Text> et notre <Text style={styles.linkText}>Confidentialité</Text>.
                </Text>
              </Animated.View>

              {/* Footer */}
              <Animated.View entering={FadeInUp.delay(600)} style={styles.footer}>
                <Text style={styles.footerText}>Déjà membre ?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.loginLink}>Se connecter</Text>
                </TouchableOpacity>
              </Animated.View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#191919' },
  bgImage: { flex: 1, width: '100%', height: '100%' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  
  backBtn: { width: 44, height: 44, justifyContent: 'center', marginTop: 10 },
  
  header: { marginTop: 10, marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 22 },

  registerCard: { 
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  form: { gap: 16 },
  inputCustom: { marginBottom: 0 },
  mainButton: { backgroundColor: '#191919', height: 56, marginTop: 10 },

  termsText: { 
    fontSize: 12, 
    color: '#999', 
    textAlign: 'center', 
    marginTop: 20, 
    lineHeight: 18 
  },
  linkText: { color: '#191919', fontWeight: '700' },

  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 30, 
    gap: 8 
  },
  footerText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  loginLink: { color: '#FFF', fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
});
