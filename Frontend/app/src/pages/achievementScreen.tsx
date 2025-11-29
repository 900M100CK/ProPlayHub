// ============================================
// My Achievements Screen (UI Only)
// ============================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../components/ToastProvider';
import ScreenHeader from '../components/ScreenHeader';

import apiClient from '../api/axiosConfig'; // Import apiClient
import { colors } from '../styles/theme';

interface AchievementStats {
  totalPackages: number;
  totalSpent: number;
  daysOnApp: number;
  purchasedSlugs?: string[]; // Thêm trường này (tùy chọn, nếu bạn đã cập nhật backend)
}

// --- Bắt đầu thay đổi cho hệ thống cấp độ ---
type AchievementLevel = 'bronze' | 'silver' | 'gold';

interface AchievementTier {
  level: AchievementLevel;
  threshold: number;
  description: string;
  color: string;
}

interface AchievementDefinition {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tiers: AchievementTier[];
  getValue: (stats: AchievementStats) => number; // Hàm để lấy giá trị cần so sánh
}
// --- Kết thúc thay đổi cho hệ thống cấp độ ---

const AchievementsScreen = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        // Gọi API để lấy dữ liệu thành tích
        const response = await apiClient.get('/achievements/stats');
        setStats(response.data);
      } catch (err: any) {
        console.error('Failed to fetch achievement stats:', err);
        setError(err.response?.data?.message || 'Could not load your achievements.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Cấu trúc lại mảng thành tích với các cấp độ
  const achievementDefinitions: AchievementDefinition[] = [
    {
      id: '1',
      title: 'Loyal Customer',
      icon: 'trophy-outline' as const,
      getValue: (s) => s.totalPackages,
      tiers: [
        { level: 'bronze', threshold: 1, description: 'Make your first purchase', color: '#CD7F32' },
        { level: 'silver', threshold: 5, description: 'Purchase 5 packages', color: '#C0C0C0' },
        { level: 'gold', threshold: 10, description: 'Purchase 10 packages', color: '#FFD700' },
      ],
    },
    {
      id: '2',
      title: 'Big Spender',
      icon: 'heart-outline' as const,
      getValue: (s) => s.totalSpent,
      tiers: [
        { level: 'bronze', threshold: 50, description: 'Spend over £50', color: '#CD7F32' },
        { level: 'silver', threshold: 200, description: 'Spend over £200', color: '#C0C0C0' },
        { level: 'gold', threshold: 500, description: 'Spend over £500', color: '#FFD700' },
      ],
    },
    {
      id: '3',
      title: 'Veteran Member',
      icon: 'star-outline' as const,
      getValue: (s) => s.daysOnApp,
      tiers: [
        { level: 'bronze', threshold: 30, description: 'Member for 30 days', color: '#CD7F32' },
        { level: 'silver', threshold: 180, description: 'Member for 6 months', color: '#C0C0C0' },
        { level: 'gold', threshold: 365, description: 'Member for a year', color: '#FFD700' },
      ],
    },
  ];

  // Hàm helper để xác định cấp độ cao nhất đạt được
  const getHighestAchievedTier = (definition: AchievementDefinition, currentStats: AchievementStats | null): AchievementTier | null => {
    if (!currentStats) return null;
    const currentValue = definition.getValue(currentStats);
    // Sắp xếp các cấp độ từ cao đến thấp để tìm cấp cao nhất
    const sortedTiers = [...definition.tiers].sort((a, b) => b.threshold - a.threshold);
    return sortedTiers.find(tier => currentValue >= tier.threshold) || null;
  };

  const shareMessage = `Check out my stats on ProPlayHub! I've purchased ${stats?.totalPackages || 0} packages and been a member for ${stats?.daysOnApp || 0} days. #ProPlayHub #Gaming`;

  const handleShareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(url).catch(() =>
      showToast({
        type: 'error',
        title: 'Unable to open Twitter',
        message: 'Please make sure the Twitter app or website is available.',
      })
    );
  };

  const handleShareToDiscord = async () => {
    await Clipboard.setStringAsync(shareMessage);
    showToast({
      type: 'success',
      title: 'Copied to clipboard',
      message: 'You can now paste your progress in Discord or anywhere else.',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader title="My Achievements" showBackButton />

      <View style={styles.body}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
        {/* Page title */}
        <Text style={styles.pageTitle}>Gaming Achievements</Text>

        {loading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your stats...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : stats ? (
          <>
        {/* Stats card */}
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
            <View style={[styles.statBox, { marginRight: 8 }]}>
              <Text style={styles.statValue}>{stats.totalPackages}</Text>
              <Text style={styles.statLabel}>Packages Bought</Text>
            </View>
            <View style={[styles.statBox, { marginLeft: 8 }]}>
              <Text style={styles.statValue}>£{stats.totalSpent.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Recent achievements */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>

          {achievementDefinitions.map((definition) => {
            const highestTier = getHighestAchievedTier(definition, stats);
            const nextTier = definition.tiers.find(t => !highestTier || t.threshold > highestTier.threshold);
            const displayTier = highestTier || nextTier; // Hiển thị cấp đã đạt hoặc cấp tiếp theo
            const isAchieved = !!highestTier;

            return (
              <View key={definition.id} style={[styles.achievementRow, !isAchieved && styles.achievementLocked]}>
                <View style={[styles.achievementIcon, { backgroundColor: isAchieved ? displayTier?.color : '#D1D5DB' }]}>
                  <Ionicons name={isAchieved ? definition.icon : 'lock-closed-outline'} size={20} color="#F9FAFB" />
                </View>
                <View style={styles.achievementTextWrapper}>
                  <Text style={styles.achievementTitle}>{definition.title} {highestTier ? `(${highestTier.level})` : ''}</Text>
                  <Text style={styles.achievementDescription}>
                    {isAchieved ? `Achieved: ${displayTier?.description}` : `Next: ${displayTier?.description}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Share progress */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Share Your Progress</Text>

          <TouchableOpacity style={styles.shareButton} onPress={handleShareToTwitter}>
            <Ionicons name="logo-twitter" size={18} color="#F9FAFB" />
            <Text style={styles.shareButtonText}>Share to Twitter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.shareButton, styles.shareButtonSecondary]} onPress={handleShareToDiscord}>
            <Ionicons name="logo-discord" size={18} color="#F9FAFB" />
            <Text style={styles.shareButtonText}>Share to Discord</Text>
          </TouchableOpacity>
        </View>
          </>
        ) : (
          <View style={styles.centeredContainer}>
            <Text>No achievement data available.</Text>
          </View>
        )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default AchievementsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A855F7',
  },
  body: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 20,
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
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.25)',
    paddingVertical: 18,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },

  // Achievement rows
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  achievementLocked: {
    opacity: 0.6,
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

  // Share buttons
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  shareButtonSecondary: {
    backgroundColor: '#8B5CF6',
  },
  shareButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
