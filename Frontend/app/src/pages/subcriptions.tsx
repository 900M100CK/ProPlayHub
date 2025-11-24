// app/src/pages/subscriptions.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ScreenHeader from "../components/ScreenHeader";
import { useAuthStore } from "../stores/authStore";
import apiClient from "../api/axiosConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SubscriptionStatus = "active" | "inactive" | "cancelled";

interface UserSubscription {
  _id: string;
  packageSlug: string;
  packageName: string;
  period: string;
  pricePerPeriod: number;
  status: SubscriptionStatus;
  startedAt?: string;
  nextBillingDate?: string;
  cancelledAt?: string;
}

const formatMonthYear = (input?: string) => {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
  });
};

const formatFullDate = (input?: string) => {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const MySubscriptionsScreen = () => {
  const { user, accessToken } = useAuthStore() as any;
  const router = useRouter();

  const [subs, setSubs] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Đảm bảo token được load vào store nếu chưa có
        let token = accessToken;
        if (!token) {
          try {
            token = await AsyncStorage.getItem('accessToken');
            if (token) {
              useAuthStore.setState({ accessToken: token });
            }
          } catch (storageErr) {
            console.error('Failed to read token from storage:', storageErr);
          }
        }

        if (!token) {
          setLoading(false);
          return;
        }

        // Dùng apiClient để tự động thêm token và xử lý lỗi 401
        const response = await apiClient.get('/subscriptions/me');
        setSubs(response.data || []);
      } catch (err: any) {
        console.error("Fetch subscriptions error:", err);
        // Nếu lỗi 401, clear token và không hiển thị lỗi
        if (err?.response?.status === 401) {
          await AsyncStorage.removeItem('accessToken');
          useAuthStore.setState({ accessToken: null, user: null });
          setError(null); // Không hiển thị lỗi 401
        } else {
          setError(err?.response?.data?.message || err?.message || "Error fetching subscriptions");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubs();
  }, [accessToken]);

  // Nếu chưa login
  const headerTitle = "My subscriptions";
  const headerSubtitle =
    subs.length > 0 ? `${subs.length} package${subs.length > 1 ? "s" : ""}` : undefined;

  if (!user || !accessToken) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScreenHeader title={headerTitle} />
        <View style={styles.body}>
          <View style={styles.centered}>
            <Text style={{ color: "#6B7280" }}>
              You need to login to view your subscriptions.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader title={headerTitle} subtitle={headerSubtitle} />
      <View style={styles.body}>
      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>My Subscriptions</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : subs.length === 0 ? (
          <View style={styles.centered}>
            <Text style={{ color: "#6B7280" }}>
              You don&apos;t have any subscriptions yet.
            </Text>
          </View>
        ) : (
          subs.map((sub) => {
            const isActive = sub.status === "active";

            const startedText = sub.startedAt
              ? `Active since ${formatMonthYear(sub.startedAt)}`
              : "Active";

            const nextBillingText = sub.nextBillingDate
              ? `Next billing: ${formatFullDate(sub.nextBillingDate)}`
              : "";

            const cancelledText = sub.cancelledAt
              ? `Cancelled on ${formatMonthYear(sub.cancelledAt)}`
              : "Inactive";

            return (
              <View
                key={sub._id}
                style={[
                  styles.card,
                  !isActive && styles.cardInactiveBackground,
                ]}
              >
                {/* Header row: name + badge */}
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.packageName}>{sub.packageName}</Text>
                    <Text style={styles.subStatusText}>
                      {isActive ? startedText : cancelledText}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isActive
                        ? styles.statusBadgeActive
                        : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isActive
                          ? styles.statusBadgeTextActive
                          : styles.statusBadgeTextInactive,
                      ]}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>

                {/* Next billing + price */}
                {isActive && (
                  <View style={{ marginTop: 8 }}>
                    {nextBillingText !== "" && (
                      <Text style={styles.nextBillingText}>
                        {nextBillingText}
                      </Text>
                    )}
                    <Text style={styles.priceText}>
                      £{sub.pricePerPeriod.toFixed(2)}
                      <Text style={styles.pricePeriod}> {sub.period}</Text>
                    </Text>
                  </View>
                )}

                {!isActive && (
                  <View style={{ height: 8 }} />
                )}

                {/* Footer buttons */}
                <View style={styles.cardFooter}>
                  {isActive ? (
                    <>
                      <TouchableOpacity
                        style={styles.manageButton}
                        onPress={() => {
                          if (sub.packageSlug) {
                            router.push(`./packageDetail?slug=${sub.packageSlug}`);
                          }
                        }}
                      >
                        <Text style={styles.manageButtonText}>Manage</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.upgradeButton}
                        onPress={() => router.push("./subscriptionCategories")}
                      >
                        <Text style={styles.upgradeButtonText}>Upgrade</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.reactivateButton}
                      onPress={() => {
                        if (sub.packageSlug) {
                          router.push({
                            pathname: "./checkout",
                            params: { slug: sub.packageSlug },
                          });
                        }
                      }}
                    >
                      <Text style={styles.reactivateButtonText}>
                        Reactivate
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default MySubscriptionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A855F7",
  },
  body: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  centered: {
    marginTop: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardInactiveBackground: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  packageName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  subStatusText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeActive: {
    backgroundColor: "#D1FAE5",
  },
  statusBadgeInactive: {
    backgroundColor: "#E5E7EB",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadgeTextActive: {
    color: "#059669",
  },
  statusBadgeTextInactive: {
    color: "#4B5563",
  },
  nextBillingText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#A855F7",
  },
  pricePeriod: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
  },
  cardFooter: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  manageButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A855F7",
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 8,
  },
  manageButtonText: {
    color: "#A855F7",
    fontWeight: "600",
  },
  upgradeButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#A855F7",
    paddingVertical: 10,
    alignItems: "center",
    marginLeft: 8,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  reactivateButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    paddingVertical: 10,
    alignItems: "center",
  },
  reactivateButtonText: {
    color: "#4B5563",
    fontWeight: "600",
  },
});
