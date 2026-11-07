import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import Header from '../components/Header';
import { Card, Button, Pill, IconBubble } from '../components/ui';
import { PARAMS, DEFAULT_READING, idealText, getStatus } from '../constants/soil';

const SAMPLE_COUNT = 5;
const jitter = (base, std) => (Math.round((parseFloat(base) + (Math.random() - 0.5) * 2 * std) * 100) / 100).toString();
const SPREAD = { Soil_Moisture: 2.2, Soil_pH: 0.25, Nitrogen_Level: 10, Phosphorus_Level: 3.5, Potassium_Level: 12, Organic_Carbon: 0.06, Electrical_Conductivity: 0.08, Temperature: 0.9, Humidity: 3 };

export default function SoilAnalysisScreen({ navigation, route }) {
  const { user, fields, selectedField, setSelectedField, setLatestAdvisory, setLastReading, loadHistory, themeColors, isDark, t } = useApp();
  const activeField = selectedField || route?.params?.field;

  const [readings, setReadings] = useState(() =>
    Array.from({ length: SAMPLE_COUNT }, (_, i) => ({ ...DEFAULT_READING, sample_index: i + 1 }))
  );
  const [showMore, setShowMore] = useState(false);
  const [reading, setReading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sensorDone, setSensorDone] = useState(false);

  // One set of values is shown; edits apply to every sample sent to the analysis.
  const values = readings[0];
  const updateValue = (param, value) => {
    setReadings((prev) => prev.map((r) => ({ ...r, [param]: value })));
  };

  const readSensor = async () => {
    setReading(true);
    try {
      const res = await api.simulateReadings({
        Soil_Moisture: values.Soil_Moisture,
        Soil_pH: values.Soil_pH,
        Nitrogen_Level: values.Nitrogen_Level,
        Phosphorus_Level: values.Phosphorus_Level,
        Potassium_Level: values.Potassium_Level,
        Organic_Carbon: values.Organic_Carbon,
        Electrical_Conductivity: values.Electrical_Conductivity,
        Temperature: values.Temperature,
        Humidity: values.Humidity
      });
      if (res?.readings?.length) {
        setReadings(res.readings.map((r) => {
          const row = { sample_index: r.sample_index };
          Object.keys(DEFAULT_READING).forEach((k) => { row[k] = String(r[k] !== undefined ? r[k] : DEFAULT_READING[k]); });
          return row;
        }));
        setSensorDone(true);
      }
    } catch {
      Alert.alert('Sensor not connected', 'Could not read from the IoT probe. Please ensure the probe is powered on and connected, or type your soil test readings into the fields below.');
    } finally {
      setReading(false);
    }
  };

  const runAnalysis = async () => {
    // Main macronutrients and soil conditions must be entered
    const mainKeys = ['Soil_Moisture', 'Soil_pH', 'Nitrogen_Level', 'Phosphorus_Level', 'Potassium_Level'];
    const missing = mainKeys.filter((k) => !values[k] || isNaN(parseFloat(values[k])));
    if (missing.length) {
      Alert.alert('Please enter your readings', `Please enter values for: ${missing.map((k) => PARAMS[k].label).join(', ')}.`);
      return;
    }
    setLoading(true);
    try {
      const fallbackDefaults = {
        Organic_Carbon: 0.65,
        Electrical_Conductivity: 0.50,
        Temperature: 29.5,
        Humidity: 65.0
      };

      const numeric = readings.map((r) => {
        const row = { sample_index: r.sample_index };
        Object.keys(PARAMS).forEach((k) => {
          const parsed = parseFloat(r[k]);
          row[k] = !isNaN(parsed) ? parsed : (fallbackDefaults[k] ?? 0);
        });
        return row;
      });
      const f = activeField || {};
      const result = await api.runAnalysis({
        readings: numeric,
        fieldId: f._id,
        fieldMetadata: {
          fieldName: f.name || 'My field',
          fieldAreaAcre: f.fieldAreaAcre || (f.fieldAreaHectare ? (f.fieldAreaHectare * 2.471).toFixed(1) : 2.5),
          fieldAreaHectare: f.fieldAreaHectare || 1.0,
          soilType: f.soilType || 'Loamy',
          cropGrowthStage: f.cropGrowthStage || 'Vegetative',
          season: f.season || 'Kharif',
          irrigationType: f.irrigationType || 'Drip',
          waterSource: f.waterSource || 'Borewell',
          mulchingUsed: f.mulchingUsed || 'Yes',
          region: f.region || 'South',
          rainfallMm: 12,
          sunlightHours: 7.5,
          windSpeedKmh: 8.0
        }
      });
      setLastReading({ ...numeric[0] });
      setLatestAdvisory(result);
      await loadHistory();
      navigation?.navigate('Recommendations', { advisory: result });
    } catch (err) {
      Alert.alert('Could not get your advice', err.message || 'Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderRow = (key) => {
    const p = PARAMS[key];
    const raw = values[key];
    const num = parseFloat(raw);
    const outOfRange = raw !== '' && (isNaN(num) || num < p.hard[0] || num > p.hard[1]);
    const st = getStatus(key, raw);
    return (
      <View key={key} style={[styles.row, isDark && { borderBottomColor: themeColors.border }]}>
        <IconBubble iconName={p.iconName} tone={st?.tone || 'neutral'} size={42} />
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>{t ? t('param' + key, p.label) : p.label}</Text>
          <Text style={[styles.rowVern, { color: themeColors.textSecondary }]}>{p.vern}</Text>
        </View>
        <View style={styles.rowRight}>
          <View
            style={[
              styles.inputBox,
              isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border },
              outOfRange && styles.inputBoxError
            ]}
          >
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={raw === undefined || raw === null ? '' : String(raw)}
              onChangeText={(t) => updateValue(key, t.replace(',', '.'))}
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              placeholder={p.unit ? `0.0 ${p.unit}` : '0.0'}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            />
            {p.unit ? <Text style={[styles.unit, { color: themeColors.textMuted }]}>{p.unit}</Text> : null}
          </View>
          {outOfRange ? (
            <Text style={styles.rangeWarn}>Check value</Text>
          ) : st ? (
            <Pill text={st.label} tone={st.tone} style={{ marginTop: 6 }} />
          ) : null}
        </View>
      </View>
    );
  };

  const mainKeys = Object.keys(PARAMS).filter((k) => PARAMS[k].group === 'main');
  const moreKeys = Object.keys(PARAMS).filter((k) => PARAMS[k].group === 'more');

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title={t ? t('soilAnalysis') : "Check your soil"} subtitle={activeField?.name ? `${t ? t('myFields') : 'For'}: ${activeField.name}` : (t ? t('soilAnalysisSub') : 'Add your soil readings')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {fields.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {fields.map((f) => {
              const sel = activeField?._id === f._id;
              return (
                <TouchableOpacity
                  key={f._id}
                  style={[
                    styles.chip,
                    isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border },
                    sel && styles.chipOn
                  ]}
                  onPress={() => setSelectedField(f)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, { color: themeColors.textSecondary }, sel && styles.chipTextOn]} numberOfLines={1}>{f.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Step 1 */}
        <Card style={styles.sensorCard}>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={[styles.stepTitle, { color: themeColors.textPrimary }]}>Get your soil readings</Text>
          </View>
          <Text style={[styles.stepText, { color: themeColors.textSecondary }]}>Tap the button to read from your soil sensor, or type the values in step 2.</Text>
          <Button title={sensorDone ? 'Read sensor again' : 'Read from sensor'} iconName="access-point" variant={sensorDone ? 'light' : 'primary'}
            onPress={readSensor} loading={reading} style={{ marginTop: spacing.md }} />
          {sensorDone && <Text style={styles.okText}>✓ Readings added below. You can still change them.</Text>}
        </Card>

        {/* Step 2 */}
        <View style={[styles.stepRow, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
          <Text style={[styles.stepTitle, { color: themeColors.textPrimary }]}>Check your values</Text>
        </View>
        <Card style={{ paddingVertical: spacing.xs }}>
          {mainKeys.map(renderRow)}
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowMore(!showMore)} activeOpacity={0.7}>
            <Text style={[styles.moreText, { color: themeColors.accent }]}>{showMore ? 'Less details' : 'More details'}</Text>
            <Text style={[styles.moreText, { color: themeColors.accent }]}>{showMore ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showMore && moreKeys.map(renderRow)}
        </Card>
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Always-visible action */}
      <View
        style={[
          styles.footer,
          isDark && {
            backgroundColor: 'rgba(18, 18, 18, 0.96)',
            borderTopColor: themeColors.border
          }
        ]}
      >
        <Button title="Analyze" iconName="check-decagram" onPress={runAnalysis} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  chip: { maxWidth: 200, paddingVertical: 9, paddingHorizontal: 16, borderRadius: borderRadius.full, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border, marginRight: 8 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.h4, color: colors.textSecondary },
  chipTextOn: { color: '#fff' },
  sensorCard: { padding: spacing.lg },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  stepTitle: { ...typography.h3, color: colors.textPrimary },
  stepText: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  okText: { ...typography.small, color: colors.success, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowText: { flex: 1, marginLeft: spacing.md, paddingRight: spacing.sm },
  rowLabel: { ...typography.h4, color: colors.textPrimary },
  rowVern: { ...typography.small, color: colors.textSecondary },
  rowIdeal: { ...typography.caption, color: colors.primaryLight, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 10, minHeight: 46 },
  inputBoxError: { borderColor: colors.error, backgroundColor: colors.errorLight },
  input: { minWidth: 56, maxWidth: 76, fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'right', paddingVertical: 8 },
  unit: { ...typography.caption, color: colors.textMuted, marginLeft: 4 },
  rangeWarn: { ...typography.caption, color: colors.error, marginTop: 6 },
  moreBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.xs },
  moreText: { ...typography.h4, color: colors.primaryLight },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingTop: spacing.md, backgroundColor: 'rgba(245,247,243,0.97)', borderTopWidth: 1, borderTopColor: colors.borderLight }
});
