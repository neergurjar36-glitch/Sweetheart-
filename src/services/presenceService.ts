import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export class PresenceService {
  private userId: string | null = null;
  private intervalId: any = null;

  public init(userId: string) {
    this.userId = userId;
    this.setOnline(true);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        this.setOnline(true);
      } else {
        this.setOnline(false);
      }
    };

    const handleBeforeUnload = () => {
      this.setOnline(false);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat every 60 seconds
    this.intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && this.userId) {
        this.setOnline(true);
      }
    }, 60000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (this.intervalId) clearInterval(this.intervalId);
      this.setOnline(false);
    };
  }

  public async setOnline(isOnline: boolean) {
    if (!this.userId) return;
    const userRef = doc(db, 'users', this.userId);
    try {
      await updateDoc(userRef, {
        isOnline,
        lastSeen: new Date().toISOString(),
      });
    } catch (e) {
      // Don't crash app on presence update failure
      console.warn('Presence update failed:', e);
    }
  }
}

export const presenceService = new PresenceService();
