/**
 * Page Recherche AfroPlan - Style Airbnb
 * Layout: Carte (haut ~50%) + Bottom sheet liste verticale (bas ~50%)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Search, Map as MapIcon, List, Scissors, SlidersHorizontal, XCircle } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/use-app-store';
import { useSalonsInfinite } from '@/hooks/use-salons-query';
import { Colors, Shadows } from '@/constants/theme';
import { SalonCard } from '@/components/ui';
import SearchFlowModal from '@/components/SearchFlowModal';
import { SalonCardSkeleton } from '@/components/ui/Skeleton';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.45; // 45% de l'écran pour la carte

const PARIS_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { favoriteIds, toggleFavorite, loadFavorites } = useAppStore();

  const mapRef    = useRef<MapView>(null);
  const listRef   = useRef<FlatList>(null);
  const mapReady  = useRef(false);

  const [viewMode, setViewMode] = useState<'list' | 'map'>((params.view as any) || 'list');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState((params.city as string) || '');
  const [selectedCategory, setSelectedCategory] = useState((params.category as string) || 'all');
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<Region>(PARIS_REGION);
  const [selectedMapSalonId, setSelectedMapSalonId] = useState<string | null>(null);

  // Géocodage : coords calculées pour les salons sans lat/lng en base
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const geocodedCities = useRef<Record<string, { lat: number; lng: number }>>({});

  const salonFilters = useMemo(() => ({
    city: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    latitude: searchCoords?.lat,
    longitude: searchCoords?.lng,
    radiusKm: 30,
  }), [searchQuery, selectedCategory, searchCoords]);

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } = useSalonsInfinite(salonFilters);
  const salons = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);

  // Recadrer la carte sur les nouveaux résultats (seulement quand la carte est prête)
  const centerMap = useCallback(() => {
    if (!mapRef.current || !mapReady.current) return;
    if (searchCoords) {
      const reg = { latitude: searchCoords.lat, longitude: searchCoords.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
      setRegion(reg);
      mapRef.current.animateToRegion(reg, 600);
    } else if (salons.length > 0) {
      const first = salons.find(s => s.latitude && s.longitude);
      if (first) {
        const reg = { latitude: Number(first.latitude), longitude: Number(first.longitude), latitudeDelta: 0.08, longitudeDelta: 0.08 };
        setRegion(reg);
        mapRef.current.animateToRegion(reg, 600);
      }
    }
  }, [searchCoords, salons]);

  useEffect(() => { centerMap(); }, [centerMap]);

  // Géocoder les salons sans coordonnées (1 appel par ville unique)
  useEffect(() => {
    if (viewMode !== 'map') return;
    const missing = salons.filter(s => !Number(s.latitude) || !Number(s.longitude));
    if (missing.length === 0) return;

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const cities = [...new Set(missing.map(s => s.city).filter(Boolean))];
    const citiesToFetch = cities.filter(city => !geocodedCities.current[city]);

    citiesToFetch.forEach(async (city) => {
      try {
        const q = encodeURIComponent(`${city}, France`);
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${apiKey}`);
        const json = await res.json();
        if (json.results?.[0]?.geometry?.location) {
          const { lat, lng } = json.results[0].geometry.location;
          geocodedCities.current[city] = { lat, lng };
          setGeocodedCoords(prev => {
            const updates: Record<string, { lat: number; lng: number }> = {};
            salons.forEach(s => {
              if (s.city === city && !Number(s.latitude) && !Number(s.longitude) && !prev[s.id]) {
                const offset = () => (Math.random() - 0.5) * 0.006; // ~300m de décalage
                updates[s.id] = { lat: lat + offset(), lng: lng + offset() };
              }
            });
            return { ...prev, ...updates };
          });
        }
      } catch (_) {}
    });
  }, [salons, viewMode]);

  // Clic sur marker → scroll la liste + centre la carte
  const onMarkerPress = useCallback((salon: any, index: number) => {
    setSelectedMapSalonId(salon.id);
    try { listRef.current?.scrollToIndex({ index, animated: true }); } catch (_) {}
    const lat = Number(salon.latitude) || geocodedCoords[salon.id]?.lat;
    const lng = Number(salon.longitude) || geocodedCoords[salon.id]?.lng;
    if (lat && lng) {
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.035, longitudeDelta: 0.035 },
        400
      );
    }
  }, [geocodedCoords]);

  // Clic sur une card → highlight le marker + centre la carte
  const onCardPress = useCallback((salon: any, index: number) => {
    setSelectedMapSalonId(salon.id);
    const lat = Number(salon.latitude) || geocodedCoords[salon.id]?.lat;
    const lng = Number(salon.longitude) || geocodedCoords[salon.id]?.lng;
    if (lat && lng) {
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.035, longitudeDelta: 0.035 },
        400
      );
    }
  }, [geocodedCoords]);

  const handleApplySearch = (newF: any) => {
    if (newF.city !== undefined) setSearchQuery(newF.city || '');
    if (newF.hairstyle !== undefined) setSelectedCategory(newF.hairstyle || 'all');
    if (newF.latitude && newF.longitude) {
      setSearchCoords({ lat: Number(newF.latitude), lng: Number(newF.longitude) });
    } else {
      setSearchCoords(null);
    }
    
    setSelectedMapSalonId(null);
    setViewMode('map'); // FORCE LE MODE CARTE IMMÉDIATEMENT
    setSearchModalVisible(false);
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadFavorites(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Clé MapView : ne change que quand la zone de recherche change (pas à chaque chargement de données)
  const mapKey = `map-${searchCoords?.lat || 0}-${searchCoords?.lng || 0}`;
  const skeletonData = useMemo(() => Array(3).fill(null), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <SearchFlowModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSearch={handleApplySearch}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.searchPill, { backgroundColor: colors.card }]}
          onPress={() => setSearchModalVisible(true)}
        >
          <Search size={16} color="#191919" strokeWidth={2.5} />
          <Text style={[styles.searchPillText, { color: searchQuery ? colors.text : colors.textMuted }]} numberOfLines={1}>
            {searchQuery || "Où allez-vous ?"}
          </Text>
          <View style={[styles.filterIconWrap, { backgroundColor: colors.backgroundSecondary }]}>
            <SlidersHorizontal size={15} color="#191919" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
        >
          {viewMode === 'list' ? <MapIcon size={19} color="#191919" /> : <List size={19} color="#191919" />}
        </TouchableOpacity>
      </View>

      {/* ── VUE CARTE (style Airbnb : carte haut + liste bas) ── */}
      <View style={[styles.flex, viewMode !== 'map' && { display: 'none' }]}>
          {/* Carte - 50% hauteur écran */}
          <View style={{ height: MAP_HEIGHT, width: '100%' }}>
            <MapView
              key={mapKey}
              ref={mapRef}
              style={StyleSheet.absoluteFillObject}
              initialRegion={region}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              showsUserLocation
              showsMyLocationButton={false}
              onMapReady={() => {
                mapReady.current = true;
                centerMap();
              }}
            >
              {salons.map((s, index) => {
                const lat = Number(s.latitude) || geocodedCoords[s.id]?.lat;
                const lng = Number(s.longitude) || geocodedCoords[s.id]?.lng;
                if (!lat || !lng) return null;
                const isSelected = selectedMapSalonId === s.id;
                return (
                  <Marker
                    key={`m-${s.id}`}
                    coordinate={{ latitude: lat, longitude: lng }}
                    onPress={() => onMarkerPress(s, index)}
                  >
                    <View style={[styles.priceBubble, isSelected && styles.priceBubbleSelected]}>
                      <Text style={[styles.priceBubbleText, isSelected && styles.priceBubbleTextSelected]}>
                        {s.min_price || 25}€
                      </Text>
                    </View>
                  </Marker>
                );
              })}
            </MapView>
          </View>

          {/* Bottom Sheet Liste */}
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
            <View style={styles.dragHandleWrap}><View style={[styles.dragHandle, { backgroundColor: colors.border }]} /></View>
            <FlatList
              ref={listRef}
              data={isLoading && salons.length === 0 ? skeletonData : salons}
              keyExtractor={(item, idx) => item?.id || `sk-${idx}`}
              contentContainerStyle={styles.sheetList}
              showsVerticalScrollIndicator={false}
              onEndReached={() => hasNextPage && fetchNextPage()}
              renderItem={({ item, index }) => (
                item ? (
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => onCardPress(item, index)}
                    style={[styles.listCardWrap, selectedMapSalonId === item.id && styles.listCardSelected]}
                  >
                    <SalonCard salon={item} variant="default" isFavorite={favoriteIds.includes(item.id)} onFavoritePress={() => toggleFavorite(user?.id || '', item.id)} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.listCardWrap}><SalonCardSkeleton /></View>
                )
              )}
            />
          </View>
        </View>

      {/* ── VUE LISTE PLEIN ÉCRAN (2 colonnes) ── */}
      {viewMode !== 'map' && <FlatList
          data={isLoading && salons.length === 0 ? skeletonData : salons}
          keyExtractor={(item, idx) => item?.id || `sk-${idx}`}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading && salons.length > 0}
          onEndReached={() => hasNextPage && fetchNextPage()}
          renderItem={({ item }) => (
            item ? (
              <View style={styles.cardContainer}>
                <SalonCard 
                  salon={item} 
                  variant="default" 
                  isFavorite={favoriteIds.includes(item.id)} 
                  onFavoritePress={() => toggleFavorite(user?.id || '', item.id)} 
                />
              </View>
            ) : (
              <View style={styles.cardContainer}>
                <SalonCardSkeleton />
              </View>
            )
          )}
        />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5E5', ...Shadows.sm },
  searchPill: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 30, gap: 10, borderWidth: 1, borderColor: '#E5E5E5', ...Shadows.md },
  searchPillText: { flex: 1, fontSize: 14, fontWeight: '600' },
  filterIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  toggleBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  priceBubble: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#191919', elevation: 4 },
  priceBubbleSelected: { backgroundColor: '#191919' },
  priceBubbleText: { fontSize: 13, fontWeight: '800', color: '#191919' },
  priceBubbleTextSelected: { color: '#FFF' },
  bottomSheet: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -16, ...Shadows.lg },
  dragHandleWrap: { alignItems: 'center', paddingVertical: 10 },
  dragHandle: { width: 36, height: 4, borderRadius: 2 },
  sheetList: { paddingHorizontal: 14, paddingBottom: 30 },
  listCardWrap: { marginBottom: 10 },
  listCardSelected: { borderRadius: 26, borderWidth: 2, borderColor: '#191919' },
  list: { padding: 10 },
  columnWrapper: { justifyContent: 'space-between' },
  cardContainer: { width: (width - 30) / 2, marginBottom: 10 },
});
