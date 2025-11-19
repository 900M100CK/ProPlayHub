import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setToast(null);
    });
  }, [opacity, translateY, visible]);

  const scheduleHide = useCallback(
    (duration?: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (duration === 0) return;
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration ?? 3500);
    },
    [hideToast]
  );

  const showToast = useCallback(
    (options: ToastOptions) => {
      const { duration, ...rest } = options;
      setToast({ type: 'info', ...rest });
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
      scheduleHide(duration ?? (options.action ? 5000 : undefined));
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
          pointerEvents="box-none"
          style={[
            styles.toastWrapper,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.toastContainer, { backgroundColor: palette.background }]}>
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
              <Text style={styles.toastTitle}>{toast.title}</Text>
              {toast.message && <Text style={styles.toastMessage}>{toast.message}</Text>}
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
            <TouchableOpacity
              onPress={hideToast}
              style={styles.closeButton}
              accessibilityLabel="Close notification"
            >
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
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
    top: 48,
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
  closeButton: {
    padding: 6,
    marginLeft: 6,
  },
});

export default ToastProvider;

