import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing, radius, shadow } from '../styles/theme';
import apiClient from '../api/axiosConfig';
import { useToast } from '../components/ToastProvider';
import { useAuthStore } from '../stores/authStore';

const ChangePasswordScreen = () => {
  const router = useRouter();
  const { accessToken, setAccessToken } = useAuthStore();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordTips = [
    'Use at least 8 characters for stronger security.',
    'Mix uppercase, lowercase, numbers, or symbols.',
    'Avoid reusing passwords from other services.',
  ];

  const handleSave = async () => {
    setErrorMessage(null);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage('Please fill all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Confirm password does not match.');
      return;
    }

    setSaving(true);
    try {
      // Ensure token exists in axios headers
      let token = accessToken;
      if (!token) {
        token = await AsyncStorage.getItem('accessToken');
        if (token) {
          setAccessToken(token);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      }

      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      showToast({
        type: 'success',
        title: 'Password updated',
        message: 'Your password has been changed.',
      });
      setErrorMessage(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.back();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.details ||
        'Could not change password. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader title="Change Password" showBackButton />

      <View style={styles.body}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>Update Your Password</Text>
            <Text style={styles.subtext}>
              Choose a strong password with at least 8 characters.
            </Text>
          </View>

          <View style={styles.secureBadge}>
            <View style={styles.secureIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.secureTextBlock}>
              <Text style={styles.secureTitle}>Keep your account safe</Text>
              <Text style={styles.secureSubtitle}>
                Use a unique password and avoid sharing it with anyone.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            {errorMessage ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter Current Password"
                  placeholderTextColor={colors.muted}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrent((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter New Password"
                  placeholderTextColor={colors.muted}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNew((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter New Password"
                  placeholderTextColor={colors.muted}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirm((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.passwordHint}>
              <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.passwordHintText}>
                Password must include at least 8 characters and one number.
              </Text>
            </View>

            <View style={styles.tipsSection}>
              {passwordTips.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="checkmark" size={14} color={colors.headerText} />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ChangePasswordScreen;

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
    paddingTop: spacing.md,
    paddingBottom: 80,
    marginBottom: -100,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  headerTextGroup: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F5F3FF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginTop: spacing.md,
  },
  secureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureTextBlock: {
    flex: 1,
    gap: 2,
  },
  secureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  secureSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    gap: spacing.md,
    ...shadow.card,
  },
  inlineError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  inlineErrorText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 44,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF7ED',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  passwordHintText: {
    flex: 1,
    color: '#9A3412',
    fontSize: 12,
  },
  tipsSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  tipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  saveButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '700',
  },
});
