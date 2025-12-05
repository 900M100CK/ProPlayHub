import { Stack } from "expo-router";
import React from "react";
import ToastProvider from "./src/components/ToastProvider";

export default function RootLayout() {
  return (
    <ToastProvider>
      <Stack
        screenOptions={{
          headerShown: false, 
        }}
      />
    </ToastProvider>
  );
}
