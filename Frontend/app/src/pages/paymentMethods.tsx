import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing, radius, shadow } from '../styles/theme';
import { useToast } from '../components/ToastProvider';
import { useAuthStore } from '../stores/authStore';

const PAYMENT_METHODS_LIST_STORAGE_KEY = 'paymentMethodsList';
const PAYMENT_METHOD_STORAGE_KEY = 'selectedPaymentMethod';
const keyForUser = (userId: string | null | undefined, base: string) =>
  `${base}:${userId ?? 'guest'}`;

type PaymentMethod = {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  brand?: string;
  last4?: string;
  name: string;
  detail: string;
};

const DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: 'pm_visa_4242',
    type: 'card',
    brand: 'Visa',
    last4: '4242',
    name: 'Visa',
    detail: '**** 4242',
  },
  {
    id: 'pm_mc_5522',
    type: 'card',
    brand: 'Mastercard',
    last4: '5522',
    name: 'Mastercard',
    detail: '**** 5522',
  },
  {
    id: 'pm_amex_0077',
    type: 'card',
    brand: 'Amex',
    last4: '0077',
    name: 'American Express',
    detail: '**** 0077',
  },
  {
    id: 'pm_paypal',
    type: 'paypal',
    name: 'PayPal',
    detail: 'john@example.com',
  },
  {
    id: 'pm_bank',
    type: 'bank',
    name: 'Bank transfer',
    detail: 'Checking **88',
  },
];

