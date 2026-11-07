import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, shadows, spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';

function useThemeSafe() {
  try {
    return useApp() || {};
  } catch (e) {
    return {};
  }
}

export const tones = {
  good: { bg: colors.successLight, fg: colors.primaryLight },
  warn: { bg: colors.warningLight, fg: colors.fertilizerAmber },
  bad: { bg: colors.errorLight, fg: colors.error },
  info: { bg: colors.waterBlueLight, fg: colors.waterBlue },
  neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary },
  accent: { bg: colors.accentMint, fg: colors.primary }
};

export function Card({ children, style, onPress, glass = false }) {
  const { themeColors, isDark } = useThemeSafe();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[
        s.card,
        themeColors && {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border
        },
        glass && (isDark ? s.cardGlassDark : s.cardGlass),
        style
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {children}
    </Wrapper>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  iconName,
  iconLib = 'mci',
  arrow,
  style
}) {
  const isPrimary = variant === 'primary';
  const isWater = variant === 'water';
  const isAmber = variant === 'amber';
  const isLight = variant === 'light';
  const isOutline = variant === 'outline';
  const isSm = size === 'sm';
  const isSolid = isPrimary || isWater || isAmber;
  const iconColor = isSolid ? '#FFFFFF' : (isWater ? colors.waterBlue : colors.primary);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.965,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true
    }).start();
  };

  const renderIcon = () => {
    if (iconName) {
      if (iconLib === 'ion') {
        return <Ionicons name={iconName} size={isSm ? 18 : 22} color={iconColor} style={{ marginRight: 8 }} />;
      }
      return <MCIcons name={iconName} size={isSm ? 18 : 22} color={iconColor} style={{ marginRight: 8 }} />;
    }
    if (icon) {
      return <Text style={[s.btnIcon, isSm && { fontSize: 16 }]}>{icon}</Text>;
    }
    return null;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.88}
        style={[
          s.btn,
          isSm ? s.btnSm : s.btnMd,
          isPrimary && s.btnPrimary,
          isWater && s.btnWater,
          isAmber && s.btnAmber,
          isLight && s.btnLight,
          isOutline && (isSm ? s.btnOutlineSm : s.btnOutline),
          (disabled || loading) && { opacity: 0.6 },
          style
        ]}
      >
        {loading ? (
          <ActivityIndicator color={isSolid ? '#FFFFFF' : colors.primary} />
        ) : (
          <View style={s.btnRow}>
            {renderIcon()}
            <Text
              style={[
                s.btnText,
                isSm && s.btnTextSm,
                isSolid ? { color: '#FFFFFF' } : { color: colors.primary }
              ]}
            >
              {title}
            </Text>
            {arrow && (
              <MCIcons name="arrow-right" size={isSm ? 16 : 20} color={iconColor} style={{ marginLeft: 6 }} />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function Pill({ text, tone = 'neutral', caps = false, style }) {
  const t = tones[tone] || tones.neutral;
  const displayText = caps && typeof text === 'string' ? text.toUpperCase() : text;
  return (
    <View style={[s.pill, { backgroundColor: t.bg }, style]}>
      <Text style={[s.pillText, { color: t.fg }, caps && s.pillCaps]}>
        {displayText}
      </Text>
    </View>
  );
}

export function IconBubble({ icon, iconName, iconLib = 'mci', tone = 'neutral', size = 44, iconColor, iconSize }) {
  const t = tones[tone] || tones.neutral;
  const resolvedColor = iconColor || t.fg;
  const resolvedIconSize = iconSize || Math.round(size * 0.52);

  const renderIcon = () => {
    if (iconName) {
      if (iconLib === 'ion') {
        return <Ionicons name={iconName} size={resolvedIconSize} color={resolvedColor} />;
      }
      return <MCIcons name={iconName} size={resolvedIconSize} color={resolvedColor} />;
    }
    // fallback to emoji text for backward compat
    return <Text style={{ fontSize: Math.round(size * 0.48) }}>{icon}</Text>;
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {renderIcon()}
    </View>
  );
}

export function SectionTitle({ title, action, onAction, style }) {
  const { themeColors } = useThemeSafe();
  return (
    <View style={[s.sectionRow, style]}>
      <Text style={[s.sectionTitle, themeColors && { color: themeColors.textPrimary }]}>{title}</Text>
      {action ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Text style={[s.sectionAction, themeColors && { color: themeColors.accent }]}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Stepper({ steps, currentStep, onStepPress, style, activeColor }) {
  const { themeColors, isDark } = useThemeSafe();
  return (
    <View style={[s.stepperRow, style]}>
      {steps.map((st, i) => {
        const stepNum = i + 1;
        const active = currentStep === stepNum;
        return (
          <TouchableOpacity
            key={st}
            disabled={!onStepPress}
            onPress={() => onStepPress && onStepPress(stepNum)}
            style={[
              s.stepperPill,
              active ? s.stepperPillActive : s.stepperPillInactive,
              active && { backgroundColor: activeColor || themeColors?.accent || '#16A34A' },
              !active && isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: themeColors?.border || '#1E4537' }
            ]}
            activeOpacity={0.8}
          >
            <View style={[s.stepNumCircle, active ? s.stepNumActive : s.stepNumInactive]}>
              <Text style={[s.stepNumText, active && s.stepNumTextActive]}>{stepNum}</Text>
            </View>
            <Text
              style={[
                s.stepperLabel,
                active ? s.stepperLabelActive : (isDark ? { color: themeColors?.textSecondary || '#A7C4B5' } : s.stepperLabelInactive)
              ]}
              numberOfLines={1}
            >
              {st}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DropdownCard({ label, value, placeholder = 'Select Field', onPress, style }) {
  const { themeColors, isDark } = useThemeSafe();
  return (
    <TouchableOpacity
      style={[
        s.dropdownCard,
        isDark && { backgroundColor: themeColors?.card || '#122D23', borderColor: themeColors?.border || '#1E4537' },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        {label ? <Text style={[s.dropdownLabel, isDark && { color: themeColors?.textMuted }]}>{label}</Text> : null}
        <Text
          style={[
            s.dropdownValue,
            !value && { color: themeColors?.textMuted || '#789586', fontWeight: '500' },
            value && { color: themeColors?.textPrimary || '#0F291E' }
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </View>
      <MCIcons name="chevron-down" size={24} color={themeColors?.textSecondary || '#476355'} />
    </TouchableOpacity>
  );
}

export function InfoTipCard({ iconName = 'lightbulb-outline', iconColor, title, text, style }) {
  const { themeColors, isDark } = useThemeSafe();
  return (
    <View
      style={[
        s.infoTipCard,
        isDark && { backgroundColor: 'rgba(18, 45, 35, 0.7)', borderColor: themeColors?.border || '#1E4537' },
        style
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <View style={s.infoTipIconWrap}>
          <MCIcons name={iconName} size={20} color={iconColor || (isDark ? '#FBBF24' : '#D97706')} />
        </View>
        <Text style={[s.infoTipTitle, { color: themeColors?.textPrimary || '#0F291E' }]}>{title}</Text>
      </View>
      <Text style={[s.infoTipText, { color: themeColors?.textSecondary || '#476355' }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon, iconName, iconLib = 'mci', title, text, actionTitle, onAction, style }) {
  const { themeColors } = useThemeSafe();
  const renderIcon = () => {
    if (iconName) {
      if (iconLib === 'ion') {
        return <Ionicons name={iconName} size={48} color={themeColors?.primary || colors.primary} />;
      }
      return <MCIcons name={iconName} size={48} color={themeColors?.primary || colors.primary} />;
    }
    return <Text style={{ fontSize: 44 }}>{icon}</Text>;
  };

  return (
    <View style={[
      s.empty,
      themeColors && {
        backgroundColor: themeColors.card,
        borderColor: themeColors.border
      },
      style
    ]}>
      <View style={[
        s.emptyIcon,
        themeColors && { backgroundColor: themeColors.surfaceAlt }
      ]}>
        {renderIcon()}
      </View>
      <Text style={[s.emptyTitle, themeColors && { color: themeColors.textPrimary }]}>{title}</Text>
      <Text style={[s.emptyText, themeColors && { color: themeColors.textSecondary }]}>{text}</Text>
      {actionTitle ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.md
  },
  cardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)'
  },
  cardGlassDark: {
    backgroundColor: 'rgba(18, 45, 35, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.22)'
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  btnMd: {
    minHeight: 52,
    borderRadius: 26
  },
  btnSm: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: spacing.md
  },
  btnPrimary: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  btnWater: {
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  btnAmber: {
    backgroundColor: '#D97706',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  btnLight: {
    backgroundColor: colors.accentMint,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  btnOutline: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.sm
  },
  btnOutlineSm: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.sm
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnIcon: {
    fontSize: 18,
    marginRight: 8
  },
  btnText: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '700'
  },
  btnTextSm: {
    fontSize: 14,
    fontWeight: '700'
  },
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999
  },
  pillText: {
    ...typography.caption,
    fontWeight: '700'
  },
  pillCaps: {
    letterSpacing: 0.6,
    fontSize: 10
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '800'
  },
  sectionAction: {
    ...typography.h4,
    color: colors.accent,
    fontWeight: '700'
  },
  empty: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    ...shadows.sm
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: colors.accentMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '800'
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6
  },
  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: spacing.md
  },
  stepperPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent'
  },
  stepperPillActive: {
    backgroundColor: '#16A34A',
    borderColor: 'transparent',
    ...shadows.sm
  },
  stepperPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderColor: '#D5E5DA'
  },
  stepNumCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  stepNumActive: {
    backgroundColor: '#FFFFFF'
  },
  stepNumInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)'
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#476355'
  },
  stepNumTextActive: {
    color: '#16A34A'
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '700'
  },
  stepperLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  stepperLabelInactive: {
    color: '#476355'
  },

  // Dropdown Card
  dropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#D5E5DA',
    marginVertical: spacing.sm,
    ...shadows.sm
  },
  dropdownLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2
  },
  dropdownValue: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700'
  },

  // Info Tip Card
  infoTipCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#E2ECE5',
    marginTop: spacing.lg,
    ...shadows.sm
  },
  infoTipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  infoTipTitle: {
    ...typography.h4,
    fontWeight: '800'
  },
  infoTipText: {
    ...typography.small,
    lineHeight: 19,
    marginTop: 2
  }
});
