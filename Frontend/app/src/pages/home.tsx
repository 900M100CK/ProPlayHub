// app/src/home/home.tsx
// ============================================
// Home Dashboard Screen
// ============================================
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "http://10.0.2.2:3000"; // chỉnh đúng IP + port backend

// Kiểu dữ liệu gói dịch vụ
type SubscriptionPackage = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  type: string;
  basePrice: number;
  period: string;
  discountLabel?: string;
  features: string[];
  isSeasonalOffer: boolean;
  tags?: string[];
};

// Helper: lấy số % từ discountLabel (vd: "Black Friday 50% OFF" -> 50)
const extractDiscountPercent = (label?: string): number | null => {
  if (!label) return null;
  const match = label.match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : null;
};

// Helper: tính giá sau giảm
const calculateDiscountedPrice = (
  basePrice: number,
  discountLabel?: string
): number => {
  const percent = extractDiscountPercent(discountLabel);
  if (!percent) return basePrice;
  const discounted = basePrice * (1 - percent / 100);
  return Number(discounted.toFixed(2));
};

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [allPackages, setAllPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Fetch toàn bộ packages từ backend
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE_URL}/api/packages`);
        const data = await res.json();
        console.log("Packages from API:", data); // kiểm tra số lượng trong Metro

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch packages");
        }

        setAllPackages(data);
      } catch (err: any) {
        console.error("Fetch packages error:", err);
        setError(err.message || "Error fetching packages");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  // Tách seasonal và recommended
  const seasonalPackages = allPackages.filter((p) => p.isSeasonalOffer);
  const recommendedPackages = allPackages.filter((p) => !p.isSeasonalOffer);

  // Lọc theo search (áp dụng cho recommended)
  const filteredRecommended = recommendedPackages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={homeStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header Section */}
      <View style={homeStyles.header}>
        <View style={homeStyles.headerContent}>
          <Text style={homeStyles.welcomeText}>Welcome, Player!</Text>

          {/* Nhóm icon message + notification */}
          <View style={homeStyles.iconGroup}>
            {/* Nhấn vào icon chat để sang trang livechat */}
            <TouchableOpacity
              style={homeStyles.headerIconButton}
              onPress={() => router.push("./livechat")}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity style={homeStyles.headerIconButton}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={homeStyles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#D1D5DB"
            style={homeStyles.searchIcon}
          />
          <TextInput
            style={homeStyles.searchInput}
            placeholder="Search packages..."
            placeholderTextColor="#D1D5DB"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Nội dung */}
      {loading ? (
        <View style={homeStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#818CF8" />
        </View>
      ) : error ? (
        <View style={homeStyles.loadingContainer}>
          <Text style={homeStyles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={homeStyles.content}
          contentContainerStyle={homeStyles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Seasonal Offers - các gói isSeasonalOffer === true */}
          {seasonalPackages.length > 0 && (
            <View style={homeStyles.section}>
              <View style={homeStyles.sectionHeader}>
                <Text style={homeStyles.sectionIcon}>🔥</Text>
                <Text style={homeStyles.sectionTitle}>Seasonal Offers</Text>
              </View>

              {seasonalPackages.map((pkg) => {
                const discountPercent = extractDiscountPercent(
                  pkg.discountLabel
                );
                const originalPrice = pkg.basePrice;
                const finalPrice = calculateDiscountedPrice(
                  pkg.basePrice,
                  pkg.discountLabel
                );

                return (
                  <TouchableOpacity
                    key={pkg.slug}
                    style={homeStyles.seasonalCard}
                    onPress={() =>
                      router.push({
                        pathname: "./src/pages/packageDetail",
                        params: { slug: pkg.slug },
                      })
                    }
                  >
                    {/* Badge giảm giá góc phải */}
                    {pkg.discountLabel && (
                      <View style={homeStyles.seasonalBadge}>
                        <Text style={homeStyles.seasonalBadgeText}>
                          {pkg.discountLabel}
                        </Text>
                      </View>
                    )}

                    <Text style={homeStyles.seasonalName}>{pkg.name}</Text>
                    <Text style={homeStyles.seasonalType}>{pkg.type}</Text>

                    <View style={homeStyles.priceRow}>
                      {discountPercent ? (
                        <View>
                          <Text style={homeStyles.originalPrice}>
                            £{originalPrice.toFixed(2)} {pkg.period}
                          </Text>
                          <Text style={homeStyles.finalPrice}>
                            £{finalPrice.toFixed(2)} {pkg.period}
                          </Text>
                        </View>
                      ) : (
                        <Text style={homeStyles.finalPrice}>
                          £{originalPrice.toFixed(2)} {pkg.period}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Recommended Packages - các gói còn lại */}
          <View style={homeStyles.section}>
            <View style={homeStyles.sectionHeader}>
              <Text style={homeStyles.sectionIcon}>📦</Text>
              <Text style={homeStyles.sectionTitle}>Recommended Packages</Text>
            </View>

            {filteredRecommended.map((pkg) => {
              const discountPercent = extractDiscountPercent(pkg.discountLabel);
              const originalPrice = pkg.basePrice;
              const finalPrice = calculateDiscountedPrice(
                pkg.basePrice,
                pkg.discountLabel
              );

              return (
                <View key={pkg.slug} style={homeStyles.packageCard}>
                  <View style={homeStyles.packageInfo}>
                    <Text style={homeStyles.packageName}>{pkg.name}</Text>
                    <Text style={homeStyles.packageTypeSmall}>{pkg.type}</Text>

                    {discountPercent ? (
                      <View>
                        <Text style={homeStyles.originalPriceSmall}>
                          £{originalPrice.toFixed(2)} {pkg.period}
                        </Text>
                        <Text style={homeStyles.finalPriceSmall}>
                          £{finalPrice.toFixed(2)} {pkg.period}
                        </Text>
                      </View>
                    ) : (
                      <Text style={homeStyles.finalPriceSmall}>
                        £{originalPrice.toFixed(2)} {pkg.period}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={homeStyles.viewButton}
                    onPress={() =>
                      router.push({
                        pathname: "./src/pages/packageDetail",
                        params: { slug: pkg.slug },
                      })
                    }
                  >
                    <Text style={homeStyles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <View style={homeStyles.bottomNav}>
        <TouchableOpacity
          style={homeStyles.navItem}
          onPress={() => router.push("./src/home/home")}
        >
          <Ionicons name="home" size={24} color="#A855F7" />
        </TouchableOpacity>
        <TouchableOpacity
          style={homeStyles.navItem}
          onPress={() => router.push("./src/home/home")} // sau này đổi sang browsePackages nếu có
        >
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
    backgroundColor: "#F3F4F6",
  },
  header: {
    backgroundColor: "#818CF8",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  iconGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    padding: 4,
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    color: "#FFFFFF",
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
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },

  // Seasonal card
  seasonalCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    backgroundColor: "#F97316", // cam nổi bật
    position: "relative",
  },
  seasonalBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#FBBF24",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  seasonalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  seasonalName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  seasonalType: {
    fontSize: 13,
    color: "#FDE68A",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Giá trên Home
  originalPrice: {
    fontSize: 14,
    color: "#FEE2E2",
    textDecorationLine: "line-through",
  },
  finalPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  originalPriceSmall: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  finalPriceSmall: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A855F7",
  },

  packageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
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
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  packageTypeSmall: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  viewButton: {
    backgroundColor: "#818CF8",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navItem: {
    padding: 8,
  },
});

export default HomeScreen;
