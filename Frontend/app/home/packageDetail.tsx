// ============================================
// FILE 4: package-detail.tsx - Package Detail Screen (MỚI)
// ============================================
import React from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';

const PackageDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse package data từ params
  const packageData = params.packageData 
    ? JSON.parse(params.packageData as string) 
    : null;

  if (!packageData) {
    return (
      <SafeAreaView style={detailStyles.container}>
        <Text style={detailStyles.errorText}>Package not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={detailStyles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={detailStyles.header}>
        <TouchableOpacity 
          style={detailStyles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={detailStyles.headerTitle}>Package Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={detailStyles.content} showsVerticalScrollIndicator={false}>
        {/* Package Card */}
        <View style={detailStyles.packageCard}>
          {/* Package Header */}
          <View style={detailStyles.packageHeader}>
            <View>
              <Text style={detailStyles.packageName}>{packageData.name}</Text>
              <Text style={detailStyles.packageType}>{packageData.type}</Text>
            </View>
            {packageData.discount && (
              <View style={detailStyles.discountBadge}>
                <Text style={detailStyles.discountText}>{packageData.discount}</Text>
              </View>
            )}
          </View>

          {/* Features List */}
          <View style={detailStyles.featuresContainer}>
            {packageData.features.map((feature: string, index: number) => (
              <View key={index} style={detailStyles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={detailStyles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Package Footer */}
          <View style={detailStyles.packageFooter}>
            <View>
              <Text style={detailStyles.price}>
                {packageData.price}
                <Text style={detailStyles.period}>{packageData.period}</Text>
              </Text>
            </View>
            <TouchableOpacity 
              style={detailStyles.subscribeButton}
              
            >
              <Text style={detailStyles.subscribeButtonText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Info Section */}
        <View style={detailStyles.infoSection}>
          <Text style={detailStyles.infoTitle}>Package Information</Text>
          <View style={detailStyles.infoItem}>
            <Text style={detailStyles.infoLabel}>Category:</Text>
            <Text style={detailStyles.infoValue}>{packageData.category}</Text>
          </View>
          <View style={detailStyles.infoItem}>
            <Text style={detailStyles.infoLabel}>Type:</Text>
            <Text style={detailStyles.infoValue}>{packageData.type}</Text>
          </View>
          <View style={detailStyles.infoItem}>
            <Text style={detailStyles.infoLabel}>Billing:</Text>
            <Text style={detailStyles.infoValue}>Monthly subscription</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#374151',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  packageName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  packageType: {
    fontSize: 13,
    color: '#6B7280',
  },
  discountBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#4B5563',
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#A855F7',
  },
  period: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
  },
  subscribeButton: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default PackageDetailScreen;