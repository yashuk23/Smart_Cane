import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, borderRadius } from '../theme/colors';
import { useApp } from '../context/AppContext';

/**
 * Premium page header.
 * Props: title, subtitle, rightAction, onRightPress, onBack, tall, transparent
 */
export default function Header({
  title,
  subtitle,
  rightAction,
  onRightPress,
  rightComponent,
  onBack,
  tall = false,
  transparent = false,
  backgroundColor
}) {
  const { themeColors, isDark } = useApp() || {};
  const headerBg = backgroundColor
    ? backgroundColor
    : transparent
      ? 'transparent'
      : isDark
        ? (themeColors?.background || '#071F17')
        : (colors.primary || '#0B5A3E');
  const headerBorder = transparent
    ? 'transparent'
    : isDark
      ? 'rgba(74, 222, 128, 0.14)'
      : 'rgba(255, 255, 255, 0.12)';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: headerBg, borderBottomColor: headerBorder },
        transparent && styles.transparentContainer,
        tall && styles.tallContainer
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity
            style={[
              styles.back,
              isDark && { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)' },
              transparent && !isDark && { backgroundColor: 'rgba(0,0,0,0.06)', borderColor: 'rgba(0,0,0,0.12)' }
            ]}
            onPress={onBack}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MCIcons
              name="arrow-left"
              size={22}
              color={transparent && !isDark ? (themeColors?.textPrimary || '#0F291E') : '#FFFFFF'}
            />
          </TouchableOpacity>
        ) : null}
        <View style={styles.textWrap}>
          <Text
            style={[
              styles.title,
              transparent && !isDark && { color: themeColors?.textPrimary || '#0F291E' }
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                transparent && !isDark
                  ? { color: themeColors?.textSecondary || '#476355' }
                  : isDark
                    ? { color: themeColors?.textSecondary || '#A7C4B5' }
                    : { color: '#DCFCE7' }
              ]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightComponent ? (
          rightComponent
        ) : rightAction ? (
          <TouchableOpacity
            style={[styles.action, isDark && styles.actionDark]}
            onPress={onRightPress}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <MCIcons
              name={String(rightAction).toLowerCase().includes('share') ? 'share-variant' : 'check'}
              size={15}
              color="#FFFFFF"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.actionText}>{rightAction}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#071F17',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 222, 128, 0.14)',
    elevation: 0,
    shadowOpacity: 0
  },
  transparentContainer: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0
  },
  tallContainer: {
    paddingBottom: 20
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  textWrap: {
    flex: 1
  },
  title: {
    ...typography.h2,
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800'
  },
  subtitle: {
    ...typography.subtitle,
    fontSize: 13,
    color: '#DCFCE7',
    marginTop: 2,
    fontWeight: '600',
    opacity: 0.95
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    marginTop: -2
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    marginLeft: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.4)'
  },
  actionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.22)'
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2
  }
});
