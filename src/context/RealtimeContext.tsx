import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, checkSupabaseConnection } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { NotificationItem, QueueEntry } from '../types/database';
import { notificationService, subscribeNotificationChanges } from '../services/notificationService';
import { subscribeLocalQueue } from '../services/queueService';

interface RealtimeContextType {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'local_fallback';
  lastPingMs: number;
  notifications: NotificationItem[];
  unreadCount: number;
  recentQueueEvent: QueueEntry | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  pushPermissionStatus: NotificationPermission;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'local_fallback'>('connecting');
  const [lastPingMs, setLastPingMs] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentQueueEvent, setRecentQueueEvent] = useState<QueueEntry | null>(null);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission>('default');

  // Check browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPushPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const res = await Notification.requestPermission();
      setPushPermissionStatus(res);
      return res === 'granted';
    } catch (e) {
      return false;
    }
  };

  const showSystemNotification = (title: string, message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/vite.svg',
        });
      } catch (e) {
        console.warn('System notification error:', e);
      }
    }
  };

  // Load notifications for user
  const loadUserNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const list = await notificationService.getNotifications(user.id);
    setNotifications(list);
  }, [user]);

  useEffect(() => {
    loadUserNotifications();
  }, [loadUserNotifications]);

  // Subscribe to notification updates from service
  useEffect(() => {
    const unsub = subscribeNotificationChanges((updated) => {
      if (user) {
        const filtered = updated.filter(n => n.recipient_id === user.id);
        setNotifications(filtered);
      }
    });
    return unsub;
  }, [user]);

  // Subscribe to queue change notifications
  useEffect(() => {
    const unsub = subscribeLocalQueue(() => {
      // Refresh local notifications
      if (user) {
        loadUserNotifications();
      }
    });
    return unsub;
  }, [user, loadUserNotifications]);

  // Setup Supabase Realtime channel or fallback check
  useEffect(() => {
    let isMounted = true;

    const setupConnection = async () => {
      if (!isSupabaseConfigured()) {
        if (isMounted) {
          setConnectionStatus('local_fallback');
          setLastPingMs(5);
        }
        return;
      }

      setConnectionStatus('connecting');
      const health = await checkSupabaseConnection();

      if (!isMounted) return;

      if (!health.connected) {
        setConnectionStatus('local_fallback');
        setLastPingMs(0);
      } else {
        setConnectionStatus('connected');
        setLastPingMs(health.latency);

        // Setup real-time channel
        const channel = supabase
          .channel('hospital_queue_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'queue_entries' },
            (payload) => {
              if (payload.new) {
                const entry = payload.new as QueueEntry;
                setRecentQueueEvent(entry);

                // If called or recalled, play chime / trigger push
                if (['called', 'recalled'].includes(entry.status)) {
                  showSystemNotification(`Queue Announcement: Token ${entry.token_number}`, `Proceed to ${entry.counter_or_room || 'Consultation Room'}`);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
              if (payload.new && user && payload.new.recipient_id === user.id) {
                const newNotif = payload.new as NotificationItem;
                setNotifications(prev => [newNotif, ...prev]);
                showSystemNotification(newNotif.title, newNotif.message);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    setupConnection();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <RealtimeContext.Provider
      value={{
        connectionStatus,
        lastPingMs,
        notifications,
        unreadCount,
        recentQueueEvent,
        markAsRead,
        markAllAsRead,
        requestPushPermission,
        pushPermissionStatus,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
