/**
 * Page Portfolio / Réalisations - Espace Coiffeur AfroPlan
 * Design modernisé shadcn / Lucide
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Plus, 
  X, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Play, 
  Camera, 
  Trash2,
  ChevronLeft,
  Filter,
  MoreVertical
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as base64js from 'base64-js';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui';
import { HAIRSTYLE_CATEGORIES } from '@/constants/hairstyleCategories';
import { salonService } from '@/services/salon.service';

// Import sécurisé pour expo-video
let useVideoPlayer: any;
let VideoView: any;
try {
  const ExpoVideo = require('expo-video');
  useVideoPlayer = ExpoVideo.useVideoPlayer;
  VideoView = ExpoVideo.VideoView;
} catch (e) {
  // console.warn('Native module ExpoVideo not found. Video features will be disabled.');
}

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2; // 2 columns with gaps

interface Realization {
  id: string;
  image_url: string;
  caption: string;
  style_category: string;
  created_at: string;
}

function PortfolioVideoItem({ url, autoPlay = false, useControls = false }: { url: string, autoPlay?: boolean, useControls?: boolean }) {
  if (!useVideoPlayer || !VideoView) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <VideoIcon size={40} color="#FFF" />
      </View>
    );
  }

  try {
    const player = useVideoPlayer(url, (player: any) => {
      player.loop = true;
      if (autoPlay) player.play();
    });

    return (
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={useControls}
        allowsFullscreen={true}
      />
    );
  } catch (error) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <VideoIcon size={40} color="#FFF" />
      </View>
    );
  }
}

export default function CoiffeurPortfolioScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();

  const [realizations, setRealizations] = useState<Realization[]>([]);
  const [filteredRealizations, setFilteredRealizations] = useState<Realization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Realization | null>(null);
  
  const [newMedia, setNewMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [newCaption, setNewCaption] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(HAIRSTYLE_CATEGORIES[0]?.id || '');
  const [isSaving, setIsSaving] = useState(false);

  const loadRealizations = useCallback(async () => {
    if (!user) return;
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (salon) {
        const gallery = await salonService.getSalonGallery(salon.id);
        const formatted: Realization[] = (gallery || []).map(img => {
          const separatorIndex = img.caption?.indexOf(': ') ?? -1;
          const catId = separatorIndex !== -1 ? img.caption!.substring(0, separatorIndex) : (img.caption || '');
          const desc = separatorIndex !== -1 ? img.caption!.substring(separatorIndex + 2) : '';
          const categoryObj = HAIRSTYLE_CATEGORIES.find(c => c.id === catId);
          
          return {
            id: img.id,
            image_url: img.image_url,
            caption: desc,
            style_category: categoryObj?.title || 'Style',
            created_at: img.created_at,
          };
        });
        setRealizations(formatted);
      }
    } catch (error) {
      if (__DEV__) console.error('Load portfolio error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        loadRealizations();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, isAuthLoading, loadRealizations]);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredRealizations(realizations);
    } else {
      setFilteredRealizations(realizations.filter(r => r.style_category === activeFilter));
    }
  }, [activeFilter, realizations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRealizations();
  };

  const pickMedia = async () => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      Alert.alert(
        'Ajouter une réalisation',
        'Quelle source souhaitez-vous utiliser ?',
        [
          {
            text: t('coiffeur.camera'),
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(t('common.error'), t('coiffeur.cameraDenied'));
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                ...options,
                mediaTypes: ['images'],
              });
              if (!result.canceled && result.assets[0]) {
                setNewMedia({ uri: result.assets[0].uri, type: 'image' });
              }
            },
          },
          {
            text: 'Enregistrer une vidéo',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(t('common.error'), t('coiffeur.cameraDenied'));
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                ...options,
                mediaTypes: ['videos'],
              });
              if (!result.canceled && result.assets[0]) {
                setNewMedia({ uri: result.assets[0].uri, type: 'video' });
              }
            },
          },
          {
            text: t('coiffeur.gallery'),
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync(options);
              if (!result.canceled && result.assets[0]) {
                setNewMedia({ 
                  uri: result.assets[0].uri, 
                  type: result.assets[0].type === 'video' ? 'video' : 'image' 
                });
              }
            },
          },
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    } catch (e) {
      console.warn('Error picking media:', e);
    }
  };

  const handleSave = async () => {
    if (!newMedia || !user) {
      Alert.alert(t('common.error'), 'Veuillez sélectionner un média.');
      return;
    }

    setIsSaving(true);
    try {
      const salon = await salonService.getSalonByOwnerId(user.id);
      if (salon) {
        let finalMediaUrl = newMedia.uri;
        
        if (!newMedia.uri.startsWith('http')) {
          const { supabase } = await import('@/lib/supabase');
          const extension = newMedia.uri.split('.').pop()?.toLowerCase() || (newMedia.type === 'video' ? 'mp4' : 'jpg');
          const fileName = `${user.id}/portfolio_${Date.now()}.${extension}`;
          
          const contentType = newMedia.type === 'video' 
            ? `video/${extension === 'mov' ? 'quicktime' : 'mp4'}` 
            : `image/${extension === 'png' ? 'png' : 'jpeg'}`;
          
          finalMediaUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
              const reader = new FileReader();
              reader.onloadend = async function () {
                try {
                  const base64 = (reader.result as string).split(',')[1];
                  const arrayBuffer = base64js.toByteArray(base64);
                  const { data, error } = await supabase.storage
                    .from('salon-photos')
                    .upload(fileName, arrayBuffer, { contentType, upsert: true });
                  if (error) { reject(new Error(`Erreur Supabase: ${error.message}`)); return; }
                  const { data: urlData } = supabase.storage.from('salon-photos').getPublicUrl(data.path);
                  resolve(urlData.publicUrl);
                } catch (err) { reject(err); }
              };
              reader.readAsDataURL(xhr.response);
            };
            xhr.onerror = () => reject(new Error('Erreur lecture fichier.'));
            xhr.responseType = 'blob';
            xhr.open('GET', newMedia.uri, true);
            xhr.send(null);
          });
        }

        await salonService.addGalleryImage(salon.id, finalMediaUrl, `${selectedCategory}: ${newCaption}`);
        Alert.alert(t('common.success'), 'Votre réalisation a été ajoutée au portfolio !');
        setModalVisible(false);
        setNewMedia(null);
        setNewCaption('');
        loadRealizations();
      }
    } catch (error: any) {
      if (__DEV__) console.warn('Portfolio upload error:', error);
      Alert.alert(t('common.error'), "Impossible d'ajouter le média : " + (error.message || "Erreur réseau"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('common.delete'), 'Voulez-vous retirer cette réalisation de votre portfolio ?', [
      { text: t('common.cancel'), style: 'cancel' },
      { 
        text: t('common.delete'), 
        style: 'destructive', 
        onPress: async () => {
          try {
            await salonService.deleteGalleryImage(id);
            await loadRealizations();
          } catch (error) {
            Alert.alert(t('common.error'), 'Impossible de supprimer l\'image.');
          }
        } 
      },
    ]);
  };

  const isVideo = (url: string) => url.toLowerCase().match(/\.(mp4|mov|wmv|avi|quicktime)$/);

  if (isAuthLoading) {
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
          <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Vos plus belles réalisations</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: '#191919' }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>Tout voir</Text>
          </TouchableOpacity>
          {HAIRSTYLE_CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat.id}
              style={[styles.filterChip, activeFilter === cat.title && styles.filterChipActive]}
              onPress={() => setActiveFilter(cat.title)}
            >
              <Text style={[styles.filterText, activeFilter === cat.title && styles.filterTextActive]}>{cat.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#191919" />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#191919" />
          </View>
        ) : filteredRealizations.length === 0 ? (
          <Animated.View entering={FadeIn} style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <ImageIcon size={48} color="#CCC" strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Votre portfolio est vide</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Partagez vos coiffures du jour pour attirer de nouveaux clients !
            </Text>
            <Button 
              title="Ajouter une photo" 
              onPress={() => setModalVisible(true)}
              style={{ marginTop: 24, paddingHorizontal: 32 }}
            />
          </Animated.View>
        ) : (
          <View style={styles.grid}>
            {filteredRealizations.map((item, index) => (
              <Animated.View 
                key={item.id} 
                entering={FadeInUp.delay(index * 50).duration(400)}
                style={styles.gridItem}
              >
                <TouchableOpacity 
                  onLongPress={() => handleDelete(item.id)}
                  onPress={() => {
                    setSelectedMedia(item);
                    setViewerVisible(true);
                  }}
                  activeOpacity={0.9}
                  style={styles.itemTouch}
                >
                  {isVideo(item.image_url) ? (
                    <View style={styles.image}>
                      <PortfolioVideoItem url={item.image_url} />
                      <View style={styles.videoIndicator}>
                        <Play size={20} color="#FFFFFF" fill="#FFF" />
                      </View>
                    </View>
                  ) : (
                    <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" transition={300} />
                  )}
                  
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.style_category}</Text>
                  </View>

                  <LinearGradient 
                    colors={['transparent', 'rgba(0,0,0,0.6)']} 
                    style={styles.itemOverlay}
                  >
                    <Text style={styles.itemCaption} numberOfLines={1}>
                      {item.caption || 'Réalisation'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL AJOUT RÉALISATION */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Nouvelle Réalisation</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving || !newMedia}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#191919" />
              ) : (
                <Text style={[styles.publishBtn, { color: !newMedia ? '#CCC' : '#191919' }]}>Publier</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TouchableOpacity 
              style={[styles.imagePicker, { backgroundColor: '#F9F9F9', borderColor: colors.border }]} 
              onPress={pickMedia}
              activeOpacity={0.8}
            >
              {newMedia ? (
                <View style={styles.previewContainer}>
                  {newMedia.type === 'video' ? (
                    <PortfolioVideoItem url={newMedia.uri} />
                  ) : (
                    <Image source={{ uri: newMedia.uri }} style={styles.previewImage} contentFit="cover" />
                  )}
                  <TouchableOpacity style={styles.changeMediaBtn} onPress={pickMedia}>
                    <Camera size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pickerPlaceholder}>
                  <View style={styles.pickerIconCircle}>
                    <Camera size={32} color="#191919" />
                  </View>
                  <Text style={styles.pickerTitle}>Prendre une photo / vidéo</Text>
                  <Text style={styles.pickerSub}>Ou choisir dans la galerie</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Style réalisé</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalCategoryScroll}>
                {HAIRSTYLE_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.modalCategoryChip,
                      selectedCategory === cat.id && styles.modalCategoryChipActive
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.modalCategoryText, selectedCategory === cat.id && styles.textWhite]}>
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Légende (optionnel)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F9F9F9', color: colors.text, borderColor: colors.border }]}
                placeholder="Décrivez votre travail..."
                placeholderTextColor="#999"
                value={newCaption}
                onChangeText={setNewCaption}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* VISIONNEUSE PLEIN ÉCRAN */}
      <Modal visible={viewerVisible} transparent animationType="fade">
        <View style={styles.viewerContainer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <X size={30} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.viewerMedia}>
            {selectedMedia && (
              isVideo(selectedMedia.image_url) ? (
                <PortfolioVideoItem url={selectedMedia.image_url} autoPlay={true} useControls={true} />
              ) : (
                <Image source={{ uri: selectedMedia.image_url }} style={styles.fullImage} contentFit="contain" />
              )
            )}
          </View>

          {selectedMedia && (
            <View style={styles.viewerFooter}>
              <View style={styles.viewerHeaderRow}>
                <Text style={styles.viewerCategory}>{selectedMedia.style_category}</Text>
                <TouchableOpacity onPress={() => { setViewerVisible(false); handleDelete(selectedMedia.id); }}>
                  <Trash2 size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
              <Text style={styles.viewerCaption}>{selectedMedia.caption || 'Magnifique réalisation AfroPlan'}</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { paddingVertical: 100, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, opacity: 0.6, marginTop: 2 },
  addButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  
  filterSection: { paddingBottom: 12 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: 'transparent' },
  filterChipActive: { backgroundColor: '#191919' },
  filterText: { fontSize: 13, fontWeight: '700', color: '#666' },
  filterTextActive: { color: '#FFF' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.3, borderRadius: 24, overflow: 'hidden', backgroundColor: '#F0F0F0' },
  itemTouch: { width: '100%', height: '100%' },
  image: { width: '100%', height: '100%' },
  videoIndicator: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { color: '#191919', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  itemOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', justifyContent: 'flex-end', padding: 12 },
  itemCaption: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F9F9F9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', opacity: 0.6, paddingHorizontal: 40, lineHeight: 22 },
  
  // Modal Styles
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalCloseBtn: { width: 40, height: 40, justifyContent: 'center' },
  modalHeaderTitle: { fontSize: 17, fontWeight: '800' },
  publishBtn: { fontSize: 16, fontWeight: '800' },
  modalContent: { padding: 20 },
  imagePicker: { width: '100%', aspectRatio: 1, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 32, justifyContent: 'center', alignItems: 'center' },
  previewContainer: { width: '100%', height: '100%' },
  previewImage: { width: '100%', height: '100%' },
  changeMediaBtn: { position: 'absolute', bottom: 16, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  pickerPlaceholder: { alignItems: 'center' },
  pickerIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...Shadows.sm, marginBottom: 16 },
  pickerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  pickerSub: { fontSize: 14, color: '#999' },
  formSection: { marginBottom: 32 },
  label: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  modalCategoryScroll: { gap: 10 },
  modalCategoryChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EEE' },
  modalCategoryChipActive: { backgroundColor: '#191919', borderColor: '#191919' },
  modalCategoryText: { fontSize: 14, fontWeight: '700', color: '#666' },
  textWhite: { color: '#FFF' },
  input: { borderRadius: 20, borderWidth: 1, padding: 16, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
  
  // Viewer styles
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 20, right: 20, zIndex: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewerMedia: { width: '100%', height: SCREEN_HEIGHT * 0.75 },
  fullImage: { width: '100%', height: '100%' },
  viewerFooter: { position: 'absolute', bottom: 60, left: 0, right: 0, padding: 24 },
  viewerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewerCategory: { color: '#FFF', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', opacity: 0.7, letterSpacing: 1 },
  viewerCaption: { color: '#FFF', fontSize: 18, fontWeight: '700', lineHeight: 26 },
});
