import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { io, Socket } from 'socket.io-client';
import { Slot, usePathname, useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';
import { useAuthStore } from '../stores/authStore';
import { useNotificationsStore } from '../stores/notificationsStore';
import { SOCKET_BASE_URL } from '../utils/apiConfig';
import { showGlobalToast } from '../components/toastService';

const HIDE_NAV_PATTERNS = [
  'login',
  'register',
  'forgotpassword',
  'resetpassword',
  'paymentmethods',
  'completeprofile',
  'changepassword',
  'profile',
  'profiledetails',
  'achievementscreen',
  'cart',
  'checkout',
  'privacypolicy',
  'customizepackage',
  'packagedetail',
  'livechat',
  'settings',
  'orderconfirmation',
  'upgradesubscription',
];

const ROUTE_ORDER: Record<string, number> = {
  '/src/pages/home': 1,
  '/src/pages/subscriptioncategories': 2,
  '/src/pages/subscriptions': 3,
  '/src/pages/cart': 4,
};

const getRouteIndex = (path: string) => {
  const match = Object.keys(ROUTE_ORDER).find((key) => path.startsWith(key));
  return match ? ROUTE_ORDER[match] : 0;
};

const NotificationListener = () => {
  const { user } = useAuthStore();
  const { addNotification, loadFromStorage } = useNotificationsStore();
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();
  const pathname = (usePathname() || '').toLowerCase();
  const isOnLiveChat = pathname.includes('livechat');

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const userId = user?._id || (user as any)?.id;
    const username = user?.username || user?.email || 'User';

    if (!userId) {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(SOCKET_BASE_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { roomId: userId, userId, username });
    });

    socket.on('chat:message', (msg: any) => {
      if (!msg) return;
      if (String(msg.userId) === String(userId)) return;
      const title = 'Staff';
      const message = msg.text || 'You have a new message';
      addNotification({
        title,
        message,
        category: 'chat',
      });
      if (!isOnLiveChat) {
        showGlobalToast({
          type: 'info',
          title,
          message,
          recordNotification: false,
          onPress: () => router.push('/src/pages/livechat'),
        });
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addNotification, user, loadFromStorage, isOnLiveChat]);

  return null;
};

const PagesLayout = () => {
  const pathname = (usePathname() || '').toLowerCase();
  const showNav = !HIDE_NAV_PATTERNS.some((p) => pathname.includes(p));
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const [prevPath, setPrevPath] = useState(pathname);

  useEffect(() => {
    if (prevPath === pathname) return;
    const prevIndex = getRouteIndex(prevPath);
    const nextIndex = getRouteIndex(pathname);
    const direction = nextIndex > prevIndex ? 1 : -1;
    translateX.setValue(direction * width);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setPrevPath(pathname);
  }, [pathname, prevPath, translateX, width]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#8B5CF6" translucent={false} />
      <NotificationListener />
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        <Slot />
      </Animated.View>
      {showNav && <BottomNav />}
    </View>
  );
};

export default PagesLayout;
