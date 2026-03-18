/**
 * Composant SalonCard - AfroPlan
 * Design modernisé shadcn / Lucide avec dimensions premium
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Star, MapPin, Heart, Scissors } from 'lucide-react-native';
import { router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Colors, BorderRadius, Spacing, FontSizes, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SalonProcessed } from '@/types';

const { width } = Dimensions.get('window');

const RippleDot = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 2.2, duration: 1500, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.dotContainer}>
      <Animated.View style={[styles.ripple, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]} />
      <View style={styles.mainDot} />
    </View>
  );
};

type SalonCardProps = {
  salon: SalonProcessed;
  variant?: 'default' | 'horizontal' | 'featured';
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  searchedService?: string;
};

export function SalonCard({ salon, variant = 'default', onFavoritePress, isFavorite = false, searchedService }: SalonCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePress = () => {
    router.push(searchedService ? { pathname: `/salon/[id]`, params: { id: salon.id, preselectService: searchedService } } : `/salon/${salon.id}`);
  };

  const getAvailabilityBadge = () => {
    if (salon.is_today_blocked) return null;
    const now = new Date();
    const hr = now.getHours();
    if (hr < 12 && !salon.busy_matin) return { text: 'CE MATIN', color: '#22C55E' };
    if (hr >= 12 && hr < 14 && !salon.busy_midi) return { text: 'CE MIDI', color: '#22C55E' };
    if (hr >= 14 && hr < 18 && !salon.busy_afternoon) return { text: 'CET APRÈS-MIDI', color: '#EF4444' };
    if (hr >= 18 && hr < 22 && !salon.busy_soir) return { text: 'CE SOIR', color: '#EF4444' };
    return { text: 'DISPO', color: '#22C55E' };
  };

  const availability = getAvailabilityBadge();
  const imageSource = salon.service_image || salon.image_url || 'https://via.placeholder.com/400x300';
  
  // Ajouter un cache breaker si c'est une URL
  const finalSource = typeof imageSource === 'string' 
    ? { uri: `${imageSource}${imageSource.includes('?') ? '&' : '?'}v=${Date.now()}` } 
    : imageSource;

  // Ajustement des dimensions selon le variant
  const cardWidth = variant === 'featured' ? 280 : variant === 'default' ? '100%' : 220;
  const imageHeight = variant === 'featured' ? 180 : 140;

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { backgroundColor: colors.card, width: cardWidth }, 
        Shadows.sm
      ]} 
      onPress={handlePress} 
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <ExpoImage 
          source={finalSource} 
          style={styles.image} 
          contentFit="cover"
          transition={300}
        />
        
        {availability && (
          <View style={[styles.availableBadge, { backgroundColor: availability.color }]}>
            <RippleDot />
            <Text style={styles.availableText}>{availability.text}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.favoriteBtn} 
          onPress={(e) => {
            e.stopPropagation();
            onFavoritePress?.();
          }}
        >
          <Heart 
            size={18} 
            color={isFavorite ? "#EF4444" : "#FFF"} 
            fill={isFavorite ? "#EF4444" : "transparent"} 
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{salon.name}</Text>
          {salon.is_verified && <Scissors size={12} color="#191919" />}
        </View>
        
        <View style={styles.metaRow}>
          <View style={styles.ratingBox}>
            <View style={{ flexDirection: 'row', gap: 1 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  size={10} 
                  color="#FFB800" 
                  fill={s <= Math.round(salon.rating > 0 ? salon.rating : 3) ? "#FFB800" : "transparent"} 
                />
              ))}
            </View>
            {salon.rating > 0 && (
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {salon.rating.toFixed(1)}
              </Text>
            )}
            {salon.reviews_count > 0 && (
              <Text style={[styles.avisText, { color: colors.textSecondary }]}>({salon.reviews_count})</Text>
            )}
          </View>
          <View style={styles.dot} />
          <View style={styles.locationBox}>
            <MapPin size={12} color={colors.textMuted} />
            <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>{salon.city}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={[styles.pricePrefix, { color: colors.textSecondary }]}>Dès </Text>
          <Text style={[styles.priceValue, { color: '#191919' }]}>{salon.min_price || 25}€</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
    borderRadius: 24, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#F0F0F0',
    marginBottom: 12,
  },
  imageContainer: { 
    position: 'relative', 
    width: '100%',
  },
  image: { 
    width: '100%', 
    height: '100%',
  },
  availableBadge: { 
    position: 'absolute', 
    top: 12, 
    left: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingRight: 10, 
    paddingLeft: 24, 
    paddingVertical: 6, 
    borderRadius: 10,
    zIndex: 2
  },
  availableText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  favoriteBtn: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: 'rgba(0,0,0,0.25)', 
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 2
  },
  content: { padding: 16, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, flex: 1, marginRight: 8 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  avisText: { fontSize: 12, opacity: 0.5 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#DDD', marginHorizontal: 8 },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationText: { fontSize: 12, fontWeight: '500' },
  
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pricePrefix: { fontSize: 12, fontWeight: '500' },
  priceValue: { fontSize: 16, fontWeight: '900' },
  
  dotContainer: { position: 'absolute', left: 8, width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
  mainDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  ripple: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
});
