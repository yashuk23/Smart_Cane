import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Button, IconBubble, SectionTitle } from '../components/ui';
import { STAGES, getStage } from '../constants/soil';
import useWeather from '../hooks/useWeather';

export default function DashboardScreen({ navigation }) {
  const {
    user,
    fields,
    selectedField,
    setSelectedField,
    loadFields,
    backendStatus,
    deleteField,
    t,
    themeColors,
    isDark
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);

  const fieldLat = selectedField?.latitude || null;
  const fieldLon = selectedField?.longitude || null;
  const { weather } = useWeather(fieldLat, fieldLon);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFields();
    setRefreshing(false);
  };

  const confirmDeleteField = (field) => {
    Alert.alert(
      t('deleteFieldPrompt'),
      `${t('deleteFieldConfirm')} "${field.name}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const res = await deleteField(field._id);
            if (!res?.success) {
              Alert.alert('Error', res?.error || 'Failed to delete field');
            }
          }
        }
      ]
    );
  };

  const firstName = (user?.name || 'Farmer').split('(')[0].trim().split(' ')[0];
  const stage = getStage(selectedField?.cropGrowthStage);
  const stageIdx = STAGES.findIndex((x) => x.key === stage.key);

  return (
    <View style={[styles.root, { backgroundColor: themeColors.background }]}>
      <Header
        title={`${t('greeting')}, ${firstName}`}
        subtitle={t('fieldSubtitle')}
        rightComponent={
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation?.navigate('Profile')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <MCIcons name="account-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {backendStatus === 'offline' && (
          <View style={styles.offline}>
            <Text style={styles.offlineText}>
              {t('offlineNotice')}
            </Text>
          </View>
        )}

        {/* Live Weather Capsule Widget */}
        <View style={[
          styles.weatherCapsule,
          isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }
        ]}>
          <View style={styles.weatherLeft}>
            <MCIcons name="weather-partly-cloudy" size={38} color="#FBBF24" />
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={[styles.weatherTemp, { color: themeColors.textPrimary }]}>
                {weather?.temperature_c != null ? `${Math.round(weather.temperature_c)}°C` : '—'}
              </Text>
              <Text style={[styles.weatherCondition, { color: themeColors.textSecondary }]}>
                {weather?.condition || t('optimal')}
              </Text>
            </View>
          </View>
          <View style={styles.weatherRight}>
            <View style={styles.weatherMetricMini}>
              <MCIcons name="water" size={15} color="#0EA5E9" style={{ marginRight: 4 }} />
              <Text style={[styles.weatherMetricText, { color: themeColors.textSecondary }]}>
                {t('humidity')} <Text style={[styles.weatherMetricVal, { color: themeColors.textPrimary }]}>{weather?.humidity != null ? `${weather.humidity}%` : '—'}</Text>
              </Text>
            </View>
            <View style={[styles.weatherMetricMini, { marginTop: 6 }]}>
              <MCIcons name="weather-windy" size={15} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={[styles.weatherMetricText, { color: themeColors.textSecondary }]}>
                {t('wind')} <Text style={[styles.weatherMetricVal, { color: themeColors.textPrimary }]}>{weather?.wind_speed_kmh != null ? `${weather.wind_speed_kmh} km/h` : '—'}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* 2 Advisory Cards Side-by-Side */}
        <View style={styles.moduleRow}>
          <TouchableOpacity
            style={[
              styles.moduleCard,
              styles.moduleCardFert,
              isDark && { backgroundColor: themeColors.card, borderColor: themeColors.primary }
            ]}
            onPress={() => navigation?.navigate('FertilizerRecommendation')}
            activeOpacity={0.88}
          >
            <View style={styles.moduleTopRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' }]}>
                <MCIcons name="sprout" size={24} color={isDark ? themeColors.primary : '#16A34A'} />
              </View>
            </View>
            <View style={styles.moduleContent}>
              <Text style={[styles.moduleTitle, { color: themeColors.textPrimary }]}>
                {t('fertilizer')}
              </Text>
              <Text
                style={[styles.moduleSub, { color: themeColors.textSecondary }]}
                numberOfLines={2}
              >
                {t('fertilizerSub')}
              </Text>
            </View>
            <Text style={[styles.moduleArrow, { color: themeColors.primary }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.moduleCard,
              styles.moduleCardWater,
              isDark && { backgroundColor: themeColors.card, borderColor: themeColors.waterBlue }
            ]}
            onPress={() => navigation?.navigate('WaterRecommendation')}
            activeOpacity={0.88}
          >
            <View style={styles.moduleTopRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE' }]}>
                <MCIcons name="water" size={24} color={isDark ? themeColors.waterBlue : '#0284C7'} />
              </View>
            </View>
            <View style={styles.moduleContent}>
              <Text style={[styles.moduleTitle, { color: themeColors.textPrimary }]}>
                {t('water')}
              </Text>
              <Text
                style={[styles.moduleSub, { color: themeColors.textSecondary }]}
                numberOfLines={2}
              >
                {t('waterSub')}
              </Text>
            </View>
            <Text style={[styles.moduleArrow, { color: themeColors.waterBlue }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* My Fields Card (Mockup Style) */}
        <TouchableOpacity
          style={[
            styles.myFieldsRowCard,
            isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }
          ]}
          onPress={() => navigation?.navigate('AddField')}
          activeOpacity={0.85}
        >
          <View style={[styles.myFieldsIconWrap, isDark && { backgroundColor: themeColors.surfaceAlt }]}>
            <MCIcons name="sprout" size={24} color={themeColors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[styles.myFieldsTitle, { color: themeColors.textPrimary }]}>{t('myFields')}</Text>
            <Text style={[styles.myFieldsSub, { color: themeColors.textSecondary }]}>
              {fields.length} {fields.length === 1 ? t('plot') : t('plots')} {selectedField?.name ? `· ${selectedField.name}` : ''}
            </Text>
          </View>
          <MCIcons name="chevron-right" size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>

        {/* Fields Horizontal Switcher if multiple fields */}
        {fields.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fieldsScroll}
          >
            {fields.map((f) => {
              const sel = selectedField?._id === f._id;
              const st = getStage(f.cropGrowthStage);
              return (
                <TouchableOpacity
                  key={f._id}
                  style={[
                    styles.fieldCard,
                    isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border },
                    sel && (isDark ? styles.fieldCardSelDark : styles.fieldCardSel)
                  ]}
                  onPress={() => setSelectedField(f)}
                  activeOpacity={0.85}
                >
                  <View style={styles.fieldTop}>
                    <MCIcons name={st.iconName || 'leaf'} size={24} color={themeColors.primary} />
                    <TouchableOpacity
                      style={styles.fieldDeleteBtn}
                      onPress={() => confirmDeleteField(f)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Delete field"
                    >
                      <MCIcons name="trash-can-outline" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[styles.fieldName, { color: themeColors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {f.name}
                  </Text>
                  <Text
                    style={[styles.fieldMeta, { color: themeColors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {f.fieldAreaAcre || (f.fieldAreaHectare ? (f.fieldAreaHectare * 2.471).toFixed(1) : '2.5')} {t('acres')} · {f.soilType}
                  </Text>
                  <Text style={styles.fieldStageText}>{t('stage' + st.key, st.label)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Crop Growth Stage */}
        <SectionTitle title={t('cropStage')} style={{ marginTop: spacing.lg }} />
        <Card style={isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }}>
          <View style={styles.stageTop}>
            <IconBubble iconName={stage.iconName || 'leaf'} tone="good" size={50} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.stageTitle, { color: themeColors.textPrimary }]}>
                {t('stage' + stage.key, stage.title)}
              </Text>
              <Text style={[styles.stageSub, { color: themeColors.textSecondary }]}>
                {t('stage' + stage.key + 'Vern', `${stage.vern} · ${stage.days}`)}
              </Text>
            </View>
          </View>
          <View style={styles.steps}>
            {STAGES.map((s, i) => (
              <View key={s.key} style={styles.step}>
                <View style={[styles.bar, i <= stageIdx && styles.barOn]} />
                <Text
                  style={[
                    styles.stepText,
                    i === stageIdx && styles.stepTextOn,
                    { color: i === stageIdx ? themeColors.primary : themeColors.textMuted }
                  ]}
                  numberOfLines={1}
                >
                  {t('stage' + s.key, s.label)}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.tip, isDark && { backgroundColor: '#382504' }]}>
            <Text style={[styles.tipTitle, isDark && { color: '#FCD34D' }]}>
              {t('tipForStage')}
            </Text>
            <Text style={[styles.tipText, isDark && { color: '#FDE68A' }]}>
              {stage.tip}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  offline: {
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCD34D'
  },
  offlineText: {
    ...typography.small,
    color: '#8A5A00',
    fontWeight: '600'
  },

  // Weather Capsule
  weatherCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(213, 229, 218, 0.95)',
    marginBottom: spacing.lg,
    ...shadows.md
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  weatherTemp: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26
  },
  weatherCondition: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600'
  },
  weatherRight: {
    alignItems: 'flex-start',
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(213, 229, 218, 0.8)'
  },
  weatherMetricMini: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  weatherMetricText: {
    fontSize: 11,
    fontWeight: '600'
  },
  weatherMetricVal: {
    fontWeight: '800'
  },

  // Recommendation module cards
  moduleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg
  },
  moduleCard: {
    flex: 1,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1.5,
    minHeight: 168,
    justifyContent: 'space-between',
    ...shadows.md
  },
  moduleCardFert: {
    backgroundColor: 'rgba(237, 253, 245, 0.92)',
    borderColor: 'rgba(187, 247, 208, 0.95)'
  },
  moduleCardWater: {
    backgroundColor: 'rgba(240, 249, 255, 0.92)',
    borderColor: 'rgba(186, 230, 253, 0.95)'
  },
  moduleTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)'
  },
  moduleContent: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  moduleTitle: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21
  },
  moduleSub: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15
  },
  moduleArrow: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right'
  },

  // My Fields Row Card
  myFieldsRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 22,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(213, 229, 218, 0.95)',
    marginBottom: spacing.sm,
    ...shadows.md
  },
  myFieldsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)'
  },
  myFieldsTitle: {
    ...typography.h4,
    fontWeight: '800'
  },
  myFieldsSub: {
    ...typography.caption,
    marginTop: 2
  },

  // Fields horizontal
  fieldsScroll: {
    paddingRight: spacing.lg,
    paddingVertical: 6,
    marginBottom: spacing.md
  },
  fieldCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    ...shadows.sm
  },
  fieldCardSel: {
    borderColor: colors.accent,
    backgroundColor: '#FFFFFF'
  },
  fieldCardSelDark: {
    borderColor: '#34D399',
    backgroundColor: '#1E1E1E'
  },
  fieldTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  fieldDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fieldName: {
    ...typography.h4,
    fontWeight: '800',
    marginTop: spacing.sm
  },
  fieldMeta: {
    ...typography.small,
    marginTop: 2
  },
  fieldStageText: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '700',
    marginTop: spacing.sm
  },

  // Growth Stage
  stageTop: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stageTitle: {
    ...typography.h3,
    fontWeight: '800'
  },
  stageSub: {
    ...typography.small,
    marginTop: 1
  },
  steps: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: 6
  },
  step: {
    flex: 1
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted
  },
  barOn: {
    backgroundColor: colors.accent
  },
  stepText: {
    ...typography.caption,
    marginTop: 6
  },
  stepTextOn: {
    fontWeight: '800'
  },
  tip: {
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg
  },
  tipTitle: {
    ...typography.h4,
    color: '#8A5A00',
    fontWeight: '700'
  },
  tipText: {
    ...typography.small,
    color: '#6B4700',
    marginTop: 4,
    lineHeight: 20
  }
});
