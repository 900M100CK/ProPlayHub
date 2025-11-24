// app/src/home/profile.tsx
// ============================================
// Profile / My Account Screen
// ============================================
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../styles/theme';
import { useAuthStore } from '../stores/authStore';

const ProfileScreen = () => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState('Player');
  const [username, setUsername] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const formatDisplayName = (raw?: string) => {
    const cleaned = (raw || '').trim();
    if (!cleaned) return 'Player';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  useEffect(() => {
    const loadUser = async () => {
      if (user) {
        setDisplayName(
          formatDisplayName(user.displayName || user.name || user.username)
        );
        setUsername(user.username || null);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setDisplayName(
            formatDisplayName(parsed.displayName || parsed.name || parsed.username)
          );
          setUsername(parsed.username || null);
        }
      } catch (err) {
        console.error('Failed to load user for profile header:', err);
      }
    };

    loadUser();
  }, [user]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/src/pages/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const navigateToAchievements = () => {
    router.push('/src/pages/achievementScreen');
  };

  const navigateToSettings = () => {
    router.push('/src/pages/settings');
  };

  const navigateToSubscriptions = () => {
    router.push('/src/pages/subscriptions');
  };

  const navigateToPaymentMethods = () => {
    router.push('/src/pages/paymentMethods');
  };

  const navigateToPersonalInfo = () => {
    router.push('/src/pages/profileDetails');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader title="Profile" showBackButton />

      <View style={styles.body}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
        {/* Header gradient with user info */}
        <LinearGradient
          colors={['#4F46E5', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerInner}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person-outline" size={32} color="#E5E7EB" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{displayName}</Text>
              <Text style={styles.userTier}>{username ? `@${username}` : 'Profile'}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Main sections */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row} onPress={navigateToSubscriptions}>
            <View style={styles.rowLeft}>
              <Ionicons name="cube-outline" size={30} color="#8B5CF6" />
              <Text style={styles.rowText}>My Subscriptions</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row} onPress={navigateToPaymentMethods}>
            <View style={styles.rowLeft}>
              <Ionicons name="card-outline" size={30} color="#8B5CF6" />
              <Text style={styles.rowText}>Payment Methods</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row} onPress={navigateToPersonalInfo}>
            <View style={styles.rowLeft}>
              <Ionicons name="person-outline" size={30} color="#8B5CF6" />
              <Text style={styles.rowText}>Personal Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row} onPress={navigateToAchievements}>
            <View style={styles.rowLeft}>
              <Ionicons name="share-social-outline" size={30} color="#8B5CF6" />
              <Text style={styles.rowText}>Gaming Achievements</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row} onPress={navigateToSettings}>
            <View style={styles.rowLeft}>
              <Ionicons name="settings-outline" size={30} color="#8B5CF6" />
              <Text style={styles.rowText}>Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={30} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>

      <Modal
        transparent
        visible={showLogoutConfirm}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            <Text style={styles.modalTitle}>Sign out?</Text>
            <Text style={styles.modalSubtitle}>
              You will need to sign in again to access your account.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm]}
                onPress={confirmLogout}
                disabled={loggingOut}
              >
                <Text style={styles.modalConfirmText}>
                  {loggingOut ? 'Signing out...' : 'Sign out'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileScreen;

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
    paddingTop: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 32,
  },

  // Header card
  headerCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(243, 244, 246, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  userTier: {
    fontSize: 13,
    color: '#E5E7EB',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalConfirm: {
    backgroundColor: '#EF4444',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '700',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
