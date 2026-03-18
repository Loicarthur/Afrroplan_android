/**
 * RatingModal - AfroPlan
 * Modale premium pour laisser un avis client
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { 
  Star, 
  X, 
  MessageSquare, 
  CheckCircle2,
  Heart
} from 'lucide-react-native';
import Animated, { FadeIn, ScaleInCenter } from 'react-native-reanimated';

import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from './ui';
import { reviewService } from '@/services/review.service';
import { useAuth } from '@/contexts/AuthContext';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  salonId: string;
  salonName: string;
  onSuccess?: () => void;
}

export default function RatingModal({ visible, onClose, bookingId, salonId, salonName, onSuccess }: RatingModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'rating' | 'success'>('rating');

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Attention', 'Veuillez sélectionner une note avant de valider.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user?.id) throw new Error("Utilisateur non identifié");

      await reviewService.createReview({
        booking_id: bookingId,
        salon_id: salonId,
        client_id: user.id,
        rating,
        comment: comment.trim(),
      });
      
      setStep('success');
      if (onSuccess) onSuccess();
      
      // Auto-fermeture après 2 secondes si succès
      setTimeout(() => {
        handleClose();
      }, 2500);

    } catch (error: any) {
      console.error('Detailed Error submitting review:', JSON.stringify(error, null, 2));
      const errorMsg = error?.message || "Impossible d'enregistrer votre avis pour le moment.";
      Alert.alert('Erreur', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setStep('rating');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <Animated.View entering={FadeIn} style={[styles.content, { backgroundColor: colors.card }]}>
              
              {step === 'rating' ? (
                <View>
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <X size={24} color="#888" />
                  </TouchableOpacity>

                  <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                      <View style={[styles.iconCircle, { backgroundColor: '#FFF9E5' }]}>
                        <Heart size={32} color="#FFB800" fill="#FFB800" />
                      </View>
                      <Text style={[styles.title, { color: colors.text }]}>Votre avis compte ! ✨</Text>
                      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {"Comment s'est passée votre prestation chez "}
                        <Text style={{ fontWeight: "800", color: "#191919" }}>{salonName}</Text> ?
                      </Text>
                    </View>

                    {/* Stars Selection */}
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity 
                          key={star} 
                          onPress={() => setRating(star)}
                          activeOpacity={0.7}
                        >
                          <Star
                            size={42}
                            color={star <= rating ? "#FFB800" : "#E5E5EA"}
                            fill={star <= rating ? "#FFB800" : "transparent"}
                            strokeWidth={2}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <MessageSquare size={14} color={colors.textSecondary} />
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Un petit mot ? (optionnel)</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { backgroundColor: '#F9F9F9', color: colors.text, borderColor: colors.border }]}
                        placeholder="Qu'avez-vous aimé le plus ?"
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        value={comment}
                        onChangeText={setComment}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>

                    <Button
                      title="Envoyer ma note"
                      onPress={handleSubmit}
                      loading={isSubmitting}
                      fullWidth
                      style={{ height: 56, borderRadius: 16 }}
                    />
                  </ScrollView>
                </View>
              ) : (
                <Animated.View entering={ScaleInCenter} style={styles.successContainer}>
                  <View style={styles.successIconBox}>
                    <CheckCircle2 size={64} color="#16A34A" strokeWidth={1.5} />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.text }]}>Merci beaucoup !</Text>
                  <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                    Votre avis aide les autres membres et permet au salon de s'améliorer.
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    borderRadius: 32,
    padding: 24,
    ...Shadows.xl,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 110,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
});
