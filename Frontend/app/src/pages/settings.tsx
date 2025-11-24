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
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../styles/theme';

type SettingsSection = 'changePassword';

const SettingsScreen = () => {
  const router = useRouter();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [dealAlerts, setDealAlerts] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  // 🔹 Single function to handle navigation for each section
  const handleNavigateSection = (section: SettingsSection) => {
    if (section === 'changePassword') {
      router.push('/src/pages/changePassword');
    }
  };

  const handleOpenPrivacy = () => {
    router.push('/src/pages/privacyPolicy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScreenHeader title="Settings" showBackButton />

      <View style={styles.body}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
        {/* Page title */}
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Account Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => handleNavigateSection('changePassword')}
          >
            <Text style={styles.rowText}>Change Password</Text>
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
              thumbColor={pushNotifications ? '#FFFFFF' : '#9CA3AF'}
              trackColor={{ false: '#E5E7EB', true: colors.primary }}
              ios_backgroundColor="#E5E7EB"
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowText}>Deal Alerts</Text>
            <Switch
              value={dealAlerts}
              onValueChange={setDealAlerts}
              thumbColor={dealAlerts ? '#FFFFFF' : '#9CA3AF'}
              trackColor={{ false: '#E5E7EB', true: colors.primary }}
              ios_backgroundColor="#E5E7EB"
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowText}>Email Updates</Text>
            <Switch
              value={emailUpdates}
              onValueChange={setEmailUpdates}
              thumbColor={emailUpdates ? '#FFFFFF' : '#9CA3AF'}
              trackColor={{ false: '#E5E7EB', true: colors.primary }}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>

        {/* Privacy Policy & others */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row} onPress={handleOpenPrivacy}>
            <Text style={styles.rowText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBackground,
  },
  body: {
    flex: 1,
    backgroundColor: colors.bodyBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
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
