import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { Card, IconBubble } from './ui';
import { useApp } from '../context/AppContext';

const PRICE_PER_BAG = { Urea: 268, DAP: 1350, MOP: 1700, NPK: 1450, Compost: 250, 'Zinc Sulphate': 850, SSP: 480 };

const FERT_VERN = {
  hi: { Urea: 'यूरिया', DAP: 'डीएपी', MOP: 'म्यूरेट ऑफ पोटाश', NPK: 'एनपीके कॉम्प्लेक्स', Compost: 'सड़ी गोबर खाद / प्रेसमड', 'Zinc Sulphate': 'जिंक सल्फेट', SSP: 'सिंगल सुपर फॉस्फेट' },
  mr: { Urea: 'युरिया', DAP: 'डीएपी', MOP: 'म्युरेट ऑफ पोटॅश', NPK: 'एनपीके कॉम्प्लेक्स', Compost: 'शेणखत / प्रेसमड', 'Zinc Sulphate': 'झिंक सल्फेट', SSP: 'सिंगल सुपर फॉस्फेट' }
};

const STAGES = [
  {
    key: 'sowing',
    label: 'At planting',
    sub: 'Basal dose',
    instruction: 'Place in furrows 5–7 cm below cane setts. Critical for early root proliferation and sett vigor.',
    tip: 'Mix with well-decomposed pressmud or farmyard manure for maximum phosphate bioavailability.'
  },
  {
    key: 'vegetative',
    label: 'Day 45',
    sub: 'Tillering',
    instruction: 'Apply along cane furrows in moist soil followed by earthing up (मिट्टी चढ़ाना) and light irrigation.',
    tip: 'Ensure soil moisture is adequate. Earthing up prevents nitrogen vaporization loss.'
  },
  {
    key: 'flowering',
    label: 'Day 90–120',
    sub: 'Grand growth',
    instruction: 'Final split application prior to onset of grand growth and monsoon stalk elongation.',
    tip: 'Supports thick internode formation and high cane stalk weight.'
  }
];

