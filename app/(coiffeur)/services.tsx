/**
 * Page de gestion des prestations - Espace Coiffeur AfroPlan
 * Design modernisé shadcn / Lucide
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Scissors, 
  PlusCircle, 
  Trash2, 
  Pencil, 
  Zap, 
  ArrowRight, 
  Camera, 
  Check, 
  Store, 
  Home, 
  RefreshCcw,
  X,
  ChevronRight,
  Clock,
  Euro,
  MapPin,
  AlertCircle
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as base64js from 'base64-js';
import Animated, { FadeInUp, FadeIn, SlideInBottom } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui';
import { HAIRSTYLE_CATEGORIES, findStyleById } from '@/constants/hairstyleCategories';
import { salonService } from '@/services/salon.service';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ServiceLocation = 'salon' | 'domicile' | 'both';

type ConfiguredStyle = {
  styleId: string;
  styleName: string;
  categoryLabel: string;
  price: string;
  duration: string;
  location: ServiceLocation;
  requiresExtensions: boolean;
  extensionsIncluded: boolean;
  coiffeurProvidesExtensions: boolean; // Nouveau: Vend des mèches
  clientCanBringExtensions: boolean; // Nouveau: Accepte les mèches du client
  extensionsPrice: string;
  image?: any;
  customImage?: string;
  customDescription?: string;
};

export default function CoiffeurServicesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user } = useAuth();
  const { t, language } = useLanguage();

  const [configuredStyles, setConfiguredStyles] = useState<ConfiguredStyle[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [isBatchConfiguring, setIsBatchConfiguring] = useState(false);
  const [batchData, setBatchData] = useState<Record<string, Partial<ConfiguredStyle>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'my_styles'>('my_styles');
  const [salonId, setSalonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConfiguredStyles = useCallback(async () => {
    if (!user) return;
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (salon) {
        setSalonId(salon.id);
        const services = await salonService.getSalonServices(salon.id);
        const mapped: ConfiguredStyle[] = services.map(s => {
          const catalogStyle = HAIRSTYLE_CATEGORIES.flatMap(c => c.styles).find(cs => 
            cs.name.toLowerCase() === s.name.toLowerCase()
          );
          
          return {
            styleId: s.id,
            styleName: s.name,
            categoryLabel: s.category,
            price: s.price.toString(),
            duration: s.duration_minutes.toString(),
            location: s.service_location as ServiceLocation,
            requiresExtensions: s.requires_extensions || s.allows_extensions || false,
            extensionsIncluded: s.extensions_included || false,
            coiffeurProvidesExtensions: s.coiffeur_provides_extensions || false,
            clientCanBringExtensions: s.client_can_bring_extensions !== false, // Défaut à true si null
            extensionsPrice: (s.extensions_price || 0).toString(),
            image: catalogStyle?.image,
            customImage: s.image_url || undefined,
            customDescription: s.description || '',
          };
        });
        setConfiguredStyles(mapped);
        if (mapped.length === 0) setActiveTab('catalog');
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) loadConfiguredStyles();
  }, [isAuthenticated, loadConfiguredStyles]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConfiguredStyles();
  };

  const isStyleConfigured = (styleName: string) =>
    configuredStyles.some((s) => s.styleName.toLowerCase() === styleName.toLowerCase());

  const toggleStyleSelection = (styleId: string) => {
    setSelectedStyleIds(prev => 
      prev.includes(styleId) 
        ? prev.filter(id => id !== styleId) 
        : [...prev, styleId]
    );
  };

  const startBatchConfiguration = (singleStyle?: ConfiguredStyle) => {
    if (singleStyle) {
      setSelectedStyleIds([singleStyle.styleId]);
      setBatchData({ [singleStyle.styleId]: { ...singleStyle } });
      setIsBatchConfiguring(true);
      return;
    }

    if (selectedStyleIds.length === 0) return;
    
    const initialData: Record<string, Partial<ConfiguredStyle>> = {};
    selectedStyleIds.forEach(id => {
      const existing = configuredStyles.find(s => s.styleId === id);
      if (existing) {
        initialData[id] = { ...existing };
      } else {
        const styleEntry = HAIRSTYLE_CATEGORIES.flatMap(c => c.styles).find(s => s.id === id);
        const parentCategory = HAIRSTYLE_CATEGORIES.find(c => c.styles.some(s => s.id === id));

        initialData[id] = {
          styleId: id,
          styleName: styleEntry?.name || 'Style inconnu',
          categoryLabel: parentCategory?.title || 'Autre',
          location: 'salon',
          price: '',
          duration: '',
          requiresExtensions: false,
          extensionsIncluded: false,
          coiffeurProvidesExtensions: false,
          clientCanBringExtensions: true,
          extensionsPrice: '0',
          customDescription: ''
        };
      }
    });
    
    setBatchData(initialData);
    setIsBatchConfiguring(true);
  };

  const updateBatchItem = (styleId: string, updates: Partial<ConfiguredStyle>) => {
    setBatchData(prev => ({
      ...prev,
      [styleId]: { ...prev[styleId], ...updates }
    }));
  };

  const pickServiceImage = async (styleId: string) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    };

    Alert.alert(
      'Photo de la prestation',
      'Quelle source souhaitez-vous utiliser ?',
      [
        {
          text: 'Prendre une photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return;
            const result = await ImagePicker.launchCameraAsync(options);
            if (!result.canceled) updateBatchItem(styleId, { customImage: result.assets[0].uri });
          },
        },
        {
          text: 'Galerie photo',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync(options);
            if (!result.canceled) updateBatchItem(styleId, { customImage: result.assets[0].uri });
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleSaveBatch = async () => {
    if (!user || !salonId) return;

    const stylesToSave = selectedStyleIds
      .map(id => batchData[id])
      .filter(s => !!s) as ConfiguredStyle[];
    
    const invalid = stylesToSave.find(s => !s.price || !s.duration);
    if (invalid) {
      Alert.alert('Champs requis', 'Veuillez renseigner le prix et la durée pour chaque style.');
      return;
    }

    setIsSaving(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const servicesPayload = [];
      
      for (const style of stylesToSave) {
        let finalImageUrl = style.customImage || null;

        if (style.customImage && !style.customImage.startsWith('http')) {
          const extension = style.customImage.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${user.id}/service_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
          
          finalImageUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
              const reader = new FileReader();
              reader.onloadend = async function () {
                try {
                  const base64 = (reader.result as string).split(',')[1];
                  const arrayBuffer = base64js.toByteArray(base64);
                  const { data, error } = await supabase.storage
                    .from('salon-photos')
                    .upload(fileName, arrayBuffer, { contentType: `image/${extension === 'png' ? 'png' : 'jpeg'}`, upsert: true });
                  if (error) throw error;
                  const { data: urlData } = supabase.storage.from('salon-photos').getPublicUrl(data.path);
                  resolve(urlData.publicUrl);
                } catch (err) { reject(err); }
              };
              reader.readAsDataURL(xhr.response);
            };
            xhr.onerror = () => reject(new Error('Erreur lecture photo.'));
            xhr.responseType = 'blob';
            xhr.open('GET', style.customImage!, true);
            xhr.send(null);
          });
        }

        const payloadItem: any = {
          salon_id: salonId,
          name: style.styleName,
          category: style.categoryLabel,
          price: parseFloat(style.price),
          duration_minutes: parseInt(style.duration, 10),
          description: style.customDescription || null,
          service_location: style.location,
          image_url: finalImageUrl,
          is_active: true,
          requires_extensions: style.requiresExtensions,
          extensions_included: style.extensionsIncluded,
          allows_extensions: style.requiresExtensions,
          extensions_price: parseFloat(style.extensionsPrice || '0'),
          coiffeur_provides_extensions: style.coiffeurProvidesExtensions,
          client_can_bring_extensions: style.clientCanBringExtensions,
        };

        // Si c'est une modification, on garde l'ID existant pour faire un UPDATE
        if (style.styleId && style.styleId.length > 20) { // Vérification sommaire que c'est un UUID DB
          payloadItem.id = style.styleId;
        }

        servicesPayload.push(payloadItem);
      }

      await salonService.upsertServicesBatch(servicesPayload);
      
      // Activer automatiquement le salon après la configuration des prestations
      await salonService.updateSalon(salonId, { is_active: true });

      await loadConfiguredStyles();
      setIsBatchConfiguring(false);
      setSelectedStyleIds([]);
      setActiveTab('my_styles');
      Alert.alert('Succès', 'Vos prestations ont été mises à jour.');
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStyle = (styleId: string) => {
    Alert.alert('Supprimer la prestation', 'Voulez-vous vraiment retirer ce service de votre liste ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await salonService.deleteService(styleId);
            loadConfiguredStyles();
          } catch (e) { Alert.alert('Erreur', 'Impossible de supprimer le service.'); }
        }
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#191919" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Premium */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Prestations</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Gérez votre catalogue de services</Text>
        </View>
        <TouchableOpacity 
          style={[styles.tabToggle, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setActiveTab(activeTab === 'catalog' ? 'my_styles' : 'catalog')}
        >
          {activeTab === 'my_styles' ? (
            <PlusCircle size={20} color="#191919" />
          ) : (
            <Scissors size={20} color="#191919" />
          )}
          <Text style={styles.tabToggleText}>
            {activeTab === 'my_styles' ? 'Ajouter' : 'Mes services'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />}
      >
        {activeTab === 'catalog' ? (
          <Animated.View entering={FadeIn}>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              Sélectionnez les styles que vous maîtrisez pour les ajouter à votre salon.
            </Text>
            
            {HAIRSTYLE_CATEGORIES.map((category) => (
              <View key={category.id} style={styles.categoryBlock}>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
                <View style={styles.catalogGrid}>
                  {category.styles.map((style) => {
                    const isSelected = selectedStyleIds.includes(style.id);
                    const isSaved = isStyleConfigured(style.name);
                    
                    return (
                      <TouchableOpacity
                        key={style.id}
                        style={[
                          styles.catalogCard,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          isSelected && { borderColor: '#191919', borderWidth: 2 },
                          isSaved && { opacity: 0.6 }
                        ]}
                        onPress={() => !isSaved && toggleStyleSelection(style.id)}
                        disabled={isSaved}
                      >
                        <Image source={style.image} style={styles.catalogImg} contentFit="cover" />
                        <View style={styles.catalogInfo}>
                          <Text style={[styles.catalogName, { color: colors.text }]} numberOfLines={1}>{style.name}</Text>
                          {isSaved ? (
                            <View style={styles.savedBadge}><Check size={10} color="#16A34A" /><Text style={styles.savedText}>Actif</Text></View>
                          ) : (
                            <View style={[styles.checkCircle, isSelected && { backgroundColor: '#191919', borderColor: '#191919' }]}>
                              {isSelected && <Check size={10} color="#FFF" strokeWidth={4} />}
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn}>
            {configuredStyles.length === 0 ? (
              <View style={styles.emptyState}>
                <Scissors size={64} color="#CCC" strokeWidth={1} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun service actif</Text>
                <Text style={styles.emptySub}>Commencez par sélectionner des styles dans le catalogue.</Text>
                <Button title="Voir le catalogue" onPress={() => setActiveTab('catalog')} style={{ marginTop: 24, paddingHorizontal: 32 }} />
              </View>
            ) : (
              <>
                <View style={[styles.statsBanner, { backgroundColor: '#191919' }]}>
                  <Zap size={20} color="#FFB800" fill="#FFB800" />
                  <Text style={styles.statsText}>Vous proposez {configuredStyles.length} prestations en ligne.</Text>
                </View>

                {configuredStyles.map((item, index) => (
                  <Animated.View 
                    key={item.styleId} 
                    entering={FadeInUp.delay(index * 50)}
                    style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.serviceMain}>
                      <Image source={item.customImage ? { uri: item.customImage } : item.image} style={styles.serviceImg} contentFit="cover" />
                      <View style={styles.serviceInfo}>
                        <Text style={[styles.serviceName, { color: colors.text }]}>{item.styleName}</Text>
                        <Text style={[styles.serviceCat, { color: colors.textMuted }]}>{item.categoryLabel}</Text>
                        <View style={styles.serviceMetaRow}>
                          <View style={styles.metaItem}>
                            <Euro size={12} color="#191919" />
                            <Text style={styles.metaText}>{item.price}€</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Clock size={12} color="#191919" />
                            <Text style={styles.metaText}>{item.duration} min</Text>
                          </View>
                          <View style={styles.metaItem}>
                            {item.location === 'salon' ? <Store size={12} color="#191919" /> : item.location === 'domicile' ? <Home size={12} color="#191919" /> : <RefreshCcw size={12} color="#191919" />}
                            <Text style={styles.metaText}>{item.location === 'both' ? 'Les 2' : item.location}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={styles.serviceActions}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#F5F5F5' }]}
                        onPress={() => startBatchConfiguration(item)}
                      >
                        <Pencil size={16} color="#191919" />
                        <Text style={styles.actionText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleRemoveStyle(item.styleId)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                ))}
              </>
            )}
          </Animated.View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action pour Catalogue */}
      {activeTab === 'catalog' && selectedStyleIds.length > 0 && (
        <Animated.View entering={SlideInBottom} style={styles.floatingFooter}>
          <TouchableOpacity 
            style={[styles.batchBtn, { backgroundColor: '#191919' }]}
            onPress={() => startBatchConfiguration()}
          >
            <Text style={styles.batchBtnText}>Configurer ({selectedStyleIds.length})</Text>
            <ArrowRight size={20} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* MODAL CONFIGURATION */}
      <Modal visible={isBatchConfiguring} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsBatchConfiguring(false)} style={styles.modalClose}>
              <X size={24} color="#191919" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Configuration</Text>
            <TouchableOpacity onPress={handleSaveBatch} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#191919" /> : <Text style={styles.saveText}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {selectedStyleIds.map((id) => {
              const data = batchData[id];
              if (!data) return null;

              return (
                <View key={id} style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.configHeader}>
                    <TouchableOpacity style={styles.configImagePicker} onPress={() => pickServiceImage(id)}>
                      <Image source={data.customImage ? { uri: data.customImage } : data.image} style={styles.configImg} contentFit="cover" />
                      <View style={styles.cameraIcon}><Camera size={14} color="#FFF" /></View>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.configName}>{data.styleName}</Text>
                      <Text style={styles.configCat}>{data.categoryLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Prix (€)</Text>
                      <TextInput 
                        style={[styles.formInput, { backgroundColor: '#F9F9F9', borderColor: colors.border }]} 
                        placeholder="0.00" 
                        keyboardType="numeric"
                        value={data.price}
                        onChangeText={val => updateBatchItem(id, { price: val })}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Durée (min)</Text>
                      <TextInput 
                        style={[styles.formInput, { backgroundColor: '#F9F9F9', borderColor: colors.border }]} 
                        placeholder="60" 
                        keyboardType="numeric"
                        value={data.duration}
                        onChangeText={val => updateBatchItem(id, { duration: val })}
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Lieu de prestation</Text>
                    <View style={styles.locationRow}>
                      {[
                        { id: 'salon', label: 'Salon', icon: Store },
                        { id: 'domicile', label: 'Domi.', icon: Home },
                        { id: 'both', label: 'Les 2', icon: RefreshCcw },
                      ].map(loc => (
                        <TouchableOpacity 
                          key={loc.id}
                          style={[styles.locBtn, data.location === loc.id && { backgroundColor: '#191919', borderColor: '#191919' }]}
                          onPress={() => updateBatchItem(id, { location: loc.id as any })}
                        >
                          <loc.icon size={14} color={data.location === loc.id ? "#FFF" : "#666"} />
                          <Text style={[styles.locText, data.location === loc.id && { color: "#FFF" }]}>{loc.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.toggleSection}>
                    <TouchableOpacity 
                      style={styles.toggleRow}
                      onPress={() => updateBatchItem(id, { requiresExtensions: !data.requiresExtensions })}
                    >
                      <View style={[styles.toggleBox, data.requiresExtensions && { backgroundColor: '#191919', borderColor: '#191919' }]}>
                        {data.requiresExtensions && <Check size={12} color="#FFF" strokeWidth={4} />}
                      </View>
                      <Text style={styles.toggleLabel}>Nécessite des mèches</Text>
                    </TouchableOpacity>

                    {data.requiresExtensions && (
                      <View style={{ gap: 12, marginTop: 8, paddingLeft: 10 }}>
                        <TouchableOpacity 
                          style={styles.toggleRow}
                          onPress={() => updateBatchItem(id, { coiffeurProvidesExtensions: !data.coiffeurProvidesExtensions })}
                        >
                          <View style={[styles.toggleBox, data.coiffeurProvidesExtensions && { backgroundColor: '#191919', borderColor: '#191919' }]}>
                            {data.coiffeurProvidesExtensions && <Check size={12} color="#FFF" strokeWidth={4} />}
                          </View>
                          <Text style={styles.toggleLabel}>Je peux fournir les mèches</Text>
                        </TouchableOpacity>

                        {data.coiffeurProvidesExtensions && (
                          <View style={[styles.formField, { marginLeft: 34 }]}>
                            <Text style={styles.formLabel}>Prix par paquet de mèches (€)</Text>
                            <TextInput 
                              style={[styles.formInput, { backgroundColor: '#F9F9F9', borderColor: colors.border }]} 
                              placeholder="0.00" 
                              keyboardType="numeric"
                              value={data.extensionsPrice}
                              onChangeText={val => updateBatchItem(id, { extensionsPrice: val })}
                            />
                          </View>
                        )}

                        <TouchableOpacity 
                          style={styles.toggleRow}
                          onPress={() => updateBatchItem(id, { clientCanBringExtensions: !data.clientCanBringExtensions })}
                        >
                          <View style={[styles.toggleBox, data.clientCanBringExtensions && { backgroundColor: '#191919', borderColor: '#191919' }]}>
                            {data.clientCanBringExtensions && <Check size={12} color="#FFF" strokeWidth={4} />}
                          </View>
                          <Text style={styles.toggleLabel}>Le client peut ramener ses mèches</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, opacity: 0.6, marginTop: 2 },
  
  tabToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  tabToggleText: { fontSize: 14, fontWeight: '700', color: '#191919' },
  
  scrollContent: { paddingHorizontal: 20 },
  sectionHint: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  
  categoryBlock: { marginBottom: 32 },
  categoryTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  catalogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catalogCard: { width: (width - 52) / 2, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5 },
  catalogImg: { width: '100%', height: 120 },
  catalogInfo: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catalogName: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  checkCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  savedText: { fontSize: 10, fontWeight: '800', color: '#16A34A', textTransform: 'uppercase' },

  statsBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, marginBottom: 24 },
  statsText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  serviceCard: { borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, ...Shadows.sm },
  serviceMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  serviceImg: { width: 70, height: 70, borderRadius: 16 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '800' },
  serviceCat: { fontSize: 12, marginTop: 2 },
  serviceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '700' },
  
  serviceActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: '700' },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center', opacity: 0.6, paddingHorizontal: 40 },

  floatingFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, ...Shadows.lg },
  batchBtn: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  batchBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Modal Styles
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalClose: { width: 44, height: 44, justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  saveText: { fontSize: 16, fontWeight: '800', color: '#191919' },
  modalScroll: { padding: 20 },
  configCard: { borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1 },
  configHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  configImagePicker: { position: 'relative' },
  configImg: { width: 60, height: 60, borderRadius: 16 },
  cameraIcon: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#191919', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  configName: { fontSize: 18, fontWeight: '800' },
  configCat: { fontSize: 13, color: '#888' },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  formField: { flex: 1, marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#666' },
  formInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontWeight: '600' },
  locationRow: { flexDirection: 'row', gap: 8 },
  locBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  locText: { fontSize: 12, fontWeight: '700', color: '#666' },
  toggleSection: { gap: 12, marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
});
