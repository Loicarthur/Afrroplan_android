/**
 * Page Profil Client - AfroPlan
 * Design épuré inspiré de l'espace coiffeur et réglages Apple
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  Camera, 
  Briefcase, 
  Languages, 
  ChevronRight, 
  Shield, 
  MessageSquare, 
  LifeBuoy, 
  ShieldCheck, 
  LogOut, 
  X,
  UserCircle
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { authService } from '@/services/auth.service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '@/constants/theme';
import LanguageSelector from '@/components/LanguageSelector';
import FeedbackListModal from '@/components/FeedbackListModal';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { profile, signOut, updateProfile, refreshProfile, isLoading, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedbackList, setShowFeedbackList] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSignOut = async () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('auth.logout'), 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('auth.nameRequired'));
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone: phone,
      });
      setIsEditing(false);
      Alert.alert(t('common.success'), t('auth.profileUpdated'));
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchToCoiffeur = async () => {
    await AsyncStorage.setItem('@afroplan_selected_role', 'coiffeur');
    router.replace('/(coiffeur)');
  };

  const handlePickImage = async () => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      if (!canAskAgain) {
        Alert.alert(
          "Permission refusée",
          "L'accès à la galerie a été refusé. Veuillez l'activer dans les réglages de votre appareil pour changer votre photo.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Réglages", onPress: () => Linking.openSettings() }
          ]
        );
      } else {
        Alert.alert("Permission refusée", "L'accès à la galerie est nécessaire pour choisir une photo.");
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setIsSaving(true);
      try {
        if (!isSupabaseConfigured()) throw new Error("Supabase non configuré");

        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `avatar_${Date.now()}.${fileExt}`;

        // Utiliser le service d'authentification centralisé qui gère le FormData et le bucket correct
        const publicUrl = await authService.uploadAvatar(profile?.id || 'unknown', {
          uri,
          type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          name: fileName
        });
        
        // Rafraîchir explicitement
        if (typeof refreshProfile === 'function') {
          await refreshProfile();
        }

        Alert.alert(t('common.success'), t('auth.profileUpdated'));
      } catch (error: any) {
        console.error('Avatar upload error:', error);
        Alert.alert(t('common.error'), "Impossible de mettre à jour la photo.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.authPrompt}>
          <UserCircle size={100} color={colors.textMuted} strokeWidth={1} />
          <Text style={[styles.authTitle, { color: colors.text }]}>{t('auth.profile')}</Text>
          <Text style={[styles.authSubtitle, { color: colors.textSecondary }]}>
            {t('auth.loginToManage')}
          </Text>
          <TouchableOpacity 
            style={[styles.authButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.authButtonText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header with Title and Logo */}
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.profile')}</Text>
          <View style={styles.logoWrapper}>
            <Image source={require('@/assets/images/logo_afroplan.png')} style={styles.logoImage} contentFit="contain" />
          </View>
        </View>

        {/* Profile Card - Apple Settings Style */}
        <TouchableOpacity 
          style={[styles.profileCard, { backgroundColor: colors.card }, Shadows.md]}
          onPress={() => setIsEditing(true)}
          activeOpacity={0.7}
        >
          <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
            <Image 
              key={`profile-avatar-${profile?.avatar_url}`}
              source={{ uri: profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}v=${Date.now()}` : 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
              contentFit="cover"
              cachePolicy="none"
              placeholder={require('@/assets/images/logo_afroplan.png')}
            />
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              <Camera size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{profile?.full_name || 'Utilisateur'}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>{profile?.email}</Text>
          </View>
          
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('common.settings')}</Text>
          
          <View style={[styles.menuCard, { backgroundColor: colors.card }, Shadows.md]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleSwitchToCoiffeur}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary + '10' }]}>
                <Briefcase size={20} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{t('role.switchToCoiffeur')}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{t('role.manageYourSalon')}</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.menuItemNoPress}>
              <View style={[styles.menuIcon, { backgroundColor: '#3B82F610' }]}>
                <Languages size={20} color="#3B82F6" />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{t('common.language')}</Text>
              </View>
              <LanguageSelector />
            </View>
          </View>
        </View>

        {/* Administration Section (Seulement pour Admin) */}
        {profile?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('common.administration')}</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: '#EF444420', borderWidth: 1 }, Shadows.md]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(admin)')}>
                <View style={[styles.menuIcon, { backgroundColor: '#EF444410' }]}>
                  <Shield size={20} color="#EF4444" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{t('common.backofficeAccess')}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{t('common.backofficeSubtitle')}</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowFeedbackList(true)}>
                <View style={[styles.menuIcon, { backgroundColor: '#EF444410' }]}>
                  <MessageSquare size={20} color="#EF4444" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{t('common.testerFeedback')}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{t('common.testerFeedbackSubtitle')}</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('common.support')}</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card }, Shadows.md]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('mailto:support@afroplan.com')}>
              <View style={[styles.menuIcon, { backgroundColor: '#10B98110' }]}>
                <LifeBuoy size={20} color="#10B981" />
              </View>
              <Text style={[styles.menuTitle, { color: colors.text, flex: 1 }]}>{t('common.help')}</Text>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-policy')}>
              <View style={[styles.menuIcon, { backgroundColor: '#6366F110' }]}>
                <ShieldCheck size={20} color="#6366F1" />
              </View>
              <Text style={[styles.menuTitle, { color: colors.text, flex: 1 }]}>{t('common.privacy')}</Text>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('auth.editProfile')}</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.fullName')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('auth.fullName')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.phone')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="06 00 00 00 00"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdateProfile}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback List Modal (Admin) */}
      <FeedbackListModal visible={showFeedbackList} onClose={() => setShowFeedbackList(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  logoWrapper: {
    width: 60,
    height: 36,
    borderRadius: 18, // Rend le cadre oval
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: BorderRadius.xxl,
    marginBottom: 8,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 70, height: 70, borderRadius: 35 },
  editBadge: { 
    position: 'absolute', 
    bottom: -2, 
    right: -2, 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#FFF' 
  },
  profileInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  email: { fontSize: 14, opacity: 0.6 },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '600', 
    marginBottom: 8, 
    marginLeft: 8,
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  menuCard: { borderRadius: BorderRadius.xxl, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemNoPress: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, marginTop: 1, opacity: 0.6 },
  divider: { height: 1, marginLeft: 66, marginRight: 16 },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 48, 
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
  authPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  authTitle: { fontSize: 26, fontWeight: '800', marginTop: 24 },
  authSubtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, marginBottom: 40, lineHeight: 24 },
  authButton: { paddingVertical: 18, paddingHorizontal: 48, borderRadius: BorderRadius.xl, width: '100%', alignItems: 'center' },
  authButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: BorderRadius.xl, padding: 16, fontSize: 16 },
  saveButton: { paddingVertical: 18, borderRadius: BorderRadius.xl, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
