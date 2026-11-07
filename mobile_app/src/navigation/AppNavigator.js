import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';

import DashboardScreen from '../screens/DashboardScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddFieldScreen from '../screens/AddFieldScreen';
import FertilizerRecommendationScreen from '../screens/FertilizerRecommendationScreen';
import WaterRecommendationScreen from '../screens/WaterRecommendationScreen';

// 5 equal tabs matching the reference mockup
const TAB_CONFIG = [
  { key: 'Dashboard', labelKey: 'home', defaultLabel: 'Home', iconName: 'sprout' },
  { key: 'FertilizerRecommendation', labelKey: 'fertilizer', defaultLabel: 'Fertilizer', iconName: 'barley' },
  { key: 'WaterRecommendation', labelKey: 'water', defaultLabel: 'Water', iconName: 'water' },
  { key: 'History', labelKey: 'history', defaultLabel: 'History', iconName: 'clock-outline' },
  { key: 'Profile', labelKey: 'profile', defaultLabel: 'Profile', iconName: 'account' }
];

export default function AppNavigator() {
  const { user, t, themeColors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const [currentTab, setCurrentTab] = useState('Dashboard');
  const [extraParams, setExtraParams] = useState({});
  const [screenStack, setScreenStack] = useState([]);

  if (!user || !user.email) {
    return null;
  }

  const navigation = {
    navigate: (screen, params) => {
      if (screen === 'AddField') {
        setScreenStack((prev) => [...prev, { screen: currentTab, params: extraParams }]);
        setCurrentTab('__AddField');
        setExtraParams(params || {});
      } else if (screen === 'Recommendations') {
        setScreenStack((prev) => [...prev, { screen: currentTab, params: extraParams }]);
        setCurrentTab('__Recommendations');
        setExtraParams(params || {});
      } else if (TAB_CONFIG.find((tab) => tab.key === screen)) {
        if (currentTab !== screen) {
          setScreenStack((prev) => [...prev, { screen: currentTab, params: extraParams }]);
        }
        setCurrentTab(screen);
        setExtraParams(params || {});
      } else {
        setCurrentTab(screen);
        setExtraParams(params || {});
      }
    },
    goBack: () => {
      if (screenStack.length > 0) {
        const prev = screenStack[screenStack.length - 1];
        setScreenStack((st) => st.slice(0, -1));
        setCurrentTab(prev.screen);
        setExtraParams(prev.params || {});
      } else {
        setCurrentTab('Dashboard');
        setExtraParams({});
      }
    }
  };

  const route = { params: extraParams };
  const isInModal = currentTab === '__AddField' || currentTab === '__Recommendations';

  const renderScreen = () => {
    switch (currentTab) {
      case 'FertilizerRecommendation':
      case '__FertilizerRecommendation':
        return <FertilizerRecommendationScreen navigation={navigation} route={route} />;
      case 'WaterRecommendation':
      case '__WaterRecommendation':
        return <WaterRecommendationScreen navigation={navigation} route={route} />;
      case 'Recommendations':
      case '__Recommendations':
        return <RecommendationsScreen navigation={navigation} route={route} />;
      case 'History':
        return <HistoryScreen navigation={navigation} route={route} />;
      case 'Profile':
        return <ProfileScreen navigation={navigation} route={route} />;
      case '__AddField':
        return <AddFieldScreen navigation={navigation} route={route} />;
      default:
        return <DashboardScreen navigation={navigation} route={route} />;
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: isDark ? themeColors.background : themeColors.primary }
      ]}
      edges={['top']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? themeColors.background : themeColors.primary}
      />
      <View style={[styles.root, { backgroundColor: themeColors.background }]}>
        <View style={[styles.content, isInModal && { paddingBottom: insets.bottom }]}>
          {renderScreen()}
        </View>

        {!isInModal && (
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: isDark ? 'rgba(7, 31, 23, 0.95)' : 'rgba(255, 255, 255, 0.94)',
                borderTopColor: isDark ? 'rgba(74, 222, 128, 0.22)' : 'rgba(213, 229, 218, 0.9)',
                paddingBottom: Math.max(insets.bottom, 10)
              }
            ]}
          >
            {TAB_CONFIG.map((tab) => {
              const active = currentTab === tab.key;
              const label = t ? t(tab.labelKey) : tab.defaultLabel;

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => {
                    setCurrentTab(tab.key);
                    setExtraParams({});
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <View
                    style={[
                      styles.indicator,
                      {
                        backgroundColor: active
                          ? (isDark ? themeColors.accent : colors.accent)
                          : 'transparent'
                      }
                    ]}
                  />
                  <View
                    style={[
                      styles.iconWrap,
                      active && {
                        backgroundColor: isDark ? 'rgba(74, 222, 128, 0.16)' : 'rgba(22, 163, 74, 0.12)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(74, 222, 128, 0.35)' : 'rgba(22, 163, 74, 0.25)'
                      }
                    ]}
                  >
                    <MCIcons
                      name={tab.iconName}
                      size={22}
                      color={active
                        ? (isDark ? themeColors.accent : colors.primary)
                        : themeColors.textMuted}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tabLabel,
                      {
                        color: active
                          ? (isDark ? themeColors.accent : colors.primary)
                          : themeColors.textMuted,
                        fontWeight: active ? '800' : '600'
                      }
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primary
  },
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    paddingTop: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 68,
    ...shadows.md
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  indicator: {
    width: 16,
    height: 3,
    borderRadius: 2,
    marginBottom: 4
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabIcon: {
    fontSize: 18
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center'
  }
});
