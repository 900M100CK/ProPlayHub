// app/complete-profile.tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const CompleteProfileScreen = () => {
  // TODO:
  // 1. Tạo các state cho age, location, gamingPlatformPreferences...
  // 2. Tạo các TextInput, Picker, hoặc Checkbox để người dùng nhập liệu.
  // 3. Viết hàm handleCompleteProfile để gọi API (ví dụ: /api/users/complete-profile)
  //    - Bạn sẽ cần lấy accessToken từ authStore để xác thực request.
  // 4. Sau khi cập nhật thành công, điều hướng người dùng đến trang chủ.
  //    router.replace('./(tabs)/home');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Hoàn tất Hồ sơ của bạn</Text>
        <Text style={styles.subtitle}>
          Cung cấp thêm một vài thông tin để chúng tôi có thể cá nhân hóa trải nghiệm của bạn.
        </Text>
        
        {/* Thêm các trường input của bạn ở đây */}
        
        <Button 
          title="Lưu và Tiếp tục" 
          onPress={() => {
            // Tạm thời điều hướng để kiểm tra luồng
            console.log("Lưu thông tin...");
            router.replace('./(tabs)/home');
          }} 
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  inner: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#818CF8', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', marginBottom: 30 },
});

export default CompleteProfileScreen;
