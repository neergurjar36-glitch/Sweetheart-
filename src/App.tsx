import React, { useState, useEffect } from 'react';
import {
  auth,
  db,
  testConnection,
  logOut,
} from './lib/firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { UserProfile, Connection, LastSnap, Message, CallSession, AppTheme } from './types';
import { safeSaveSnapToLocalStorage } from './lib/storage';
import {
  saveSnapToDb,
  getAllSnapsFromDb,
  deleteSnapFromDb,
  saveSnapsListToDb,
} from './lib/snapGalleryDb';
import { AuthScreens, PROFILE_NEER, PROFILE_ANNU } from './components/auth/AuthScreens';
import { ConnectionSetup } from './components/connection/ConnectionSetup';
import { LastSnapHome } from './components/snap/LastSnapHome';
import { CameraModal } from './components/snap/CameraModal';
import { SnapGalleryModal } from './components/snap/SnapGalleryModal';
import { ChatScreen } from './components/chat/ChatScreen';
import { VideoCallModal } from './components/call/VideoCallModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { presenceService } from './services/presenceService';
import { notificationService, AppNotification } from './services/notificationService';
import { Heart, X, Sparkles } from 'lucide-react';

const getInitialConnectionCreatedAt = (): string => {
  const saved = localStorage.getItem('sweetheart_connection_created_at') || localStorage.getItem('sweetheart_anniversary_date');
  if (saved) return saved;
  // Established romantic relationship milestone (~142 days ago)
  const defaultDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 142).toISOString();
  try {
    localStorage.setItem('sweetheart_connection_created_at', defaultDate);
    localStorage.setItem('sweetheart_anniversary_date', defaultDate);
  } catch {}
  return defaultDate;
};

const SHARED_CONNECTION: Connection = {
  id: 'neer_annu_sweetheart',
  code: 'SW-NEER-ANNU',
  user1Id: PROFILE_NEER.id,
  user2Id: PROFILE_ANNU.id,
  status: 'connected',
  createdAt: getInitialConnectionCreatedAt(),
  connectedAt: getInitialConnectionCreatedAt(),
};

const INITIAL_LAST_SNAP: LastSnap = {
  connectionId: 'neer_annu_sweetheart',
  snapId: 'snap_annu_special',
  senderId: PROFILE_ANNU.id,
  receiverId: PROFILE_NEER.id,
  imageUrl: '/sweetheart-logo.jpg',
  caption: 'Designed for you with love ❤️',
  createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
};

