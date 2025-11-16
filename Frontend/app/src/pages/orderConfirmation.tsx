// app/src/pages/orderConfirmation.tsx
import React, { useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

const OrderConfirmationScreen = () => {
  const router = useRouter();
  const { packageName, price } = useLocalSearchParams<{
    packageName?: string;
    price?: string;
  }>();

  // Tạo ID đơn hàng giả cho đẹp UI
  const orderId = useMemo(
    () => "# " + Math.floor(10000 + Math.random() * 90000).toString(),
    []
  );

  const pkgName = packageName || "Your Subscription";
  const pkgPrice = price || "0.00";

  const handleBackHome = () => {
    // Đổi path này cho đúng màn hình Home của bạn nếu khác
    router.push("./home");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar giống step title */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>7. Order Confirmation</Text>
      </View>

      <View style={styles.wrapper}>
        <View style={styles.card}>
          {/* Icon check xanh */}
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          </View>

          {/* Title + subtitle */}
          <Text style={styles.title}>Order Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your subscription has been activated
          </Text>

          {/* Order box */}
          <View style={styles.orderBox}>
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.orderId}>Order {orderId}</Text>
            </View>

            <Text style={styles.orderName}>{pkgName}</Text>
            <Text style={styles.orderPrice}>£{pkgPrice}/month</Text>
          </View>

          {/* Info text */}
          <Text style={styles.infoText}>
            A confirmation email has been sent to your registered email address.
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("./subcriptions")}
          >
            <Text style={styles.primaryButtonText}>View My Subscriptions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackHome}
          >
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  topBar: {
    height: 48,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  topBarText: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "600",
  },
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  orderBox: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  orderId: {
    fontSize: 12,
    color: "#6B7280",
  },
  orderName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8B5CF6",
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#8B5CF6",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "500",
  },
});

export default OrderConfirmationScreen;
