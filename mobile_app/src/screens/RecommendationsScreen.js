import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Button, EmptyState } from '../components/ui';
import FertilizerAdvisoryCard from '../components/FertilizerAdvisoryCard';
import WaterAdvisoryCard from '../components/WaterAdvisoryCard';
import SoilHealthCard from '../components/SoilHealthCard';

export default function RecommendationsScreen({ navigation, route }) {
  const { latestAdvisory, themeColors, isDark, t } = useApp();
  const advisory = route?.params?.advisory || latestAdvisory;
  const defaultTab = advisory?.advisoryType === 'fertilizer' ? 'fertilizer' : 'water';
  const [tab, setTab] = useState(defaultTab);

  const TABS = [
    { key: 'water', label: t('water', 'Water'), iconName: 'water' },
    { key: 'fertilizer', label: t('fertilizer', 'Fertilizer'), iconName: 'sprout' },
    { key: 'soil', label: t('soil', 'Soil'), iconName: 'flask-outline' }
  ];

  if (!advisory) {
    return (
      <View style={[styles.root, { backgroundColor: themeColors.background }]}>
        <Header title={t('cropAdvisory')} subtitle={t('fieldSubtitle')} onBack={() => navigation?.goBack()} />
        <EmptyState iconName="microscope" title={t('noHistory')}
          text={t('fieldSubtitle')}
          actionTitle={t('fertilizer')} onAction={() => navigation?.navigate('FertilizerRecommendation')} />
      </View>
    );
  }

  const predictions = advisory.predictions || {
    fertilizer: advisory.fertilizerPrediction,
    irrigation: advisory.irrigationPrediction
  };
  const adv = advisory.advisory || {
    fertilizer: advisory.fertilizerAdvisory,
    water: advisory.waterAdvisory,
    soilStatus: advisory.soilStatusAdvisory
  };
  const field = advisory.field || advisory.metadata;
  const fert = adv?.fertilizer?.fertilizer_type || predictions?.fertilizer?.recommended_fertilizer || '—';
  const waterNeeded = adv?.water?.irrigation_required;
  const score = adv?.soilStatus?.overall_health_score;
  const fieldName = field?.fieldName || field?.name || advisory.fieldName || 'your field';

  const shareAdvisory = async () => {
    try {
      const lines = [`🎋 Smart Cane advice for ${fieldName}`, ''];
      lines.push(`💧 Watering: ${waterNeeded ? 'Water now' : 'Not needed now'}`);
      if (waterNeeded && adv?.water?.recommended_depth_mm) {
        lines.push(`   ${adv.water.recommended_depth_mm} mm, about ${Math.round((adv.water.total_water_liters || 0) / 1000)}k litres in total`);
      }
      lines.push(`🌾 Fertilizer: ${fert}`);
      const rateAcre = adv?.fertilizer?.dosage_kg_per_acre || (adv?.fertilizer?.dosage_kg_per_ha ? Math.round(adv.fertilizer.dosage_kg_per_ha / 2.471) : null);
      if (rateAcre) lines.push(`   ${rateAcre} kg per acre (${adv.fertilizer.total_dosage_kg} kg total)`);
      if (score != null) lines.push(`🧪 Soil health: ${score}/100 (${adv?.soilStatus?.health_category || ''})`);
      await Share.share({ message: lines.join('\n') });
    } catch (err) {
      Alert.alert('Could not share', err.message);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: themeColors.background }]}>
      <Header
        title={t('cropAdvisory', 'Crop Advisory')}
        subtitle={`${t('for', 'For')} ${fieldName}`}
        onBack={() => navigation?.goBack()}
        rightAction={t('share', 'Share')}
        onRightPress={shareAdvisory}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[
          styles.summary,
          isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }
        ]}>
          <SummaryItem iconName="water" label={t('water', 'Water')} value={waterNeeded ? t('now', 'Now') : t('notNow', 'Not now')} good={!waterNeeded} themeColors={themeColors} />
          <View style={[styles.sDiv, isDark && { backgroundColor: themeColors.border }]} />
          <SummaryItem iconName="sprout" label={t('fertilizer', 'Fertilizer')} value={fert} themeColors={themeColors} />
          <View style={[styles.sDiv, isDark && { backgroundColor: themeColors.border }]} />
          <SummaryItem iconName="flask-outline" label={t('soil', 'Soil')} value={score != null ? `${score}/100` : '—'} good={score >= 70} themeColors={themeColors} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, isDark && { backgroundColor: themeColors.surfaceAlt }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tab,
                tab === t.key && styles.tabOn,
                tab === t.key && isDark && { backgroundColor: themeColors.surface }
              ]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MCIcons
                  name={t.iconName}
                  size={18}
                  color={tab === t.key ? (isDark ? themeColors.accent : colors.primary) : themeColors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[
                  styles.tabText,
                  { color: themeColors.textSecondary },
                  tab === t.key && styles.tabTextOn,
                  tab === t.key && isDark && { color: themeColors.accent }
                ]}>
                  {t.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'water' && <WaterAdvisoryCard waterAdvisory={adv?.water} prediction={predictions?.irrigation} />}
        {tab === 'fertilizer' && <FertilizerAdvisoryCard fertilizerAdvisory={adv?.fertilizer} prediction={predictions?.fertilizer} />}
        {tab === 'soil' && <SoilHealthCard soilStatusAdvisory={adv?.soilStatus} />}

        {/* Share Action Card */}
        <Card style={[styles.shareCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.shareCardHeader}>
            <View style={styles.shareIconCircle}>
              <MCIcons name="share-variant-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.shareCardTitle, { color: themeColors.textPrimary }]}>
                Share Sugarcane Advisory
              </Text>
              <Text style={[styles.shareCardSub, { color: themeColors.textSecondary }]}>
                Export comprehensive dosage & irrigation instructions for your field.
              </Text>
            </View>
          </View>
          <Button
            title={t('share', 'Share Report')}
            iconName="share-variant"
            variant="primary"
            onPress={shareAdvisory}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function SummaryItem({ iconName, label, value, good, themeColors }) {
  return (
    <View style={styles.sItem}>
      <MCIcons name={iconName} size={22} color={themeColors?.primary || colors.primary} />
      <Text style={[styles.sLabel, { color: themeColors?.textMuted || colors.textMuted }]}>{label}</Text>
      <Text style={[styles.sVal, { color: themeColors?.textPrimary || colors.textPrimary }, good === true && { color: colors.success }, good === false && { color: colors.error }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 130 },
  summary: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: borderRadius.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.borderLight, ...shadows.md },
  sItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  sDiv: { width: 1, backgroundColor: colors.borderLight },
  sIcon: { fontSize: 22 },
  sLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  sVal: { ...typography.h3, color: colors.textPrimary, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: borderRadius.md, padding: 4, marginTop: spacing.md },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm },
  tabOn: { backgroundColor: '#fff', ...shadows.sm },
  tabText: { ...typography.h4, fontSize: 14, color: colors.textSecondary },
  tabTextOn: { color: colors.primary },
  shareCard: { marginTop: spacing.xl, padding: spacing.md },
  shareCardHeader: { flexDirection: 'row', alignItems: 'center' },
  shareIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  shareCardTitle: { ...typography.h4, fontWeight: '800' },
  shareCardSub: { ...typography.caption, marginTop: 2 }
});
