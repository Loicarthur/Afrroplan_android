/**
 * Page de mot de passe oublié AfroPlan
 * Design Immersif, Glassmorphism & Animations
 */

import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { 
  Mail, 
  ArrowLeft,
  Send
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/auth.service';

const { width, height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError("L'email est requis");
      return;
    }

    // Validation email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("L'email n'est pas valide");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    try {
      await authService.resetPassword(email);
      setIsSent(true);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('@/assets/images/afro_image2.jpg')} 
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
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color="#FFF" />
              </TouchableOpacity>

              {/* Header */}
              <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.header}>
                <View style={styles.logoCircle}>
                  <Mail size={40} color="#191919" />
                </View>
                <Text style={styles.title}>Mot de passe oublié</Text>
                <Text style={styles.subtitle}>
                  Entrez votre email pour recevoir un lien de réinitialisation
                </Text>
              </Animated.View>

              {/* Card */}
              <Animated.View 
                entering={FadeInUp.delay(400).duration(800)} 
                style={styles.card}
              >
                {!isSent ? (
                  <View style={styles.form}>
                    <Input
                      placeholder="Email"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) setError(undefined);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      leftIcon={() => <Mail size={18} color="#999" />}
                      error={error}
                      containerStyle={styles.inputCustom}
                    />

                    <Button
                      title="Envoyer le lien"
                      onPress={handleResetPassword}
                      loading={isSubmitting}
                      fullWidth
                      style={styles.mainButton}
                      leftIcon={<Send size={18} color="#FFF" />}
                    />
                  </View>
                ) : (
                  <View style={styles.successContainer}>
                    <View style={styles.successIconCircle}>
                      <Send size={32} color="#4CAF50" />
                    </View>
                    <Text style={styles.successTitle}>Email envoyé !</Text>
                    <Text style={styles.successSubtitle}>
                      Consultez votre boîte mail {email} pour réinitialiser votre mot de passe.
                    </Text>
                    <Button
                      title="Retour à la connexion"
                      onPress={() => router.back()}
                      fullWidth
                      style={styles.mainButton}
                    />
                  </View>
                )}
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
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 10 },
  backButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 20
  },
  
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
  title: { fontSize: 28, fontWeight: '900', color: '#FFF', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },

  card: { 
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

  successContainer: { alignItems: 'center', paddingVertical: 10 },
  successIconCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#E8F5E9', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 16
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#191919', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
});
