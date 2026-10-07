/**
 * Notification Service for Sweetheart
 * 
 * Rules strictly followed:
 * - Push notification for Snap: "[Partner Name] sent you a Snap ❤️"
 * - Push notification for Message: "[Partner Name] sent you a message"
 * - Push notification for Call: "[Partner Name] is calling you 📹"
 * - IMPORTANT PRIVACY RULE: Do NOT display private Snap images in push notifications.
 */

export interface AppNotification {
  id: string;
  type: 'snap' | 'message' | 'call';
  title: string;
  body: string;
  timestamp: number;
}

class NotificationService {
  private listeners: ((notification: AppNotification) => void)[] = [];

  constructor() {
    // Check permission if in browser
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // Will prompt when user connects or enables
      }
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch (e) {
      console.warn('Notification permission error:', e);
      return false;
    }
  }

  public notifySnap(partnerName: string) {
    this.send({
      type: 'snap',
      title: 'Sweetheart ❤️',
      body: `${partnerName} sent you a Snap ❤️`,
    });
  }

  public notifyMessage(partnerName: string, textSnippet?: string) {
    this.send({
      type: 'message',
      title: 'Sweetheart 💬',
      body: `${partnerName} sent you a message`,
    });
  }

  public notifyIncomingCall(partnerName: string) {
    this.send({
      type: 'call',
      title: 'Sweetheart 📹',
      body: `${partnerName} is calling you 📹`,
    });
  }

  public notifyToast(title: string, body: string) {
    this.send({
      type: 'snap',
      title,
      body,
    });
  }

  private send(item: Omit<AppNotification, 'id' | 'timestamp'>) {
    const notification: AppNotification = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };

    // 1. Notify in-app subscribers
    this.listeners.forEach((cb) => cb(notification));

    // 2. Play soft haptic / vibration if available on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }

    // 3. Native system notification (if backgrounded or permitted)
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(notification.title, {
          body: notification.body,
          icon: '/favicon.ico',
          // Notice: NO snap image preview included here for user privacy
          tag: notification.type,
        });
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }
  }

  public subscribe(cb: (notification: AppNotification) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }
}

export const notificationService = new NotificationService();
