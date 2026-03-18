/**
 * Page de connexion AfroPlan - Version Premium
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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  Mail, 
  Lock, 
  User, 
  Scissors, 
  ArrowRight,
  Apple
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { Button, Input } from '@/components/ui';

const { width, height } = Dimensions.get('window');
const SELECTED_ROLE_KEY = '@afroplan_selected_role';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const params = useLocalSearchParams<{ role?: string; email?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [selectedRole, setSelectedRole] = useState<'client' | 'coiffeur'>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const role = params.role || await AsyncStorage.getItem(SELECTED_ROLE_KEY);
      if (role === 'client' || role === 'coiffeur') setSelectedRole(role);
      if (params.email) setEmail(params.email);
    };
    loadData();
  }, [params.role, params.email]);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrors({ 
        email: !email ? "L'email est requis" : undefined, 
        password: !password ? "Le mot de passe est requis" : undefined 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password, selectedRole);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  return (
    <View style={styles.container}>
      {/* Fond Immersif avec Image et Gradient */}
      <ImageBackground 
        source={require('@/assets/images/afro_image1.jpg')} 
        style={styles.bgImage}
        blurRadius={Platform.OS === 'ios' ? 2 : 1}
      >
        <LinearGradient
          colors={['rgba(25,25,25,0.4)', 'rgba(25,25,25,0.95)']}
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
              {/* Logo & Welcome */}
              <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.header}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require('@/assets/images/logo_afroplan.png')}
                    style={styles.logo}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.welcomeTitle}>Ravi de vous revoir</Text>
                <Text style={styles.welcomeSubtitle}>
                  Connectez-vous pour retrouver vos habitudes coiffure
                </Text>
              </Animated.View>

              {/* Card de Connexion (Glassmorphism effect) */}
              <Animated.View 
                entering={FadeInUp.delay(400).duration(800)} 
                style={styles.loginCard}
              >
                {/* Role Switcher Mini */}
                <View style={styles.roleTabs}>
                  <TouchableOpacity 
                    onPress={() => setSelectedRole('client')}
                    style={[styles.roleTab, selectedRole === 'client' && styles.roleTabActive]}
                  >
                    <User size={16} color={selectedRole === 'client' ? '#FFF' : '#666'} />
                    <Text style={[styles.roleTabText, selectedRole === 'client' && styles.textWhite]}>Client</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setSelectedRole('coiffeur')}
                    style={[styles.roleTab, selectedRole === 'coiffeur' && styles.roleTabActive]}
                  >
                    <Scissors size={16} color={selectedRole === 'coiffeur' ? '#FFF' : '#666'} />
                    <Text style={[styles.roleTabText, selectedRole === 'coiffeur' && styles.textWhite]}>Pro</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.form}>
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
                    placeholder="Mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    isPassword
                    leftIcon={() => <Lock size={18} color="#999" />}
                    error={errors.password}
                    containerStyle={styles.inputCustom}
                  />

                  <TouchableOpacity 
                    style={styles.forgotBtn}
                    onPress={() => router.push('/(auth)/forgot-password')}
                  >
                    <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                  </TouchableOpacity>

                  <Button
                    title="Se connecter"
                    onPress={handleLogin}
                    loading={isSubmitting}
                    fullWidth
                    style={styles.mainButton}
                  />
                </View>

                <View style={styles.dividerRow}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>OU</Text>
                  <View style={styles.line} />
                </View>

                {/* Social Buttons */}
                <View style={styles.socialRow}>
                  <TouchableOpacity 
                    style={styles.socialCircle}
                    onPress={() => signInWithGoogle()}
                  >
                    <Ionicons name="logo-google" size={22} color="#191919" />
                  </TouchableOpacity>

                  {Platform.OS === 'ios' && (
                    <TouchableOpacity 
                      style={styles.socialCircle}
                      onPress={() => signInWithApple()}
                    >
                      <Apple size={22} color="#191919" />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>

              {/* Footer */}
              <Animated.View entering={FadeInUp.delay(600).duration(800)} style={styles.footer}>
                <Text style={styles.footerText}>Pas encore de compte ?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.registerLink}>Créer un compte</Text>
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
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  
  header: { alignItems: 'center', marginBottom: 30 },
  logoCircle: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#FFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  logo: { width: '70%', height: '70%' },
  welcomeTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', textAlign: 'center', letterSpacing: -0.5 },
  welcomeSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },

  loginCard: { 
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  roleTabs: { 
    flexDirection: 'row', 
    backgroundColor: '#F5F5F5', 
    borderRadius: 16, 
    padding: 4, 
    marginBottom: 24 
  },
  roleTab: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 12,
    gap: 8
  },
  roleTabActive: { backgroundColor: '#191919' },
  roleTabText: { fontSize: 14, fontWeight: '700', color: '#666' },
  textWhite: { color: '#FFF' },

  form: { gap: 16 },
  inputCustom: { marginBottom: 0 },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { color: '#666', fontSize: 13, fontWeight: '600' },
  mainButton: { backgroundColor: '#191919', height: 56, marginTop: 10 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: '#EEE' },
  dividerText: { fontSize: 12, fontWeight: '800', color: '#BBB' },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  socialCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    borderWidth: 1, 
    borderColor: '#EEE', 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#FFF'
  },

  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 30, 
    gap: 8 
  },
  footerText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  registerLink: { color: '#FFF', fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
});
