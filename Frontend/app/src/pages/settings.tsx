// app/src/home/settings.tsx
// ============================================
// Settings Screen (UI + navigation to sections)
// ============================================
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type SettingsSection = 'editProfile' | 'changePassword' | 'gamingPreferences';

const SettingsScreen = () => {
  const router = useRouter();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [dealAlerts, setDealAlerts] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  // 🔹 Single function to handle navigation for each section
  const handleNavigateSection = (section: SettingsSection) => {
    switch (section) {
      case 'editProfile':
        router.push('/src/pages/editProfile');
        break;
      case 'changePassword':
        router.push('/src/pages/changePassword');
        break;
      case 'gamingPreferences':
        router.push('/src/pages/gamingPreferences');
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBarIcon}>
          <Ionicons name="chevron-back" size={20} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.topBarText}>Settings</Text>
        <View style={styles.topBarIcon} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Page title */}
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Account Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleNavigateSection('editProfile')}
          >
            <Text style={styles.rowText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleNavigateSection('changePassword')}
          >
            <Text style={styles.rowText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleNavigateSection('gamingPreferences')}
          >
            <Text style={styles.rowText}>Gaming Preferences</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <Text style={styles.rowText}>Push Notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              thumbColor={pushNotifications ? '#FFFFFF' : '#F9FAFB'}
              trackColor={{ false: '#D1D5DB', true: '#8B5CF6' }}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowText}>Deal Alerts</Text>
            <Switch
              value={dealAlerts}
              onValueChange={setDealAlerts}
              thumbColor={dealAlerts ? '#FFFFFF' : '#F9FAFB'}
              trackColor={{ false: '#D1D5DB', true: '#8B5CF6' }}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowText}>Email Updates</Text>
            <Switch
              value={emailUpdates}
              onValueChange={setEmailUpdates}
              thumbColor={emailUpdates ? '#FFFFFF' : '#F9FAFB'}
              trackColor={{ false: '#D1D5DB', true: '#9CA3AF' }}
            />
          </View>
        </View>

        {/* Privacy Policy & others */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

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

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  rowText: {
    fontSize: 14,
    color: '#111827',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});
