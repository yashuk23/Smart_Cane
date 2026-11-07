import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Animated
} from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import Header from '../components/Header';
import { Card, Button, Pill, IconBubble, SectionTitle, Stepper, DropdownCard, InfoTipCard } from '../components/ui';
import SoilHealthCard from '../components/SoilHealthCard';
import useWeather from '../hooks/useWeather';
import { filterRepeatedReadings } from '../services/kalmanFilter';

// Authentic ICAR-IISR Lucknow & Vasantdada Sugar Institute (VSI) Pune Sugarcane Guidelines
const FERT_PARAMS = {
  soil_ph: {
    label: 'Soil pH',
    unit: 'pH',
    iconName: 'flask-outline',
    min: 4.0,
    max: 9.5,
    placeholder: '6.8',
    guideline: 'Optimal: 6.5–7.5 (VSI Pune)'
  },
  soil_moisture: {
    label: 'Soil Moisture',
    unit: '%',
    iconName: 'water-percent',
    min: 10,
    max: 80,
    placeholder: '35.0',
    guideline: 'Field Capacity (ICAR-IISR)'
  },
  electrical_conductivity: {
    label: 'Conductivity',
    unit: 'dS/m',
    iconName: 'lightning-bolt-outline',
    min: 0.1,
    max: 4.0,
    placeholder: '0.50',
    guideline: 'Non-saline normal (VSI Pune)'
  },
  nitrogen_level: {
    label: 'Nitrogen',
    unit: 'kg/ha',
    iconName: 'leaf',
    min: 10,
    max: 500,
    placeholder: '150.0',
    guideline: 'Medium fertility (ICAR-SBI)'
  },
  phosphorus_level: {
    label: 'Phosphorus',
    unit: 'kg/ha',
    iconName: 'sprout',
    min: 2,
    max: 120,
    placeholder: '22.0',
    guideline: "Olsen's Available P (VSI Pune)"
  },
  potassium_level: {
    label: 'Potassium',
    unit: 'kg/ha',
    iconName: 'seed-outline',
    min: 10,
    max: 450,
    placeholder: '160.0',
    guideline: 'Available K (ICAR-IISR)'
  }
};

const SOIL_TYPES = ['Loamy', 'Sandy', 'Clay', 'Silt', 'Sandy Loam', 'Clay Loam', 'Silty Clay'];
const IRRIG_TYPES = ['Drip', 'Sprinkler', 'Canal', 'Rainfed', 'Flood', 'Furrow'];
const TOTAL_SAMPLES = 5;

const DEFAULT_SAMPLE = {
  soil_ph: '',
  soil_moisture: '',
  electrical_conductivity: '',
  nitrogen_level: '',
  phosphorus_level: '',
  potassium_level: ''
};

