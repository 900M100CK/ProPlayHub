// ============================================
// FILE 1: home.tsx - Home Dashboard Screen
// ============================================
import React, { useState } from 'react';
import { useRouter } from 'expo-router';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const seasonalOffers = [
    {
      id: 1,
      title: 'Black Friday Special',
      subtitle: '50% OFF Gaming Bundle',
      color: '#FF6B6B'
    }
  ];

  const recommendedPackages = [
    {
      id: 1,
      name: 'PC Gaming Elite',
      price: '£29.99',
      period: '/month'
    },
    {
      id: 2,
      name: 'Streaming Bundle',
      price: '£19.99',
      period: '/month'
    }
  ];

  return (
    <SafeAreaView style={homeStyles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View style={homeStyles.header}>
        <View style={homeStyles.headerContent}>
          <Text style={homeStyles.welcomeText}>Welcome, Player!</Text>
          <View style={homeStyles.headerContent}>

  <View style={homeStyles.iconGroup}>
    {/* Message Icon */}
    <TouchableOpacity style={homeStyles.headerIconButton}>
      <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
    </TouchableOpacity>

    {/* Notification Icon */}
    <TouchableOpacity style={homeStyles.headerIconButton}>
      <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
  
</View>

        </View>

        {/* Search Bar */}
        <View style={homeStyles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#D1D5DB" style={homeStyles.searchIcon} />
          <TextInput
            style={homeStyles.searchInput}
            placeholder="Search packages..."
            placeholderTextColor="#D1D5DB"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={homeStyles.content} showsVerticalScrollIndicator={false}>
        {/* Seasonal Offers */}
        <View style={homeStyles.section}>
          <View style={homeStyles.sectionHeader}>
            <Text style={homeStyles.sectionIcon}>🔥</Text>
            <Text style={homeStyles.sectionTitle}>Seasonal Offers</Text>
          </View>

          {seasonalOffers.map((offer) => (
            <TouchableOpacity 
              key={offer.id}
              style={[homeStyles.offerCard, { backgroundColor: offer.color }]}
              onPress={() => router.push('./page/packageDetail')}
            >
              <Text style={homeStyles.offerTitle}>{offer.title}</Text>
              <Text style={homeStyles.offerSubtitle}>{offer.subtitle}</Text>
            </TouchableOpacity>

            
          ))}
        </View>

        {/* Recommended Packages */}
        <View style={homeStyles.section}>
          <View style={homeStyles.sectionHeader}>
            <Text style={homeStyles.sectionIcon}>📦</Text>
            <Text style={homeStyles.sectionTitle}>Recommended Packages</Text>
          </View>

          {recommendedPackages.map((pkg) => (
            <View key={pkg.id} style={homeStyles.packageCard}>
              <View style={homeStyles.packageInfo}>
                <Text style={homeStyles.packageName}>{pkg.name}</Text>
                <Text style={homeStyles.packagePrice}>
                  {pkg.price}<Text style={homeStyles.packagePeriod}>{pkg.period}</Text>
                </Text>
              </View>
              <TouchableOpacity style={homeStyles.viewButton}>
                <Text style={homeStyles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={homeStyles.bottomNav}>
        <TouchableOpacity style={homeStyles.navItem} onPress={() => router.push('./page/home')}>
          <Ionicons name="home" size={24} color="#A855F7" />
        </TouchableOpacity>
        <TouchableOpacity style={homeStyles.navItem} onPress={() => router.push('./page/browsePackages')}>
          <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={homeStyles.navItem}>
          <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={homeStyles.navItem}>
          <Ionicons name="person-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#818CF8',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  notificationButton: {
    padding: 4,
  },

  iconGroup: {
  flexDirection: 'row',
  alignItems: 'center',
},
headerIconButton: {
  padding: 4,
  marginLeft: 12,
},


  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  offerCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  offerSubtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  packageCard: {
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
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  packagePeriod: {
    fontSize: 12,
    fontWeight: '400',
  },
  viewButton: {
    backgroundColor: '#818CF8',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    padding: 8,
  },
});

export default HomeScreen;