import { Redirect } from 'expo-router';
import React from 'react';


export default function AppIndex() {
  // Redirect đến login page (file-based routing của Expo Router)
  return <Redirect href="/src/pages/login" />;
}