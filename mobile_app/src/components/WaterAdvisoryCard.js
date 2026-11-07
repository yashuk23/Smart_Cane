import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { Card, Pill, IconBubble } from './ui';
import { useApp } from '../context/AppContext';

const LEVEL_VERN = {
  hi: { High: 'बहुत ज़रूरी (उच्च)', Medium: 'मध्यम आवश्यकता', Low: 'कम' },
  mr: { High: 'तातडीची गरज (उच्च)', Medium: 'मध्यम गरज', Low: 'कमी' }
};

export default function WaterAdvisoryCard({ waterAdvisory, prediction }) {
  const { t, language, themeColors, isDark } = useApp ? useApp() : { t: (k, fb) => fb || k, language: 'en', themeColors: colors, isDark: false };

  if (!waterAdvisory) return null;
  const needed = waterAdvisory.irrigation_required;
  const level = waterAdvisory.irrigation_need_level || prediction?.irrigation_need || 'Medium';
  const depthMm = waterAdvisory.recommended_depth_mm || 0;
  const liters = waterAdvisory.total_water_liters || 0;
  const interval = waterAdvisory.irrigation_interval_days || 7;
  const runtimeHrs = waterAdvisory.pump_runtime_hours || (depthMm > 0 ? (depthMm / 8.5).toFixed(1) : 0);
  const levelLocalized = LEVEL_VERN[language]?.[level] || level;

  return (
    <Card style={[{ marginTop: spacing.md }, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      {/* Header */}
      <View style={styles.head}>
        <IconBubble iconName={needed ? "water" : "water-check"} tone={needed ? 'info' : 'good'} size={52} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.kicker, { color: needed ? '#0284C7' : '#16A34A' }]}>{t('waterAdvisory')}</Text>
            {!needed && (
              <View style={styles.optBadge}>
                <Text style={styles.optBadgeText}>{t('optimal')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>{needed ? t('irrigationRequirement') : t('noWateringNeeded')}</Text>
          <Text style={[styles.sub, { color: themeColors.textSecondary }]}>{needed ? `${t('urgency')}: ${levelLocalized}` : t('optimalMoistureCond')}</Text>
        </View>
      </View>

      {!needed && (
        <View style={[styles.optBox, isDark && { backgroundColor: 'rgba(6,78,59,0.3)', borderColor: '#059669' }]}>
          <Text style={[styles.optTitle, isDark && { color: '#6EE7B7' }]}>💧 {t('optimalMoistureCond')}</Text>
          <Text style={[styles.optDesc, isDark && { color: '#D1FAE5' }]}>
            {t('optimalConditionSub')}
          </Text>
        </View>
      )}

      {/* 2-Column Balanced Metric Cards */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, isDark ? styles.metricCardDark : { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
          <View style={styles.metricLabelRow}>
            <MCIcons name="water-outline" size={15} color="#0284C7" style={{ marginRight: 4 }} />
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Water Depth</Text>
          </View>
          <Text style={[styles.metricValue, { color: themeColors.textPrimary }]}>
            {needed ? `${depthMm} mm` : '0 mm'}
          </Text>
          <Text style={[styles.metricFootnote, { color: themeColors.textMuted }]}>
            {needed ? `${(liters / 1000).toFixed(0)}k Litres total` : 'Field moisture optimal'}
          </Text>
        </View>

        <View style={[styles.metricCard, isDark ? styles.metricCardDark : { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
          <View style={styles.metricLabelRow}>
            <MCIcons name="clock-outline" size={15} color="#0284C7" style={{ marginRight: 4 }} />
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>{t('pumpRuntimeHours')}</Text>
          </View>
          <Text style={[styles.metricValue, { color: needed ? '#0284C7' : '#16A34A' }]}>
            {needed ? `~${runtimeHrs} ${t('hours')}` : '0 hrs (OFF)'}
          </Text>
          <Text style={[styles.metricFootnote, { color: themeColors.textMuted }]}>
            {needed ? `Every ${interval} days` : 'Power saved'}
          </Text>
        </View>
      </View>

      {/* Prominent Wide Hero Banner */}
      <View style={[
        styles.heroBanner,
        needed ? styles.heroBannerBlue : styles.heroBannerGreen,
        isDark && { backgroundColor: needed ? 'rgba(12, 74, 110, 0.35)' : 'rgba(6, 78, 59, 0.3)', borderColor: needed ? '#0284C7' : '#059669' }
      ]}>
        <View style={[
          styles.heroIconBubble,
          { backgroundColor: needed ? '#E0F2FE' : '#DCFCE7' }
        ]}>
          <MCIcons
            name={needed ? "pump" : "power-plug-off"}
            size={24}
            color={needed ? '#0284C7' : '#16A34A'}
          />
        </View>

        <View style={styles.heroContent}>
          <View style={styles.heroTitleRow}>
            <Text style={[styles.heroTitle, { color: themeColors.textPrimary }]}>
              {needed ? `Pump Runtime: ~${runtimeHrs} hrs` : 'Motor Status: OFF'}
            </Text>
            <View style={[styles.heroTag, { backgroundColor: needed ? '#0284C7' : '#16A34A' }]}>
              <Text style={styles.heroTagText}>
                {needed ? `${interval} Day Cycle` : 'Moisture Safe'}
              </Text>
            </View>
          </View>
          <Text style={[styles.heroSub, { color: themeColors.textSecondary }]}>
            {needed
              ? `Delivers ${(liters / 1000).toFixed(0)}k Litres via ${waterAdvisory.recommended_method || 'Drip Irrigation'}`
              : 'Re-check soil moisture in 7–10 days before next watering.'}
          </Text>
        </View>
      </View>

      {waterAdvisory.reason ? (
        <View style={styles.why}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <MCIcons name="information-outline" size={16} color="#0284C7" style={{ marginRight: 4 }} />
            <Text style={[styles.whyTitle, { color: themeColors.textPrimary }]}>Agronomic Justification</Text>
          </View>
          <Text style={[styles.whyText, { color: themeColors.textSecondary }]}>{waterAdvisory.reason}</Text>
        </View>
      ) : null}

      <View style={[styles.tip, isDark && { backgroundColor: 'rgba(6, 78, 59, 0.25)', borderColor: 'rgba(74, 222, 128, 0.3)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MCIcons name="lightbulb-on-outline" size={18} color="#16A34A" style={{ marginRight: 6 }} />
          <Text style={styles.tipTitle}>Water Conservation Tip</Text>
        </View>
        <Text style={[styles.tipText, isDark && { color: '#BBF7D0' }]}>
          Cover the soil with dry cane trash mulching (पत्ती बिछाना). 1.5–2 tonnes per acre cuts evaporation loss by up to 35% and suppresses weed germination.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  optBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  optBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  optBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md
  },
  optTitle: {
    ...typography.h4,
    color: '#065F46',
    fontWeight: '800'
  },
  optDesc: {
    ...typography.caption,
    color: '#064E3B',
    marginTop: 3,
    lineHeight: 18
  },
  kicker: { ...typography.micro, color: colors.waterBlue },
  title: { ...typography.h3, color: colors.textPrimary, marginTop: 2 },
  sub: { ...typography.small, color: colors.textSecondary, marginTop: 2 },

  // Metrics Grid (2 Columns, Balanced)
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md
  },
  metricCardDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700'
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2
  },
  metricFootnote: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  },

  // Hero Banner
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md,
    marginTop: spacing.md
  },
  heroBannerBlue: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD'
  },
  heroBannerGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  heroIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  heroContent: {
    flex: 1
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '900'
  },
  heroTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  heroTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3
  },

  why: {
    marginTop: spacing.md,
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    borderRadius: 12
  },
  whyTitle: {
    fontSize: 13,
    fontWeight: '800'
  },
  whyText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2
  },
  tip: {
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  tipTitle: {
    ...typography.h4,
    color: '#16A34A',
    fontWeight: '800'
  },
  tipText: {
    ...typography.small,
    color: '#166534',
    marginTop: 4,
    lineHeight: 20
  }
});
