import { Redirect } from 'expo-router';
import React from 'react';

/**
 * Đây là tệp gốc của thư mục 'app'.
 * Khi người dùng mở ứng dụng, tệp này sẽ được tải.
 * Chúng ta dùng <Redirect> để tự động chuyển hướng họ đến trang đăng nhập.
 * Email và password sẽ được tự động điền nếu có "Ghi nhớ".
 */
export default function AppIndex() {
  // Redirect đến login page (file-based routing của Expo Router)
  return <Redirect href="/src/pages/login" />;
}