// app/complete-profile.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const CompleteProfileScreen = () => {
  const { user, completeProfile, isLoading, errorMessage } = useAuthStore();

  const [formData, setFormData] = useState({
    displayName: user?.username || '',
    age: '',
    location: '',
    address: '',
    gamingPlatformPreferences: [] as string[],
  });

  // Explicitly type the field to prevent errors
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => {
      const current = prev.gamingPlatformPreferences;
      const updated = current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform];
      return { ...prev, gamingPlatformPreferences: updated };
    });
  };

  const handleSave = () => {
    // The `completeProfile` function in the store will handle the final validation
    // and transformation via Zod.
    // Gửi dữ liệu thô, Zod trong store sẽ xử lý việc chuyển đổi và validation.
    completeProfile(formData);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Provide a few more details to personalize your experience.
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={formData.displayName}
              onChangeText={(val) => handleInputChange('displayName', val)}
              placeholder="How you'll appear to others"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(val) => handleInputChange('age', val)}
              placeholder="Enter your age"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(val) => handleInputChange('location', val)}
              placeholder="e.g., Ho Chi Minh City"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(val) => handleInputChange('address', val)}
              placeholder="Enter your detailed address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Favorite Gaming Platforms</Text>
            <View style={styles.platformsContainer}>
              {['PC', 'PlayStation', 'Xbox'].map((platform) => (
                <TouchableOpacity
                  key={platform}
                  style={[
                    styles.platformButton,
                    formData.gamingPlatformPreferences.includes(platform) && styles.platformButtonSelected,
                  ]}
                  onPress={() => togglePlatform(platform)}
                >
                  <Text
                    style={[
                      styles.platformText,
                      formData.gamingPlatformPreferences.includes(platform) && styles.platformTextSelected,
                    ]}
                  >
                    {platform}
                  </Text>
                  {formData.gamingPlatformPreferences.includes(platform) && (
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Save and Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContainer: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#111827',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  platformsContainer: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  platformButtonSelected: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  platformText: { fontSize: 14, color: '#374151' },
  platformTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: { color: '#B91C1C', fontSize: 14 },
});

export default CompleteProfileScreen;
