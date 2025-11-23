// app/src/pages/profile.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../stores/authStore";
import apiClient from "../api/axiosConfig";
import { useToast } from "../components/ToastProvider";
import ScreenHeader from "../components/ScreenHeader";
import { colors } from "../styles/theme";

const ProfileScreen = () => {
  const router = useRouter();
  const { user, accessToken, setUser, setAccessToken } = useAuthStore();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    displayName: "",
    age: "",
    location: "",
    address: "",
    gamingPlatformPreferences: [] as string[],
  });

  const [originalData, setOriginalData] = useState(formData);

  // Load user data
  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get token from store or storage
      let token = accessToken;
      if (!token) {
        token = await AsyncStorage.getItem('accessToken');
        if (token) {
          setAccessToken(token);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      }

      if (!token) {
        showToast({
          type: 'info',
          title: 'Sign-in required',
          message: 'Please log in to view your profile.',
          action: {
            label: 'Sign in',
            onPress: () => router.replace('./login'),
          },
        });
        router.replace('./login');
        return;
      }

      // Load from store first
      if (user) {
        updateFormData(user);
        setLoading(false);
      }

      // Fetch fresh data from API
      const response = await apiClient.get('/auth/me');

      if (response.data.user) {
        updateFormData(response.data.user);
        setUser(response.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (err: any) {
      console.error('Load user data error:', err);
      if (err.response?.status === 401) {
        // Token expired, redirect to login
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('user');
        setAccessToken(null);
        setUser(null);
        showToast({
          type: 'info',
          title: 'Session expired',
          message: 'Please sign in again.',
          action: {
            label: 'Sign in',
            onPress: () => router.replace('./login'),
          },
        });
        router.replace('./login');
      } else {
        setError(err.response?.data?.message || 'Unable to load profile information.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (userData: any) => {
    const data = {
      name: userData.name || "",
      username: userData.username || "",
      email: userData.email || "",
      displayName: userData.displayName || userData.username || "",
      age: userData.age ? String(userData.age) : "",
      location: userData.location || "",
      address: userData.address || "",
      gamingPlatformPreferences: userData.gamingPlatformPreferences || [],
    };
    setFormData(data);
    setOriginalData(data);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = accessToken || await AsyncStorage.getItem('accessToken');
      if (!token) {
        showToast({
          type: 'info',
          title: 'Session expired',
          message: 'Please sign in again.',
          action: {
            label: 'Sign in',
            onPress: () => router.replace('./login'),
          },
        });
        router.replace('./login');
        return;
      }

      const updatePayload: any = {};
      if (formData.displayName !== originalData.displayName) {
        updatePayload.displayName = formData.displayName;
      }
      if (formData.age !== originalData.age) {
        updatePayload.age = formData.age ? parseInt(formData.age) : null;
      }
      if (formData.location !== originalData.location) {
        updatePayload.location = formData.location;
      }
      if (formData.address !== originalData.address) {
        updatePayload.address = formData.address;
      }
      if (JSON.stringify(formData.gamingPlatformPreferences) !== JSON.stringify(originalData.gamingPlatformPreferences)) {
        updatePayload.gamingPlatformPreferences = formData.gamingPlatformPreferences;
      }
      if (formData.name !== originalData.name) {
        updatePayload.name = formData.name;
      }

      const response = await apiClient.put('/auth/profile', updatePayload);

      if (response.data.user) {
        updateFormData(response.data.user);
        setUser(response.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        setEditing(false);
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Profile updated successfully!',
        });
      }
    } catch (err: any) {
      console.error('Save profile error:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.details || 'Unable to update the profile.';
      setError(errorMsg);
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setEditing(false);
    setError(null);
  };

  const togglePlatform = (platform: string) => {
    if (!editing) return;
    setFormData(prev => {
      const current = prev.gamingPlatformPreferences || [];
      const updated = current.includes(platform)
        ? current.filter(p => p !== platform)
        : [...current, platform];
      return { ...prev, gamingPlatformPreferences: updated };
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={profileStyles.container}>
        <View style={profileStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={profileStyles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={profileStyles.container}>
      <StatusBar barStyle="light-content" />

      <ScreenHeader
        title="Profile"
        rightSlot={
          !editing ? (
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={profileStyles.headerIconButton}
            >
              <Ionicons name="pencil" size={20} color={colors.headerText} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={profileStyles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={profileStyles.avatarSection}>
          <View style={profileStyles.avatarContainer}>
            <Ionicons name="person" size={64} color="#8B5CF6" />
          </View>
          <Text style={profileStyles.displayName}>
            {formData.displayName || formData.name || formData.username || "User"}
          </Text>
          <Text style={profileStyles.username}>@{formData.username || "username"}</Text>
        </View>

        {/* Profile Information */}
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Personal information</Text>

          {/* Name */}
          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Name</Text>
            {editing ? (
              <TextInput
                style={profileStyles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter your name"
              />
            ) : (
              <Text style={profileStyles.value}>{formData.name || "Not set yet"}</Text>
            )}
          </View>

          {/* Email */}
          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Email</Text>
            <Text style={profileStyles.value}>{formData.email}</Text>
          </View>

          {/* Display Name */}
          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Display name</Text>
            {editing ? (
              <TextInput
                style={profileStyles.input}
                value={formData.displayName}
                onChangeText={(text) => setFormData({ ...formData, displayName: text })}
                placeholder="Display name"
              />
            ) : (
              <Text style={profileStyles.value}>{formData.displayName || "Not set yet"}</Text>
            )}
          </View>

          {/* Age */}
          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Age</Text>
            {editing ? (
              <TextInput
                style={profileStyles.input}
                value={formData.age}
                onChangeText={(text) => setFormData({ ...formData, age: text.replace(/[^0-9]/g, '') })}
                placeholder="Enter age"
                keyboardType="numeric"
              />
            ) : (
              <Text style={profileStyles.value}>{formData.age || "Not set yet"}</Text>
            )}
          </View>

          {/* Location */}
          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Location</Text>
            {editing ? (
              <TextInput
                style={profileStyles.input}
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="Enter location"
              />
            ) : (
              <Text style={profileStyles.value}>{formData.location || "Not set yet"}</Text>
            )}
          </View>

          {/* Address */}
          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Address</Text>
            {editing ? (
              <TextInput
                style={[profileStyles.input, profileStyles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Enter address"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={profileStyles.value}>{formData.address || "Not set yet"}</Text>
            )}
          </View>
        </View>

        {/* Gaming Platforms */}
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Preferred gaming platforms</Text>
          <View style={profileStyles.platformsContainer}>
            {['PC', 'PlayStation', 'Xbox'].map((platform) => (
              <TouchableOpacity
                key={platform}
                style={[
                  profileStyles.platformButton,
                  formData.gamingPlatformPreferences.includes(platform) &&
                    profileStyles.platformButtonSelected,
                  !editing && profileStyles.platformButtonDisabled,
                ]}
                onPress={() => togglePlatform(platform)}
                disabled={!editing}
              >
                <Ionicons
                  name={
                    platform === 'PC'
                      ? 'desktop-outline'
                      : platform === 'PlayStation'
                      ? 'game-controller-outline'
                      : 'hardware-chip-outline'
                  }
                  size={20}
                  color={
                    formData.gamingPlatformPreferences.includes(platform)
                      ? '#FFFFFF'
                      : '#6B7280'
                  }
                />
                <Text
                  style={[
                    profileStyles.platformText,
                    formData.gamingPlatformPreferences.includes(platform) &&
                      profileStyles.platformTextSelected,
                  ]}
                >
                  {platform}
                </Text>
                {formData.gamingPlatformPreferences.includes(platform) && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={profileStyles.errorContainer}>
            <Text style={profileStyles.errorText}>{error}</Text>
          </View>
        )}

        {/* Edit Buttons */}
        {editing && (
          <View style={profileStyles.editActions}>
            <TouchableOpacity
              style={[profileStyles.button, profileStyles.cancelButton]}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={profileStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[profileStyles.button, profileStyles.saveButton, saving && profileStyles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={profileStyles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Links */}
        <View style={profileStyles.section}>
          <TouchableOpacity
            style={profileStyles.linkItem}
            onPress={() => router.push('./subcriptions')}
          >
            <Ionicons name="card-outline" size={24} color="#4B5563" />
            <Text style={profileStyles.linkText}>My subscriptions</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={profileStyles.linkItem}
            onPress={() => router.push('./achievementScreen')}
          >
            <Ionicons name="trophy-outline" size={24} color="#4B5563" />
            <Text style={profileStyles.linkText}>Achievements</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={profileStyles.logoutButton} onPress={() => router.replace('./login')}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={profileStyles.logoutButtonText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: "#6B7280",
  },
  section: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: "#111827",
  },
  input: {
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  platformsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  platformButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  platformButtonSelected: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  platformButtonDisabled: {
    opacity: 0.6,
  },
  platformText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginLeft: 8,
  },
  platformTextSelected: {
    color: "#FFFFFF",
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  saveButton: {
    backgroundColor: "#8B5CF6",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 8,
  },
});

export default ProfileScreen;