const PaymentMethodsScreen = () => {
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_METHODS[0].id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<PaymentMethod['type']>('card');
  const [newName, setNewName] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newLast4, setNewLast4] = useState('');

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const listKey = keyForUser(user?._id, PAYMENT_METHODS_LIST_STORAGE_KEY);
        const selectedKey = keyForUser(user?._id, PAYMENT_METHOD_STORAGE_KEY);

        const storedList = await AsyncStorage.getItem(listKey);
        let loadedMethods = DEFAULT_METHODS;
        if (storedList) {
          const parsedList: PaymentMethod[] = JSON.parse(storedList);
          if (Array.isArray(parsedList) && parsedList.length > 0) {
            loadedMethods = parsedList;
          }
        }
        setMethods(loadedMethods);

        const storedSelected = await AsyncStorage.getItem(selectedKey);
        if (storedSelected) {
          const parsed: PaymentMethod = JSON.parse(storedSelected);
          const exists = loadedMethods.find((m) => m.id === parsed?.id);
          setSelectedId(exists?.id || loadedMethods[0].id);
        } else {
          setSelectedId(loadedMethods[0].id);
        }
      } catch (err) {
        console.error('Failed to load saved payment method:', err);
      } finally {
        setLoading(false);
        setHydrated(true);
      }
    };

    loadSaved();
  }, [user?._id]);

  useEffect(() => {
    if (!hydrated) return;
    const listKey = keyForUser(user?._id, PAYMENT_METHODS_LIST_STORAGE_KEY);
    AsyncStorage.setItem(listKey, JSON.stringify(methods)).catch((err) =>
      console.error('Failed to persist payment methods list:', err)
    );
  }, [methods, hydrated, user?._id]);

  const saveSelection = async () => {
    const method = methods.find((m) => m.id === selectedId);
    if (!method) return;

    setSaving(true);
    try {
      const selectedKey = keyForUser(user?._id, PAYMENT_METHOD_STORAGE_KEY);
      await AsyncStorage.setItem(selectedKey, JSON.stringify(method));
      showToast({
        type: 'success',
        title: 'Payment method updated',
        message: `${method.name} set as default.`,
      });
    } catch (err) {
      console.error('Failed to save payment method:', err);
      showToast({
        type: 'error',
        title: 'Could not save',
        message: 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewType('card');
    setNewName('');
    setNewDetail('');
    setNewBrand('');
    setNewLast4('');
  };

  const handleAddMethod = async () => {
    if (!newName.trim() || !newDetail.trim()) {
      showToast({
        type: 'error',
        title: 'Missing info',
        message: 'Please fill in name and details.',
      });
      return;
    }

    if (newType === 'card') {
      if (!newBrand.trim() || newLast4.trim().length !== 4 || /\D/.test(newLast4)) {
        showToast({
          type: 'error',
          title: 'Card info incomplete',
          message: 'Brand and last 4 digits are required for cards.',
        });
        return;
      }
    }

    const newMethod: PaymentMethod = {
      id: `pm_${Date.now()}`,
      type: newType,
      brand: newType === 'card' ? newBrand.trim() : undefined,
      last4: newType === 'card' ? newLast4.trim() : undefined,
      name: newName.trim(),
      detail: newDetail.trim(),
    };

    const updated = [newMethod, ...methods];
    setMethods(updated);
    setSelectedId(newMethod.id);

    const selectedKey = keyForUser(user?._id, PAYMENT_METHOD_STORAGE_KEY);
    await AsyncStorage.setItem(selectedKey, JSON.stringify(newMethod)).catch((err) =>
      console.error('Failed to persist new selected payment method:', err)
    );

    showToast({
      type: 'success',
      title: 'Added payment method',
      message: `${newMethod.name} saved as default.`,
    });
    resetForm();
    setShowAddForm(false);
  };

  const renderIconName = (method: PaymentMethod) => {
    if (method.type === 'paypal') return 'logo-paypal';
    if (method.type === 'bank') return 'business-outline';
    return 'card-outline';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScreenHeader title="Payment Methods" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment methods...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader title="Payment Methods" showBackButton />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm((prev) => !prev)}
          activeOpacity={0.9}
        >
          <Ionicons name={showAddForm ? 'close' : 'add'} size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>
            {showAddForm ? 'Close add form' : 'Add new payment method'}
          </Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.addFormCard}>
            <Text style={styles.sectionTitle}>New payment method</Text>
            <View style={styles.typeRow}>
              {(['card', 'paypal', 'bank'] as PaymentMethod['type'][]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    newType === type && styles.typeChipActive,
                  ]}
            onPress={() => setNewType(type)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      newType === type && styles.typeChipTextActive,
                    ]}
                  >
                    {type === 'card' ? 'Card' : type === 'paypal' ? 'PayPal' : 'Bank'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Display Name (e.g., Personal Visa)"
              placeholderTextColor={colors.muted}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder={
                newType === 'paypal'
                  ? 'Account email'
                  : newType === 'bank'
                  ? 'Account label'
                  : 'Card description (optional)'
              }
              placeholderTextColor={colors.muted}
              value={newDetail}
              onChangeText={setNewDetail}
            />

            {newType === 'card' && (
              <View style={styles.cardFieldsRow}>
                <TextInput
                  style={[styles.input, styles.cardInput]}
                  placeholder="Brand (Visa/Mastercard)"
                  placeholderTextColor={colors.muted}
                  value={newBrand}
                  onChangeText={setNewBrand}
                />
                <TextInput
                  style={[styles.input, styles.cardInput]}
                  placeholder="Last 4"
                  placeholderTextColor={colors.muted}
                  maxLength={4}
                  keyboardType="number-pad"
                  value={newLast4}
                  onChangeText={(v) => setNewLast4(v.replace(/\\D/g, ''))}
                />
              </View>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleAddMethod}>
              <Text style={styles.saveButtonText}>Add method</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Choose a default method</Text>

        {methods.map((method) => {
          const isSelected = method.id === selectedId;
          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, isSelected && styles.methodCardSelected]}
              onPress={() => setSelectedId(method.id)}
              activeOpacity={0.9}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconBubble}>
                  <Ionicons
                    name={renderIconName(method)}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDetail}>{method.detail}</Text>
                </View>
              </View>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={colors.muted} />
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSelection}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save default method</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentMethodsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBackground,
  },
  content: {
    flex: 1,
    backgroundColor: colors.bodyBackground,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 80,
    marginBottom: -50,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addFormCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
    gap: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  typeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#F4EFFE',
  },
  typeChipText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  cardFieldsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardInput: {
    flex: 1,
  },
  methodCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F6F0FF',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  methodDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

