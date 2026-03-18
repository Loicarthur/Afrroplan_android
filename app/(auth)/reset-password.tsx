/**
 * Page de réinitialisation de mot de passe AfroPlan
 * Design Immersif, Glassmorphism & Animations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  Lock, 
  CheckCircle,
  Save
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/auth.service';

const { width, height } = Dimensions.get('window');

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpdatePassword = async () => {
    const newErrors: { password?: string; confirm?: string } = {};
    
    // Validation mot de passe
    const passwordValidation = authService.validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    if (password !== confirmPassword) {
      newErrors.confirm = "Les mots de passe ne correspondent pas";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await authService.updatePassword(password);
      setIsSuccess(true);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('@/assets/images/afro_image3.jpg')} 
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
              {/* Header */}
              <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.header}>
                <View style={styles.logoCircle}>
                  <Lock size={40} color="#191919" />
                </View>
                <Text style={styles.title}>Nouveau mot de passe</Text>
                <Text style={styles.subtitle}>
                  Créez un nouveau mot de passe sécurisé pour votre compte
                </Text>
              </Animated.View>

              {/* Card */}
              <Animated.View 
                entering={FadeInUp.delay(400).duration(800)} 
                style={styles.card}
              >
                {!isSuccess ? (
                  <View style={styles.form}>
                    <Input
                      placeholder="Nouveau mot de passe"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      isPassword
                      leftIcon={() => <Lock size={18} color="#999" />}
                      error={errors.password}
                      containerStyle={styles.inputCustom}
                    />

                    <Input
                      placeholder="Confirmer le mot de passe"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (errors.confirm) setErrors(prev => ({ ...prev, confirm: undefined }));
                      }}
                      isPassword
                      leftIcon={() => <Lock size={18} color="#999" />}
                      error={errors.confirm}
                      containerStyle={styles.inputCustom}
                    />

                    <Button
                      title="Mettre à jour"
                      onPress={handleUpdatePassword}
                      loading={isSubmitting}
                      fullWidth
                      style={styles.mainButton}
                      leftIcon={<Save size={18} color="#FFF" />}
                    />
                  </View>
                ) : (
                  <View style={styles.successContainer}>
                    <View style={styles.successIconCircle}>
                      <CheckCircle size={32} color="#4CAF50" />
                    </View>
                    <Text style={styles.successTitle}>Mot de passe mis à jour !</Text>
                    <Text style={styles.successSubtitle}>
                      Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
                    </Text>
                    <Button
                      title="Aller à la connexion"
                      onPress={() => router.replace('/(auth)/login')}
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
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 40 },
  
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
