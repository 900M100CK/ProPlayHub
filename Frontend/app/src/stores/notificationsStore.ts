import { create } from "zustand";
import { useAuthStore } from "./authStore";
import apiClient from "../api/axiosConfig";

export type AppNotification = {
  id: string;
  title: string;
  message?: string;
  createdAt: number;
  read: boolean;
  category?: "chat" | "system" | "order" | "cart" | string;
};

type NotificationState = {
  notifications: AppNotification[];
  hydrated: boolean;
  unreadCount: number;
  loadFromStorage: () => Promise<void>;
  addNotification: (
    data: Omit<AppNotification, "id" | "createdAt" | "read"> &
      Partial<Pick<AppNotification, "id" | "createdAt" | "read">>
  ) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const getUserId = (state = useAuthStore.getState()) =>
  state.user?._id || (state.user as any)?.id || null;

const isChatNotification = (n: AppNotification) => {
  const title = (n.title || "").toLowerCase();
  return n.category === "chat" || title === "staff" || title.includes("message");
};

export const useNotificationsStore = create<NotificationState>((set, get) => ({
  notifications: [],
  hydrated: false,
  unreadCount: 0,

  loadFromStorage: async () => {
    const auth = useAuthStore.getState();
    const uid = getUserId(auth);
    if (!auth.accessToken || !uid) {
      set({ notifications: [], unreadCount: 0, hydrated: true });
      return;
    }
    try {
      const res = await apiClient.get("/notifications");
      const raw = Array.isArray(res.data) ? res.data : res.data?.notifications || [];
      const list: AppNotification[] = raw.map((n: any) => ({
        id: n.id || n._id || `${n.createdAt || Date.now()}`,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt ? new Date(n.createdAt).getTime() : Date.now(),
        read: !!n.read,
        category: n.category,
      }));
      const sorted = list.sort((a, b) => b.createdAt - a.createdAt);

      // Keep only the newest chat notification, keep all others
      const chatKept = new Set<string>();
      const normalized: AppNotification[] = [];
      for (const n of sorted) {
        if (isChatNotification(n)) {
          const key = n.title || "chat";
          if (chatKept.has(key)) continue;
          chatKept.add(key);
          normalized.push(n);
        } else {
          normalized.push(n);
        }
      }

      set({
        notifications: normalized,
        hydrated: true,
        unreadCount: normalized.filter((n: AppNotification) => !n.read).length,
      });
    } catch (err) {
      console.warn("Failed to load notifications", err);
      set({ hydrated: true, notifications: [], unreadCount: 0 });
    }
  },

  addNotification: async (data) => {
    const auth = useAuthStore.getState();
    const uid = getUserId(auth);
    let newNotif: AppNotification = {
      id: data.id || `${Date.now()}`,
      title: data.title,
      message: data.message,
      createdAt: data.createdAt ?? Date.now(),
      read: data.read ?? false,
      category: data.category,
    };

    // Try to persist when authenticated; otherwise store locally only
    if (auth.accessToken && uid) {
      try {
        const payload = { title: data.title, message: data.message, category: data.category };
        const res = await apiClient.post("/notifications", payload);
        newNotif = res.data?.notification || {
          id: res.data?._id || data.id || `${Date.now()}`,
          title: data.title,
          message: data.message,
          createdAt: data.createdAt ?? Date.now(),
          read: data.read ?? false,
          category: data.category,
        };
      } catch (err) {
        console.warn("Failed to add notification", err);
      }
    }

    const existing = get().notifications;
    let updated: AppNotification[];
    if (isChatNotification(newNotif)) {
      const withoutChat = existing.filter((n) => !isChatNotification(n));
      updated = [newNotif, ...withoutChat];
    } else {
      updated = [newNotif, ...existing];
    }

    set({ notifications: updated, unreadCount: updated.filter((n) => !n.read).length });
  },

  markRead: async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      const updated = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      set({ notifications: updated, unreadCount: updated.filter((n) => !n.read).length });
    } catch (err) {
      console.warn("Failed to mark read", err);
    }
  },

  markAllRead: async () => {
    try {
      await apiClient.post("/notifications/read-all");
      const updated = get().notifications.map((n) => ({ ...n, read: true }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (err) {
      console.warn("Failed to mark all read", err);
    }
  },

  removeNotification: async (id: string) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch (err) {
      console.warn("Failed to delete notification", err);
    } finally {
      const updated = get().notifications.filter((n) => n.id !== id);
      set({ notifications: updated, unreadCount: updated.filter((n) => !n.read).length });
    }
  },

  clearAll: async () => {
    try {
      await apiClient.delete("/notifications");
    } catch (err) {
      console.warn("Failed to clear notifications", err);
    } finally {
      set({ notifications: [], unreadCount: 0 });
    }
  },
}));

let notificationsAuthUnsubscribe: (() => void) | null = null;
if (!notificationsAuthUnsubscribe) {
  let prevUserId = getUserId();
  useNotificationsStore.getState().loadFromStorage();
  notificationsAuthUnsubscribe = useAuthStore.subscribe((state) => {
    const nextId = getUserId(state);
    if (nextId !== prevUserId) {
      prevUserId = nextId;
      useNotificationsStore.setState({ hydrated: false, notifications: [], unreadCount: 0 });
      useNotificationsStore.getState().loadFromStorage();
    }
  });
}

export default useNotificationsStore;
