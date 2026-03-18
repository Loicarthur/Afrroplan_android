import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

/**
 * Composant de base pour une animation de scintillement (shimmer)
 */
export const Shimmer = ({ style }: { style?: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        style,
        { backgroundColor: '#E5E7EB', opacity },
      ]}
    />
  );
};

/**
 * Skeleton reproduisant exactement la SalonCard (Grille 2 colonnes)
 */
export const SalonCardSkeleton = () => {
  return (
    <View style={styles.cardSkeleton}>
      {/* Image */}
      <Shimmer style={styles.imageSkeleton} />
      
      <View style={styles.contentSkeleton}>
        {/* Nom du salon */}
        <Shimmer style={styles.nameSkeleton} />
        
        {/* Note + Avis */}
        <Shimmer style={styles.ratingSkeleton} />
        
        {/* Ville */}
        <Shimmer style={styles.locationSkeleton} />
        
        {/* Prix */}
        <Shimmer style={styles.priceSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardSkeleton: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  imageSkeleton: {
    height: 120,
    width: '100%',
  },
  contentSkeleton: {
    padding: 10,
    gap: 8,
  },
  nameSkeleton: {
    height: 14,
    width: '80%',
    borderRadius: 4,
  },
  ratingSkeleton: {
    height: 10,
    width: '40%',
    borderRadius: 4,
  },
  locationSkeleton: {
    height: 10,
    width: '60%',
    borderRadius: 4,
  },
  priceSkeleton: {
    height: 14,
    width: '30%',
    borderRadius: 4,
    marginTop: 4,
  },
});