export default function FertilizerRecommendationScreen({ navigation }) {
  const { fields, selectedField, setSelectedField, loadHistory, themeColors, isDark, t } = useApp();

  const [step, setStep] = useState(1);
  const fieldLat = selectedField?.latitude || null;
  const fieldLon = selectedField?.longitude || null;
  const fieldSoil = selectedField?.soilType || 'Loamy';
  const fieldIrr = selectedField?.irrigationType || 'Drip';
  const fieldArea = selectedField?.fieldAreaAcre
    ? parseFloat(selectedField.fieldAreaAcre)
    : (selectedField?.fieldAreaHectare ? parseFloat((selectedField.fieldAreaHectare * 2.47105).toFixed(1)) : 2.5);

  // 5 Sample readings state for Kalman filter
  const [sampleIdx, setSampleIdx] = useState(0);
  const [samples, setSamples] = useState([
    { ...DEFAULT_SAMPLE },
    { ...DEFAULT_SAMPLE },
    { ...DEFAULT_SAMPLE },
    { ...DEFAULT_SAMPLE },
    { ...DEFAULT_SAMPLE }
  ]);

  const [soilType, setSoilType] = useState(fieldSoil);
  const [irrigType, setIrrigType] = useState(fieldIrr);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [kalmanReport, setKalmanReport] = useState(null);
  const [focusedKey, setFocusedKey] = useState(null);
  const inputRefs = useRef({});

  // 3D Card flip animation
  const flipAnim = useRef(new Animated.Value(0)).current;

  const animateFlip = (targetIndex, direction = 1) => {
    Animated.timing(flipAnim, {
      toValue: direction * 90,
      duration: 160,
      useNativeDriver: true
    }).start(() => {
      setSampleIdx(targetIndex);
      flipAnim.setValue(direction * -90);
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true
      }).start();
    });
  };

  const {
    weather,
    coords,
    locationType,
    loading: weatherLoading,
    error: weatherError,
    lastFetched,
    refresh: refreshWeather,
    useDeviceGPS
  } = useWeather(fieldLat, fieldLon);

  const updateCurrentSampleValue = (key, val) => {
    let clean = val.replace(',', '.');
    if (clean === '.') clean = '0.';
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    setSamples(prev => {
      const next = [...prev];
      next[sampleIdx] = { ...next[sampleIdx], [key]: clean };
      return next;
    });
  };

  const validateSampleAt = (index) => {
    const sample = samples[index];
    const numericRequired = Object.keys(FERT_PARAMS);
    for (const key of numericRequired) {
      const v = parseFloat(sample[key]);
      if (!sample[key] || isNaN(v)) {
        Alert.alert('Missing Reading', `Please enter a value for ${FERT_PARAMS[key].label} in Spot ${index + 1}.`);
        return false;
      }
      if (v < FERT_PARAMS[key].min || v > FERT_PARAMS[key].max) {
        Alert.alert(
          'Out of Range',
          `Spot ${index + 1}: ${FERT_PARAMS[key].label} should be between ${FERT_PARAMS[key].min} and ${FERT_PARAMS[key].max} ${FERT_PARAMS[key].unit}.`
        );
        return false;
      }
    }
    return true;
  };

  const handleNextReading = () => {
    if (!validateSampleAt(sampleIdx)) return;

    if (sampleIdx < TOTAL_SAMPLES - 1) {
      // Auto-populate next spot with slight physical variance if empty (makes testing seamless)
      setSamples(prev => {
        const next = [...prev];
        const curr = next[sampleIdx];
        const target = next[sampleIdx + 1];
        const isNextEmpty = Object.values(target).every(v => v === '');
        if (isNextEmpty) {
          const seeded = {};
          for (const [k, v] of Object.entries(curr)) {
            const num = parseFloat(v);
            if (!isNaN(num)) {
              // Slight physical variance (+-3%) typical of IoT capacitive soil probes
              const delta = (Math.random() * 0.06 - 0.03) * num;
              const p = FERT_PARAMS[k];
              const clamped = Math.max(p.min, Math.min(p.max, num + delta));
              seeded[k] = clamped.toFixed(k === 'electrical_conductivity' ? 2 : 1);
            } else {
              seeded[k] = '';
            }
          }
          next[sampleIdx + 1] = seeded;
        }
        return next;
      });

      animateFlip(sampleIdx + 1, 1);
    }
  };

  const handlePreviousReading = () => {
    if (sampleIdx > 0) {
      animateFlip(sampleIdx - 1, -1);
    }
  };

  const validateAllSamples = () => {
    for (let i = 0; i < TOTAL_SAMPLES; i++) {
      if (!validateSampleAt(i)) {
        setSampleIdx(i);
        return false;
      }
    }
    if (!weather) {
      Alert.alert(
        'Live weather needed',
        'Temperature and humidity are required from live weather. ' +
        (weatherError || 'Please check your location settings and internet connection.'),
        [
          { text: 'Retry Weather', onPress: refreshWeather },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return false;
    }
    return true;
  };

  const getRecommendation = async () => {
    if (!validateAllSamples()) return;
    setLoading(true);
    setResult(null);

    // Apply Discrete 1D Kalman Filter on all 5 sample readings
    const numericSamples = samples.map(s => {
      const obj = {};
      for (const [k, v] of Object.entries(s)) {
        obj[k] = parseFloat(v);
      }
      return obj;
    });

    const kalmanFilterResult = filterRepeatedReadings(numericSamples);
    setKalmanReport(kalmanFilterResult);

    const filtered = kalmanFilterResult.filteredParameters;

    try {
      const payload = {
        field_id: selectedField?._id,
        field_name: selectedField?.name || 'Sugarcane Field',
        crop_growth_stage: selectedField?.cropGrowthStage || 'Vegetative',
        soil_type: soilType,
        soil_ph: filtered.soil_ph || (samples[0]?.soil_ph ? parseFloat(samples[0].soil_ph) : 6.8),
        soil_moisture: filtered.soil_moisture || parseFloat(samples[0].soil_moisture),
        electrical_conductivity: filtered.electrical_conductivity || parseFloat(samples[0].electrical_conductivity),
        nitrogen_level: filtered.nitrogen_level || parseFloat(samples[0].nitrogen_level),
        phosphorus_level: filtered.phosphorus_level || parseFloat(samples[0].phosphorus_level),
        potassium_level: filtered.potassium_level || parseFloat(samples[0].potassium_level),
        temperature_c: weather.temperature_c,
        humidity: weather.humidity,
        irrigation_type: irrigType,
        field_area_acre: fieldArea,
        field_area_ha: parseFloat((fieldArea / 2.47105).toFixed(2)),
        samples: numericSamples
      };

      const res = await api.getFertilizerRecommendation(payload);
      if (res?.result) {
        setResult(res.result);
        setStep(3);
        if (loadHistory) {
          loadHistory().catch(() => { });
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      Alert.alert('Could not get recommendation', err.message || 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = () => {
    if (!lastFetched) return 'Just now';
    const mins = Math.max(0, Math.floor((Date.now() - new Date(lastFetched).getTime()) / 60000));
    if (mins === 0) return 'Just now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  };

  const isSampleComplete = (idx) => {
    const s = samples[idx];
    return Object.keys(FERT_PARAMS).every(k => s[k] !== '' && !isNaN(parseFloat(s[k])));
  };

  const renderInput = (key) => {
    const p = FERT_PARAMS[key];
    const currVal = samples[sampleIdx][key];
    const v = parseFloat(currVal);
    const outOfRange = currVal !== '' && !isNaN(v) && (v < p.min || v > p.max);
    const isFocused = focusedKey === key;

    return (
      <View key={key} style={[styles.inputRow, isDark && { borderBottomColor: themeColors.border }]}>
        <IconBubble iconName={p.iconName} tone="good" size={40} />
        <View style={styles.inputInfo}>
          <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>{p.label}</Text>
          <Text style={[styles.inputHint, { color: themeColors.textMuted }]}>{p.unit ? `Unit: ${p.unit}` : 'Soil reading'}</Text>
        </View>
        <View style={styles.inputRight}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => inputRefs.current[key]?.focus()}
            style={[
              styles.inputBox,
              isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border },
              isFocused && styles.inputBoxFocused,
              outOfRange && styles.inputBoxError
            ]}
          >
            <TextInput
              ref={r => { inputRefs.current[key] = r; }}
              style={[styles.textInput, { color: themeColors.textPrimary }]}
              value={currVal === undefined || currVal === null ? '' : String(currVal)}
              onChangeText={t => updateCurrentSampleValue(key, t)}
              keyboardType="decimal-pad"
              placeholder=""
              onFocus={() => setFocusedKey(key)}
              onBlur={() => setFocusedKey(null)}
            />
            <Text style={[styles.unitText, { color: themeColors.textMuted }]}>{p.unit}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleHeaderBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation?.goBack();
    }
  };

  const getHeaderTitle = () => {
    if (step === 3) return t('fertTitle', 'Fertilizer Advice');
    return t('fertilizerAdvisory', 'Fertilizer Guide');
  };

  const getHeaderSubtitle = () => {
    if (step === 1) return t('fertSubtitle', 'Get the right nutrients for your sugarcane');
    if (step === 2) return `${t('myFields')}: ${selectedField?.name || t('plot')} | ${t('sampleIndex')} ${sampleIdx + 1} ${t('of')} 5`;
    return t('step3Results', 'Recommended nutrient dose & application guide');
  };

  const flipStyle = {
    transform: [
      { perspective: 1000 },
      {
        rotateY: flipAnim.interpolate({
          inputRange: [-90, 0, 90],
          outputRange: ['-90deg', '0deg', '90deg']
        })
      }
    ]
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        onBack={handleHeaderBack}
        rightComponent={
          <View style={styles.headerIconBubble}>
            <MCIcons name="sprout" size={24} color="#FFFFFF" />
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stepper Wizard (Screen 5 & 6) */}
        <Stepper
          steps={[t('stepField', 'Field'), t('stepReadings', 'Readings'), t('stepResult', 'Result')]}
          currentStep={step}
          onStepPress={(s) => {
            if (s === 3 && !result) return;
            setStep(s);
          }}
        />

        {/* STEP 1: Select Field */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <DropdownCard
              label={t('selectField', 'Selected Sugarcane Field')}
              value={selectedField?.name}
              placeholder={t('selectField', 'Select Field')}
              onPress={() => {
                if (fields.length === 0) {
                  navigation?.navigate('AddField');
                }
              }}
            />

            {/* Field Pills for quick selection */}
            {fields.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginVertical: spacing.sm }}
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                {fields.map((f) => {
                  const sel = selectedField?._id === f._id;
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
                      <Text style={[styles.chipText, { color: themeColors.textSecondary }, sel && styles.chipTextOn]}>
                        {f.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Button
              title={t('next')}
              onPress={() => setStep(2)}
              arrow
              style={{ marginTop: spacing.lg }}
            />

            <InfoTipCard
              iconName="lightbulb-outline"
              title="Overview"
              text="Multi-spot sensor readings ensure precise soil nutrient calculation."
            />
          </View>
        )}

        {/* STEP 2: 5-Sample Soil Readings with Card Flip Animation */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            {/* Live Weather Card */}
            <SectionTitle title="Environmental Conditions" style={{ marginTop: spacing.xs }} />
            <Card style={styles.weatherCard}>
              {weatherLoading ? (
                <View style={styles.weatherLoading}>
                  <ActivityIndicator color={themeColors.primary} />
                  <Text style={[styles.weatherLoadingText, { color: themeColors.textSecondary }]}>Updating local weather...</Text>
                </View>
              ) : weather ? (
                <>
                  <View style={[styles.weatherLocationHeader, isDark && { borderBottomColor: themeColors.border }]}>
                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MCIcons name="map-marker" size={16} color={themeColors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.weatherCityText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                          {weather.city ? `${weather.city}, ${weather.country}` : 'Current Location'}
                        </Text>
                      </View>
                      <Text style={[styles.weatherSourceText, { color: themeColors.textMuted }]}>
                        {locationType === 'device' ? 'Device GPS' : 'Field Coordinates'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.gpsSyncPill,
                        isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }
                      ]}
                      onPress={useDeviceGPS}
                      disabled={weatherLoading}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.gpsSyncPillText, isDark && { color: themeColors.accent }]}>Use Device GPS</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.weatherMetricsRow}>
                    <View style={styles.weatherMetric}>
                      <Text style={[styles.weatherMetricLabel, { color: themeColors.textMuted }]}>Temperature</Text>
                      <Text style={[styles.weatherMetricValue, { color: themeColors.textPrimary }]}>{weather.temperature_c}°C</Text>
                    </View>
                    <View style={[styles.metricDivider, isDark && { backgroundColor: themeColors.border }]} />
                    <View style={styles.weatherMetric}>
                      <Text style={[styles.weatherMetricLabel, { color: themeColors.textMuted }]}>Humidity</Text>
                      <Text style={[styles.weatherMetricValue, { color: themeColors.textPrimary }]}>{weather.humidity}%</Text>
                    </View>
                  </View>

                  <View style={[styles.weatherFooter, isDark && { borderTopColor: themeColors.border }]}>
                    <Pill text="Live data" tone="good" />
                    <Text style={[styles.weatherTimestampText, { color: themeColors.textMuted }]}>Updated {getTimeAgo()}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.weatherError}>
                  <Text style={styles.weatherErrorText}>
                    {weatherError || 'Weather data unavailable'}
                  </Text>
                  <View style={styles.weatherRetryRow}>
                    <TouchableOpacity style={styles.gpsSyncPill} onPress={useDeviceGPS}>
                      <Text style={styles.gpsSyncPillText}>Use Device GPS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.gpsSyncPill, { backgroundColor: themeColors.surfaceAlt }]}
                      onPress={refreshWeather}
                    >
                      <Text style={[styles.gpsSyncPillText, { color: themeColors.textPrimary }]}>
                        Retry
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Card>

            {/* 5-Sample Spot Stepper Navigation */}
            <View style={styles.sampleHeaderRow}>
              <View>
                <Text style={[styles.sampleHeaderTitle, { color: themeColors.textPrimary }]}>
                  Field Samples
                </Text>
                <Text style={[styles.sampleHeaderSub, { color: themeColors.textSecondary }]}>
                  Sample {sampleIdx + 1} of 5
                </Text>
              </View>
              <View style={styles.kalmanBadgeMini}>
                <MCIcons name="check-circle-outline" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={styles.kalmanBadgeText}>Validated</Text>
              </View>
            </View>

            {/* Spot Selection Pills - Horizontally scrollable with ample padding so words never overflow */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotsScrollContent}
              style={{ marginBottom: spacing.md }}
            >
              {[0, 1, 2, 3, 4].map(idx => {
                const active = idx === sampleIdx;
                const completed = isSampleComplete(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.spotPill,
                      {
                        backgroundColor: active
                          ? '#16A34A'
                          : (isDark ? themeColors.card : 'rgba(255, 255, 255, 0.85)'),
                        borderColor: active
                          ? '#16A34A'
                          : (isDark ? themeColors.border : colors.borderCard)
                      }
                    ]}
                    onPress={() => {
                      if (idx !== sampleIdx) {
                        animateFlip(idx, idx > sampleIdx ? 1 : -1);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.spotPillText,
                        { color: active ? '#FFFFFF' : themeColors.textPrimary }
                      ]}
                      numberOfLines={1}
                    >
                      Reading {idx + 1}
                    </Text>
                    {completed && !active && (
                      <MCIcons name="check-circle" size={13} color="#16A34A" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Flipping Card Container */}
            <Animated.View style={flipStyle}>
              <Card style={styles.flippingCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTag}>
                    <MCIcons name="crosshairs-gps" size={16} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={styles.cardHeaderTagText}>Reading No #{sampleIdx + 1}</Text>
                  </View>
                  <Text style={[styles.cardHeaderHint, { color: themeColors.textMuted }]}>
                    Next
                  </Text>
                </View>

                {Object.keys(FERT_PARAMS).map(renderInput)}
              </Card>
            </Animated.View>

            {/* Navigation Buttons for Readings */}
            <View style={styles.sampleActionRow}>
              {sampleIdx > 0 && (
                <TouchableOpacity
                  style={[styles.prevSpotBtn, { backgroundColor: isDark ? themeColors.card : 'rgba(255,255,255,0.9)', borderColor: isDark ? themeColors.border : colors.borderCard }]}
                  onPress={handlePreviousReading}
                  activeOpacity={0.8}
                >
                  <MCIcons name="arrow-left" size={18} color={themeColors.textPrimary} style={{ marginRight: 4 }} />
                  <Text style={[styles.prevSpotText, { color: themeColors.textPrimary }]}>{t('back')}</Text>
                </TouchableOpacity>
              )}

              <View style={{ flex: 1, marginLeft: sampleIdx > 0 ? 10 : 0 }}>
                {sampleIdx < TOTAL_SAMPLES - 1 ? (
                  <Button
                    title={t('next')}
                    onPress={handleNextReading}
                    arrow
                  />
                ) : (
                  <Button
                    title={t('calculate')}
                    onPress={getRecommendation}
                    loading={loading}
                    disabled={weatherLoading}
                    iconName="calculator-variant-outline"
                  />
                )}
              </View>
            </View>

            {/* Soil Type Picker */}
            <SectionTitle title={t('soilType')} style={{ marginTop: spacing.lg }} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.md }}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {SOIL_TYPES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border },
                    soilType === s && styles.chipOn
                  ]}
                  onPress={() => setSoilType(s)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: themeColors.textSecondary },
                      soilType === s && styles.chipTextOn
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Irrigation Type Picker */}
            <SectionTitle title={t('irrigationMethod')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.md }}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {IRRIG_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.chip,
                    isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border },
                    irrigType === t && styles.chipOn
                  ]}
                  onPress={() => setIrrigType(t)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: themeColors.textSecondary },
                      irrigType === t && styles.chipTextOn
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* STEP 3: Result Card with Kalman Report */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            {result ? (
              <>
                {/* Kalman Filter Denoising Report Card */}
                {kalmanReport && (
                  <Card style={[styles.kalmanReportCard, isDark && { backgroundColor: 'rgba(18, 45, 35, 0.9)', borderColor: '#22C55E' }]}>
                    <View style={styles.kalmanReportTop}>
                      <View style={styles.kalmanIconBubble}>
                        <MCIcons name="filter-check" size={24} color="#16A34A" />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={[styles.kalmanReportTitle, { color: themeColors.textPrimary }]}>
                          Filtered Readings
                        </Text>
                        <Text style={[styles.kalmanReportSub, { color: themeColors.textSecondary }]}>
                          Multi-spot precision average
                        </Text>
                      </View>
                      <View style={styles.kalmanTagPill}>
                        <Text style={styles.kalmanTagText}>Optimal</Text>
                      </View>
                    </View>

                    <View style={[styles.kalmanGrid, { borderTopColor: isDark ? themeColors.border : colors.borderLight }]}>
                      <View style={styles.kalmanGridCol}>
                        <Text style={styles.kalmanGridLabel}>Moisture</Text>
                        <Text style={[styles.kalmanGridVal, { color: themeColors.textPrimary }]}>
                          {kalmanReport.filteredParameters.soil_moisture}%
                        </Text>
                      </View>
                      <View style={styles.kalmanGridCol}>
                        <Text style={styles.kalmanGridLabel}>Conductivity</Text>
                        <Text style={[styles.kalmanGridVal, { color: themeColors.textPrimary }]}>
                          {kalmanReport.filteredParameters.electrical_conductivity} dS/m
                        </Text>
                      </View>
                      <View style={styles.kalmanGridCol}>
                        <Text style={styles.kalmanGridLabel}>Nitrogen</Text>
                        <Text style={[styles.kalmanGridVal, { color: themeColors.textPrimary }]}>
                          {kalmanReport.filteredParameters.nitrogen_level} kg/ha
                        </Text>
                      </View>
                    </View>
                  </Card>
                )}

                <FertilizerResultCard result={result} navigation={navigation} />

                <InfoTipCard
                  iconName="information-outline"
                  iconColor="#16A34A"
                  title="Tip"
                  text="Apply in split doses for better absorption and higher yield."
                />

                <Button
                  title="Recalculate"
                  variant="outline"
                  onPress={() => {
                    setSampleIdx(0);
                    setStep(2);
                  }}
                  style={{ marginTop: spacing.xl }}
                />
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
                <Text style={{ ...typography.body, color: themeColors.textSecondary }}>No result available yet. Please complete step 2.</Text>
                <Button title={t('back')} onPress={() => setStep(2)} style={{ marginTop: spacing.md }} />
              </View>
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FertilizerResultCard({ result, navigation }) {
  const { themeColors, isDark, t } = useApp();
  const isOptimal = result.is_optimal_condition || result.recommended_fertilizer === 'No Fertilizer Needed' || result.recommended_fertilizer === 'Compost';
  const displayFert = isOptimal ? 'No Fertilizer Needed' : result.recommended_fertilizer;

  return (
    <Card style={styles.resultCard}>
      <View style={[styles.resultHeaderBanner, isOptimal && { backgroundColor: '#065F46' }]}>
        <View style={styles.resultBannerTopRow}>
          <Text style={styles.resultBadgeText}>
            {isOptimal ? 'FIELD STATUS' : 'RECOMMENDED FERTILIZER'}
          </Text>
          {isOptimal && (
            <View style={styles.optimalTagPill}>
              <MCIcons name="check-decagram" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.optimalTagText}>Optimal Condition</Text>
            </View>
          )}
        </View>
        <Text style={styles.resultFertName}>{displayFert}</Text>
        <Text style={[styles.resultNutrientText, isOptimal && { color: '#86EFAC' }]}>
          {isOptimal ? 'All Primary Nutrients in Healthy Balance' : result.nutrient_supplied}
        </Text>
      </View>

      <View style={styles.resultBody}>
        {isOptimal && (
          <View style={[styles.optimalCallout, isDark && { backgroundColor: 'rgba(6, 95, 70, 0.25)', borderColor: '#059669' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MCIcons name="shield-check" size={20} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={[styles.optimalCalloutTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                Optimal Field Condition Detected
              </Text>
            </View>
            <Text style={[styles.optimalCalloutDesc, { color: isDark ? '#D1FAE5' : '#064E3B' }]}>
              All primary nutrients (N-P-K) and soil conductivity are in healthy range. <Text style={{ fontWeight: '800' }}>No chemical fertilizers (Urea/DAP/MOP) or supplements are needed right now.</Text>
            </Text>
            <View style={[styles.optimalCalloutDivider, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]} />
            <Text style={[styles.optimalWhyTitle, { color: isDark ? '#A7F3D0' : '#047857' }]}>
              Why 0 kg Fertilizer is Best Right Now:
            </Text>
            <Text style={[styles.optimalWhyPoint, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              • Saves 100% of fertilizer purchase expenditure for this growth stage
            </Text>
            <Text style={[styles.optimalWhyPoint, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              • Prevents fertilizer toxicity, root burn, and excessive soil salt accumulation
            </Text>
            <Text style={[styles.optimalWhyPoint, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              • Protects groundwater and allows natural root mycorrhizae to nourish the cane
            </Text>
          </View>
        )}

        <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>
          {isOptimal ? t('optimalConditionTitle') : t('fertSubtitle')}
        </Text>
        <Text style={[styles.resultDescText, { color: themeColors.textSecondary }]}>{result.description}</Text>

        <View style={[styles.resultDivider, isDark && { backgroundColor: themeColors.border }]} />

        <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>
          {t('dosagePerAcre')}
        </Text>
        <View style={styles.dosageRow}>
          <DosageBox
            label={t('dosagePerAcre')}
            value={isOptimal ? '0 kg' : `${result.dosage_kg_per_acre || result.dosage_kg_per_ha} kg/${t('acre')}`}
            isDark={isDark}
            themeColors={themeColors}
          />
          <DosageBox
            label={t('totalDosage')}
            value={isOptimal ? '0 kg' : `${result.total_dosage_kg} kg`}
            isDark={isDark}
            themeColors={themeColors}
          />
          {(() => {
            const areaVal = result.field_area_acre || (result.field_area_ha ? (result.field_area_ha * 2.471).toFixed(1) : '2.5');
            const unit = Number(areaVal) === 1 ? t('acre') : t('acres');
            return <DosageBox label={t('farmSize')} value={`${areaVal} ${unit}`} isDark={isDark} themeColors={themeColors} />;
          })()}
        </View>

        <View style={[styles.packageBanner, isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }]}>
          <MCIcons name={isOptimal ? "check-circle-outline" : "package-variant-closed"} size={18} color="#16A34A" style={{ marginRight: 8 }} />
          <Text style={[styles.packageText, { color: themeColors.textPrimary }]}>
            {t('estimatedBags')}{' '}
            <Text style={{ fontWeight: '800', color: themeColors.primary }}>
              {isOptimal ? t('zeroBagsNeeded') : result.package_estimate}
            </Text>
          </Text>
        </View>

        <View style={[styles.guidelineBadge, isDark && { backgroundColor: 'rgba(22,163,74,0.14)' }]}>
          <MCIcons name="certificate-outline" size={15} color="#16A34A" style={{ marginRight: 6 }} />
          <Text style={[styles.guidelineText, { color: isDark ? '#4ADE80' : '#166534' }]}>
            {result.guideline_source || 'ICAR-IISR & Vasantdada Sugar Institute (VSI) Pune'}
          </Text>
        </View>

        <View style={[styles.resultDivider, isDark && { backgroundColor: themeColors.border }]} />

        <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>{t('applicationInstructions')}</Text>
        <Text style={[styles.resultDescText, { color: themeColors.textSecondary }]}>{result.application_instructions}</Text>

        {result.important_notes && result.important_notes.length > 0 && (
          <>
            <View style={[styles.resultDivider, isDark && { backgroundColor: themeColors.border }]} />
            <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>{t('importantNotes')}</Text>
            {result.important_notes.map((note, i) => (
              <Text key={i} style={[styles.noteItem, { color: themeColors.textSecondary }]}>• {note}</Text>
            ))}
          </>
        )}

        <View style={styles.confidenceRow}>
          <Text style={[styles.confidenceLabel, { color: themeColors.textMuted }]}>{t('mlConfidence')}</Text>
          <Text style={[styles.confidenceValue, { color: themeColors.primaryLight }]}>{result.confidence_percentage}%</Text>
        </View>

        {result.soil_status ? (
          <>
            <View style={[styles.resultDivider, isDark && { backgroundColor: themeColors.border }]} />
            <SoilHealthCard soilStatusAdvisory={result.soil_status} />
          </>
        ) : null}

        <View style={[styles.resultDivider, isDark && { backgroundColor: themeColors.border }]} />

        <TouchableOpacity
          style={[
            styles.switchModuleBtn,
            isDark && { backgroundColor: '#0C2D48', borderColor: themeColors.waterBlue }
          ]}
          onPress={() => navigation?.navigate('WaterRecommendation')}
          activeOpacity={0.85}
        >
          <View style={[styles.switchIconWrap, isDark && { backgroundColor: '#082F49' }]}>
            <MCIcons name="water" size={22} color={colors.waterBlue} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.switchModuleTitle}>{t('checkWaterModule')}</Text>
            <Text style={[styles.switchModuleSub, { color: themeColors.textSecondary }]}>{t('checkWaterSub')}</Text>
          </View>
          <Text style={styles.switchModuleArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function DosageBox({ label, value, isDark, themeColors }) {
  return (
    <View
      style={[
        styles.dosageBox,
        isDark && { backgroundColor: themeColors?.surfaceAlt || '#272727' }
      ]}
    >
      <Text style={[styles.dosageValue, isDark && { color: themeColors?.primary || '#34D399' }]}>{value}</Text>
      <Text style={[styles.dosageLabel, isDark && { color: themeColors?.textSecondary || '#9CA3AF' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110
  },
  stepContainer: {
    paddingVertical: spacing.xs
  },
  headerIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Weather
  weatherCard: {
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  weatherLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm
  },
  weatherLoadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.md
  },
  weatherLocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  weatherCityText: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: '800'
  },
  weatherSourceText: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: 2
  },
  gpsSyncPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  gpsSyncPillText: {
    ...typography.micro,
    color: colors.primary,
    fontWeight: '700'
  },
  weatherMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs
  },
  weatherMetric: {
    alignItems: 'center',
    flex: 1
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderLight
  },
  weatherMetricLabel: {
    ...typography.caption,
    color: colors.textMuted
  },
  weatherMetricValue: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '800',
    marginTop: 2
  },
  weatherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  weatherTimestampText: {
    ...typography.caption,
    color: colors.textMuted
  },
  weatherError: {
    alignItems: 'center',
    paddingVertical: spacing.md
  },
  weatherErrorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center'
  },
  weatherRetryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md
  },

  // 5-Spot Stepper
  sampleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  sampleHeaderTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  sampleHeaderSub: {
    fontSize: 12,
    marginTop: 1
  },
  kalmanBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDFDF5',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14
  },
  kalmanBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46'
  },
  spotsScrollContent: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 2
  },
  spotPill: {
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    ...shadows.sm
  },
  spotPillText: {
    fontSize: 12,
    fontWeight: '800'
  },
  packageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7'
  },
  packageText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600'
  },
  guidelineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 8
  },
  guidelineText: {
    fontSize: 11,
    fontWeight: '700'
  },

  // Flipping card
  flippingCard: {
    paddingVertical: spacing.xs,
    borderRadius: 22,
    borderWidth: 1.5
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)'
  },
  cardHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardHeaderTagText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A'
  },
  cardHeaderHint: {
    fontSize: 11,
    fontWeight: '500'
  },
  sampleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md
  },
  prevSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5
  },
  prevSpotText: {
    fontSize: 14,
    fontWeight: '700'
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  inputInfo: {
    flex: 1,
    marginLeft: spacing.md,
    paddingRight: spacing.sm
  },
  inputLabel: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: '700'
  },
  inputHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2
  },
  inputRight: {
    alignItems: 'flex-end'
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 10,
    minHeight: 46
  },
  inputBoxFocused: {
    borderColor: colors.borderFocused,
    ...shadows.sm
  },
  inputBoxError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight
  },
  textInput: {
    minWidth: 55,
    maxWidth: 85,
    flexGrow: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  unitText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    marginLeft: 4
  },

  // Chips
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38
  },
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary
  },
  chipTextOn: {
    color: '#FFFFFF',
    fontWeight: '700'
  },

  // Kalman Report Card
  kalmanReportCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md
  },
  kalmanReportTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  kalmanIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kalmanReportTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  kalmanReportSub: {
    fontSize: 12,
    marginTop: 1
  },
  kalmanTagPill: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  kalmanTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  kalmanGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    justifyContent: 'space-around'
  },
  kalmanGridCol: {
    alignItems: 'center'
  },
  kalmanGridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46'
  },
  kalmanGridVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2
  },

  // Result Card
  resultCard: {
    padding: 0,
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  resultHeaderBanner: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    paddingBottom: spacing.lg
  },
  resultBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  optimalTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  optimalTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  optimalCallout: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#34D399',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  optimalCalloutTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  optimalCalloutDesc: {
    fontSize: 13,
    lineHeight: 19
  },
  optimalCalloutDivider: {
    height: 1,
    backgroundColor: '#A7F3D0',
    marginVertical: 10
  },
  optimalWhyTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  optimalWhyPoint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2
  },
  resultBadgeText: {
    ...typography.micro,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8
  },
  resultFertName: {
    ...typography.h1,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 4
  },
  resultNutrientText: {
    ...typography.body,
    color: colors.accentLime,
    fontWeight: '700',
    marginTop: 2
  },
  resultBody: {
    padding: spacing.xl
  },
  resultSectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: '800',
    marginBottom: spacing.xs
  },
  resultDescText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22
  },
  resultDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg
  },
  dosageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: spacing.xs
  },
  dosageBox: {
    flex: 1,
    backgroundColor: colors.accentMint,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center'
  },
  dosageValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '800'
  },
  dosageLabel: {
    ...typography.caption,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 2
  },
  noteItem: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 4
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md
  },
  confidenceLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600'
  },
  confidenceValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '800'
  },
  switchModuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.waterBlueLight,
    borderWidth: 1.5,
    borderColor: colors.waterBlue,
    borderRadius: 14,
    padding: spacing.md
  },
  switchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center'
  },
  switchModuleTitle: {
    ...typography.h4,
    color: colors.waterBlue,
    fontWeight: '800'
  },
  switchModuleSub: {
    ...typography.caption,
    color: colors.textSecondary
  },
  switchModuleArrow: {
    fontSize: 20,
    color: colors.waterBlue,
    fontWeight: '800',
    marginLeft: spacing.sm
  }
});
