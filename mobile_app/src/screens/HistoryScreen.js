import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Alert
} from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import Header from '../components/Header';
import { EmptyState } from '../components/ui';

export default function HistoryScreen({ navigation }) {
  const {
    history,
    loadHistory,
    setLatestAdvisory,
    deleteHistoryItem,
    clearHistory,
    t,
    isDark,
    themeColors
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const openItem = async (item) => {
    try {
      const res = await api.getSession(item.id);
      if (res?.session) {
        setLatestAdvisory(res.session);
        navigation?.navigate('Recommendations', { advisory: res.session });
        return;
      }
    } catch (err) {
      Alert.alert('Could not load advice', err.message || 'Please try again when you have a connection.');
    }
  };

  const confirmDelete = (item) => {
    Alert.alert(
      t('delete'),
      `${t('delete')} "${item.fieldName || t('home')}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHistoryItem(item.id);
              await loadHistory();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete advisory record');
            }
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      t('clearAll'),
      t('clearHistoryConfirm'),
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

  const FILTERS = [
    { k: 'all', label: t('filterAll', 'All') },
    { k: 'fertilizer', label: t('filterFert', 'Fertilizer') },
    { k: 'water', label: t('filterWater', 'Water') }
  ];

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((h) => {
      const matchesSearch =
        !q ||
        (h.fieldName || '').toLowerCase().includes(q) ||
        (h.recommendedFertilizer || '').toLowerCase().includes(q) ||
        (h.irrigationNeed || '').toLowerCase().includes(q) ||
        (h.advisoryType || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (filter === 'fertilizer') {
        return h.advisoryType === 'fertilizer' || !!h.recommendedFertilizer;
      }
      if (filter === 'water') {
        return h.advisoryType === 'water' || h.irrigationNeed != null || h.irrigationRequired != null;
      }
      return true;
    });
  }, [history, query, filter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: themeColors.background }]}>
      <Header
        title={t('history')}
        subtitle={t('fieldSubtitle')}
        onBack={() => navigation?.goBack()}
        rightAction={history.length > 0 ? t('clearAll') : undefined}
        onRightPress={handleClearAll}
      />

      {/* Filter Pills row (Screen 8 in Mockup) */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.k;
          return (
            <TouchableOpacity
              key={f.k}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active
                    ? (isDark ? themeColors.primary : '#FFFFFF')
                    : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)'),
                  borderColor: active
                    ? (isDark ? themeColors.primary : '#FFFFFF')
                    : (isDark ? themeColors.border : colors.border)
                }
              ]}
              onPress={() => setFilter(f.k)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color: active
                      ? (isDark ? '#0B1E17' : colors.primary)
                      : themeColors.textSecondary,
                    fontWeight: active ? '800' : '600'
                  }
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Input */}
      {history.length > 4 && (
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? themeColors.card : '#FFFFFF',
                borderColor: isDark ? themeColors.border : colors.border
              }
            ]}
          >
            <MCIcons name="magnify" size={18} color={themeColors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.textPrimary }]}
              placeholder={t('searchHistory')}
              placeholderTextColor={themeColors.textMuted}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <MCIcons name="close-circle" size={16} color={themeColors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        {history.length === 0 ? (
          <EmptyState
            iconName="clipboard-text-outline"
            title={t('noHistory')}
            text={t('fieldSubtitle')}
            actionTitle={filter === 'water' ? t('waterAdvisory') : t('fertilizerAdvisory')}
            onAction={() => navigation?.navigate(filter === 'water' ? 'WaterRecommendation' : 'FertilizerRecommendation')}
            style={{ marginTop: spacing.xl }}
          />
        ) : list.length === 0 ? (
          <EmptyState
            iconName="text-box-search-outline"
            title={t('noRecordsMatch')}
            text={t('adjustFilterKeywords')}
            actionTitle={t('clearFilter')}
            onAction={() => {
              setQuery('');
              setFilter('all');
            }}
            style={{ marginTop: spacing.xl }}
          />
        ) : (
          list.map((item, idx) => {
            const isFert =
              item.advisoryType === 'fertilizer' ||
              (item.recommendedFertilizer && !item.irrigationNeed);

            return (
              <TouchableOpacity
                key={item.id || idx}
                onPress={() => openItem(item)}
                activeOpacity={0.85}
                style={[
                  styles.historyCard,
                  {
                    backgroundColor: isDark ? themeColors.card : '#FFFFFF',
                    borderColor: isDark ? themeColors.border : colors.borderCard
                  }
                ]}
              >
                <View
                  style={[
                    styles.historyIconBubble,
                    {
                      backgroundColor: isFert
                        ? (isDark ? '#064E3B' : '#EDFDF5')
                        : (isDark ? '#0C4A6E' : '#F0F9FF'),
                      borderColor: isFert
                        ? (isDark ? 'rgba(74, 222, 128, 0.4)' : '#BBF7D0')
                        : (isDark ? 'rgba(56, 189, 248, 0.4)' : '#BAE6FD'),
                      borderWidth: 1.5
                    }
                  ]}
                >
                  <MCIcons
                    name={isFert ? 'sprout' : 'water'}
                    size={24}
                    color={isFert ? (isDark ? '#4ADE80' : '#16A34A') : (isDark ? '#38BDF8' : '#0284C7')}
                  />
                </View>

                <View style={styles.historyContent}>
                  <Text style={[styles.historyTitle, { color: themeColors.textPrimary }]}>
                    {isFert ? t('fertilizerAdvisory') : t('waterAdvisory')}
                  </Text>
                  <Text style={[styles.historySubtitle, { color: themeColors.textSecondary }]}>
                    {item.fieldName || 'Sugarcane Field'}
                  </Text>
                  <Text style={[styles.historyDate, { color: themeColors.textMuted }]}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>

                <View style={styles.historyRight}>
                  <TouchableOpacity
                    style={styles.deleteMiniBtn}
                    onPress={() => confirmDelete(item)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.7}
                  >
                    <MCIcons name="trash-can-outline" size={16} color={isDark ? '#F87171' : '#DC2626'} />
                  </TouchableOpacity>
                  <MCIcons name="chevron-right" size={24} color={themeColors.textMuted} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: 10
  },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm
  },
  filterPillText: {
    ...typography.body,
    fontSize: 14
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    minHeight: 44
  },
  searchInput: {
    flex: 1,
    fontSize: 14
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  historyIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  historyContent: {
    flex: 1
  },
  historyTitle: {
    ...typography.h4,
    fontWeight: '800',
    marginBottom: 2
  },
  historySubtitle: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600'
  },
  historyDate: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  deleteMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
