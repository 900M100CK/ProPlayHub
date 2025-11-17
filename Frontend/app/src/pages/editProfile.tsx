// app/src/home/profile.tsx
// ============================================
// Profile / My Account Screen
// ============================================
import React from 'react';
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

const ProfileScreen = () => {
  const router = useRouter();

  const handleLogout = () => {
    // TODO: clear auth tokens / state here
    console.log('Logout pressed');
    // Example: router.replace('/login');
  };

  const navigateToAchievements = () => {
    router.push('/src/pages/achievements');
  };

  const navigateToSettings = () => {
    router.push('/src/pages/settings');
  };

//   const navigateToSubscriptions = () => {
//     router.push('/src/home/subscriptions');
//   };

//   const navigateToPaymentMethods = () => {
//     router.push('/src/home/paymentMethods');
//   };

//   const navigateToPersonalInfo = () => {
//     router.push('/src/pages/personalInformation');
//   };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBarIcon}>
          <Ionicons name="chevron-back" size={20} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.topBarText}>My Account / Profile</Text>
        <View style={styles.topBarIcon} />
      </View>

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
              <Text style={styles.username}>GameMaster99</Text>
              <Text style={styles.userTier}>Premium Member</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Main sections */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row} >
            <View style={styles.rowLeft}>
              <Ionicons name="cube-outline" size={30} color="#8B5CF6" />
              <Text style={styles.rowText}>My Subscriptions</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="card-outline" size={30} color="#8B5CF6" />
              <Text style={styles.rowText}>Payment Methods</Text>
            </View>
            <Ionicons name="chevron-forward" size={30} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row}>
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
    </SafeAreaView>
  );
};

export default ProfileScreen;

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
    fontSize: 18,
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
});
