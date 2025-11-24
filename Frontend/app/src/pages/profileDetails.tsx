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

      <View style={profileStyles.body}>
        <ScrollView
          style={profileStyles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={profileStyles.scrollContent}
        >
          <View style={profileStyles.card}>
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

            <View style={profileStyles.divider} />

            {/* Profile Information */}
            <View style={profileStyles.section}>
              <Text style={profileStyles.sectionTitle}>Personal Information</Text>

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

              <View style={profileStyles.inputGroup}>
                <Text style={profileStyles.label}>Email</Text>
                <Text style={profileStyles.value}>{formData.email}</Text>
              </View>

              <View style={profileStyles.inputGroup}>
                <Text style={profileStyles.label}>Display Name</Text>
                {editing ? (
                  <TextInput
                    style={profileStyles.input}
                    value={formData.displayName}
                    onChangeText={(text) => setFormData({ ...formData, displayName: text })}
                    placeholder="Display Name"
                  />
                ) : (
                  <Text style={profileStyles.value}>{formData.displayName || "Not set yet"}</Text>
                )}
              </View>

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

            <View style={profileStyles.divider} />

            {/* Gaming Platforms */}
            <View style={profileStyles.section}>
              <Text style={profileStyles.sectionTitle}>Preferred Gaming Platforms</Text>
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

            {error && (
              <View style={profileStyles.errorContainer}>
                <Text style={profileStyles.errorText}>{error}</Text>
              </View>
            )}

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
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBackground,
  },
  body: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
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
  scrollContent: {
    paddingBottom: 24,
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 16,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 20,
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
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
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
    marginTop: 12,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
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
});

export default ProfileScreen;

