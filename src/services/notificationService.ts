import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { NotificationItem } from '../types/database';
import { INITIAL_NOTIFICATIONS } from './mockDataStore';

let localNotifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];
let listeners: Array<(notifications: NotificationItem[]) => void> = [];

export const subscribeNotificationChanges = (callback: (notifications: NotificationItem[]) => void) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
};

const notifySubscribers = () => {
  listeners.forEach(fn => fn([...localNotifications]));
};

export const notificationService = {
  async getNotifications(recipientId: string): Promise<NotificationItem[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', recipientId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as NotificationItem[];
      }
    }

    return localNotifications
      .filter(n => n.recipient_id === recipientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
    }

    const item = localNotifications.find(n => n.id === notificationId);
    if (item) {
      item.is_read = true;
      item.read_at = new Date().toISOString();
      notifySubscribers();
    }
    return true;
  },

  async markAllAsRead(recipientId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', recipientId);
    }

    localNotifications.forEach(n => {
      if (n.recipient_id === recipientId) {
        n.is_read = true;
        n.read_at = new Date().toISOString();
      }
    });
    notifySubscribers();
    return true;
  },

  async createNotification(item: Omit<NotificationItem, 'id' | 'is_read' | 'created_at'>): Promise<NotificationItem> {
    const newItem: NotificationItem = {
      ...item,
      id: 'n-' + Math.random().toString(36).substring(2, 9),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      await supabase.from('notifications').insert([newItem]);
    }

    localNotifications.unshift(newItem);
    notifySubscribers();
    return newItem;
  },
};
