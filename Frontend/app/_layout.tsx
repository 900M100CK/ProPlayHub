import { Stack } from "expo-router";
import React from "react";
import ToastProvider from "./src/components/ToastProvider";

export default function RootLayout() {
  return (
    <ToastProvider>
      <Stack
        screenOptions={{
          headerShown: false, // vì bạn đã custom header trong home/packageDetail rồi
        }}
      />
    </ToastProvider>
  );
}
