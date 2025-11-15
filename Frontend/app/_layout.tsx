import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // vì bạn đã custom header trong home/packageDetail rồi
      }}
    />
  );
}
