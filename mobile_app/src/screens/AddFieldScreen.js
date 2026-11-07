import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Switch, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { getDeviceLocation } from '../services/locationService';
import Header from '../components/Header';
import { Card, Button } from '../components/ui';
import { STAGES } from '../constants/soil';

const VARIETIES = [
  { code: 'Co 86032 Nayana', desc: 'High sugar recovery, drought tolerant' },
  { code: 'Co 0238 Karan 4', desc: 'High yield, profuse tillering' },
  { code: 'CoM 0265 Phule 265', desc: 'Saline tolerant, vigorous ratoon' },
  { code: 'Co 0118', desc: 'Early maturing, red rot resistant' },
  { code: 'Co 11015', desc: 'Superior sucrose content' }
];

const SOILS = [
  { name: 'Loamy', iconName: 'terrain' },
  { name: 'Clay', iconName: 'layers-triple' },
  { name: 'Sandy', iconName: 'weather-dust' },
  { name: 'Silt', iconName: 'texture' }
];

const IRRIGATION = ['Drip', 'Furrow', 'Sprinkler', 'Canal'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

export default function AddFieldScreen({ navigation }) {
  const { loadFields, themeColors, isDark, t } = useApp();
  const [loading, setLoading] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [focusedInput, setFocusedInput] = useState('');

  const [form, setForm] = useState({
    name: '',
    fieldAreaAcre: '2.5',
    soilType: 'Loamy',
    cropVariety: 'Co 86032 Nayana',
    cropGrowthStage: 'Vegetative',
    season: 'Kharif',
    irrigationType: 'Drip',
    waterSource: 'Borewell',
    mulchingUsed: true,
    region: 'South',
    cropType: 'Plant Cane',
    notes: '',
    latitude: '',
    longitude: ''
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const detectLocation = async () => {
    setDetectingLoc(true);
    try {
      const loc = await getDeviceLocation();
      set({ latitude: String(loc.latitude), longitude: String(loc.longitude) });
      Alert.alert(
        'GPS Detected',
        `Coordinates filled from device location:\n${loc.latitude}°N, ${loc.longitude}°E`
      );
    } catch (err) {
      Alert.alert(
        'GPS Error',
        err.message || 'Could not fetch device location. Please enable location permissions.'
      );
    } finally {
      setDetectingLoc(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Field name needed', 'Please give your field a descriptive name (e.g. "North Field").');
      return;
    }
    const areaAcre = parseFloat(form.fieldAreaAcre);
    if (!areaAcre || areaAcre <= 0) {
      Alert.alert('Field area needed', 'Please enter a valid field size in acres.');
      return;
    }
    setLoading(true);
    try {
      await api.createField({
        ...form,
        name: form.name.trim(),
        fieldAreaAcre: areaAcre,
        fieldAreaHectare: parseFloat((areaAcre / 2.47105).toFixed(2)),
        mulchingUsed: form.mulchingUsed ? 'Yes' : 'No',
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null
      });
      await loadFields();
      Alert.alert('Field Added', 'Your field has been created successfully.', [
        { text: 'OK', onPress: () => navigation?.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Could not save', err.message || 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const Chips = ({ options, value, onChange, render }) => (
    <View style={styles.chips}>
      {options.map((o) => {
        const key = typeof o === 'string' ? o : o.key;
        const on = value === key;
        const iconName = typeof o === 'object' ? o.iconName : null;
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.chip,
              isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border },
              on && styles.chipOn
            ]}
            onPress={() => onChange(key)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {iconName ? (
                <MCIcons
                  name={iconName}
                  size={15}
                  color={on ? '#fff' : (isDark ? themeColors.textSecondary : colors.textSecondary)}
                  style={{ marginRight: 6 }}
                />
              ) : null}
              <Text style={[styles.chipText, { color: isDark ? themeColors.textSecondary : colors.textSecondary }, on && styles.chipTextOn]}>
                {render ? render(o) : (typeof o === 'string' ? o : o.label)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const isFocused = (k) => focusedInput === k;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={t('addField')}
        subtitle={t('fieldSubtitle')}
        onBack={() => navigation?.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.sectionCard}>
          <Text style={[styles.label, { color: themeColors.textPrimary }]}>{t('fieldNameLabel')}</Text>
          <TextInput
            style={[
              styles.input,
              isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border, color: themeColors.textPrimary },
              isFocused('name') && styles.inputFocused
            ]}
            placeholder={t('fieldNamePlaceholder')}
            value={form.name}
            onChangeText={(v) => set({ name: v })}
            placeholderTextColor={themeColors.textMuted}
            onFocus={() => setFocusedInput('name')}
            onBlur={() => setFocusedInput('')}
          />

          <Text style={[styles.label, { marginTop: spacing.lg, color: themeColors.textPrimary }]}>{t('fieldAreaLabel')}</Text>
          <TextInput
            style={[
              styles.input,
              isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border, color: themeColors.textPrimary },
              isFocused('area') && styles.inputFocused
            ]}
            value={form.fieldAreaAcre}
            onChangeText={(v) => set({ fieldAreaAcre: v.replace(',', '.') })}
            keyboardType="decimal-pad"
            placeholder={t('fieldAreaPlaceholder')}
            placeholderTextColor={themeColors.textMuted}
            onFocus={() => setFocusedInput('area')}
            onBlur={() => setFocusedInput('')}
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Farm Region</Text>
          <Chips options={REGIONS} value={form.region} onChange={(v) => set({ region: v })} />

          <View style={styles.gpsRow}>
            <Text style={[styles.gpsLabel, { color: themeColors.textSecondary }]}>Farm Coordinates</Text>
            <TouchableOpacity
              onPress={detectLocation}
              disabled={detectingLoc}
              style={[
                styles.gpsDetectBtn,
                isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }
              ]}
              activeOpacity={0.8}
            >
              {detectingLoc ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <Text style={[styles.gpsDetectBtnText, isDark && { color: themeColors.accent }]}>Locate</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.coordInputsRow}>
            <TextInput
              style={[
                styles.input,
                { flex: 1 },
                isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border, color: themeColors.textPrimary },
                isFocused('lat') && styles.inputFocused
              ]}
              placeholder="Latitude"
              value={form.latitude}
              onChangeText={(v) => set({ latitude: v.replace(',', '.') })}
              keyboardType="decimal-pad"
              placeholderTextColor={themeColors.textMuted}
              onFocus={() => setFocusedInput('lat')}
              onBlur={() => setFocusedInput('')}
            />
            <TextInput
              style={[
                styles.input,
                { flex: 1 },
                isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border, color: themeColors.textPrimary },
                isFocused('lon') && styles.inputFocused
              ]}
              placeholder="Longitude"
              value={form.longitude}
              onChangeText={(v) => set({ longitude: v.replace(',', '.') })}
              keyboardType="decimal-pad"
              placeholderTextColor={themeColors.textMuted}
              onFocus={() => setFocusedInput('lon')}
              onBlur={() => setFocusedInput('')}
            />
          </View>
          <Text style={[styles.gpsHint, { color: themeColors.textMuted }]}>
            Used to query local meteorological readings for weather-informed advice.
          </Text>
        </Card>

        {/* Soil Type */}
        <Text style={[styles.sectionHeader, { color: themeColors.textPrimary }]}>{t('soilType')}</Text>
        <View style={styles.soilGrid}>
          {SOILS.map((s) => {
            const on = form.soilType === s.name;
            return (
              <TouchableOpacity
                key={s.name}
                style={[
                  styles.soilTile,
                  isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border },
                  on && styles.soilTileOn
                ]}
                onPress={() => set({ soilType: s.name })}
                activeOpacity={0.85}
              >
                <MCIcons name={s.iconName} size={28} color={on ? themeColors.primary : themeColors.textSecondary} />
                <Text style={[styles.soilName, { color: themeColors.textSecondary }, on && { color: themeColors.primary }]}>{s.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cane Variety */}
        <Text style={[styles.sectionHeader, { color: themeColors.textPrimary }]}>{t('caneVarietyLabel')}</Text>
        {VARIETIES.map((v) => {
          const on = form.cropVariety === v.code;
          return (
            <TouchableOpacity
              key={v.code}
              style={[
                styles.varietyCard,
                isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border },
                on && styles.varietyCardOn
              ]}
              onPress={() => set({ cropVariety: v.code })}
              activeOpacity={0.85}
            >
              <View style={[styles.radioCircle, on && styles.radioCircleOn]}>
                {on && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.varietyCode, { color: themeColors.textPrimary }]}>{v.code}</Text>
                <Text style={[styles.varietyDesc, { color: themeColors.textSecondary }]}>{v.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Growth Stage */}
        <Text style={[styles.sectionHeader, { color: themeColors.textPrimary }]}>{t('growthStage')}</Text>
        <Card style={styles.sectionCard}>
          <Chips
            options={STAGES.map((s) => ({ key: s.key, label: t('stage' + s.key, s.label), iconName: s.iconName }))}
            value={form.cropGrowthStage}
            onChange={(v) => set({ cropGrowthStage: v })}
          />
        </Card>

        {/* Irrigation & Practices */}
        <Text style={[styles.sectionHeader, { color: themeColors.textPrimary }]}>{t('irrigationMethod')}</Text>
        <Card style={styles.sectionCard}>
          <Chips
            options={IRRIGATION}
            value={form.irrigationType}
            onChange={(v) => set({ irrigationType: v })}
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={[styles.switchTitle, { color: themeColors.textPrimary }]}>{t('mulchingLabel')}</Text>
              <Text style={[styles.switchSub, { color: themeColors.textSecondary }]}>Conserves soil moisture & cools roots</Text>
            </View>
            <Switch
              value={form.mulchingUsed}
              onValueChange={(v) => set({ mulchingUsed: v })}
              trackColor={{ false: themeColors.border, true: themeColors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          isDark && {
            backgroundColor: 'rgba(18, 18, 18, 0.96)',
            borderTopColor: themeColors.border
          }
        ]}
      >
        <Button
          title={t('saveFieldBtn')}
          onPress={handleSave}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  scroll: {
    padding: spacing.lg
  },
  sectionCard: {
    borderRadius: 18,
    padding: spacing.lg
  },
  label: {
    ...typography.small,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6
  },
  input: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.border
  },
  inputFocused: {
    borderColor: colors.borderFocused,
    ...shadows.sm
  },
  sectionHeader: {
    ...typography.h3,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    ...typography.h4,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  chipTextOn: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: 6
  },
  gpsLabel: {
    ...typography.small,
    fontWeight: '700',
    color: colors.textPrimary
  },
  gpsDetectBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.accentMint,
    borderWidth: 1,
    borderColor: colors.borderFocused
  },
  gpsDetectBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800'
  },
  coordInputsRow: {
    flexDirection: 'row',
    gap: 8
  },
  gpsHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 16
  },
  soilGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  soilTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: 'center',
    ...shadows.sm
  },
  soilTileOn: {
    borderColor: colors.accent,
    backgroundColor: '#FFFFFF'
  },
  soilName: {
    ...typography.h4,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6
  },
  varietyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  varietyCardOn: {
    borderColor: colors.accent,
    backgroundColor: '#FFFFFF'
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioCircleOn: {
    borderColor: colors.accent
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent
  },
  varietyCode: {
    ...typography.h4,
    fontWeight: '800',
    color: colors.textPrimary
  },
  varietyDesc: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  switchTitle: {
    ...typography.h4,
    fontWeight: '700',
    color: colors.textPrimary
  },
  switchSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(244, 248, 245, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  }
});
