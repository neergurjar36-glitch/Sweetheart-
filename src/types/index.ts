export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string;
  connectionId?: string | null;
  partnerId?: string | null;
  createdAt: string;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface Connection {
  id: string;
  code: string;
  user1Id: string;
  user2Id: string | null;
  status: 'waiting' | 'connected' | 'disconnected';
  createdAt: string;
  connectedAt?: string;
}

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen';
  seenAt?: string;
}

export interface Snap {
  id: string;
  connectionId: string;
  senderId: string;
  receiverId: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  seenAt?: string;
}

export interface LastSnap {
  connectionId: string;
  snapId: string;
  senderId: string;
  receiverId: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  seenAt?: string;
}

export interface CallSession {
  connectionId: string;
  callerId: string;
  receiverId: string;
  callerName: string;
  callerPhoto?: string;
  status: 'idle' | 'calling' | 'connected' | 'ended' | 'declined';
  offer?: string;
  answer?: string;
  callerCandidates?: string;
  receiverCandidates?: string;
  updatedAt: string;
}

export type ActiveTab = 'last_snap' | 'chat' | 'camera' | 'settings';
export type AppTheme = 'dark' | 'light';
