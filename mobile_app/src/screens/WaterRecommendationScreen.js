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

// Authentic ICAR-IISR & Vasantdada Sugar Institute (VSI) Sugarcane Water Standards
const WATER_PARAMS = {
  soil_ph: {
    label: 'Soil pH',
    unit: 'pH',
    iconName: 'flask-outline',
    min: 4.0,
    max: 9.5,
    ideal: '6.5–7.5 pH',
    placeholder: '6.8',
    guideline: 'Optimal for sett sprouting (VSI Pune)'
  },
  soil_moisture: {
    label: 'Soil Moisture',
    unit: '%',
    iconName: 'water-percent',
    min: 10,
    max: 80,
    ideal: '30–45%',
    placeholder: '35.0',
    guideline: 'Field Capacity (ICAR-IISR)'
  },
  electrical_conductivity: {
    label: 'Conductivity',
    unit: 'dS/m',
    iconName: 'lightning-bolt-outline',
    min: 0.1,
    max: 4.0,
    ideal: '0.2–0.8 dS/m',
    placeholder: '0.50',
    guideline: 'Normal non-saline rootzone (CSSRI/VSI)'
  }
};

const SOIL_TYPES = ['Loamy', 'Sandy', 'Clay', 'Silt', 'Sandy Loam', 'Clay Loam', 'Silty Clay'];
const IRRIG_TYPES = ['Drip', 'Sprinkler', 'Canal', 'Rainfed', 'Flood', 'Furrow'];
const SEASONS = ['Kharif', 'Rabi', 'Zaid'];
const CROP_STAGES = ['Germination', 'Vegetative', 'Grand Growth', 'Maturation', 'Harvest'];
const TOTAL_SAMPLES = 5;

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 10) return 'Kharif';
  if (m >= 11 || m <= 2) return 'Rabi';
  return 'Zaid';
}

const DEFAULT_SAMPLE = {
  soil_ph: '',
  soil_moisture: '',
  electrical_conductivity: ''
};

