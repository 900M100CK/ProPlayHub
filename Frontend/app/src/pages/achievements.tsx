// app/src/home/achievements.tsx
// ============================================
// My Achievements - Data-driven Dashboard UI
// ============================================
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

type PlatformFilter = 'All' | 'PC' | 'Console' | 'Mobile';
type DateRangeFilter = '7d' | '30d' | '6m';

const AchievementsScreen = () => {
  const router = useRouter();

  // --- Filters state ---
  const [platform, setPlatform] = useState<PlatformFilter>('All');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30d');

  // --- Dummy stats (can be replaced by API data later) ---
  const baseStats = {
    totalHoursPlayed: 247,
    completedGames: 18,
    activeSubscriptions: 3,
  };

  // Simple scale to pretend filters change numbers a bit
  const multiplierByPlatform: Record<PlatformFilter, number> = {
    All: 1,
    PC: 0.7,
    Console: 0.5,
    Mobile: 0.4,
  };
  const multiplierByRange: Record<DateRangeFilter, number> = {
    '7d': 0.15,
    '30d': 0.5,
    '6m': 1,
  };

  const stats = useMemo(() => {
    const factor = multiplierByPlatform[platform] * multiplierByRange[dateRange];
    return {
      hoursPlayed: Math.round(baseStats.totalHoursPlayed * factor),
      completedGames: Math.max(1, Math.round(baseStats.completedGames * factor)),
      activeSubscriptions: baseStats.activeSubscriptions,
    };
  }, [platform, dateRange]);

  const recentAchievements = [
    {
      id: '1',
      title: 'Master Player',
      description: 'Completed 10 games',
      color: '#FACC15',
      icon: 'trophy-outline' as const,
    },
    {
      id: '2',
      title: 'Marathon Gamer',
      description: '200+ hours played',
      color: '#38BDF8',
      icon: 'star-outline' as const,
    },
  ];

  // Playtime trend data (fake data per range)
  const playtimeData = useMemo(() => {
    if (dateRange === '7d') {
      return [
        { label: 'Mon', value: 2 },
        { label: 'Tue', value: 3 },
        { label: 'Wed', value: 1 },
        { label: 'Thu', value: 4 },
        { label: 'Fri', value: 5 },
        { label: 'Sat', value: 6 },
        { label: 'Sun', value: 3 },
      ];
    }
    if (dateRange === '30d') {
      return [
        { label: 'W1', value: 10 },
        { label: 'W2', value: 15 },
        { label: 'W3', value: 9 },
        { label: 'W4', value: 13 },
      ];
    }
    // 6 months
    return [
      { label: 'Jan', value: 35 },
      { label: 'Feb', value: 28 },
      { label: 'Mar', value: 42 },
      { label: 'Apr', value: 30 },
      { label: 'May', value: 50 },
      { label: 'Jun', value: 62 },
    ];
  }, [dateRange]);

  const maxPlaytimeValue = Math.max(...playtimeData.map((d) => d.value));

  // Progress examples (could be per-genre etc.)
  const progressItems = [
    { id: 'p1', label: 'Story Completion', value: 0.72 },
    { id: 'p2', label: 'Achievement Unlocks', value: 0.48 },
    { id: 'p3', label: 'Multiplayer Rank', value: 0.63 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBarIcon}>
          <Ionicons name="chevron-back" size={20} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.topBarText}>My Achievements</Text>
        <View style={styles.topBarIcon} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Title */}
        <Text style={styles.pageTitle}>Gaming Achievements</Text>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Platform</Text>
            <View style={styles.chipRow}>
              {(['All', 'PC', 'Console', 'Mobile'] as PlatformFilter[]).map((item) => {
                const active = platform === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setPlatform(item)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.chipRow}>
              {(['7d', '30d', '6m'] as DateRangeFilter[]).map((item) => {
                const active = dateRange === item;
                const label =
                  item === '7d' ? 'Last 7 days' : item === '30d' ? 'Last 30 days' : 'Last 6 months';
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDateRange(item)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Key Metrics card */}
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsCard}
        >
          <View style={styles.statsHeader}>
            <Ionicons name="game-controller-outline" size={22} color="#E0F2FE" />
            <Text style={styles.statsHeaderText}>Your Stats</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.hoursPlayed}</Text>
              <Text style={styles.statLabel}>Hours Played</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.completedGames}</Text>
              <Text style={styles.statLabel}>Games Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.activeSubscriptions}</Text>
              <Text style={styles.statLabel}>Active Subs</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Playtime chart */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Playtime Trend</Text>
            <Ionicons name="bar-chart-outline" size={18} color="#6B7280" />
          </View>
          <Text style={styles.sectionSubtitle}>
            Hours played by {dateRange === '7d' ? 'day' : dateRange === '30d' ? 'week' : 'month'}
          </Text>

          <View style={styles.chartContainer}>
            {playtimeData.map((item) => {
              const widthPercent = (item.value / maxPlaytimeValue) * 100;
              return (
                <View key={item.label} style={styles.chartRow}>
                  <Text style={styles.chartLabel}>{item.label}</Text>
                  <View style={styles.chartBarBackground}>
                    <View
                      style={[styles.chartBarFill, { width: `${widthPercent}%` }]}
                    />
                  </View>
                  <Text style={styles.chartValue}>{item.value}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Progress bars / badges */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Progress Overview</Text>
            <Ionicons name="trophy-outline" size={18} color="#6B7280" />
          </View>

          {progressItems.map((p) => (
            <View key={p.id} style={styles.progressItem}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>{p.label}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{Math.round(p.value * 100)}%</Text>
                </View>
              </View>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${p.value * 100}%` }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Recent achievements */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>

          {recentAchievements.map((a) => (
            <View key={a.id} style={styles.achievementRow}>
              <View style={[styles.achievementIcon, { backgroundColor: a.color }]}>
                <Ionicons name={a.icon} size={20} color="#F9FAFB" />
              </View>
              <View style={styles.achievementTextWrapper}>
                <Text style={styles.achievementTitle}>{a.title}</Text>
                <Text style={styles.achievementDescription}>{a.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AchievementsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topBar: {
    height: 50,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  topBarIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  // Filters
  filtersContainer: {
    marginBottom: 12,
  },
  filterGroup: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 12,
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // Stats card
  statsCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsHeaderText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.25)',
    paddingVertical: 14,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#E5E7EB',
  },

  // Sections
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },

  // Chart
  chartContainer: {
    marginTop: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartLabel: {
    width: 36,
    fontSize: 11,
    color: '#6B7280',
  },
  chartBarBackground: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4F46E5',
  },
  chartValue: {
    width: 26,
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'right',
  },

  // Progress / badges
  progressItem: {
    marginTop: 6,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  badgeText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4F46E5',
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementTextWrapper: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
