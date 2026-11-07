import { Platform } from 'react-native';

/**
 * Smart Cane design system
 * Premium Agricultural Palette
 * Light: Deep forest green + fresh teal/emerald accents on soft off-white canvas.
 * Dark: Pitch black canvas (#121212) + high contrast surfaces (#1E1E1E) with emerald glow.
 */
export const lightColors = {
  // Brand
  primary: '#0B5A3E',
  primaryDark: '#04281B',
  primaryLight: '#16A34A',
  secondary: '#0F766E',
  accent: '#16A34A',
  accentLime: '#DCFCE7',
  accentGlow: '#4ADE80',
  accentMint: '#F0FDF4',
  highlight: '#FBBF24',
  highlightLight: '#FEF3C7',

  // Surfaces (Refined Glassmorphism)
  background: '#EDF5EF',
  card: 'rgba(255, 255, 255, 0.92)',
  surface: 'rgba(255, 255, 255, 0.94)',
  surfaceAlt: 'rgba(240, 247, 242, 0.85)',
  surfaceMuted: '#E2ECE5',

  // Text
  textPrimary: '#0F291E',
  textSecondary: '#476355',
  textMuted: '#789586',
  textInverse: '#FFFFFF',
  textAccent: '#16A34A',
  textEmerald: '#0B5A3E',

  // Status
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  // Farm domain
  waterBlue: '#0284C7',
  waterBlueLight: '#E0F2FE',
  gold: '#FBBF24',
  goldLight: '#FEF3C7',
  goldDark: '#B45309',
  fertilizerAmber: '#D97706',
  fertilizerLight: '#FEF3C7',
  soilBrown: '#7A4A21',
  soilLight: '#F6EDE4',

  // Lines (Luminous Glass Borders)
  border: 'rgba(213, 229, 218, 0.9)',
  borderLight: 'rgba(230, 239, 232, 0.85)',
  borderFocused: '#16A34A',
  borderCard: 'rgba(213, 229, 218, 0.95)'
};

export const darkColors = {
  // Brand
  primary: '#10B981',
  primaryDark: '#022C22',
  primaryLight: '#34D399',
  secondary: '#06B6D4',
  accent: '#10B981',
  accentLime: '#064E3B',
  accentGlow: '#6EE7B7',
  accentMint: '#064E3B',
  highlight: '#F59E0B',
  highlightLight: '#451A03',

  // Surfaces (Sleek Obsidian Canvas & Modern Elevated Glass Surfaces)
  background: '#090D0B',
  card: 'rgba(18, 26, 22, 0.88)',
  surface: 'rgba(23, 33, 28, 0.94)',
  surfaceAlt: 'rgba(29, 43, 36, 0.82)',
  surfaceMuted: '#1E2F26',

  // Text (WCAG High Contrast for Dark Mode)
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#090D0B',
  textAccent: '#34D399',
  textEmerald: '#34D399',

  // Status
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.15)',

  // Farm domain
  waterBlue: '#38BDF8',
  waterBlueLight: 'rgba(56, 189, 248, 0.15)',
  gold: '#FBBF24',
  goldLight: 'rgba(251, 191, 36, 0.15)',
  goldDark: '#D97706',
  fertilizerAmber: '#F59E0B',
  fertilizerLight: 'rgba(245, 158, 11, 0.15)',
  soilBrown: '#D97706',
  soilLight: 'rgba(217, 119, 6, 0.15)',

  // Lines (Crisp Luminescent Glass Borders)
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
  borderFocused: '#10B981',
  borderCard: 'rgba(255, 255, 255, 0.12)'
};

// Base colors definition for stylesheets (Standard Light theme defaults)
export const colors = lightColors;

export function getTheme(mode) {
  return mode === 'dark' ? darkColors : lightColors;
}

const FONT_HEADING = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium'
});

const FONT_BODY = Platform.select({
  ios: 'System',
  android: 'sans-serif'
});

export const typography = {
  h1: { fontFamily: FONT_HEADING, fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: FONT_HEADING, fontSize: 22, fontWeight: '800', lineHeight: 28, letterSpacing: -0.4 },
  h3: { fontFamily: FONT_HEADING, fontSize: 17, fontWeight: '700', lineHeight: 23, letterSpacing: -0.2 },
  h4: { fontFamily: FONT_HEADING, fontSize: 15, fontWeight: '700', lineHeight: 21, letterSpacing: -0.1 },
  subtitle: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
  body: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: '400', lineHeight: 21, letterSpacing: 0.15 },
  bodyBold: { fontFamily: FONT_HEADING, fontSize: 14, fontWeight: '700', lineHeight: 21, letterSpacing: 0.1 },
  small: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: '500', lineHeight: 18, letterSpacing: 0.1 },
  caption: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: '600', lineHeight: 16, letterSpacing: 0.3 },
  micro: { fontFamily: FONT_HEADING, fontSize: 10, fontWeight: '700', lineHeight: 14, letterSpacing: 0.6 }
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 40 };

export const borderRadius = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, full: 9999 };

export const shadows = {
  none: { elevation: 0, shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  sm: { elevation: 2, shadowColor: '#07281D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  md: { elevation: 4, shadowColor: '#07281D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12 },
  lg: { elevation: 8, shadowColor: '#07281D', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 20 }
};