export default function FertilizerAdvisoryCard({ fertilizerAdvisory, prediction }) {
  const { t, language, themeColors, isDark } = useApp ? useApp() : { t: (k, fb) => fb || k, language: 'en', themeColors: colors, isDark: false };

  if (!fertilizerAdvisory) return null;
  const type = fertilizerAdvisory.fertilizer_type || prediction?.recommended_fertilizer || 'Urea';
  const totalKg = fertilizerAdvisory.total_dosage_kg || 0;
  const perAcre = fertilizerAdvisory.dosage_kg_per_acre || (fertilizerAdvisory.dosage_kg_per_ha ? Math.round(fertilizerAdvisory.dosage_kg_per_ha / 2.471) : 0);
  const currentStage = (fertilizerAdvisory.crop_stage || 'Vegetative').toLowerCase();

  const [activeStageKey, setActiveStageKey] = useState(
    STAGES.some(s => s.key === currentStage) ? currentStage : 'vegetative'
  );

  const bags = Math.max(1, Math.ceil(totalKg / 50));
  const cost = bags * (PRICE_PER_BAG[type] || 600);

  const isOptimal = type === 'No Fertilizer Needed' || type === 'Compost' || fertilizerAdvisory.is_optimal_condition;
  const displayTitle = isOptimal ? t('optimalConditionTitle') : type;
  const localizedFert = FERT_VERN[language]?.[type];

  const activeStageInfo = STAGES.find(s => s.key === activeStageKey) || STAGES[1];

  // Resolve bag singular/plural cleanly
  const bagUnitStr = bags === 1 ? t('bag', 'bag') : t('bags', 'bags');
  const bagEstimateDisplay = isOptimal
    ? t('zeroBagsNeeded')
    : `${bags} ${bagUnitStr} (50 kg)`;

  return (
    <Card style={[{ marginTop: spacing.md }, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      {/* Head */}
      <View style={styles.head}>
        <IconBubble iconName="sprout" tone={isOptimal ? 'good' : 'warn'} size={52} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.kicker, isOptimal && { color: colors.primary }]}>{t('fertilizerAdvisory')}</Text>
            {isOptimal && (
              <View style={styles.optBadge}>
                <Text style={styles.optBadgeText}>{t('optimal')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>{displayTitle}</Text>
          {localizedFert && !isOptimal ? <Text style={[styles.sub, { color: themeColors.textSecondary }]}>{localizedFert}</Text> : null}
        </View>
      </View>

      {isOptimal && (
        <View style={[styles.optBox, isDark && { backgroundColor: 'rgba(6,78,59,0.3)', borderColor: '#059669' }]}>
          <Text style={[styles.optTitle, isDark && { color: '#6EE7B7' }]}>🌱 {t('optimalConditionTitle')}</Text>
          <Text style={[styles.optDesc, isDark && { color: '#D1FAE5' }]}>
            {t('optimalConditionSub')}
          </Text>
        </View>
      )}

      {/* 2-Column Balanced Metric Cards */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, isDark ? styles.metricCardDark : { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
          <View style={styles.metricLabelRow}>
            <MCIcons name="scale" size={15} color={themeColors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>{t('dosagePerAcre')}</Text>
          </View>
          <Text style={[styles.metricValue, { color: themeColors.textPrimary }]}>
            {isOptimal ? '0 kg' : `${perAcre} kg`}
            <Text style={styles.metricSubUnit}> / {t('acre')}</Text>
          </Text>
          <Text style={[styles.metricFootnote, { color: themeColors.textMuted }]}>
            {isOptimal ? t('optimal') : `${t('totalReq')}: ${totalKg} kg`}
          </Text>
        </View>

        <View style={[styles.metricCard, isDark ? styles.metricCardDark : { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
          <View style={styles.metricLabelRow}>
            <MCIcons name={isOptimal ? "cash-check" : "cash-multiple"} size={15} color={isOptimal ? '#16A34A' : '#D97706'} style={{ marginRight: 4 }} />
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>
              {isOptimal ? t('costSaved') : t('estExpense')}
            </Text>
          </View>
          <Text style={[styles.metricValue, { color: isOptimal ? '#16A34A' : themeColors.textPrimary }]}>
            {isOptimal ? '₹0' : `₹${cost.toLocaleString('en-IN')}`}
          </Text>
          <Text style={[styles.metricFootnote, { color: themeColors.textMuted }]}>
            {isOptimal ? t('optimal') : `~₹${PRICE_PER_BAG[type] || 600} / ${t('bag')}`}
          </Text>
        </View>
      </View>

      {/* Prominent Wide Purchase Requirement Banner */}
      <View style={[
        styles.purchaseBanner,
        isOptimal ? styles.purchaseBannerOptimal : styles.purchaseBannerAmber,
        isDark && { backgroundColor: isOptimal ? 'rgba(6,78,59,0.3)' : 'rgba(120,53,15,0.25)', borderColor: isOptimal ? '#059669' : '#D97706' }
      ]}>
        <View style={[
          styles.purchaseIconBubble,
          { backgroundColor: isOptimal ? '#DCFCE7' : '#FEF3C7' }
        ]}>
          <MCIcons
            name={isOptimal ? "check-decagram" : "bag-personal-outline"}
            size={24}
            color={isOptimal ? '#16A34A' : '#D97706'}
          />
        </View>

        <View style={styles.purchaseContent}>
          <View style={styles.purchaseTitleRow}>
            <Text style={[styles.purchaseTitle, { color: themeColors.textPrimary }]}>
              {bagEstimateDisplay}
            </Text>
            <View style={[styles.purchaseTag, { backgroundColor: isOptimal ? '#16A34A' : '#D97706' }]}>
              <Text style={styles.purchaseTagText}>
                {isOptimal ? '0 Bags' : `${totalKg} kg total`}
              </Text>
            </View>
          </View>
          <Text style={[styles.purchaseSub, { color: themeColors.textSecondary }]}>
            {isOptimal
              ? 'Soil nutrients in perfect balance. No chemical expense needed.'
              : `${fertilizerAdvisory.field_area_acre || 1} ${t('acre')} sugarcane plot requirement.`}
          </Text>
        </View>
      </View>

      {/* Interactive Application Stages */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionLabel, { color: themeColors.textPrimary }]}>{t('applicationInstructions', 'When to apply')}</Text>
        <Text style={[styles.tapHint, { color: themeColors.textMuted }]}>Tap stage to view</Text>
      </View>

      <View style={styles.timeline}>
        {STAGES.map((stageItem) => {
          const isCurrentCropStage = currentStage === stageItem.key;
          const isSelected = activeStageKey === stageItem.key;
          return (
            <TouchableOpacity
              key={stageItem.key}
              onPress={() => setActiveStageKey(stageItem.key)}
              activeOpacity={0.8}
              style={[
                styles.slot,
                isSelected && (isDark ? styles.slotOnDark : styles.slotOn),
                !isSelected && isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }
              ]}
            >
              <Text style={[styles.slotLabel, isSelected ? styles.slotTextOn : { color: themeColors.textPrimary }]}>
                {stageItem.label}
              </Text>
              <Text style={[styles.slotSub, isSelected ? styles.slotTextOn : { color: themeColors.textSecondary }]}>
                {stageItem.sub}
              </Text>
              {isCurrentCropStage ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>CURRENT</Text>
                </View>
              ) : isSelected ? (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>SELECTED</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dynamic Interactive Stage Guidance */}
      <View style={[styles.stageDetailCard, isDark && { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }]}>
        <View style={styles.stageDetailHead}>
          <MCIcons name="calendar-sync" size={18} color="#16A34A" style={{ marginRight: 6 }} />
          <Text style={[styles.stageDetailTitle, { color: themeColors.textPrimary }]}>
            {activeStageInfo.label} ({activeStageInfo.sub}) Guideline
          </Text>
        </View>
        <Text style={[styles.stageDetailBody, { color: themeColors.textSecondary }]}>
          {fertilizerAdvisory.application_method && activeStageKey === currentStage
            ? fertilizerAdvisory.application_method
            : activeStageInfo.instruction}
        </Text>
        <View style={styles.stageTipBox}>
          <MCIcons name="lightbulb-on-outline" size={14} color="#D97706" style={{ marginRight: 5, marginTop: 1 }} />
          <Text style={styles.stageTipText}>{activeStageInfo.tip}</Text>
        </View>
      </View>

      {/* Caution Callout */}
      <View style={[styles.caution, isDark && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MCIcons name="alert-circle-outline" size={18} color={colors.error} style={{ marginRight: 6 }} />
          <Text style={styles.cautionTitle}>Please remember</Text>
        </View>
        <Text style={[styles.cautionText, isDark && { color: '#FCA5A5' }]}>
          {fertilizerAdvisory.split_schedule ? fertilizerAdvisory.split_schedule + ' ' : ''}
          Apply when the soil is moist, then cover with soil (मिट्टी चढ़ाना) so nitrogen is not lost to the air.
        </Text>
      </View>

      <Text style={styles.note}>Cost is an estimate. Actual prices depend on your local shop.</Text>
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
  kicker: { ...typography.micro, color: colors.fertilizerAmber },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: 1 },
  sub: { ...typography.small, color: colors.textSecondary },

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
  metricSubUnit: {
    fontSize: 13,
    fontWeight: '600'
  },
  metricFootnote: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  },

  // Wide Purchase Banner
  purchaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md,
    marginTop: spacing.md
  },
  purchaseBannerAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  purchaseBannerOptimal: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  purchaseIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  purchaseContent: {
    flex: 1
  },
  purchaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  purchaseTitle: {
    fontSize: 16,
    fontWeight: '900'
  },
  purchaseTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  purchaseTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  purchaseSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3
  },

  // Interactive Timeline Stages
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm
  },
  sectionLabel: {
    ...typography.h4,
    fontWeight: '800'
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '600'
  },
  timeline: {
    flexDirection: 'row',
    gap: 8
  },
  slot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    alignItems: 'center',
    minHeight: 74,
    justifyContent: 'center',
    ...shadows.sm
  },
  slotOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  slotOnDark: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981'
  },
  slotLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center'
  },
  slotSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center'
  },
  slotTextOn: {
    color: '#FFFFFF'
  },
  currentBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3
  },
  selectedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4
  },
  selectedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // Dynamic Stage Details Card
  stageDetailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginTop: spacing.sm
  },
  stageDetailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  stageDetailTitle: {
    fontSize: 13,
    fontWeight: '800'
  },
  stageDetailBody: {
    fontSize: 13,
    lineHeight: 19
  },
  stageTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8
  },
  stageTipText: {
    fontSize: 11.5,
    color: '#92400E',
    fontWeight: '600',
    flex: 1
  },

  // Caution Box
  caution: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  cautionTitle: {
    ...typography.h4,
    color: colors.error,
    fontWeight: '800'
  },
  cautionText: {
    ...typography.small,
    color: '#7F1D1D',
    marginTop: 4,
    lineHeight: 20
  },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center'
  }
});
