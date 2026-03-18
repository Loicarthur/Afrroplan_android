import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/auth.service';
import { Colors, Shadows, BorderRadius, FontSizes } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

export default function VerifyOTPScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();
  const phone = params.phone as string;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputs = useRef<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChangeText = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus le suivant
    if (text.length === 1 && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Focus le précédent si effacement
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code complet à 6 chiffres.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyOTP(phone, fullCode);
      Alert.alert('Succès', 'Votre numéro a été vérifié !', [
        { text: 'Continuer', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', 'Code invalide ou expiré.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      await authService.sendOTP(phone);
      setTimer(60);
      Alert.alert('Succès', 'Un nouveau code a été envoyé.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de renvoyer le code.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Vérification</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Entrez le code à 6 chiffres envoyé au {"\n"}
          <Text style={{ fontWeight: 'bold', color: colors.text }}>{phone}</Text>
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[
                styles.input, 
                { 
                  backgroundColor: colors.card, 
                  color: colors.text,
                  borderColor: digit ? colors.primary : colors.border
                }
              ]}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyButton, { backgroundColor: colors.primary }]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Vérifier le numéro</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={{ color: colors.textSecondary }}>Vous n'avez rien reçu ? </Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
            <Text style={[styles.resendText, { color: timer > 0 ? colors.textMuted : colors.primary }]}>
              {timer > 0 ? `Renvoyer (${timer}s)` : 'Renvoyer le code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  backButton: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 12 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 40 },
  codeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  input: {
    width: (width - 80) / 6,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  verifyButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    ...Shadows.md,
  },
  verifyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  resendText: { fontWeight: '700' },
});