const INITIAL_GALLERY_SNAPS: LastSnap[] = [
  INITIAL_LAST_SNAP,
  {
    connectionId: 'neer_annu_sweetheart',
    snapId: 'snap_neer_morning',
    senderId: PROFILE_NEER.id,
    receiverId: PROFILE_ANNU.id,
    imageUrl: '/neer-profile.jpg',
    caption: 'Thinking of you always ✨',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('sweetheart_active_user');
    if (saved === 'user_annu') return PROFILE_ANNU;
    if (saved === 'user_neer') return PROFILE_NEER;
    return null;
  });

  const [partner, setPartner] = useState<UserProfile | null>(() => {
    return currentUser?.id === PROFILE_NEER.id ? PROFILE_ANNU : PROFILE_NEER;
  });

  const [connection, setConnection] = useState<Connection | null>(SHARED_CONNECTION);
  const [lastSnap, setLastSnap] = useState<LastSnap | null>(() => {
    const saved = localStorage.getItem('sweetheart_last_snap');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_LAST_SNAP;
  });

  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [isCallingPartner, setIsCallingPartner] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'home' | 'chat' | 'camera' | 'settings' | 'gallery'>('home');
  const [gallerySnaps, setGallerySnaps] = useState<LastSnap[]>(() => {
    const saved = localStorage.getItem('sweetheart_snap_gallery');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_GALLERY_SNAPS;
  });
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('sweetheart_theme') as AppTheme) || 'dark';
  });

  // Neer & Annu Messages Store
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('sweetheart_chat_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'msg_1',
        connectionId: 'neer_annu_sweetheart',
        senderId: PROFILE_ANNU.id,
        receiverId: PROFILE_NEER.id,
        text: 'Hey Neer! Designed for you with love ❤️',
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        status: 'seen',
      },
      {
        id: 'msg_2',
        connectionId: 'neer_annu_sweetheart',
        senderId: PROFILE_NEER.id,
        receiverId: PROFILE_ANNU.id,
        text: 'Annu! Seeing your picture made my whole day brighter ✨',
        createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        status: 'seen',
      },
    ];
  });

  // Save messages to local persistence
  useEffect(() => {
    localStorage.setItem('sweetheart_chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Save lastSnap to persistence with quota safety
  useEffect(() => {
    if (lastSnap) {
      safeSaveSnapToLocalStorage('sweetheart_last_snap', lastSnap);
    }
  }, [lastSnap]);

  // Load and merge all past snaps from IndexedDB on startup
  useEffect(() => {
    getAllSnapsFromDb().then((dbSnaps) => {
      if (dbSnaps && dbSnaps.length > 0) {
        setGallerySnaps((prev) => {
          const map = new Map<string, LastSnap>();
          [...dbSnaps, ...prev].forEach((s) => {
            if (s && s.snapId) map.set(s.snapId, s);
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          safeSaveSnapToLocalStorage('sweetheart_snap_gallery', merged.slice(0, 50));
          return merged;
        });
      } else {
        saveSnapsListToDb(INITIAL_GALLERY_SNAPS);
      }
    });
  }, []);

  // Save gallerySnaps to persistence with quota safety (keeps latest 50 in localStorage)
  useEffect(() => {
    if (gallerySnaps && gallerySnaps.length > 0) {
      safeSaveSnapToLocalStorage('sweetheart_snap_gallery', gallerySnaps.slice(0, 50));
    }
  }, [gallerySnaps]);

  // Real-time snap synchronization across tabs
  useEffect(() => {
    const handleSnapUpdated = (e: any) => {
      const snap = e.detail;
      if (snap) {
        setLastSnap(snap);
        saveSnapToDb(snap);
        setGallerySnaps((prev) => {
          if (prev.some((s) => s.snapId === snap.snapId)) return prev;
          const updated = [snap, ...prev];
          safeSaveSnapToLocalStorage('sweetheart_snap_gallery', updated.slice(0, 50));
          return updated;
        });
      }
    };

    window.addEventListener('sweetheart_last_snap_updated', handleSnapUpdated);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('sweetheart_sync_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SNAP_SENT' && event.data?.snap) {
            const incomingSnap = event.data.snap;
            setLastSnap(incomingSnap);
            saveSnapToDb(incomingSnap);
            setGallerySnaps((prev) => {
              if (prev.some((s) => s.snapId === incomingSnap.snapId)) return prev;
              const updated = [incomingSnap, ...prev];
              safeSaveSnapToLocalStorage('sweetheart_snap_gallery', updated.slice(0, 50));
              return updated;
            });
            if (currentUser && incomingSnap.receiverId === currentUser.id) {
              notificationService.notifySnap(partner?.displayName || 'Your Sweetheart');
            }
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel init warning:', err);
      }
    }

    return () => {
      window.removeEventListener('sweetheart_last_snap_updated', handleSnapUpdated);
      if (bc) bc.close();
    };
  }, [currentUser?.id, partner?.displayName]);

  // Keep partner in sync when current user changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sweetheart_active_user', currentUser.id);
      setPartner(currentUser.id === PROFILE_NEER.id ? PROFILE_ANNU : PROFILE_NEER);
      setConnection(SHARED_CONNECTION);
    } else {
      localStorage.removeItem('sweetheart_active_user');
      setPartner(null);
    }
  }, [currentUser]);

  // Synchronize Annu's custom photo when updated
  useEffect(() => {
    const handleCustomLogo = (e: any) => {
      const newImg = e.detail || localStorage.getItem('sweetheart_custom_logo');
      if (newImg) {
        PROFILE_ANNU.photoUrl = newImg;
        if (currentUser?.id === PROFILE_ANNU.id) {
          setCurrentUser((prev) => (prev ? { ...prev, photoUrl: newImg } : null));
        }
        if (partner?.id === PROFILE_ANNU.id) {
          setPartner((prev) => (prev ? { ...prev, photoUrl: newImg } : null));
        }
        setLastSnap((prev) => {
          if (!prev || prev.senderId === PROFILE_ANNU.id) {
            return {
              ...(prev || INITIAL_LAST_SNAP),
              imageUrl: newImg,
            };
          }
          return prev;
        });
      }
    };

    // Check if custom logo already exists on boot
    const existingLogo = localStorage.getItem('sweetheart_custom_logo');
    if (existingLogo) {
      handleCustomLogo({ detail: existingLogo });
    }

    window.addEventListener('sweetheart_logo_updated', handleCustomLogo);
    return () => window.removeEventListener('sweetheart_logo_updated', handleCustomLogo);
  }, [currentUser?.id, partner?.id]);

  // Synchronize Neer's custom photo when updated
  useEffect(() => {
    const handleNeerDp = (e: any) => {
      const newImg = e.detail || localStorage.getItem('sweetheart_neer_dp');
      if (newImg) {
        PROFILE_NEER.photoUrl = newImg;
        if (currentUser?.id === PROFILE_NEER.id) {
          setCurrentUser((prev) => (prev ? { ...prev, photoUrl: newImg } : null));
        }
        if (partner?.id === PROFILE_NEER.id) {
          setPartner((prev) => (prev ? { ...prev, photoUrl: newImg } : null));
        }
      }
    };

    const existingNeerDp = localStorage.getItem('sweetheart_neer_dp');
    if (existingNeerDp) {
      handleNeerDp({ detail: existingNeerDp });
    }

    window.addEventListener('sweetheart_neer_dp_updated', handleNeerDp);
    return () => window.removeEventListener('sweetheart_neer_dp_updated', handleNeerDp);
  }, [currentUser?.id, partner?.id]);

  // Boot connection check
  useEffect(() => {
    testConnection();
  }, []);

  // Theme Sync
  useEffect(() => {
    localStorage.setItem('sweetheart_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Toast subscription
  useEffect(() => {
    const unsub = notificationService.subscribe((toast) => {
      setActiveToast(toast);
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    });
    return unsub;
  }, []);

  // One-click profile selector for Neer and Annu
  const handleSelectProfile = (profile: UserProfile) => {
    setCurrentUser(profile);
    setPartner(profile.id === PROFILE_NEER.id ? PROFILE_ANNU : PROFILE_NEER);
    setConnection(SHARED_CONNECTION);
  };

  // Switch between Neer and Annu
  const handleSwitchUser = () => {
    if (!currentUser) return;
    const nextUser = currentUser.id === PROFILE_NEER.id ? PROFILE_ANNU : PROFILE_NEER;
    handleSelectProfile(nextUser);
  };

  // Save Snap when taken
  const handleSaveSnap = (newSnap: LastSnap) => {
    setLastSnap(newSnap);
    safeSaveSnapToLocalStorage('sweetheart_last_snap', newSnap);
    setGallerySnaps((prev) => {
      const filtered = prev.filter((s) => s.snapId !== newSnap.snapId);
      const updated = [newSnap, ...filtered];
      safeSaveSnapToLocalStorage('sweetheart_snap_gallery', updated.slice(0, 50));
      return updated;
    });
    saveSnapToDb(newSnap);
  };

  // Delete individual snap from Gallery
  const handleDeleteSnap = (snapId: string) => {
    setGallerySnaps((prev) => {
      const updated = prev.filter((s) => s.snapId !== snapId);
      safeSaveSnapToLocalStorage('sweetheart_snap_gallery', updated.slice(0, 50));
      return updated;
    });
    deleteSnapFromDb(snapId);
    setLastSnap((prev) => {
      if (prev?.snapId === snapId) {
        const remaining = gallerySnaps.filter((s) => s.snapId !== snapId);
        const nextSnap = remaining[0] || null;
        if (nextSnap) {
          safeSaveSnapToLocalStorage('sweetheart_last_snap', nextSnap);
        } else {
          localStorage.removeItem('sweetheart_last_snap');
        }
        return nextSnap;
      }
      return prev;
    });
  };

  // Send Chat message
  const handleSendMessage = (text: string) => {
    if (!currentUser || !partner) return;
    const newMsg: Message = {
      id: `m_${Date.now()}`,
      connectionId: 'neer_annu_sweetheart',
      senderId: currentUser.id,
      receiverId: partner.id,
      text,
      createdAt: new Date().toISOString(),
      status: 'delivered',
    };
    setMessages((prev) => [...prev, newMsg]);
    notificationService.notifyMessage(currentUser.displayName, text);
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setPartner(null);
    setActiveScreen('home');
    localStorage.removeItem('sweetheart_active_user');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-4 bg-zinc-950 transition-colors">
      <div className="mobile-app-container relative">
        {/* Floating Notification Toast */}
        {activeToast && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
            <div className="p-3.5 rounded-2xl bg-zinc-900/95 border border-rose-500/30 text-white shadow-2xl backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                </div>
                <div>
                  <h5 className="text-xs font-semibold leading-tight">{activeToast.title}</h5>
                  <p className="text-xs text-zinc-300 leading-snug">{activeToast.body}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveToast(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Neer ❤️ Annu Quick Switch Header Pill */}
        {currentUser && (
          <div className="bg-rose-500/15 border-b border-rose-500/25 px-4 py-1.5 flex items-center justify-between text-xs text-rose-300 z-30 shrink-0">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Viewing as <strong>{currentUser.displayName}</strong></span>
            </div>
            <button
              onClick={handleSwitchUser}
              className="px-2.5 py-0.5 rounded-full bg-rose-500/25 hover:bg-rose-500/35 text-white text-[11px] font-semibold border border-rose-500/40 cursor-pointer active:scale-95 transition"
            >
              Switch to {partner?.displayName} ⇄
            </button>
          </div>
        )}

        {/* 1. AUTH SCREEN: Log in as Neer / Log in as Annu */}
        {!currentUser ? (
          <AuthScreens
            onAuthenticated={handleSelectProfile}
            onSelectProfile={handleSelectProfile}
          />
        ) : (
          /* 2. THE SANCTUARY: LAST SNAP HOME SCREEN */
          <>
            <LastSnapHome
              currentUser={currentUser}
              partner={partner}
              connection={connection || SHARED_CONNECTION}
              lastSnap={lastSnap}
              theme={theme}
              unreadCount={unreadMessages}
              galleryCount={gallerySnaps.length}
              onOpenChat={() => setActiveScreen('chat')}
              onOpenSnapCamera={() => setActiveScreen('camera')}
              onOpenGallery={() => setActiveScreen('gallery')}
              onStartVideoCall={() => setIsCallingPartner(true)}
              onOpenSettings={() => setActiveScreen('settings')}
              onToggleTheme={toggleTheme}
              onSwitchTestUser={handleSwitchUser}
            />

            {/* Chat Screen */}
            {activeScreen === 'chat' && (
              <div className="absolute inset-0 z-40 bg-zinc-950">
                <ChatScreen
                  currentUser={currentUser}
                  partner={partner}
                  connection={connection || SHARED_CONNECTION}
                  theme={theme}
                  onBack={() => setActiveScreen('home')}
                  onOpenSnapCamera={() => setActiveScreen('camera')}
                  onStartVideoCall={() => setIsCallingPartner(true)}
                  sandboxMessages={messages}
                  onSandboxSendMessage={handleSendMessage}
                  onSandboxDeleteMessage={handleDeleteMessage}
                />
              </div>
            )}

            {/* Camera / Snap Modal */}
            {activeScreen === 'camera' && (
              <CameraModal
                currentUser={currentUser}
                partner={partner}
                connection={connection || SHARED_CONNECTION}
                onClose={() => setActiveScreen('home')}
                onCustomSaveSnap={handleSaveSnap}
              />
            )}

            {/* Snap Gallery Modal */}
            {activeScreen === 'gallery' && (
              <SnapGalleryModal
                currentUser={currentUser}
                partner={partner}
                snaps={gallerySnaps}
                theme={theme}
                onClose={() => setActiveScreen('home')}
                onOpenSnapCamera={() => setActiveScreen('camera')}
                onDeleteSnap={handleDeleteSnap}
              />
            )}

            {/* Settings Modal */}
            {activeScreen === 'settings' && (
              <SettingsModal
                currentUser={currentUser}
                partner={partner}
                connection={connection || SHARED_CONNECTION}
                theme={theme}
                onToggleTheme={toggleTheme}
                onDisconnect={handleSignOut}
                onSignOut={handleSignOut}
                onClose={() => setActiveScreen('home')}
              />
            )}

            {/* Video Call Modal */}
            {(incomingCall || isCallingPartner) && (
              <VideoCallModal
                currentUser={currentUser}
                partner={partner}
                connection={connection || SHARED_CONNECTION}
                incomingCall={incomingCall}
                isCaller={isCallingPartner}
                onClose={() => {
                  setIncomingCall(null);
                  setIsCallingPartner(false);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
