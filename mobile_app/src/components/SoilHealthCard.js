import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { Card, Pill } from './ui';
import { PARAMS, idealText } from '../constants/soil';

const RATING = {
  critical: { tone: 'bad', word: 'Needs attention' },
  warning: { tone: 'warn', word: 'Needs care' },
  caution: { tone: 'warn', word: 'Watch this' },
  good: { tone: 'good', word: 'Optimal' }
};

export default function SoilHealthCard({ soilStatusAdvisory }) {
  const { themeColors, isDark, t } = useApp ? useApp() : { themeColors: colors, isDark: false, t: (k, fb) => fb || k };

  const status = soilStatusAdvisory || {};
  const evals = (status.evaluations && typeof status.evaluations === 'object')
    ? status.evaluations
    : {};
  const evalEntries = Object.entries(evals);

  // Do not render dummy fallback data if no evaluations were performed
  if (evalEntries.length === 0) {
    return null;
  }

  const score = status.overall_health_score ?? 85;
  const category = status.health_category || (score >= 85 ? t('excellent') : (score >= 70 ? t('good') : t('needsAttention')));

  const good = score >= 70;
  const barColor = score >= 80 ? (isDark ? '#4ADE80' : colors.success) : score >= 60 ? (isDark ? '#FBBF24' : colors.warning) : colors.error;

  return (
    <Card style={[{ marginTop: spacing.md }, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={styles.head}>
        <View style={[styles.ring, { borderColor: barColor }]}>
          <Text style={[styles.score, { color: themeColors.textPrimary }]}>{score}</Text>
          <Text style={[styles.outOf, { color: themeColors.textMuted }]}>{t('of')} 100</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.lg }}>
          <Text style={[styles.kicker, { color: isDark ? '#4ADE80' : colors.success }]}>{t('soilHealthStatus')}</Text>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>{category}</Text>
          <Pill text={good ? t('nutrientsBalanced') : t('adjustmentNeeded')} tone={good ? 'good' : 'warn'} style={{ marginTop: 6 }} />
        </View>
      </View>
      
      {status.summary ? (
        <Text style={[styles.summary, { color: themeColors.textSecondary }]}>{status.summary}</Text>
      ) : (
        <Text style={[styles.summary, { color: themeColors.textSecondary }]}>
          {t('soilAssessmentNote')}
        </Text>
      )}

      <Text style={[styles.listTitle, { color: themeColors.textPrimary }]}>{t('measuredSoilParams')} ({evalEntries.length})</Text>
      {evalEntries.map(([key, item]) => {
        const p = PARAMS[key];
        const ratingKey = item.rating || 'good';
        const ratingWord = t(ratingKey === 'good' ? 'optimal' : ratingKey, RATING[ratingKey]?.word || 'Optimal');
        const rTone = RATING[ratingKey]?.tone || 'good';
        const localizedLabel = t('param' + key, p?.label || key.replace(/_/g, ' '));

        return (
          <View key={key} style={[styles.item, isDark && { borderBottomColor: themeColors.border }]}>
            <View style={styles.itemTop}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MCIcons name={p?.iconName || 'leaf'} size={18} color={isDark ? themeColors.accent : colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.name, { color: themeColors.textPrimary }]}>{localizedLabel}</Text>
                </View>
                {p ? <Text style={[styles.ideal, { color: themeColors.textMuted }]}>{t('normalRange')} {idealText(p)}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.val, { color: themeColors.textPrimary }]}>{item.value} {p?.unit || ''}</Text>
                <Pill text={ratingWord} tone={rTone} style={{ marginTop: 4 }} />
              </View>
            </View>
            {item.recommendation ? (
              <View style={[styles.action, isDark && { backgroundColor: themeColors.surfaceAlt }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <MCIcons name="arrow-right-circle" size={16} color={isDark ? themeColors.accent : colors.primary} style={{ marginRight: 6, marginTop: 2 }} />
                  <Text style={[styles.actionText, { color: themeColors.textPrimary, flex: 1 }]}>{item.recommendation}</Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  ring: { width: 92, height: 92, borderRadius: 46, borderWidth: 7, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 28, fontWeight: '900', color: colors.textPrimary, lineHeight: 32 },
  outOf: { ...typography.caption, color: colors.textMuted },
  kicker: { ...typography.micro, color: colors.success, fontWeight: '700' },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: 1 },
  summary: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 22 },
  listTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.xs },
  item: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemTop: { flexDirection: 'row', alignItems: 'center' },
  name: { ...typography.h4, color: colors.textPrimary },
  ideal: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  val: { ...typography.h4, color: colors.textPrimary },
  action: { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm, padding: spacing.md, marginTop: spacing.sm },
  actionText: { ...typography.small, color: colors.textPrimary, lineHeight: 20 }
});
