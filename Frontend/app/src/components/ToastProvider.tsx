import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { registerToastHandlers, unregisterToastHandlers } from './toastService';

type ToastType = 'success' | 'error' | 'info';

type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastOptions = {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
  onPress?: () => void;
  persistent?: boolean; // Nếu true, toast sẽ không tự tắt (dùng cho các alert quan trọng)
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_COLORS: Record<ToastType, { background: string; icon: string }> = {
  success: { background: '#DCFCE7', icon: '#16A34A' },
  error: { background: '#FEE2E2', icon: '#DC2626' },
  info: { background: '#DBEAFE', icon: '#2563EB' },
};

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const hiddenOffset = useRef(-60).current;
  const translateY = useRef(new Animated.Value(hiddenOffset)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);
  const insets = useSafeAreaInsets();

  const clearHideTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const hideToast = useCallback(
    (options?: { instant?: boolean; swipe?: boolean; to?: number }) => {
      const instant = options?.instant ?? false;
      const swipe = options?.swipe ?? false;
      const toValue = options?.to ?? (swipe ? -140 : hiddenOffset);
      if (!visibleRef.current) return;
      clearHideTimeout();

      if (instant) {
        translateY.setValue(hiddenOffset);
        opacity.setValue(0);
        visibleRef.current = false;
        setVisible(false);
        setToast(null);
        return;
      }

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: toValue,
          duration: swipe ? 160 : 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: swipe ? 160 : 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        visibleRef.current = false;
        setVisible(false);
        setToast(null);
        translateY.setValue(hiddenOffset);
        opacity.setValue(0);
      });
    },
    [clearHideTimeout, hiddenOffset, opacity, translateY]
  );

  const scheduleHide = useCallback(
    (duration?: number) => {
      clearHideTimeout();
      if (duration === 0) return;
      timeoutRef.current = setTimeout(() => {
        const offscreenTarget = -Dimensions.get('window').height;
        hideToast({ swipe: true, to: offscreenTarget });
      }, duration ?? 3000);
    },
    [clearHideTimeout, hideToast]
  );

  const panResponder = useRef(
    PanResponder.create({
      onPanResponderGrant: () => {
        clearHideTimeout(); // pause auto-hide while touching
      },
      // Let simple taps fall through to onPress; only capture after a real move
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        visibleRef.current && Math.abs(gestureState.dy) > 3,
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        visibleRef.current && Math.abs(gestureState.dy) > 3,
      onPanResponderMove: (_, gestureState) => {
        if (!visibleRef.current) return;
        const screenHeight = Dimensions.get('window').height;
        const dy = gestureState.dy;
        // Only react to upward pulls; downward drags bounce back but don't move far
        const clampedDy = Math.min(dy, 30);
        const resistanceFactor = clampedDy < 0 ? 1 : 1 / (1 + clampedDy / 80);
        const offset = Math.max(-screenHeight, clampedDy * resistanceFactor);
        translateY.setValue(offset);
        const newOpacity = offset < 0
          ? Math.max(0.05, 1 + offset / (screenHeight * 0.35))
          : 1;
        opacity.setValue(newOpacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        const screenHeight = Dimensions.get('window').height;
        const draggedUp = gestureState.dy < -1 || gestureState.vy < -0.02;
        if (draggedUp) {
          hideToast({ swipe: true, to: -screenHeight });
          return;
        }
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
        ]).start(() => {
          scheduleHide(); // restart auto-hide after touch end
        });
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
        ]).start(() => {
          scheduleHide();
        });
      },
    })
  ).current;

  const showToast = useCallback(
    (options: ToastOptions) => {
      const { duration, persistent, action, ...rest } = options;
      setToast({ type: 'info', ...rest, action });
      visibleRef.current = true;
      setVisible(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Nếu có action (link chuyển trang) hoặc persistent=true, không tự tắt
      // Các toast khác tự tắt sau 3s
      if (persistent || action) {
        // Không schedule hide cho các toast quan trọng
        scheduleHide(0);
      } else {
        scheduleHide(duration ?? 3000);
      }
    },
    [opacity, scheduleHide, translateY]
  );

  useEffect(() => {
    registerToastHandlers(showToast, hideToast);
    return () => {
      unregisterToastHandlers();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [hideToast, showToast]);

  const activeType: ToastType = toast?.type ?? 'info';
  const palette = TOAST_COLORS[activeType];

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && visible && (
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.toastWrapper,
            {
              top: 0,
              paddingTop: insets.top + 12,
              opacity,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            activeOpacity={toast?.onPress ? 0.8 : 1}
            onPress={() => {
              if (toast?.onPress) {
                toast.onPress();
                hideToast();
              }
            }}
            style={[styles.toastContainer, { backgroundColor: palette.background }]}
          >
            <View style={[styles.iconWrapper, { backgroundColor: palette.icon }]}>
              <Ionicons
                name={
                  activeType === 'success'
                    ? 'checkmark'
                    : activeType === 'error'
                      ? 'close'
                      : 'information'
                }
                color="#fff"
                size={18}
              />
            </View>
            <View style={styles.toastContent}>
              <Text style={styles.toastTitle} numberOfLines={2} ellipsizeMode="tail">
                {toast.title}
              </Text>
              {toast.message && (
                <Text style={styles.toastMessage} numberOfLines={2} ellipsizeMode="tail">
                  {toast.message}
                </Text>
              )}
              {toast.action && (
                <TouchableOpacity
                  onPress={() => {
                    toast.action?.onPress();
                    hideToast();
                  }}
                  style={styles.toastActionButton}
                >
                  <Text style={styles.toastActionText}>{toast.action.label}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 999,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  toastMessage: {
    marginTop: 2,
    fontSize: 13,
    color: '#334155',
  },
  toastActionButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  toastActionText: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ToastProvider;

