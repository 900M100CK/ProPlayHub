// Frontend/app/src/pages/livechat.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import io, { Socket } from "socket.io-client";
import { useAuthStore } from "../stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SOCKET_BASE_URL } from "../utils/apiConfig";
import { useNotificationsStore } from "../stores/notificationsStore";
import apiClient from "../api/axiosConfig";

interface ChatMessage {
  id: string;
  text: string;
  fromSelf: boolean;
  username: string;
  createdAt?: string;
}

const SOCKET_URL = SOCKET_BASE_URL;
const PAGE_SIZE = 20;

export default function LivechatScreen() {
  const { user } = useAuthStore() as any;
  const router = useRouter();
  const { addNotification, loadFromStorage, markAllRead: notificationsMarkAllRead } = useNotificationsStore();

  const userId: string | undefined = user?._id || user?.id;
  const username: string = user?.username || user?.email || "Guest";
  const ROOM_ID = userId ?? "guest_room";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const atBottomRef = useRef(true);
  const initialScrolledRef = useRef(false);
  const fetchingRef = useRef(false);

  // Jump to latest on first load
  useEffect(() => {
    if (!messages.length || initialScrolledRef.current) return;
    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: false }); atBottomRef.current = true; initialScrolledRef.current = true; }, 20);
  }, [messages]);

  useEffect(() => {
    loadFromStorage();
    notificationsMarkAllRead();
  }, [loadFromStorage, notificationsMarkAllRead]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join", { roomId: ROOM_ID, userId, username });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("chat:history", (history: any[] = []) => {
      const mapped: ChatMessage[] = history
        .map((m: any) => ({
          id: m.id || m._id,
          text: m.text,
          fromSelf: String(m.userId) === String(userId),
          username: m.username,
          createdAt: m.createdAt,
        }))
        .sort((a: ChatMessage, b: ChatMessage) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      atBottomRef.current = true;
      initialScrolledRef.current = false;
      setMessages(mapped);
      setHasMore(history.length >= PAGE_SIZE);
    });

    socket.on("chat:message", (msg: any) => {
      if (!msg) return;
      const newMsg: ChatMessage = {
        id: msg.id || msg._id || Date.now().toString(),
        text: msg.text,
        fromSelf: String(msg.userId) === String(userId),
        username: msg.username,
        createdAt: msg.createdAt || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      if (atBottomRef.current) {
        requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
      }
      if (!newMsg.fromSelf) {
        addNotification({ title: "Staff", message: newMsg.text });
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [ROOM_ID, addNotification, userId, username, loadFromStorage, notificationsMarkAllRead]);

  const loadInitial = async () => {
    if (!userId || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const res = await apiClient.get("/chat/messages", {
        params: { roomId: userId, limit: PAGE_SIZE },
      });
      const raw = res.data?.messages || res.data || [];
      const mapped: ChatMessage[] = raw
        .map((m: any) => ({
          id: m.id || m._id || `${m.createdAt || Date.now()}`,
          text: m.text,
          fromSelf: String(m.userId) === String(userId),
          username: m.username,
          createdAt: m.createdAt,
        }))
        .sort((a: ChatMessage, b: ChatMessage) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      setMessages(mapped);
      setHasMore(raw.length >= PAGE_SIZE);
      initialScrolledRef.current = false;
    } catch (err) {
      console.warn("Failed to load messages", err);
      setHasMore(false);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [userId]);

  const loadOlder = async () => {
    if (!userId || fetchingRef.current || !hasMore || !messages.length) return;
    fetchingRef.current = true;
    try {
      const oldest = messages[0];
      const res = await apiClient.get("/chat/messages", {
        params: { roomId: userId, before: oldest.createdAt, limit: PAGE_SIZE },
      });
      const raw = res.data?.messages || res.data || [];
      const mapped: ChatMessage[] = raw
        .map((m: any) => ({
          id: m.id || m._id || `${m.createdAt || Date.now()}`,
          text: m.text,
          fromSelf: String(m.userId) === String(userId),
          username: m.username,
          createdAt: m.createdAt,
        }))
        .sort((a: ChatMessage, b: ChatMessage) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      if (mapped.length) {
        setMessages((prev) => [...mapped, ...prev]);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn("Failed to load older messages", err);
      setHasMore(false);
    } finally {
      fetchingRef.current = false;
    }
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !socketRef.current || !userId) return;

    socketRef.current.emit(
      "chat:message",
      { roomId: ROOM_ID, text: trimmed, userId, username },
      (res: any) => {
        if (!res?.ok) {
          console.log("Send error:", res?.error);
        }
      }
    );

    setInputText("");
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  };

  const formatTime = (x?: string) => {
    if (!x) return "";
    const d = new Date(x);
    if (Number.isNaN(d.getTime())) return "";
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const hour12 = h % 12 || 12;
    const suffix = h >= 12 ? "PM" : "AM";
    return `${hour12}:${m} ${suffix}`;
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const containerStyle = item.fromSelf
      ? [styles.messageRow, styles.messageRowRight]
      : [styles.messageRow, styles.messageRowLeft];

    const bubbleStyle = item.fromSelf
      ? [styles.bubble, styles.bubbleSelf]
      : [styles.bubble, styles.bubbleOther];

    const textStyle = item.fromSelf
      ? [styles.textMessage, styles.textMessageSelf]
      : [styles.textMessage, styles.textMessageOther];

    const time = formatTime(item.createdAt);

    return (
      <View style={containerStyle}>
        <View style={bubbleStyle}>
          {!item.fromSelf && <Text style={styles.username}>{item.username}</Text>}
          <Text style={textStyle}>{item.text}</Text>
          {time ? <Text style={[styles.timeText, item.fromSelf ? styles.timeTextRight : styles.timeTextLeft]}>{time}</Text> : null}
        </View>
      </View>
    );
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screenBg}>
          <View style={styles.chatCard}>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Support Chat</Text>
              </View>
            </View>
            <View style={[styles.messagesContainer, { justifyContent: "center", alignItems: "center" }]}>
              <Text style={{ color: "#6B7280" }}>Please sign in to use live chat.</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.screenBg}>
          <View style={styles.chatCard}>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View>
                  <Text style={styles.headerTitle}>Support Chat</Text>
                  <Text style={styles.headerSubtitle}>{isConnected ? "Online • Usually replies in minutes" : "Offline"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.messagesContainer}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (!initialScrolledRef.current && messages.length) {
                    flatListRef.current?.scrollToEnd({ animated: false });
                    initialScrolledRef.current = true;
                    atBottomRef.current = true;
                  }
                }}
                onScroll={(e) => {
                  const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                  const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
                  atBottomRef.current = distanceFromBottom < 40;
                  if (contentOffset.y < 20 && !fetchingRef.current) {
                    loadOlder();
                  }
                }}
                scrollEventThrottle={16}
                ListFooterComponent={loading ? <Text style={styles.loadingText}>Loading�</Text> : null}
              />
            </View>

            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Type your message..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },
  screenBg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  chatCard: {
    width: "100%",
    maxWidth: 400,
    height: "98%",
    backgroundColor: "#F9FAFB",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#E5E7EB",
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  messagesContent: {
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  messageRowRight: {
    justifyContent: "flex-end",
    paddingTop: 1,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: "center",
  },
  bubbleSelf: {
    backgroundColor: "#8B5CF6",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  username: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
  },
  textMessage: {
    fontSize: 14,
    textAlign: "left",
  },
  textMessageSelf: {
    color: "#F9FAFB",
  },
  textMessageOther: {
    color: "#111827",
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
  },
  timeTextLeft: {
    alignSelf: "flex-start",
  },
  timeTextRight: {
    alignSelf: "flex-end",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    color: "#111827",
    fontSize: 14,
  },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  loadingText: {
    textAlign: "center",
    color: "#6B7280",
    paddingVertical: 8,
  },
});