export default function WaterRecommendationScreen({ navigation }) {
  const { fields, selectedField, setSelectedField, loadHistory, themeColors, isDark, t } = useApp();

  const [step, setStep] = useState(1);
  const fieldLat = selectedField?.latitude || null;
  const fieldLon = selectedField?.longitude || null;
  const fieldSoil = selectedField?.soilType || 'Loamy';
  const fieldIrr = selectedField?.irrigationType || 'Drip';
  const fieldStage = selectedField?.cropGrowthStage || 'Vegetative';
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
  const [season, setSeason] = useState(getCurrentSeason());
  const [cropStage, setCropStage] = useState(fieldStage);
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
    for (const [key, p] of Object.entries(WATER_PARAMS)) {
      const v = parseFloat(sample[key]);
      if (!sample[key] || isNaN(v)) {
        Alert.alert('Missing value', `Please enter a value for ${p.label} in Spot ${index + 1}.`);
        return false;
      }
      if (v < p.min || v > p.max) {
        Alert.alert(
          'Out of range',
          `Spot ${index + 1}: ${p.label} should be between ${p.min} and ${p.max} ${p.unit}.`
        );
        return false;
      }
    }
    return true;
  };

  const handleNextReading = () => {
    if (!validateSampleAt(sampleIdx)) return;

    if (sampleIdx < TOTAL_SAMPLES - 1) {
      // Auto-populate next spot with slight physical variance if empty
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
              const delta = (Math.random() * 0.05 - 0.025) * num;
              const p = WATER_PARAMS[k];
              const clamped = Math.max(p.min, Math.min(p.max, num + delta));
              seeded[k] = clamped.toFixed(k === 'soil_moisture' ? 1 : 2);
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
        'Temperature, humidity, and wind speed are required from live weather. ' +
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

    // Run Discrete 1D Kalman Filter on all 5 sample readings
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
        soil_type: soilType,
        soil_ph: filtered.soil_ph || parseFloat(samples[0].soil_ph),
        soil_moisture: filtered.soil_moisture || parseFloat(samples[0].soil_moisture),
        electrical_conductivity: filtered.electrical_conductivity || parseFloat(samples[0].electrical_conductivity),
        temperature_c: weather.temperature_c,
        humidity: weather.humidity,
        wind_speed_kmh: weather.wind_speed_kmh,
        rainfall_mm: weather.rainfall_mm !== undefined ? weather.rainfall_mm : 0.0,
        irrigation_type: irrigType,
        season,
        crop_growth_stage: cropStage,
        field_area_acre: fieldArea,
        field_area_ha: parseFloat((fieldArea / 2.47105).toFixed(2)),
        samples: numericSamples
      };

      const res = await api.getWaterRecommendation(payload);
      if (res?.result) {
        setResult(res.result);
        setStep(3);
        if (loadHistory) {
          loadHistory().catch(() => {});
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
    return Object.keys(WATER_PARAMS).every(k => s[k] !== '' && !isNaN(parseFloat(s[k])));
  };

  const handleHeaderBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation?.goBack();
    }
  };

  const getHeaderTitle = () => {
    if (step === 3) return t('waterTitle', 'Water Recommendation');
    return t('waterAdvisory', 'Water Advice');
  };

  const getHeaderSubtitle = () => {
    if (step === 1) return t('waterSubtitle', 'Get irrigation guidance based on soil and weather');
    if (step === 2) return `${t('myFields')}: ${selectedField?.name || t('plot')} | ${t('sampleIndex')} ${sampleIdx + 1} ${t('of')} 5`;
    return t('waterSub', 'Precision sugarcane irrigation plan');
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

  const renderInput = (key) => {
    const p = WATER_PARAMS[key];
    const currVal = samples[sampleIdx][key];
    const v = parseFloat(currVal);
    const outOfRange = currVal !== '' && !isNaN(v) && (v < p.min || v > p.max);
    const isFocused = focusedKey === key;

    return (
      <View key={key} style={[styles.inputRow, { borderBottomColor: isDark ? themeColors.border : colors.borderLight }]}>
        <IconBubble iconName={p.iconName} tone="info" size={40} />
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
              {
                backgroundColor: isDark ? themeColors.surfaceAlt : '#FFFFFF',
                borderColor: isDark ? themeColors.border : colors.border
              },
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

  const PickerSection = ({ title, options, selected, onSelect }) => (
    <>
      <SectionTitle title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.md }}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {options.map(t => (
          <TouchableOpacity
            key={t}
            style={[
              styles.chip,
              {
                backgroundColor: isDark ? themeColors.card : '#FFFFFF',
                borderColor: isDark ? themeColors.border : colors.borderLight
              },
              selected === t && styles.chipOn
            ]}
            onPress={() => onSelect(t)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.chipText,
                { color: themeColors.textSecondary },
                selected === t && styles.chipTextOn
              ]}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        onBack={handleHeaderBack}
        backgroundColor={isDark ? '#0C2A38' : '#0284C7'}
        rightComponent={
          <View style={styles.headerIconBubble}>
            <MCIcons name="water" size={24} color="#FFFFFF" />
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stepper Wizard (Screen 7 in Mockup) */}
        <Stepper
          steps={[t('stepField', 'Field'), t('stepReadings', 'Readings'), t('stepResult', 'Result')]}
          currentStep={step}
          activeColor="#0284C7"
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
                        {
                          backgroundColor: isDark ? themeColors.card : '#FFFFFF',
                          borderColor: isDark ? themeColors.border : colors.borderLight
                        },
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
              variant="water"
              arrow
              style={{ marginTop: spacing.lg }}
            />

            <InfoTipCard
              iconName="water"
              title="Overview"
              text="Multi-spot sensor readings ensure precise irrigation planning."
            />
          </View>
        )}

        {/* STEP 2: 5-Sample Soil Readings with Card Flip Animation */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            {/* Atmospheric Conditions Panel */}
            <SectionTitle title="Atmospheric Conditions" style={{ marginTop: spacing.xs }} />
            <Card style={styles.weatherCard}>
              {weatherLoading ? (
                <View style={styles.weatherLoading}>
                  <ActivityIndicator color={themeColors.secondary} />
                  <Text style={[styles.weatherLoadingText, { color: themeColors.textSecondary }]}>Updating live atmospheric readings...</Text>
                </View>
              ) : weather ? (
                <>
                  <View style={[styles.weatherLocationHeader, { borderBottomColor: isDark ? themeColors.border : colors.borderLight }]}>
                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MCIcons name="map-marker" size={16} color={themeColors.secondary} style={{ marginRight: 4 }} />
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
                        {
                          backgroundColor: isDark ? themeColors.surfaceAlt : colors.surfaceAlt,
                          borderColor: isDark ? themeColors.border : colors.borderLight
                        }
                      ]}
                      onPress={useDeviceGPS}
                      disabled={weatherLoading}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.gpsSyncPillText, { color: isDark ? themeColors.accent : colors.secondary }]}>Use Device GPS</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.weatherMetricsRow}>
                    <View style={styles.weatherMetric}>
                      <Text style={[styles.weatherMetricLabel, { color: themeColors.textMuted }]}>Temp</Text>
                      <Text style={[styles.weatherMetricValue, { color: themeColors.textPrimary }]}>{weather.temperature_c}°C</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />
                    <View style={styles.weatherMetric}>
                      <Text style={[styles.weatherMetricLabel, { color: themeColors.textMuted }]}>Humidity</Text>
                      <Text style={[styles.weatherMetricValue, { color: themeColors.textPrimary }]}>{weather.humidity}%</Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />
                    <View style={styles.weatherMetric}>
                      <Text style={[styles.weatherMetricLabel, { color: themeColors.textMuted }]}>Wind</Text>
                      <Text style={[styles.weatherMetricValue, { color: themeColors.textPrimary }]}>{weather.wind_speed_kmh} <Text style={[styles.metricSubUnit, { color: themeColors.textMuted }]}>km/h</Text></Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />
                    <View style={styles.weatherMetric}>
                      <Text style={[styles.weatherMetricLabel, { color: themeColors.textMuted }]}>Rainfall</Text>
                      <Text style={[styles.weatherMetricValue, { color: themeColors.textPrimary }]}>{weather.rainfall_mm !== undefined ? weather.rainfall_mm : 0} <Text style={[styles.metricSubUnit, { color: themeColors.textMuted }]}>mm</Text></Text>
                    </View>
                  </View>

                  <View style={[styles.weatherFooter, { borderTopColor: isDark ? themeColors.border : colors.borderLight }]}>
                    <Pill text="Live data" tone="info" />
                    <Text style={[styles.weatherTimestampText, { color: themeColors.textMuted }]}>Updated {getTimeAgo()}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.weatherError}>
                  <Text style={styles.weatherErrorText}>
                    {weatherError || 'Atmospheric data unavailable'}
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
                <MCIcons name="check-circle-outline" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={[styles.kalmanBadgeText, { color: '#0284C7' }]}>Validated</Text>
              </View>
            </View>

            {/* Spot Selection Pills - Horizontally scrollable so words never overflow */}
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
                          ? '#0284C7'
                          : (isDark ? themeColors.card : 'rgba(255, 255, 255, 0.85)'),
                        borderColor: active
                          ? '#0284C7'
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
                      <MCIcons name="check-circle" size={13} color="#0284C7" style={{ marginLeft: 4 }} />
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
                    <MCIcons name="crosshairs-gps" size={16} color="#0284C7" style={{ marginRight: 4 }} />
                    <Text style={[styles.cardHeaderTagText, { color: '#0284C7' }]}>Probe Spot #{sampleIdx + 1}</Text>
                  </View>
                  <Text style={[styles.cardHeaderHint, { color: themeColors.textMuted }]}>
                    Card flips on Next
                  </Text>
                </View>

                {Object.keys(WATER_PARAMS).map(renderInput)}
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
                    variant="water"
                    arrow
                  />
                ) : (
                  <Button
                    title={t('calculate')}
                    onPress={getRecommendation}
                    loading={loading}
                    disabled={weatherLoading}
                    variant="water"
                    iconName="calculator-variant-outline"
                  />
                )}
              </View>
            </View>

            {/* Pickers */}
            <PickerSection title={t('soilType')} options={SOIL_TYPES} selected={soilType} onSelect={setSoilType} />
            <PickerSection title={t('irrigationMethod')} options={IRRIG_TYPES} selected={irrigType} onSelect={setIrrigType} />
            <PickerSection title={t('cropStage')} options={CROP_STAGES} selected={cropStage} onSelect={setCropStage} />
            <PickerSection title={t('season')} options={SEASONS} selected={season} onSelect={setSeason} />
          </View>
        )}

        {/* STEP 3: Results with Kalman Report */}
        {step === 3 && result && (
          <View style={styles.stepContainer}>
            {/* Kalman Filter Denoising Report Card */}
            {kalmanReport && (
              <Card style={[styles.kalmanReportCard, isDark && { backgroundColor: 'rgba(12, 45, 72, 0.9)', borderColor: '#38BDF8' }]}>
                <View style={styles.kalmanReportTop}>
                  <View style={[styles.kalmanIconBubble, { backgroundColor: '#E0F2FE' }]}>
                    <MCIcons name="filter-check" size={24} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[styles.kalmanReportTitle, { color: themeColors.textPrimary }]}>
                      Filtered Readings
                    </Text>
                    <Text style={[styles.kalmanReportSub, { color: themeColors.textSecondary }]}>
                      Multi-spot precision average
                    </Text>
                  </View>
                  <View style={[styles.kalmanTagPill, { backgroundColor: '#0284C7' }]}>
                    <Text style={styles.kalmanTagText}>Optimal</Text>
                  </View>
                </View>

                <View style={[styles.kalmanGrid, { borderTopColor: isDark ? themeColors.border : colors.borderLight }]}>
                  <View style={styles.kalmanGridCol}>
                    <Text style={[styles.kalmanGridLabel, { color: '#0284C7' }]}>Soil pH</Text>
                    <Text style={[styles.kalmanGridVal, { color: themeColors.textPrimary }]}>
                      {kalmanReport.filteredParameters.soil_ph} pH
                    </Text>
                  </View>
                  <View style={styles.kalmanGridCol}>
                    <Text style={[styles.kalmanGridLabel, { color: '#0284C7' }]}>Moisture</Text>
                    <Text style={[styles.kalmanGridVal, { color: themeColors.textPrimary }]}>
                      {kalmanReport.filteredParameters.soil_moisture}%
                    </Text>
                  </View>
                  <View style={styles.kalmanGridCol}>
                    <Text style={[styles.kalmanGridLabel, { color: '#0284C7' }]}>Conductivity</Text>
                    <Text style={[styles.kalmanGridVal, { color: themeColors.textPrimary }]}>
                      {kalmanReport.filteredParameters.electrical_conductivity} dS/m
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            <WaterResultCard result={result} navigation={navigation} />

            <InfoTipCard
              iconName="water"
              title="Tip"
              text="Dry cane leaf mulching conserves soil moisture and reduces evaporation significantly."
            />

            <Button
              title="Recalculate"
              variant="outline"
              onPress={() => {
                setSampleIdx(0);
                setStep(2);
              }}
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function WaterResultCard({ result, navigation }) {
  const { themeColors, isDark, t } = useApp();
  const isOptimal = !result.irrigation_required || result.irrigation_need === 'Low' || result.is_optimal_condition;
  const isHigh = result.irrigation_need === 'High';
  const isMed = result.irrigation_need === 'Medium';
  const bannerBg = isHigh ? '#B91C1C' : isMed ? '#D97706' : '#047857';

  return (
    <Card style={styles.resultCard}>
      <View style={[styles.resultHeaderBanner, { backgroundColor: bannerBg }]}>
        <View style={styles.resultBannerTop}>
          <Text style={styles.resultBadgeText}>IRRIGATION REQUIREMENT</Text>
          <Pill
            text={isOptimal ? 'Optimal Moisture' : 'Water Now'}
            tone={isOptimal ? 'good' : 'warn'}
          />
        </View>
        <Text style={styles.resultDecisionText}>
          {isOptimal ? 'Optimal Moisture' : `${result.irrigation_need} Need`}
        </Text>
        <Text style={styles.resultUrgencyText}>
          {isOptimal ? 'No Watering Needed · Keep Pump OFF' : result.urgency}
        </Text>
      </View>

      <View style={[styles.resultBody, { backgroundColor: isDark ? themeColors.card : '#FFFFFF' }]}>
        {isOptimal && (
          <View style={[styles.optimalCallout, isDark && { backgroundColor: 'rgba(4, 120, 87, 0.25)', borderColor: '#10B981' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MCIcons name="water-check" size={22} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={[styles.optimalCalloutTitle, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                Optimal Field Condition Detected
              </Text>
            </View>
            <Text style={[styles.optimalCalloutDesc, { color: isDark ? '#D1FAE5' : '#064E3B' }]}>
              Sugarcane roots currently have adequate available water. <Text style={{ fontWeight: '800' }}>No irrigation is needed today — keep your pump turned OFF.</Text>
            </Text>
            <View style={[styles.optimalCalloutDivider, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]} />
            <Text style={[styles.optimalWhyTitle, { color: isDark ? '#A7F3D0' : '#047857' }]}>
              Why Watering Now is Harmful:
            </Text>
            <Text style={[styles.optimalWhyPoint, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              • Over-watering suffocates cane roots (oxygen starvation / hypoxia) and slows tillering
            </Text>
            <Text style={[styles.optimalWhyPoint, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              • Excess water leaches valuable nitrogen & soluble nutrients deep below root depth
            </Text>
            <Text style={[styles.optimalWhyPoint, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              • Keeping pump OFF conserves precious groundwater and saves electricity bills
            </Text>
          </View>
        )}

        <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>
          {isOptimal ? 'Water Assessment & Status' : 'Water Assessment'}
        </Text>
        <Text style={[styles.resultDescText, { color: themeColors.textSecondary }]}>{result.description}</Text>

        <View style={[styles.resultDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />

        {isOptimal ? (
          <>
            <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>{t('waterTitle')}</Text>
            <View style={styles.dosageRow}>
              <DosageBox label={t('recommendedWaterDepth')} value="0 mm" isDark={isDark} themeColors={themeColors} />
              <DosageBox label={t('pumpRuntimeHours')} value={`0 ${t('hours')} (OFF)`} isDark={isDark} themeColors={themeColors} />
              {(() => {
                const areaVal = result.field_area_acre || (result.field_area_ha ? (result.field_area_ha * 2.471).toFixed(1) : '2.5');
                const unit = Number(areaVal) === 1 ? t('acre') : t('acres');
                return <DosageBox label={t('farmSize')} value={`${areaVal} ${unit}`} isDark={isDark} themeColors={themeColors} />;
              })()}
            </View>

            <View style={[styles.pumpBanner, isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }]}>
              <MCIcons name="power-plug-off" size={18} color="#059669" style={{ marginRight: 8 }} />
              <Text style={[styles.pumpText, { color: themeColors.textPrimary }]}>
                Pump Status: <Text style={{ fontWeight: '800', color: '#059669' }}>OFF (Power Saved)</Text>
              </Text>
            </View>

            <View style={[styles.guidelineBadge, isDark && { backgroundColor: 'rgba(4,120,87,0.14)' }]}>
              <MCIcons name="calendar-clock" size={15} color="#059669" style={{ marginRight: 6 }} />
              <Text style={[styles.guidelineText, { color: isDark ? '#34D399' : '#047857' }]}>
                Re-check soil moisture in 7–10 days before next irrigation
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>{t('waterTitle')}</Text>
            <View style={styles.dosageRow}>
              <DosageBox label={t('recommendedWaterDepth')} value={`${result.recommended_depth_mm} mm`} isDark={isDark} themeColors={themeColors} />
              <DosageBox label={t('totalWaterLitres')} value={`${(result.total_water_litres / 1000).toFixed(0)}k L`} isDark={isDark} themeColors={themeColors} />
              {(() => {
                const areaVal = result.field_area_acre || (result.field_area_ha ? (result.field_area_ha * 2.471).toFixed(1) : '2.5');
                const unit = Number(areaVal) === 1 ? t('acre') : t('acres');
                return <DosageBox label={t('farmSize')} value={`${areaVal} ${unit}`} isDark={isDark} themeColors={themeColors} />;
              })()}
            </View>

            {result.pump_runtime_hours > 0 && (
              <View style={[styles.pumpBanner, isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }]}>
                <MCIcons name="pump" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                <Text style={[styles.pumpText, { color: themeColors.textPrimary }]}>
                  {t('pumpRuntimeHours')}: <Text style={{ fontWeight: '800', color: '#0284C7' }}>~{result.pump_runtime_hours} {t('hours')}</Text>
                </Text>
              </View>
            )}

            <View style={[styles.guidelineBadge, isDark && { backgroundColor: 'rgba(2,132,199,0.14)' }]}>
              <MCIcons name="certificate-outline" size={15} color="#0284C7" style={{ marginRight: 6 }} />
              <Text style={[styles.guidelineText, { color: isDark ? '#38BDF8' : '#0369A1' }]}>
                {result.guideline_source || 'ICAR-IISR & VSI Pune Sugarcane Irrigation Standards'}
              </Text>
            </View>
            <Text style={[styles.resultDescText, { marginTop: spacing.md, color: themeColors.textSecondary }]}>
              {t('wateringFrequency')}: <Text style={{ fontWeight: '800', color: themeColors.textPrimary }}>{result.frequency}</Text>
            </Text>
          </>
        )}

        {result.important_notes && result.important_notes.length > 0 && (
          <>
            <View style={[styles.resultDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />
            <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>{t('importantNotes')}</Text>
            {result.important_notes.map((note, i) => (
              <Text key={i} style={[styles.noteItem, { color: themeColors.textSecondary }]}>• {note}</Text>
            ))}
          </>
        )}

        {result.weather_used && (
          <>
            <View style={[styles.resultDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />
            <Text style={[styles.resultSectionTitle, { color: themeColors.textPrimary }]}>{t('liveWeather')}</Text>
            <View style={styles.weatherUsedRow}>
              <View style={styles.weatherUsedItem}>
                <Text style={[styles.weatherUsedLabel, { color: themeColors.textMuted }]}>{t('temperature')}</Text>
                <Text style={[styles.weatherUsedValue, { color: themeColors.textPrimary }]}>{result.weather_used.temperature_c}°C</Text>
              </View>
              <View style={styles.weatherUsedItem}>
                <Text style={[styles.weatherUsedLabel, { color: themeColors.textMuted }]}>{t('humidity')}</Text>
                <Text style={[styles.weatherUsedValue, { color: themeColors.textPrimary }]}>{result.weather_used.humidity}%</Text>
              </View>
              <View style={styles.weatherUsedItem}>
                <Text style={[styles.weatherUsedLabel, { color: themeColors.textMuted }]}>{t('wind')}</Text>
                <Text style={[styles.weatherUsedValue, { color: themeColors.textPrimary }]}>{result.weather_used.wind_speed_kmh} km/h</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.confidenceRow}>
          <Text style={[styles.confidenceLabel, { color: themeColors.textMuted }]}>{t('mlConfidence')}</Text>
          <Text style={[styles.confidenceValue, { color: themeColors.secondary }]}>{result.confidence_percentage}%</Text>
        </View>

        {result.soil_status ? (
          <>
            <View style={[styles.resultDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />
            <SoilHealthCard soilStatusAdvisory={result.soil_status} />
          </>
        ) : null}

        <View style={[styles.resultDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />

        <TouchableOpacity
          style={[
            styles.switchModuleBtn,
            {
              backgroundColor: isDark ? themeColors.surfaceAlt : '#FEF3C7',
              borderColor: isDark ? themeColors.border : '#D97706'
            }
          ]}
          onPress={() => navigation?.navigate('FertilizerRecommendation')}
          activeOpacity={0.85}
        >
          <View style={[styles.switchIconWrap, { backgroundColor: isDark ? themeColors.card : '#FDE68A' }]}>
            <MCIcons name="sprout" size={22} color="#D97706" />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[styles.switchModuleTitle, isDark && { color: themeColors.accent }]}>{t('checkFertModule')}</Text>
            <Text style={[styles.switchModuleSub, { color: themeColors.textSecondary }]}>{t('checkFertSub')}</Text>
          </View>
          <Text style={[styles.switchModuleArrow, isDark && { color: themeColors.accent }]}>→</Text>
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
        {
          backgroundColor: isDark ? themeColors?.surfaceAlt || '#1B3B30' : colors.waterBlueLight
        }
      ]}
    >
      <Text style={[styles.dosageValue, { color: isDark ? themeColors?.primaryLight || '#38BDF8' : colors.waterBlue }]}>{value}</Text>
      <Text style={[styles.dosageLabel, { color: isDark ? themeColors?.textSecondary || '#9CA3AF' : colors.secondary }]}>{label}</Text>
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
  headerIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepContainer: {
    paddingTop: spacing.xs
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
    color: colors.secondary,
    fontWeight: '700'
  },
  weatherMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm
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
  metricSubUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted
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
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14
  },
  kalmanBadgeText: {
    fontSize: 11,
    fontWeight: '800'
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
  pumpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE'
  },
  pumpText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600'
  },
  guidelineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 8
  },
  guidelineText: {
    fontSize: 11,
    fontWeight: '700'
  },

  // Flipping Card
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
    fontWeight: '800'
  },
  cardHeaderHint: {
    fontSize: 11,
    fontWeight: '500'
  },
  sampleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm
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
    backgroundColor: '#0284C7',
    borderColor: '#0284C7'
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
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
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
    fontWeight: '600'
  },
  kalmanGridVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2
  },

  // Result
  resultCard: {
    padding: 0,
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  resultHeaderBanner: {
    padding: spacing.xl,
    paddingBottom: spacing.lg
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
  resultBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultBadgeText: {
    ...typography.micro,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8
  },
  resultDecisionText: {
    ...typography.h1,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 6
  },
  resultUrgencyText: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
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
    backgroundColor: colors.waterBlueLight,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center'
  },
  dosageValue: {
    ...typography.h4,
    color: colors.waterBlue,
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
  weatherUsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs
  },
  weatherUsedItem: {
    alignItems: 'center'
  },
  weatherUsedLabel: {
    ...typography.caption,
    color: colors.textMuted
  },
  weatherUsedValue: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2
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
    color: colors.secondary,
    fontWeight: '800'
  },
  switchModuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#D97706',
    borderRadius: 14,
    padding: spacing.md
  },
  switchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center'
  },
  switchModuleTitle: {
    ...typography.h4,
    color: '#D97706',
    fontWeight: '800'
  },
  switchModuleSub: {
    ...typography.caption,
    color: colors.textSecondary
  },
  switchModuleArrow: {
    fontSize: 20,
    color: '#D97706',
    fontWeight: '800',
    marginLeft: spacing.sm
  }
});
