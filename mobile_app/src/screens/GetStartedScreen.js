import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ImageBackground, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { typography, spacing, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';

const LANGUAGES = [
  { key: 'en', label: 'English' },
  { key: 'hi', label: 'हिन्दी' },
  { key: 'mr', label: 'मराठी' }
];

export default function GetStartedScreen({ onGetStarted }) {
  const { language, setLanguage, t } = useApp ? useApp() : { language: 'en', setLanguage: () => {}, t: (k) => k };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Sugarcane Plantation Background matching Reference Mockup Screen 1 */}
      <ImageBackground
        source={require('../../assets/sugarcane_bg.jpg')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        {/* Dark overlay gradient for contrast */}
        <View style={styles.scrimOverlay} />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Top Brand Tag & Language Switcher */}
          <View style={styles.topBar}>
            <View style={styles.topBadge}>
              <MCIcons name="leaf" size={14} color="#4ADE80" style={{ marginRight: 4 }} />
              <Text style={styles.topBadgeText}>{t('smartAgri')}</Text>
            </View>

            {/* Language Selector Pill */}
            <View style={styles.langPillContainer}>
              {LANGUAGES.map((l) => {
                const active = language === l.key;
                return (
                  <TouchableOpacity
                    key={l.key}
                    style={[styles.langChip, active && styles.langChipActive]}
                    onPress={() => setLanguage(l.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bottom Card Content */}
          <View style={styles.bottomContent}>
            {/* Sprout Icon Bubble */}
            <View style={styles.logoWrap}>
              <View style={styles.sproutBubble}>
                <MCIcons name="sprout" size={38} color="#4ADE80" />
              </View>
            </View>

            {/* App Title & Subtitle */}
            <Text style={styles.title}>{t('getStartedTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('getStartedSubtitle')}
            </Text>

            {/* Pagination Dots (matching Screen 1) */}
            <View style={styles.dotsRow}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>

            {/* Get Started Button */}
            <TouchableOpacity
              style={styles.getStartedBtn}
              onPress={onGetStarted}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={t('getStartedBtn')}
            >
              <Text style={styles.getStartedText}>{t('getStartedBtn')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#072318'
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 27, 18, 0.45)'
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl
  },
  topBar: {
    alignItems: 'center',
    paddingTop: spacing.lg
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 35, 24, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)'
  },
  topBadgeText: {
    ...typography.caption,
    color: '#F0FDF4',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  langPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 35, 24, 0.85)',
    borderRadius: 20,
    padding: 3,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)'
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16
  },
  langChipActive: {
    backgroundColor: '#16A34A'
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  langChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  bottomContent: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    backgroundColor: 'rgba(7, 35, 24, 0.82)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    marginHorizontal: -4,
    ...shadows.lg
  },
  logoWrap: {
    marginBottom: spacing.md
  },
  sproutBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.45)'
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: spacing.xs
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xxl
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)'
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80'
  },
  getStartedBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  }
});

