import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert
} from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Button, IconBubble } from '../components/ui';
import { getStage } from '../constants/soil';

export default function ProfileScreen({ navigation }) {
  const {
    user,
    logout,
    fields = [],
    history = [],
    deleteField,
    clearHistory,
    language,
    setLanguage,
    themeMode,
    setThemeMode,
    isDark,
    themeColors,
    t
  } = useApp();

  const displayName = (user?.name || 'Farmer').split('(')[0].trim();
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'SC';

  const handleLogout = () => {
    Alert.alert(t('logoutPrompt'), 'Are you sure you want to log out of Smart Cane?', [
      { text: t('staySignedIn'), style: 'cancel' },
      {
        text: t('logout'),
        style: 'destructive',
        onPress: () => logout()
      }
    ]);
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

  const handleClearHistory = () => {
    if (history.length === 0) {
      Alert.alert('No records', 'There are no saved advisory records to clear.');
      return;
    }
    Alert.alert(
      t('clearAll'),
      'Are you sure you want to delete all saved advisory records for your account? This action cannot be undone.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clearAll'),
          style: 'destructive',
          onPress: async () => {
            const res = await clearHistory();
            if (!res?.success) {
              Alert.alert('Error', res?.error || 'Failed to clear history');
            }
          }
        }
      ]
    );
  };

  const THEMES = [
    {
      key: 'light',
      label: t('themeLight'),
      sub: 'Light',
      iconName: 'weather-sunny',
      iconColor: '#F59E0B',
      bubbleBg: '#FEF3C7'
    },
    {
      key: 'dark',
      label: t('themeDark'),
      sub: 'Dark',
      iconName: 'moon-waning-crescent',
      iconColor: '#4ADE80',
      bubbleBg: '#064E3B'
    }
  ];

  const LANGUAGES = [
    { key: 'en', code: 'EN', label: 'English', sub: 'English' },
    { key: 'hi', code: 'हि', label: 'हिन्दी', sub: 'Hindi' },
    { key: 'mr', code: 'म', label: 'मराठी', sub: 'Marathi' }
  ];

  return (
    <View style={[styles.root, { backgroundColor: themeColors.background }]}>
      <Header
        title={t('myProfile')}
        subtitle={t('fieldSubtitle')}
        rightComponent={
          <View style={styles.headerIconBubble}>
            <MCIcons name="shield-check" size={20} color="#FFFFFF" />
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Farmer Profile Hero Card */}
        <Card
          style={[
            styles.profileCard,
            {
              backgroundColor: isDark ? themeColors.card : '#FFFFFF',
              borderColor: isDark ? themeColors.border : colors.borderCard
            }
          ]}
        >
          {/* Avatar with Glow Ring */}
          <View style={styles.avatarGlowRing}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          {/* Name & Farmer Status */}
          <Text style={[styles.displayName, { color: themeColors.textPrimary }]}>{displayName}</Text>

          <View style={styles.farmerBadge}>
            <MCIcons name="check-decagram" size={14} color="#16A34A" style={{ marginRight: 4 }} />
            <Text style={styles.farmerBadgeText}>{t('verifiedGrower')}</Text>
          </View>

          {/* Contact Details with Icons */}
          <View style={styles.contactContainer}>
            {user?.email ? (
              <View style={[styles.contactRow, { backgroundColor: isDark ? themeColors.surfaceAlt : colors.surfaceAlt }]}>
                <MCIcons name="email-outline" size={16} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.contactText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            ) : null}

            {user?.phone ? (
              <View style={[styles.contactRow, { backgroundColor: isDark ? themeColors.surfaceAlt : colors.surfaceAlt, marginTop: 6 }]}>
                <MCIcons name="phone-outline" size={16} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.contactText, { color: themeColors.textPrimary }]}>
                  {user.phone}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Farm Statistics Tiles */}
          <View style={styles.statsRow}>
            <View style={[styles.statTile, { backgroundColor: isDark ? themeColors.surfaceAlt : '#F0FDF4', borderColor: isDark ? themeColors.border : '#DCFCE7' }]}>
              <View style={[styles.statIconCircle, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
                <MCIcons name="sprout" size={20} color={isDark ? '#4ADE80' : '#16A34A'} />
              </View>
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>{fields.length}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('registeredPlots')}</Text>
            </View>

            <View style={[styles.statTile, { backgroundColor: isDark ? themeColors.surfaceAlt : '#F0F9FF', borderColor: isDark ? themeColors.border : '#E0F2FE' }]}>
              <View style={[styles.statIconCircle, { backgroundColor: isDark ? '#0C4A6E' : '#E0F2FE' }]}>
                <MCIcons name="clipboard-text-clock-outline" size={20} color={isDark ? '#38BDF8' : '#0284C7'} />
              </View>
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>{history.length}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('advisoriesTaken')}</Text>
            </View>
          </View>
        </Card>

        {/* SECTION 1: APPEARANCE & THEME */}
        <View style={styles.sectionHeaderWrap}>
          <View style={styles.sectionTitleRow}>
            <MCIcons name="palette-outline" size={18} color={themeColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionHeaderCaption, { color: themeColors.textPrimary }]}>{t('appearance').toUpperCase()}</Text>
          </View>
        </View>

        <Card
          style={[
            styles.settingsCard,
            {
              backgroundColor: isDark ? themeColors.card : '#FFFFFF',
              borderColor: isDark ? themeColors.border : colors.borderCard
            }
          ]}
        >
          <Text style={[styles.settingsItemLabel, { color: themeColors.textPrimary }]}>{t('appTheme')}</Text>
          <View style={styles.themeToggleRow}>
            {THEMES.map((th) => {
              const active = themeMode === th.key;
              return (
                <TouchableOpacity
                  key={th.key}
                  style={[
                    styles.themeTile,
                    {
                      backgroundColor: isDark ? themeColors.surfaceAlt : '#FFFFFF',
                      borderColor: active ? themeColors.primary : (isDark ? themeColors.border : colors.border)
                    },
                    active && { borderWidth: 2 }
                  ]}
                  onPress={() => setThemeMode(th.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.themeIconBubble, { backgroundColor: th.bubbleBg }]}>
                    <MCIcons name={th.iconName} size={22} color={th.iconColor} />
                  </View>
                  <Text style={[styles.themeTileTitle, { color: themeColors.textPrimary }]}>{th.label}</Text>
                  <Text style={[styles.themeTileSub, { color: themeColors.textMuted }]}>{th.sub}</Text>
                  {active && (
                    <View style={[styles.themeActiveDot, { backgroundColor: themeColors.primary }]}>
                      <MCIcons name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.cardInternalDivider, { backgroundColor: isDark ? themeColors.border : colors.borderLight }]} />

          <Text style={[styles.settingsItemLabel, { color: themeColors.textPrimary, marginTop: spacing.md }]}>{t('language')}</Text>
          <View style={styles.langList}>
            {LANGUAGES.map((l, idx) => {
              const active = language === l.key;
              return (
                <TouchableOpacity
                  key={l.key}
                  style={[
                    styles.langRow,
                    idx > 0 && [styles.langRowBorder, { borderTopColor: isDark ? themeColors.border : colors.borderLight }]
                  ]}
                  onPress={() => setLanguage(l.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.langCodeBadge, { backgroundColor: active ? (isDark ? '#064E3B' : '#DCFCE7') : (isDark ? themeColors.surfaceAlt : colors.surfaceAlt) }]}>
                    <Text style={[styles.langCodeText, { color: active ? themeColors.primary : themeColors.textSecondary }]}>{l.code}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[styles.langName, { color: themeColors.textPrimary }, active && { fontWeight: '800', color: themeColors.primary }]}>
                      {l.label}
                    </Text>
                    <Text style={[styles.langSub, { color: themeColors.textMuted }]}>{l.sub}</Text>
                  </View>
                  <View style={[styles.radioCircle, { borderColor: active ? themeColors.primary : (isDark ? themeColors.border : colors.border) }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: themeColors.primary }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* SECTION 2: MY FIELDS */}
        <View style={styles.sectionHeaderWrap}>
          <View style={styles.sectionTitleRow}>
            <MCIcons name="sprout" size={18} color={themeColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionHeaderCaption, { color: themeColors.textPrimary }]}>{t('myFields2').toUpperCase()} · {fields.length}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addFieldPill, { backgroundColor: isDark ? themeColors.surfaceAlt : '#DCFCE7', borderColor: isDark ? themeColors.border : '#86EFAC' }]}
            onPress={() => navigation?.navigate('AddField')}
            activeOpacity={0.8}
          >
            <MCIcons name="plus" size={14} color={isDark ? '#4ADE80' : '#16A34A'} style={{ marginRight: 2 }} />
            <Text style={[styles.addFieldPillText, { color: isDark ? '#4ADE80' : '#16A34A' }]}>{t('addField')}</Text>
          </TouchableOpacity>
        </View>

        {fields.length === 0 ? (
          <Card
            style={[
              { alignItems: 'center', paddingVertical: spacing.xl },
              { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderColor: isDark ? themeColors.border : colors.borderCard }
            ]}
          >
            <MCIcons name="seed-outline" size={36} color={themeColors.textMuted} style={{ marginBottom: 6 }} />
            <Text style={{ ...typography.body, color: themeColors.textSecondary, fontWeight: '600' }}>
              {t('noFields')}
            </Text>
          </Card>
        ) : (
          fields.map((f) => {
            const st = getStage(f.cropGrowthStage);
            return (
              <Card
                key={f._id}
                style={[
                  styles.fieldCardRow,
                  {
                    backgroundColor: isDark ? themeColors.card : '#FFFFFF',
                    borderColor: isDark ? themeColors.border : colors.borderCard
                  }
                ]}
              >
                <View style={[styles.fieldIconCircle, { backgroundColor: isDark ? '#064E3B' : '#EDFDF5' }]}>
                  <MCIcons name="sprout" size={24} color={isDark ? '#4ADE80' : '#16A34A'} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md, marginRight: spacing.sm }}>
                  <Text style={[styles.fieldNameText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <View style={styles.fieldMetaRow}>
                    <Text style={[styles.fieldMetaPillText, { color: themeColors.textSecondary }]}>
                      {(() => {
                        const acreVal = f.fieldAreaAcre || (f.fieldAreaHectare ? (f.fieldAreaHectare * 2.471).toFixed(1) : '2.5');
                        const acreUnit = Number(acreVal) === 1 ? t('acre') : t('acres');
                        return `${acreVal} ${acreUnit} · ${f.soilType} · ${st.label}`;
                      })()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.fieldDeleteCircle}
                  onPress={() => confirmDeleteField(f)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Delete field"
                >
                  <MCIcons name="trash-can-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </Card>
            );
          })
        )}

        {/* SECTION 3: DATA & STORAGE */}
        <View style={styles.sectionHeaderWrap}>
          <View style={styles.sectionTitleRow}>
            <MCIcons name="database-outline" size={18} color={themeColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionHeaderCaption, { color: themeColors.textPrimary }]}>{t('dataStorage').toUpperCase()}</Text>
          </View>
        </View>

        <Card
          style={[
            styles.accountCard,
            {
              backgroundColor: isDark ? themeColors.card : '#FFFFFF',
              borderColor: isDark ? themeColors.border : colors.borderCard
            }
          ]}
        >
          <View style={styles.accountActionRow}>
            <View style={[styles.dataIconBubble, { backgroundColor: isDark ? themeColors.surfaceAlt : colors.surfaceAlt }]}>
              <MCIcons name="history" size={22} color={themeColors.textSecondary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md, paddingRight: spacing.sm }}>
              <Text style={[styles.accountActionTitle, { color: themeColors.textPrimary }]}>
                {t('clearHistoryBtn')}
              </Text>
              <Text style={[styles.accountActionSub, { color: themeColors.textMuted }]}>
                {history.length} {t('cachedRecords')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.clearHistoryButton, history.length === 0 && { opacity: 0.5 }]}
              onPress={handleClearHistory}
              disabled={history.length === 0}
              activeOpacity={0.8}
            >
              <MCIcons name="trash-can-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={styles.clearHistoryText}>{t('clearBtn')}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Logout Button */}
        <TouchableOpacity
          style={[
            styles.logoutPillBtn,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5'
            }
          ]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <MCIcons name="logout" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>{t('logout')}</Text>
        </TouchableOpacity>

        {/* App Info Footer */}
        <View style={styles.footerInfo}>
          <MCIcons name="shield-check" size={16} color={themeColors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.versionText, { color: themeColors.textMuted }]}>
            {t('appVersion')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  headerIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110
  },
  profileCard: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    borderWidth: 1.5,
    ...shadows.md
  },
  avatarGlowRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    marginBottom: spacing.sm
  },
  avatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0B5A3E',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4ADE80'
  },
  displayName: {
    ...typography.h2,
    fontWeight: '900',
    textAlign: 'center'
  },
  farmerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginTop: 6,
    marginBottom: spacing.md
  },
  farmerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46'
  },
  contactContainer: {
    width: '100%',
    marginBottom: spacing.lg
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600'
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  statTile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center'
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900'
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center'
  },

  // Sections
  sectionHeaderWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: 4
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionHeaderCaption: {
    ...typography.caption,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  addFieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1
  },
  addFieldPillText: {
    fontSize: 12,
    fontWeight: '800'
  },

  // Settings Card
  settingsCard: {
    padding: spacing.lg,
    borderRadius: 22,
    borderWidth: 1.5,
    ...shadows.sm
  },
  settingsItemLabel: {
    ...typography.h4,
    fontWeight: '800',
    marginBottom: spacing.sm
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 12
  },
  themeTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md,
    position: 'relative'
  },
  themeIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  themeTileTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2
  },
  themeTileSub: {
    fontSize: 11,
    fontWeight: '500'
  },
  themeActiveDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardInternalDivider: {
    height: 1,
    marginVertical: spacing.lg
  },
  langList: {
    marginTop: 2
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  langRowBorder: {
    borderTopWidth: 1
  },
  langCodeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  langCodeText: {
    fontSize: 13,
    fontWeight: '800'
  },
  langName: {
    fontSize: 14,
    fontWeight: '700'
  },
  langSub: {
    fontSize: 11,
    marginTop: 1
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },

  // Field Cards
  fieldCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    ...shadows.sm
  },
  fieldIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fieldNameText: {
    fontSize: 15,
    fontWeight: '800'
  },
  fieldMetaRow: {
    marginTop: 3
  },
  fieldMetaPillText: {
    fontSize: 12,
    fontWeight: '600'
  },
  fieldDeleteCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Account Card
  accountCard: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    ...shadows.sm
  },
  accountActionRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dataIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center'
  },
  accountActionTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  accountActionSub: {
    fontSize: 11,
    marginTop: 2
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  clearHistoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626'
  },
  logoutPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    marginTop: spacing.xl,
    ...shadows.sm
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626'
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600'
  }
});
