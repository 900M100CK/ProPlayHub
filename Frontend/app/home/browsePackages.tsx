// ============================================
// FILE 2: browse-packages.tsx - Browse Packages Screen
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
import { Ionicons } from '@expo/vector-icons';

const BrowsePackagesScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'PC', 'PlayStation', 'Xbox'];

  const packages = [
    {
      id: 1,
      name: 'PC Gaming Elite',
      category: 'PC',
      type: 'Platform-Specific Package',
      price: '£29.99',
      period: '/mo',
      discount: '15% OFF',
      features: [
        'Multiplayer Access',
        'Cloud Saves (50GB)',
        'Game Streaming'
      ]
    },
    {
      id: 2,
      name: 'Streaming Bundle',
      category: 'Streaming',
      type: 'Game Streaming Package',
      price: '£19.99',
      period: '/mo',
      features: [
        'Game Rentals (5/month)',
        'Cloud Saves (20GB)'
      ]
    }
  ];

  return (
    <SafeAreaView style={browseStyles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={browseStyles.header}>
        <Text style={browseStyles.headerTitle}>4. Browse Packages</Text>
      </View>

      <ScrollView style={browseStyles.content} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <Text style={browseStyles.pageTitle}>Subscription Packages</Text>

        {/* Category Filter */}
        <View style={browseStyles.categoryContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                browseStyles.categoryButton,
                selectedCategory === category && browseStyles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  browseStyles.categoryText,
                  selectedCategory === category && browseStyles.categoryTextActive
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Package Cards */}
        <View style={browseStyles.packagesContainer}>
          {packages.map((pkg) => (
            <View key={pkg.id} style={browseStyles.packageCard}>
              {/* Package Header */}
              <View style={browseStyles.packageHeader}>
                <View>
                  <Text style={browseStyles.packageName}>{pkg.name}</Text>
                  <Text style={browseStyles.packageType}>{pkg.type}</Text>
                </View>
                {pkg.discount && (
                  <View style={browseStyles.discountBadge}>
                    <Text style={browseStyles.discountText}>{pkg.discount}</Text>
                  </View>
                )}
              </View>

              {/* Features List */}
              <View style={browseStyles.featuresContainer}>
                {pkg.features.map((feature, index) => (
                  <View key={index} style={browseStyles.featureItem}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={browseStyles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Package Footer */}
              <View style={browseStyles.packageFooter}>
                <View>
                  <Text style={browseStyles.price}>
                    {pkg.price}
                    <Text style={browseStyles.period}>{pkg.period}</Text>
                  </Text>
                </View>
                <TouchableOpacity style={browseStyles.subscribeButton}>
                  <Text style={browseStyles.subscribeButtonText}>Subscribe</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const browseStyles = StyleSheet.create({
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
    marginBottom: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  packagesContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  packageType: {
    fontSize: 12,
    color: '#6B7280',
  },
  discountBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  featuresContainer: {
    gap: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A855F7',
  },
  period: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  subscribeButton: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BrowsePackagesScreen;