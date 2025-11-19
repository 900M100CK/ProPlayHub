// app/src/home/home.tsx
// ============================================
// Home Dashboard Screen
// ============================================
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../stores/authStore";

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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../stores/cartStore";

// Auto-detect API URL based on platform
// Android emulator: 10.0.2.2
// iOS simulator: localhost
// Physical device: use your computer's local IP (e.g., 192.168.1.100)
const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000';

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
  const [username, setUsername] = useState<string>("Player");

  const router = useRouter();
  const { user } = useAuthStore();
  const { items: cartItems, loadCartFromStorage } = useCartStore();
  const cartItemCount = cartItems.length;

  // Load user info for welcome message
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // First try to get from authStore
        if (user?.username) {
          setUsername(user.username);
          return;
        }
        if (user?.name) {
          setUsername(user.name);
          return;
        }

        // If not in store, try AsyncStorage
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.username) {
            setUsername(parsedUser.username);
          } else if (parsedUser.name) {
            setUsername(parsedUser.name);
          }
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    };

    loadUserInfo();
  }, [user]);

  // Load cart from storage when component mounts
  useEffect(() => {
    loadCartFromStorage();
  }, [loadCartFromStorage]);

  // Fetch toàn bộ packages từ backend
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE_URL}/api/packages`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to fetch packages' }));
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("Packages from API:", data); // kiểm tra số lượng trong Metro

        setAllPackages(data);
      } catch (err: any) {
        console.error("Fetch packages error:", err);
        const errorMessage = err?.message || 'Error fetching packages. Please check if backend is running.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  // Helper function để search packages
  const searchPackages = (packages: SubscriptionPackage[], query: string): SubscriptionPackage[] => {
    if (!query.trim()) {
      return packages;
    }

    const searchLower = query.toLowerCase().trim();
    
    return packages.filter((pkg) => {
      // Tìm theo name
      const nameMatch = pkg.name.toLowerCase().includes(searchLower);
      
      // Tìm theo category
      const categoryMatch = pkg.category.toLowerCase().includes(searchLower);
      
      // Tìm theo type
      const typeMatch = pkg.type.toLowerCase().includes(searchLower);
      
      // Tìm theo tags
      const tagsMatch = pkg.tags?.some((tag) => 
        tag.toLowerCase().includes(searchLower)
      ) || false;
      
      // Tìm theo slug
      const slugMatch = pkg.slug.toLowerCase().includes(searchLower);
      
      return nameMatch || categoryMatch || typeMatch || tagsMatch || slugMatch;
    });
  };

  // Tách seasonal và recommended
  const seasonalPackages = allPackages.filter((p) => p.isSeasonalOffer);
  const recommendedPackages = allPackages.filter((p) => !p.isSeasonalOffer);

  // Áp dụng search cho cả seasonal và recommended
  const filteredSeasonal = searchPackages(seasonalPackages, searchQuery);
  const filteredRecommended = searchPackages(recommendedPackages, searchQuery);

  return (
    <SafeAreaView style={homeStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header Section */}
      <View style={homeStyles.header}>
        <View style={homeStyles.headerContent}>
          <Text style={homeStyles.welcomeText}>Welcome, {username}!</Text>

          {/* Nhóm icon message + notification + profile */}
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

            {/* Profile icon */}
            <TouchableOpacity
              style={homeStyles.headerIconButton}
              onPress={() => router.push("./profile")}
            >
              <Ionicons
                name="person-outline"
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
            placeholder="Search..."
            placeholderTextColor="#D1D5DB"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={homeStyles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#D1D5DB"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Nội dung */}
      {loading ? (
        <View style={homeStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#818CF8" />
        </View>
      ) : error ? (
        <View style={homeStyles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={homeStyles.errorText}>{error}</Text>
          <Text style={homeStyles.errorSubText}>
            Please make sure backend server is running at {API_BASE_URL}
          </Text>
          <TouchableOpacity
            style={homeStyles.retryButton}
            onPress={() => {
              setError(null);
              // Trigger refetch
              const fetchPackages = async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const res = await fetch(`${API_BASE_URL}/api/packages`);
                  if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch packages' }));
                    throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
                  }
                  const data = await res.json();
                  setAllPackages(data);
                } catch (err: any) {
                  setError(err?.message || 'Error fetching packages');
                } finally {
                  setLoading(false);
                }
              };
              fetchPackages();
            }}
          >
            <Text style={homeStyles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={homeStyles.content}
          contentContainerStyle={homeStyles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Seasonal Offers - các gói isSeasonalOffer === true */}
          {filteredSeasonal.length > 0 && (
            <View style={homeStyles.section}>
              <View style={homeStyles.sectionHeader}>
                <Text style={homeStyles.sectionIcon}>🔥</Text>
                <Text style={homeStyles.sectionTitle}>Seasonal Offers</Text>
                {searchQuery.length > 0 && (
                  <Text style={homeStyles.searchResultCount}>
                    ({filteredSeasonal.length} kết quả)
                  </Text>
                )}
              </View>

              {filteredSeasonal.map((pkg) => {
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
                        pathname: "./packageDetail",
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
              {searchQuery.length > 0 && (
                <Text style={homeStyles.searchResultCount}>
                  ({filteredRecommended.length} kết quả)
                </Text>
              )}
            </View>

            {filteredRecommended.length > 0 ? (
              filteredRecommended.map((pkg) => {
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
                        pathname: "./packageDetail",
                        params: { slug: pkg.slug },
                      })
                    }
                  >
                    <Text style={homeStyles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
              );
            })) : (
              <View style={homeStyles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                <Text style={homeStyles.noResultsText}>
                  Không tìm thấy kết quả cho &ldquo;{searchQuery}&rdquo;
                </Text>
                <Text style={homeStyles.noResultsSubText}>
                  Hãy thử tìm kiếm với từ khóa khác
                </Text>
              </View>
            )}
          </View>

          {/* Hiển thị thông báo nếu không có kết quả nào cả */}
          {searchQuery.length > 0 && filteredSeasonal.length === 0 && filteredRecommended.length === 0 && (
            <View style={homeStyles.noResultsContainer}>
              <Ionicons name="search-outline" size={64} color="#9CA3AF" />
              <Text style={homeStyles.noResultsText}>
                Không tìm thấy kết quả nào
              </Text>
              <Text style={homeStyles.noResultsSubText}>
                Không có gói dịch vụ nào khớp với &ldquo;{searchQuery}&rdquo;
              </Text>
              <TouchableOpacity
                style={homeStyles.clearSearchButton}
                onPress={() => setSearchQuery("")}
              >
                <Text style={homeStyles.clearSearchButtonText}>Xóa tìm kiếm</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <View style={homeStyles.bottomNav}>
        <TouchableOpacity
          style={homeStyles.navItem}
          onPress={() => router.push("./home")}
        >
          <Ionicons name="home" size={24} color="#A855F7" />
        </TouchableOpacity>
        <TouchableOpacity
          style={homeStyles.navItem}
          onPress={() => router.push("./subscriptions")}
        >
          <Ionicons name="receipt-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={homeStyles.navItem}
          onPress={() => router.push('./cart')}
        >
          <View style={homeStyles.cartIconContainer}>
            <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
            {cartItemCount > 0 && (
              <View style={homeStyles.cartBadge}>
                <Text style={homeStyles.cartBadgeText}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Text>
              </View>
            )}
          </View>
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
  clearButton: {
    padding: 4,
    marginLeft: 8,
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
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
  errorSubText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    marginHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#818CF8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "space-between",
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  searchResultCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
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
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  seasonalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
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
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    textAlign: "center",
  },
  noResultsSubText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  clearSearchButton: {
    marginTop: 24,
    backgroundColor: "#818CF8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeScreen;
