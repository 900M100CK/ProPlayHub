import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing, radius, shadow } from '../styles/theme';
import { useNotificationsStore } from '../stores/notificationsStore';
import { useRouter } from 'expo-router';

const NotificationsScreen = () => {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loadFromStorage,
    markRead,
    markAllRead,
    removeNotification,
    clearAll,
  } = useNotificationsStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const sorted = [...notifications].sort((a, b) => b.createdAt - a.createdAt);

  const isChatNotification = (item: any) => {
    const title = (item?.title || '').toLowerCase();
    return item?.category === 'chat' || title === 'staff' || title.includes('message');
  };

  const handlePress = async (item: any) => {
    await markRead(item.id);
    if (isChatNotification(item)) {
      router.push('/src/pages/livechat');
    }
  };

  const renderItem = ({ item }: any) => {
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconWrapper}>
            <Ionicons
              name={item.read ? 'notifications-outline' : 'notifications'}
              size={20}
              color={item.read ? colors.textSecondary : colors.primary}
            />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {item.message ? (
              <Text style={styles.message} numberOfLines={2}>
                {item.message}
              </Text>
            ) : null}
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => removeNotification(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Notifications"
        showBackButton
        rightSlot={
          notifications.length > 0 ? (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={markAllRead} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Mark read</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearAll} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>When you get alerts, they will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: spacing.xs,
    flexShrink: 0,
  },
  headerButton: {
    minWidth: 130,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
  },
  headerButtonText: {
    color: colors.headerText,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cardContent: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.md,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  message: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  time: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: spacing.xs,
  },
});

export default NotificationsScreen;
