/**
 * Page d'abonnement Salon - AfroPlan
 * Plan unique pour publier le salon et débloquer toutes les fonctionnalités
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Globe, 
  MessageSquare,
  BarChart3,
  Star
} from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { salonService } from '@/services/salon.service';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: Globe, text: "Publication immédiate sur la carte" },
  { icon: Zap, text: "Réservations en ligne illimitées" },
  { icon: MessageSquare, text: "Messagerie directe avec vos clients" },
  { icon: Star, text: "Collecte et affichage d'avis illimités" },
  { icon: BarChart3, text: "Statistiques détaillées de votre activité" },
  { icon: ShieldCheck, text: "Paiements sécurisés et garantis" },
];

export default function SubscriptionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (!salon) throw new Error("Salon non trouvé");

      // 1. Simulation Paiement Stripe (à remplacer par l'appel réel plus tard)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Mise à jour réelle dans Supabase
      await salonService.updateSalon(salon.id, { 
        is_active: true,
        // On peut aussi enregistrer la date de fin d'abonnement
      });

      // 3. Enregistrer la transaction pour l'admin
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('payments').insert({
        salon_id: salon.id,
        amount: 1899, // 18.99€ en cents
        status: 'completed',
        payment_type: 'subscription',
        provider: 'stripe'
      });

      setLoading(false);
      Alert.alert(
        'Félicitations ! 🎉',
        'Votre abonnement AfroPlan Pro est activé. Votre salon est maintenant en ligne et visible par tous les clients.',
        [{ text: 'Voir mon dashboard', onPress: () => router.replace('/(coiffeur)') }]
      );
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Erreur', e.message || 'Impossible de traiter le paiement.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#191919' }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient Sophistiqué */}
      <LinearGradient
        colors={['rgba(74,74,74,0.5)', '#191919']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Titre & Prix */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.heroSection}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>OFFRE PRO</Text>
            </View>
            <Text style={styles.heroTitle}>Boostez votre talent</Text>
            <Text style={styles.heroSubtitle}>Un plan unique pour tout gérer, sans limites.</Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>18,99€</Text>
              <Text style={styles.pricePeriod}>/mois</Text>
            </View>
            <Text style={styles.cancelAnytime}>Sans engagement, annulez quand vous voulez.</Text>
          </Animated.View>

          {/* Features Grid */}
          <View style={styles.featuresList}>
            {FEATURES.map((item, index) => (
              <Animated.View 
                key={index} 
                entering={FadeInUp.delay(400 + index * 100)} 
                style={styles.featureItem}
              >
                <View style={styles.iconCircle}>
                  <item.icon size={20} color="#FFF" />
                </View>
                <Text style={styles.featureText}>{item.text}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={{ height: 140 }} />
        </ScrollView>

        {/* Footer Fixed Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.subscribeBtn} 
            onPress={handleSubscribe}
            disabled={loading}
          >
            <LinearGradient
              colors={['#FFF', '#E5E5E5']}
              style={styles.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#191919" />
              ) : (
                <Text style={styles.btnText}>S'abonner et Publier mon salon</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.secureText}>Paiement sécurisé via Stripe</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  
  scrollContent: { paddingHorizontal: 24, paddingTop: 20 },
  
  heroSection: { alignItems: 'center', marginBottom: 40 },
  badge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#FFF', textAlign: 'center', letterSpacing: -1 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 30 },
  priceValue: { fontSize: 56, fontWeight: '900', color: '#FFF' },
  pricePeriod: { fontSize: 20, color: 'rgba(255,255,255,0.5)', marginLeft: 4 },
  cancelAnytime: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 },

  featuresList: { gap: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  featureText: { color: '#FFF', fontSize: 15, fontWeight: '600', flex: 1 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  subscribeBtn: { borderRadius: 20, overflow: 'hidden', ...Shadows.lg },
  btnGradient: { height: 64, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#191919', fontSize: 17, fontWeight: '800' },
  secureText: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 16 },
});
