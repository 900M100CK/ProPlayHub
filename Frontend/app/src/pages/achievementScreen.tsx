// ============================================
// My Achievements Screen (UI Only)
// ============================================
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../components/ToastProvider';
import ScreenHeader from '../components/ScreenHeader';

const AchievementsScreen = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // Dummy stats (will be replaced by real data later)
  const stats = {
    hoursPlayed: 247,
    gamesCompleted: 18,
  };

  const recentAchievements = [
    {
      id: '1',
      title: 'Master Player',
      description: 'Completed 10 games',
      color: '#FACC15', // yellow
      icon: 'trophy-outline' as const,
    },
    {
      id: '2',
      title: 'Marathon Gamer',
      description: '200+ hours played',
      color: '#38BDF8', // blue
      icon: 'star-outline' as const,
    },
  ];

  const shareMessage = `Check out my gaming stats on ProPlayHub! I've played for ${stats.hoursPlayed} hours and completed ${stats.gamesCompleted} games. #ProPlayHub #Gaming`;

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
      <ScreenHeader title="My Achievements" />

      <View style={styles.body}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
        {/* Page title */}
        <Text style={styles.pageTitle}>Gaming Achievements</Text>

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
              <Text style={styles.statValue}>{stats.hoursPlayed}</Text>
              <Text style={styles.statLabel}>Hours Played</Text>
            </View>
            <View style={[styles.statBox, { marginLeft: 8 }]}>
              <Text style={styles.statValue}>{stats.gamesCompleted}</Text>
              <Text style={styles.statLabel}>Games Completed</Text>
            </View>
          </View>
        </LinearGradient>

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
