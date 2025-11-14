import React from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-900 px-4 py-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <Image
            source={{ uri: "https://i.pravatar.cc/300" }}
            className="w-12 h-12 rounded-full"
          />
          <View className="ml-3">
            <Text className="text-white text-lg font-bold">Welcome back</Text>
            <Text className="text-gray-400 text-sm">Gamer123</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center bg-gray-800 rounded-2xl px-4 py-3 mb-6">
        <Ionicons name="search" size={20} color="gray" />
        <TextInput
          placeholder="Search subscriptions, deals..."
          placeholderTextColor="gray"
          className="ml-3 flex-1 text-white"
        />
      </View>

      {/* Quick Actions */}
      <View className="mb-8">
        <Text className="text-white text-lg font-bold mb-4">Quick Actions</Text>
        <View className="flex-row justify-between">
          {[
            { icon: "card" as const, label: "My Subs" },
            { icon: "pricetag" as const, label: "Packages" },
            { icon: "chatbubble" as const, label: "Live Chat" },
            { icon: "cart" as const, label: "Orders" },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              className="items-center bg-gray-800 p-4 rounded-2xl w-[22%]"
            >
              <Ionicons name={item.icon} size={24} color="white" />
              <Text className="text-gray-300 text-sm mt-2 text-center">
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Curated Deals */}
      <View className="mb-8">
        <Text className="text-white text-lg font-bold mb-4">Curated Deals</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              className="bg-gray-800 w-64 mr-4 p-4 rounded-2xl"
            >
              <Image
                source={{ uri: "https://cdn.mos.cms.futurecdn.net/WtG5pTFqjNenE2no0Rvrg8.jpg" }}
                className="w-full h-32 rounded-xl mb-3"
              />
              <Text className="text-white font-bold text-base mb-1">
                Xbox Ultimate Pass
              </Text>
              <Text className="text-gray-400 text-sm mb-2">
                Save 15% when ordering via app
              </Text>
              <View className="bg-green-600 px-3 py-1 self-start rounded-full">
                <Text className="text-white text-xs font-bold">15% OFF</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Recommended */}
      <View className="mb-8">
        <Text className="text-white text-lg font-bold mb-4">Recommended for You</Text>
        {[1, 2].map((item) => (
          <View
            key={item}
            className="bg-gray-800 p-4 rounded-2xl mb-4 flex-row items-center"
          >
            <Image
              source={{ uri: "https://i.imgur.com/8Km9tLL.png" }}
              className="w-16 h-16 rounded-xl mr-4"
            />
            <View className="flex-1">
              <Text className="text-white font-bold text-base">PS5 Add‑on Pack</Text>
              <Text className="text-gray-400 text-sm">Recommended based on your profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </View>
        ))}
      </View>

      {/* Social Share */}
      <View className="mb-10">
        <Text className="text-white text-lg font-bold mb-4">Share Your Achievements</Text>
        <View className="flex-row justify-between">
          <TouchableOpacity className="w-[48%] bg-blue-600 rounded-2xl py-4 items-center">
            <Text className="text-white font-semibold">Share on Twitter</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-[48%] bg-indigo-600 rounded-2xl py-4 items-center">
            <Text className="text-white font-semibold">Share on Discord</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
import { StyleSheet } from "react-native";
export const homeStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111827', // bg-gray-900
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // HEADER
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
  },
  notificationBtn: {
    padding: 8,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },

  // SEARCH
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4B5563',
  },

  // QUICK ACTIONS
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    width: '23%',
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionIcon: {
    marginBottom: 6,
    color: '#818CF8',
    fontSize: 20,
  },
  actionText: {
    fontSize: 12,
    color: '#E5E7EB',
    textAlign: 'center',
  },

  // SECTION TITLES
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 12,
  },

  // DEAL CARDS
  dealCard: {
    backgroundColor: '#1F2937',
    width: 180,
    padding: 14,
    borderRadius: 12,
    marginRight: 12,
  },
  dealBadge: {
    backgroundColor: '#4F46E5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  dealBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 6,
  },
  dealDesc: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // RECOMMENDED
  recommendedCard: {
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendedTitle: {
    color: '#E5E7EB',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  recommendedDesc: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  // SOCIAL SHARE
  socialBox: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  socialText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  socialButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});


