import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Shadows, BorderRadius, FontSizes } from '@/constants/theme';

export default function AdminSettings() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [commissionRate, setCommissionRate] = useState('15');
  const [minWithdrawal, setMinWithdrawal] = useState('50');
  const [platformEmail, setPlatformEmail] = useState('contact@afroplan.com');

  const handleSave = () => {
    // Dans une vraie app, on mettrait à jour une table 'app_config' dans Supabase
    Alert.alert('Succès', 'Paramètres de la plateforme mis à jour (simulé).');
  };

  const SettingItem = ({ label, value, onChange, icon, suffix }: any) => (
    <View style={[styles.settingCard, { backgroundColor: colors.card }, Shadows.small]}>
      <View style={styles.settingHeader}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
        />
        {suffix && <Text style={{ color: colors.textSecondary, marginRight: 10 }}>{suffix}</Text>}
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 20 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Frais & Commissions</Text>
      
      <SettingItem 
        label="Taux de commission standard" 
        value={commissionRate} 
        onChange={setCommissionRate} 
        icon="percent-outline" 
        suffix="%" 
      />

      <SettingItem 
        label="Montant minimum de retrait" 
        value={minWithdrawal} 
        onChange={setMinWithdrawal} 
        icon="cash-outline" 
        suffix="€" 
      />

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Support & Contact</Text>
      
      <View style={[styles.settingCard, { backgroundColor: colors.card }, Shadows.small]}>
        <View style={styles.settingHeader}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <Text style={[styles.settingLabel, { color: colors.text }]}>Email de contact plateforme</Text>
        </View>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderRadius: BorderRadius.md, padding: 12, marginTop: 10 }]}
          value={platformEmail}
          onChangeText={setPlatformEmail}
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: 15 },
  settingCard: { padding: 15, borderRadius: BorderRadius.lg, marginBottom: 15 },
  settingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  settingLabel: { fontSize: FontSizes.md, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, overflow: 'hidden' },
  input: { flex: 1, padding: 12, fontSize: FontSizes.md },
  saveButton: { padding: 18, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.md },
});
