/**
 * Page de gestion du salon - Espace Coiffeur AfroPlan
 * Gère uniquement les informations de base du salon
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui';
import { salonService } from '@/services/salon.service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type SalonLocationType = 'salon' | 'coiffeur_home' | 'domicile' | 'both';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lundi', labelEn: 'Monday' },
  { key: 'tuesday', label: 'Mardi', labelEn: 'Tuesday' },
  { key: 'wednesday', label: 'Mercredi', labelEn: 'Wednesday' },
  { key: 'thursday', label: 'Jeudi', labelEn: 'Thursday' },
  { key: 'friday', label: 'Vendredi', labelEn: 'Friday' },
  { key: 'saturday', label: 'Samedi', labelEn: 'Saturday' },
  { key: 'sunday', label: 'Dimanche', labelEn: 'Sunday' },
];

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type OpeningHours = Record<string, DayHours>;

const DEFAULT_HOURS: OpeningHours = {
  monday: { open: '09:00', close: '19:00', closed: false },
  tuesday: { open: '09:00', close: '19:00', closed: false },
  wednesday: { open: '09:00', close: '19:00', closed: false },
  thursday: { open: '09:00', close: '19:00', closed: false },
  friday: { open: '09:00', close: '19:00', closed: false },
  saturday: { open: '09:00', close: '18:00', closed: false },
  sunday: { open: '09:00', close: '18:00', closed: true },
};

export default function SalonManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [existingSalonId, setExistingSalonId] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(Date.now().toString());

  // Informations du salon
  const [salonName, setSalonName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Address Autocomplete States
  const [addressPredictions, setAddressPredictions] = useState<any[]>([]);
  const [showAddressPredictions, setShowAddressPredictions] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const fetchAddressPredictions = async (input: string) => {
    if (input.length < 2) {
      setAddressPredictions([]);
      setShowAddressPredictions(false);
      return;
    }
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:fr&language=fr&types=address`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.status === 'OK' && json.predictions) {
        setAddressPredictions(json.predictions);
        setShowAddressPredictions(true);
      } else {
        setShowAddressPredictions(false);
      }
    } catch (e) {
      console.error('Autocomplete error:', e);
    }
  };

  const selectAddressPrediction = async (prediction: any) => {
    setAddress(prediction.description);
    setAddressPredictions([]);
    setShowAddressPredictions(false);
    
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      setIsAddressLoading(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=address_components,formatted_address,geometry&key=${apiKey}`;
        const response = await fetch(url);
        const json = await response.json();
        
        if (json.result) {
          const components = json.result.address_components;
          const streetNumber = components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
          const route = components.find((c: any) => c.types.includes('route'))?.long_name || '';
          const cityFound = components.find((c: any) => c.types.includes('locality'))?.long_name || '';
          const postalCodeFound = components.find((c: any) => c.types.includes('postal_code'))?.long_name || '';
          
          if (streetNumber || route) {
            setAddress(`${streetNumber} ${route}`.trim());
          } else {
            setAddress(json.result.formatted_address.split(',')[0]);
          }
          
          if (cityFound) setCity(cityFound);
          if (postalCodeFound) setPostalCode(postalCodeFound);

          if (json.result.geometry && json.result.geometry.location) {
            setLatitude(json.result.geometry.location.lat);
            setLongitude(json.result.geometry.location.lng);
          }
        }
      } catch (e) {
        console.error('Error fetching place details:', e);
      } finally {
        setIsAddressLoading(false);
      }
    }
  };

  // Médias
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [idCardPhoto, setIdCardPhoto] = useState<string | null>(null);
  const [idCardVersoPhoto, setIdCardVersoPhoto] = useState<string | null>(null);

  const [openingHours, setOpeningHours] = useState<OpeningHours>(DEFAULT_HOURS);
  const [serviceLocationType, setServiceLocationType] = useState<SalonLocationType>('salon');
  const [homeServiceFee, setHomeServiceFee] = useState('');

  const loadExistingSalon = async () => {
    if (!user?.id || !isSupabaseConfigured()) return;
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (salon) {
        setExistingSalonId(salon.id);
        setSalonName(salon.name || '');
        setDescription(salon.description || '');
        setPhone(salon.phone || '');
        setAddress(salon.address || '');
        setCity(salon.city || '');
        setPostalCode(salon.postal_code || '');
        setLatitude(salon.latitude || null);
        setLongitude(salon.longitude || null);
        
        setIdCardPhoto(salon.id_card_url || null);
        setIdCardVersoPhoto(salon.id_card_verso_url || null);
        
        const initialCover = salon.cover_image_url || (salon.photos?.[0] || null);
        if (initialCover) setCoverPhoto(initialCover);
        
        if (salon.opening_hours) {
          setOpeningHours(salon.opening_hours as unknown as OpeningHours);
        }
        
        if (salon.service_location) setServiceLocationType(salon.service_location as SalonLocationType);
        if (salon.min_home_service_amount) setHomeServiceFee(salon.min_home_service_amount.toString());
      }
    } catch (e) {
      console.warn('Error loading salon:', e);
    }
  };

  React.useEffect(() => { loadExistingSalon(); }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExistingSalon().finally(() => setRefreshing(false));
  };

  const uploadFile = async (uri: string, prefix: string) => {
    if (uri.startsWith('http')) {
      return uri.split('?')[0];
    }
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.id}/${prefix}_${Date.now()}.${fileExt}`;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
      } as any);

      const { data, error } = await supabase.storage
        .from('salon-photos')
        .upload(fileName, formData, {
          upsert: true
        });

      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('salon-photos').getPublicUrl(fileName);
      return publicUrl;
    } catch (err) { 
      console.error('Upload error:', err);
      throw err; 
    }
  };

  const pickMedia = async (type: 'cover' | 'id_recto' | 'id_verso') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      allowsEditing: true, 
      aspect: type === 'cover' ? [16, 9] : [1, 1], 
      quality: 0.7 
    });
    
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      
      if (type === 'cover') {
        // Affichage local immédiat
        setCoverPhoto(uri);
        
        if (existingSalonId) {
          setIsSaving(true);
          try {
            const url = await uploadFile(uri, 'cover');
            await salonService.updateSalon(existingSalonId, { 
              cover_image_url: url,
              image_url: url 
            } as any);
            
            // On force l'URL finale avec un breaker pour tuer le cache
            const finalUrl = `${url}${url.includes('?') ? '&' : '?'}upd=${Date.now()}`;
            setCoverPhoto(finalUrl);
            Alert.alert('Succès', 'La photo de votre salon a été mise à jour !');
          } catch (e) {
            console.error('Auto-save photo error:', e);
            Alert.alert('Erreur', 'Impossible de mettre à jour la photo sur le serveur.');
          } finally {
            setIsSaving(false);
          }
        }
      } else if (type === 'id_recto') setIdCardPhoto(uri);
      else if (type === 'id_verso') setIdCardVersoPhoto(uri);
    }
  };

  const updateDayHours = (day: string, field: keyof DayHours, value: any) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!salonName.trim() || !address.trim() || !city.trim() || !postalCode.trim() || !phone.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    setIsSaving(true);
    try {
      const finalCoverUrl = coverPhoto ? await uploadFile(coverPhoto, 'cover') : null;
      const finalIdRecto = idCardPhoto ? await uploadFile(idCardPhoto, 'id_recto') : null;
      const finalIdVerso = idCardVersoPhoto ? await uploadFile(idCardVersoPhoto, 'id_verso') : null;

      const salonPayload = {
        name: salonName.trim(),
        description: description.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        latitude: latitude,
        longitude: longitude,
        cover_image_url: finalCoverUrl,
        image_url: finalCoverUrl,
        id_card_url: finalIdRecto,
        id_card_verso_url: finalIdVerso,
        opening_hours: openingHours,
        service_location: serviceLocationType,
        min_home_service_amount: (serviceLocationType === 'domicile' || serviceLocationType === 'both') ? parseFloat(homeServiceFee || '0') : 0,
        owner_id: user?.id,
        is_active: true
      };

      if (existingSalonId) await salonService.updateSalon(existingSalonId, salonPayload as any);
      else {
        const newSalon = await salonService.createSalon(salonPayload as any);
        setExistingSalonId(newSalon.id);
      }

      Alert.alert('Succès', 'Informations enregistrées !', [
        { text: 'Gérer mes tarifs', onPress: () => router.push('/(coiffeur)/services') }
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        
        {/* Photo du salon */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Photo du salon</Text>
          <TouchableOpacity 
            style={[styles.coverPhotoCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => pickMedia('cover')}
          >
            {coverPhoto ? (
              <Image 
                key={`salon-photo-${coverPhoto}`}
                source={{ 
                  uri: coverPhoto.startsWith('http') 
                    ? `${coverPhoto}${coverPhoto.includes('?') ? '&' : '?'}v=${existingSalonId || 'new'}` 
                    : coverPhoto 
                }} 
                style={styles.photo} 
                contentFit="cover" 
                cachePolicy="none"
                placeholder={require('@/assets/images/logo_afroplan.png')}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 8 }}>Ajouter une photo du salon</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 12, lineHeight: 18 }}>
            Cette photo sera l'image principale de votre salon pour les clients.
          </Text>
        </View>

        {/* Informations générales */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations générales</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du salon *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
              placeholder="Ex: Afro Excellence" 
              value={salonName} 
              onChangeText={setSalonName} 
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, height: 100 }]} 
              placeholder="Décrivez votre salon et votre expertise..." 
              value={description} 
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone professionnel *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
              placeholder="06 00 00 00 00" 
              value={phone} 
              onChangeText={setPhone} 
              keyboardType="phone-pad" 
            />
          </View>
        </View>

        {/* Localisation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Localisation</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse *</Text>
            <View style={{ position: 'relative', zIndex: 1000 }}>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                placeholder="Numéro et nom de rue" 
                value={address} 
                onChangeText={(text) => {
                  setAddress(text);
                  fetchAddressPredictions(text);
                }} 
              />
              {isAddressLoading && (
                <View style={{ position: 'absolute', right: 12, top: 14 }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Chargement...</Text>
                </View>
              )}
              
              {showAddressPredictions && addressPredictions.length > 0 && (
                <View style={[styles.suggestionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {addressPredictions.map((p, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.suggestionItem, { borderBottomColor: colors.border }]} 
                      onPress={() => selectAddressPrediction(p)}
                    >
                      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={1}>
                        {p.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                placeholder="Ville" 
                value={city} 
                onChangeText={setCity} 
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>Code Postal *</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                placeholder="75000" 
                value={postalCode} 
                onChangeText={setPostalCode} 
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Horaires d'ouverture */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Horaires d'ouverture</Text>
          <View style={[styles.hoursContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {DAYS_OF_WEEK.map((day) => (
              <View key={day.key} style={styles.dayRow}>
                <View style={styles.dayInfo}>
                  <Text style={[styles.dayLabel, { color: colors.text }]}>{day.label}</Text>
                  <Switch 
                    value={!openingHours[day.key].closed} 
                    onValueChange={(val) => updateDayHours(day.key, 'closed', !val)}
                    trackColor={{ false: '#767577', true: '#191919' }}
                    thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (!openingHours[day.key].closed ? '#FFFFFF' : '#f4f3f4')}
                  />
                </View>
                {!openingHours[day.key].closed ? (
                  <View style={styles.timeInputs}>
                    <TextInput 
                      style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                      value={openingHours[day.key].open}
                      onChangeText={(val) => updateDayHours(day.key, 'open', val)}
                      placeholder="09:00"
                      maxLength={5}
                    />
                    <Text style={{ color: colors.textSecondary }}>à</Text>
                    <TextInput 
                      style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                      value={openingHours[day.key].close}
                      onChangeText={(val) => updateDayHours(day.key, 'close', val)}
                      placeholder="19:00"
                      maxLength={5}
                    />
                  </View>
                ) : (
                  <Text style={[styles.closedText, { color: colors.textMuted }]}>Fermé</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Vérification du compte</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
            L'ajout de votre pièce d'identité permet d'obtenir le badge "Vérifié" et de rassurer vos clients.
          </Text>
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.idCardCard, { flex: 1, borderColor: idCardPhoto ? colors.success : colors.border }]} 
              onPress={() => pickMedia('id_recto')}
            >
              {idCardPhoto ? (
                <Image source={{ uri: idCardPhoto }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="id-card-outline" size={32} color={colors.primary} />
                  <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 4 }}>RECTO</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.idCardCard, { flex: 1, borderColor: idCardVersoPhoto ? colors.success : colors.border, marginLeft: 10 }]} 
              onPress={() => pickMedia('id_verso')}
            >
              {idCardVersoPhoto ? (
                <Image source={{ uri: idCardVersoPhoto }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="id-card-outline" size={32} color={colors.primary} />
                  <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 4 }}>VERSO</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ padding: 20, marginBottom: 40 }}>
          <Button 
            title={isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'} 
            onPress={handleSave} 
            loading={isSaving} 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#666' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  row: { flexDirection: 'row' },
  coverPhotoCard: { width: '100%', height: 180, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  idCardCard: { height: 110, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden' },
  hoursContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  dayRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  dayInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dayLabel: { fontSize: 15, fontWeight: '700', width: 80 },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    width: 65, 
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600'
  },
  closedText: { fontSize: 14, fontWeight: '600', fontStyle: 'italic' },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 9999,
    ...Shadows.md,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  }
});
