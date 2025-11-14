// ============================================
// FILE 3: customize-package.tsx - Customize Package Screen
// ============================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar
} from 'react-native';

const CustomizePackageScreen = () => {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const packageInfo = {
    name: 'PC Gaming Elite',
    basePrice: 29.99
  };

  const addons = [
    {
      id: 'cloud-storage',
      name: 'Extra Cloud Storage (100GB)',
      price: 4.99
    },
    {
      id: 'ingame-items',
      name: 'Exclusive In-Game Items',
      price: 9.99
    },
    {
      id: 'priority-support',
      name: 'Priority Support',
      price: 2.99
    }
  ];

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const calculateTotal = () => {
    const addonsTotal = addons
      .filter(addon => selectedAddons.includes(addon.id))
      .reduce((sum, addon) => sum + addon.price, 0);
    return (packageInfo.basePrice + addonsTotal).toFixed(2);
  };

  return (
    <SafeAreaView style={customizeStyles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={customizeStyles.header}>
        <Text style={customizeStyles.headerTitle}>5. Customize Package</Text>
      </View>

      <ScrollView style={customizeStyles.content} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <Text style={customizeStyles.pageTitle}>Customize Your Package</Text>
        <Text style={customizeStyles.packageInfo}>
          {packageInfo.name} - Base: £{packageInfo.basePrice.toFixed(2)}
        </Text>

        {/* Add-ons Section */}
        <View style={customizeStyles.addonsSection}>
          <Text style={customizeStyles.sectionTitle}>Add-ons</Text>

          {addons.map((addon) => (
            <TouchableOpacity
              key={addon.id}
              style={customizeStyles.addonCard}
              onPress={() => toggleAddon(addon.id)}
            >
              <View style={customizeStyles.addonInfo}>
                <Text style={customizeStyles.addonName}>{addon.name}</Text>
                <Text style={customizeStyles.addonPrice}>
                  +£{addon.price.toFixed(2)}/month
                </Text>
              </View>
              <View
                style={[
                  customizeStyles.checkbox,
                  selectedAddons.includes(addon.id) && customizeStyles.checkboxChecked
                ]}
              >
                {selectedAddons.includes(addon.id) && (
                  <Text style={customizeStyles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Section */}
        <View style={customizeStyles.totalSection}>
          <Text style={customizeStyles.totalLabel}>Total:</Text>
          <Text style={customizeStyles.totalPrice}>£{calculateTotal()}/mo</Text>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity style={customizeStyles.checkoutButton}>
          <Text style={customizeStyles.checkoutButtonText}>Continue to Checkout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const customizeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#374151',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 8,
  },
  packageInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  addonsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  addonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  addonPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#A855F7',
  },
  checkoutButton: {
    backgroundColor: '#A855F7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CustomizePackageScreen;