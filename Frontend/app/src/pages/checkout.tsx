// app/src/pages/checkout.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

const API_BASE_URL = "http://10.0.2.2:3000";

// ====== HELPER DISCOUNT ======
const extractDiscountPercent = (label?: string): number | null => {
  if (!label) return null;
  const match = label.match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : null;
};

const calcDiscountedPrice = (basePrice: number, label?: string) => {
  const percent = extractDiscountPercent(label);
  if (!percent) return { final: basePrice, discountAmount: 0 };
  const final = basePrice * (1 - percent / 100);
  return {
    final: Number(final.toFixed(2)),
    discountAmount: Number((basePrice - final).toFixed(2)),
  };
};

// ====== MOCK PAYMENT METHODS (demo) ======
type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  holder: string;
  isDefault?: boolean;
};

const MOCK_METHODS: PaymentMethod[] = [
  {
    id: "pm_visa_4242",
    brand: "Visa",
    last4: "4242",
    holder: "John Smith",
    isDefault: true,
  },
  {
    id: "pm_mc_5522",
    brand: "Mastercard",
    last4: "5522",
    holder: "John Smith",
  },
  {
    id: "pm_ppal",
    brand: "PayPal",
    last4: "—",
    holder: "john@example.com",
  },
];

const CheckoutScreen = () => {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();

  const [pkg, setPkg] = useState<any | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [loading, setLoading] = useState(false);

  // ====== PAYMENT METHOD STATE ======
  const [paymentMethods] = useState<PaymentMethod[]>(MOCK_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    MOCK_METHODS[0].id
  );
  const [showMethodList, setShowMethodList] = useState(false);

  // ====== FETCH PACKAGE ======
  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/packages/${slug}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch.");
        }
        setPkg(data);
      } catch (err) {
        console.error("Checkout fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (!pkg) {
    return (
      <SafeAreaView style={checkoutStyles.container}>
        <Text style={checkoutStyles.errorText}>
          {loading ? "Loading..." : "Package not found"}
        </Text>
      </SafeAreaView>
    );
  }

  const basePrice = pkg.basePrice;
  const { final, discountAmount } = calcDiscountedPrice(
    basePrice,
    pkg.discountLabel
  );

  const selectedMethod = paymentMethods.find(
    (m) => m.id === selectedMethodId
  ) as PaymentMethod;

  // ====== COMPLETE ORDER (CHUYỂN QUA ORDER CONFIRMATION) ======
  const handleCompleteOrder = () => {
    router.push({
      pathname: "./orderConfirmation",
      params: {
        slug: pkg.slug,
        packageName: pkg.name,
        price: final.toFixed(2),
        // gửi luôn method để màn sau hiển thị nếu cần
        paymentBrand: selectedMethod.brand,
        paymentLast4: selectedMethod.last4,
      },
    });
  };

  return (
    <SafeAreaView style={checkoutStyles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={checkoutStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={checkoutStyles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={checkoutStyles.headerTitle}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={checkoutStyles.content} bounces={false}>
        {/* Order Summary */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Order Summary</Text>

          <View style={checkoutStyles.rowBetween}>
            <Text style={checkoutStyles.itemName}>{pkg.name}</Text>
            <Text style={checkoutStyles.itemPrice}>
              £{basePrice.toFixed(2)}
            </Text>
          </View>

          {discountAmount > 0 && (
            <View style={checkoutStyles.rowBetween}>
              <Text style={checkoutStyles.discountLabel}>
                {pkg.discountLabel || "App Discount"}
              </Text>
              <Text style={checkoutStyles.discountValue}>
                -£{discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={checkoutStyles.rowBetweenTotal}>
            <Text style={checkoutStyles.totalLabel}>Total</Text>
            <Text style={checkoutStyles.totalValue}>£{final.toFixed(2)}</Text>
          </View>
        </View>

        {/* Discount Code */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Discount Code</Text>
          <View style={checkoutStyles.discountRow}>
            <TextInput
              style={checkoutStyles.discountInput}
              placeholder="Enter code"
              placeholderTextColor="#9CA3AF"
              value={discountCode}
              onChangeText={setDiscountCode}
            />
            <TouchableOpacity style={checkoutStyles.discountButton}>
              <Text style={checkoutStyles.discountButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Payment Method</Text>

          {/* Ô đang chọn */}
          <View style={checkoutStyles.paymentBox}>
            <View style={checkoutStyles.row}>
              <Ionicons name="card-outline" size={20} color="#4B5563" />
              <View style={{ marginLeft: 12 }}>
                <Text style={checkoutStyles.cardNumber}>
                  {selectedMethod.brand === "PayPal"
                    ? selectedMethod.holder
                    : `•••• •••• •••• ${selectedMethod.last4}`}
                </Text>
                <Text style={checkoutStyles.cardSub}>
                  {selectedMethod.brand}
                  {selectedMethod.brand !== "PayPal"
                    ? ` ending in ${selectedMethod.last4}`
                    : ""}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowMethodList((prev) => !prev)}
            >
              <Text style={checkoutStyles.changeText}>
                {showMethodList ? "Close" : "Change"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách method để Change */}
          {showMethodList && (
            <View style={checkoutStyles.methodList}>
              {paymentMethods.map((method) => {
                const isActive = method.id === selectedMethodId;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      checkoutStyles.methodItem,
                      isActive && checkoutStyles.methodItemActive,
                    ]}
                    onPress={() => {
                      setSelectedMethodId(method.id);
                      setShowMethodList(false);
                    }}
                  >
                    <View style={checkoutStyles.row}>
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color={isActive ? "#8B5CF6" : "#4B5563"}
                      />
                      <View style={{ marginLeft: 10 }}>
                        <Text
                          style={[
                            checkoutStyles.methodTitle,
                            isActive && checkoutStyles.methodTitleActive,
                          ]}
                        >
                          {method.brand}
                        </Text>
                        <Text style={checkoutStyles.methodSub}>
                          {method.brand === "PayPal"
                            ? method.holder
                            : `•••• •••• •••• ${method.last4}`}
                        </Text>
                      </View>
                    </View>
                    {isActive && (
                      <Text style={checkoutStyles.methodTag}>Selected</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View style={checkoutStyles.footer}>
        <TouchableOpacity
          style={checkoutStyles.completeButton}
          onPress={handleCompleteOrder}
        >
          <Text style={checkoutStyles.completeButtonText}>
            Complete Order
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const checkoutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    height: 80,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rowBetweenTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  itemName: {
    fontSize: 14,
    color: "#111827",
  },
  itemPrice: {
    fontSize: 14,
    color: "#111827",
  },
  discountLabel: {
    fontSize: 13,
    color: "#10B981",
  },
  discountValue: {
    fontSize: 13,
    color: "#10B981",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#A855F7",
  },
  discountRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  discountInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    color: "#111827",
    marginRight: 8,
  },
  discountButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  discountButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  paymentBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  cardSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  changeText: {
    fontSize: 13,
    color: "#6366F1",
    fontWeight: "500",
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 30,
  },
  completeButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 40,
    textAlign: "center",
    color: "#EF4444",
  },

  // payment method list
  methodList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
    gap: 8,
  },
  methodItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  methodItemActive: {
    borderColor: "#8B5CF6",
    backgroundColor: "#F5F3FF",
  },
  methodTitle: {
    fontSize: 14,
    color: "#111827",
  },
  methodTitleActive: {
    color: "#8B5CF6",
    fontWeight: "600",
  },
  methodSub: {
    fontSize: 12,
    color: "#6B7280",
  },
  methodTag: {
    fontSize: 11,
    color: "#8B5CF6",
    fontWeight: "600",
  },
});

export default CheckoutScreen;
