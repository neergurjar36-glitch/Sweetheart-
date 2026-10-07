import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Camera,
  Video,
  Images,
  Settings,
  Sparkles,
  Maximize2,
  X,
  Clock,
  CheckCheck,
  Check,
  Sun,
  Moon,
  Users,
  Calendar,
} from 'lucide-react';
import { SweetheartLogo } from '../common/SweetheartLogo';
import { UserProfile, LastSnap, Connection, AppTheme } from '../../types';

interface LastSnapHomeProps {
  currentUser: UserProfile;
  partner: UserProfile | null;
  connection: Connection;
  lastSnap: LastSnap | null;
  theme: AppTheme;
  unreadCount?: number;
  galleryCount?: number;
  onOpenChat: () => void;
  onOpenSnapCamera: () => void;
  onOpenGallery: () => void;
  onStartVideoCall?: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onSwitchTestUser?: () => void;
}

export const LastSnapHome: React.FC<LastSnapHomeProps> = ({
  currentUser,
  partner,
  connection,
  lastSnap,
  theme,
  unreadCount = 0,
  galleryCount = 0,
  onOpenChat,
  onOpenSnapCamera,
  onOpenGallery,
  onStartVideoCall,
  onOpenSettings,
  onToggleTheme,
  onSwitchTestUser,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [heartFlutterActive, setHeartFlutterActive] = useState(false);
  const [showAnniversaryModal, setShowAnniversaryModal] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [customAnniversaryDate, setCustomAnniversaryDate] = useState<string>(() => {
    return (
      localStorage.getItem('sweetheart_anniversary_date') ||
      localStorage.getItem('sweetheart_connection_created_at') ||
      connection?.createdAt ||
      connection?.connectedAt ||
      ''
    );
  });
  const [newDateValue, setNewDateValue] = useState<string>('');

  // Calculate anniversary metrics since connection creation
  const getAnniversaryMetrics = () => {
    const dateStr =
      customAnniversaryDate || connection?.createdAt || connection?.connectedAt;
    let startDate = dateStr
      ? new Date(dateStr)
      : new Date(Date.now() - 1000 * 60 * 60 * 24 * 142);
    if (isNaN(startDate.getTime())) {
      startDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 142);
    }
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - startDate.getTime());
    const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const months = Math.floor(days / 30.4375);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const formattedStart = startDate.toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const rawDate = startDate.toISOString().split('T')[0];

    return {
      days,
      months,
      hours,
      formattedStart,
      rawDate,
    };
  };

  const anniversaryMetrics = getAnniversaryMetrics();

  const handleSaveCustomDate = (dateVal: string) => {
    if (!dateVal) return;
    try {
      const iso = new Date(dateVal).toISOString();
      localStorage.setItem('sweetheart_anniversary_date', iso);
      localStorage.setItem('sweetheart_connection_created_at', iso);
      setCustomAnniversaryDate(iso);
      setIsEditingDate(false);
    } catch (e) {
      console.warn('Date save error:', e);
    }
  };

  // Trigger subtle romantic heart-flutter animation when viewing partner's latest Snap for the first time
  React.useEffect(() => {
    if (lastSnap?.imageUrl && lastSnap.snapId) {
      const isFromPartnerSnap = lastSnap.senderId !== currentUser.id;
      const snapKey = `sweetheart_flutter_seen_${currentUser.id}_${lastSnap.snapId}`;
      const alreadyFluttered = sessionStorage.getItem(snapKey);

      if (isFromPartnerSnap && !alreadyFluttered) {
        sessionStorage.setItem(snapKey, 'true');
        setHeartFlutterActive(true);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([40, 50, 40]);
          } catch {}
        }

        const timer = setTimeout(() => {
          setHeartFlutterActive(false);
        }, 3200);
        return () => clearTimeout(timer);
      }
    }
  }, [lastSnap?.snapId, lastSnap?.imageUrl, currentUser.id]);

  // Format timestamp nicely
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleDoubleTapSnap = () => {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 900);
  };

  const isDarkMode = theme === 'dark';
  const partnerName = partner?.displayName || 'Your Sweetheart';
  const partnerAvatar =
    partner?.photoUrl ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${partner?.id || 'partner'}`;

  // Has this user received a snap from the partner?
  // Note: If lastSnap exists, check who sent it.
  // The heart of the app is "The last Snap sent by the other person".
  const hasPartnerSnap = lastSnap && lastSnap.imageUrl;
  const isFromPartner = lastSnap?.senderId !== currentUser.id;

  return (
    <div
      className={`flex-1 flex flex-col justify-between h-full select-none transition-colors duration-300 ${
        isDarkMode
          ? 'bg-zinc-950 text-white'
          : 'bg-gradient-to-b from-rose-50/70 via-white to-pink-50/50 text-zinc-900'
      }`}
    >
      {/* 1. TOP HEADER & PARTNER PROFILE */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between z-10 shrink-0">
        {/* App Logo Placeholder */}
        <div className="flex items-center gap-3">
          <SweetheartLogo variant="header" size="sm" showText={true} />
        </div>

        {/* Quick Top Controls (Settings, Theme, Dev Switcher) */}
        <div className="flex items-center gap-2">
          {onSwitchTestUser && (
            <button
              onClick={onSwitchTestUser}
              title="Quick test switch to partner"
              className={`p-2 rounded-full text-xs flex items-center gap-1 transition ${
                isDarkMode
                  ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20'
                  : 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono text-[10px]">Switch User</span>
            </button>
          )}

          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className={`p-2 rounded-full transition ${
              isDarkMode
                ? 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/5'
                : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200 shadow-sm'
            }`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Open settings"
            className={`p-2 rounded-full transition ${
              isDarkMode
                ? 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/5'
                : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200 shadow-sm'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* PARTNER STATUS BAR */}
      <div className="px-5 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-rose-500/40 p-0.5 bg-zinc-800"
            />
            {/* Online status indicator */}
            <span
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 ${
                isDarkMode ? 'border-zinc-950' : 'border-white'
              } ${partner?.isOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm tracking-tight">{partnerName}</h2>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            </div>
            <p className="text-[11px] flex items-center gap-1 text-zinc-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  partner?.isOnline ? 'bg-emerald-500' : 'bg-zinc-500'
                }`}
              />
              <span>
                {partner?.isOnline
                  ? 'Online now'
                  : partner?.lastSeen
                  ? `Last seen ${formatTimeAgo(partner.lastSeen)}`
                  : 'Offline'}
              </span>
            </p>
          </div>
        </div>

        {/* Small live connection indicator */}
        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider flex items-center gap-1.5 ${
            isDarkMode
              ? 'bg-zinc-900/90 text-rose-300/80 border border-rose-500/20'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>CONNECTED</span>
        </div>
      </div>

      {/* 2. CENTER STAGE: THE LAST SNAP (THE HEART OF THE APP) */}
      <main className="flex-1 px-5 py-2 flex flex-col justify-center items-center min-h-0">
        {hasPartnerSnap ? (
          <div className="w-full max-w-sm h-full max-h-[58vh] flex flex-col justify-center">
            {/* Snap Card Container with Heart Flutter Aura */}
            <div
              onClick={handleDoubleTapSnap}
              className={`relative w-full h-full rounded-3xl overflow-hidden cursor-pointer group shadow-2xl transition-all duration-500 ${
                heartFlutterActive
                  ? 'ring-4 ring-rose-400/60 shadow-rose-500/40 animate-card-shimmer'
                  : ''
              } ${
                isDarkMode
                  ? 'bg-zinc-900 border border-white/10 shadow-rose-950/20'
                  : 'bg-white border border-rose-100 shadow-rose-200/40'
              }`}
            >
              {/* Actual Snap Image */}
              <img
                src={lastSnap.imageUrl}
                alt="Last Snap"
                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-[1.02]"
                loading="eager"
              />

              {/* Romantic Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />

              {/* Subtle Romantic Heart-Flutter Animation (First-Time View) */}
              {heartFlutterActive && (
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex flex-col justify-end items-center pb-12">
                  {/* Floating flutter hearts cluster */}
                  {[
                    { left: '20%', delay: '0ms', size: 'w-5 h-5', color: '#f43f5e', duration: '2.5s' },
                    { left: '35%', delay: '200ms', size: 'w-4 h-4', color: '#fb7185', duration: '2.8s' },
                    { left: '50%', delay: '400ms', size: 'w-6 h-6', color: '#fda4af', duration: '2.6s' },
                    { left: '65%', delay: '650ms', size: 'w-5 h-5', color: '#f43f5e', duration: '2.9s' },
                    { left: '80%', delay: '900ms', size: 'w-4 h-4', color: '#fb7185', duration: '2.4s' },
                    { left: '28%', delay: '1150ms', size: 'w-5 h-5', color: '#fda4af', duration: '2.7s' },
                    { left: '58%', delay: '1400ms', size: 'w-4 h-4', color: '#f43f5e', duration: '2.8s' },
                  ].map((h, i) => (
                    <div
                      key={i}
                      className="absolute bottom-16 animate-heart-flutter"
                      style={{
                        left: h.left,
                        animationDelay: h.delay,
                        animationDuration: h.duration,
                      }}
                    >
                      <Heart
                        className={`${h.size} fill-current`}
                        style={{ color: h.color, filter: 'drop-shadow(0 2px 8px rgba(244,63,94,0.7))' }}
                      />
                    </div>
                  ))}

                  {/* Gentle romantic flutter pill badge */}
                  <div className="mb-4 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-rose-400/40 text-rose-200 text-xs font-serif italic shadow-xl shadow-rose-500/20 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-500">
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-400 animate-heart-pulse" />
                    <span>{partnerName}'s heart is with you</span>
                  </div>
                </div>
              )}

              {/* Top Card Badge: Who sent it and when */}
              <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeartFlutterActive(true);
                    setTimeout(() => setHeartFlutterActive(false), 3200);
                  }}
                  className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-xs text-white hover:bg-black/70 hover:border-rose-400/30 transition group/badge"
                  title="Replay heart flutter"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-400 group-hover/badge:scale-110 transition-transform" />
                  <span className="font-medium tracking-tight">
                    {isFromPartner ? `From ${partnerName}` : 'Sent by You'}
                  </span>
                  <Heart className="w-3 h-3 text-rose-400 fill-rose-500/40 group-hover/badge:fill-rose-500 ml-0.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullScreen(true);
                  }}
                  className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white border border-white/10 active:scale-95 transition"
                  title="View full screen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Double-tap heart splash animation */}
              {heartAnim && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <Heart className="w-24 h-24 text-rose-500 fill-rose-500 animate-heart-pulse drop-shadow-2xl" />
                </div>
              )}

              {/* Bottom Card Content: Caption & Received Timestamp */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 text-white space-y-1.5">
                {lastSnap.caption && (
                  <p className="text-sm font-medium leading-snug drop-shadow-md text-white/95 line-clamp-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                    {lastSnap.caption}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-zinc-300 px-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-400" />
                    <span>{isFromPartner ? 'Received ' : 'Sent '}{formatTimeAgo(lastSnap.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-rose-300 font-mono text-[10px]">
                    <CheckCheck className="w-3.5 h-3.5 text-rose-400" />
                    <span>LATEST SNAP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* NO SNAP EMPTY STATE */
          <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center text-center p-6 space-y-5">
            <div className="relative">
              <div
                className={`w-28 h-28 rounded-3xl flex items-center justify-center transition-all ${
                  isDarkMode
                    ? 'bg-rose-500/10 border border-rose-500/20 shadow-2xl shadow-rose-500/10'
                    : 'bg-rose-100/70 border border-rose-200 shadow-xl shadow-rose-200/50'
                } animate-heart-pulse`}
              >
                <Heart className="w-14 h-14 text-rose-500 fill-rose-500" strokeWidth={1.5} />
              </div>
              <Sparkles className="w-6 h-6 text-rose-400 absolute -top-2 -right-2 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold font-serif tracking-tight">
                No Snap yet ❤️
              </h3>
              <p
                className={`text-xs max-w-xs mx-auto leading-relaxed ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                Send the very first Snap to {partnerName}. It will instantly become the emotional heart of their screen.
              </p>
            </div>

            <button
              onClick={onOpenSnapCamera}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold text-sm shadow-xl shadow-rose-500/30 hover:shadow-rose-500/40 active:scale-[0.98] transition flex items-center gap-2.5"
            >
              <Camera className="w-4 h-4" />
              <span>Send the First Snap</span>
            </button>
          </div>
        )}
      </main>

      {/* 3. BOTTOM FLOATING ACTION BAR & ANNIVERSARY COUNTER */}
      <footer className="px-5 pt-1 pb-3 shrink-0 z-10 flex flex-col items-center gap-1.5">
        <div
          className={`w-full p-2.5 rounded-3xl flex items-center justify-around shadow-xl transition-all ${
            isDarkMode
              ? 'bg-zinc-900/90 border border-zinc-800 shadow-black/40 backdrop-blur-lg'
              : 'bg-white/95 border border-rose-100 shadow-rose-200/50 backdrop-blur-lg'
          }`}
        >
          {/* Chat Action */}
          <button
            onClick={onOpenChat}
            className={`relative flex flex-col items-center gap-1 py-2 px-5 rounded-2xl transition active:scale-95 ${
              isDarkMode
                ? 'hover:bg-zinc-800/60 text-zinc-300 hover:text-white'
                : 'hover:bg-rose-50 text-zinc-700 hover:text-zinc-900'
            }`}
          >
            <div className="relative">
              <MessageCircle className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium tracking-tight">Chat</span>
          </button>

          {/* Snap Camera Shutter (Hero Action) */}
          <button
            onClick={onOpenSnapCamera}
            className="relative -top-3 p-4 rounded-full bg-gradient-to-tr from-rose-500 via-rose-500 to-pink-500 text-white shadow-xl shadow-rose-500/40 hover:shadow-rose-500/60 active:scale-95 transition-all group cursor-pointer"
            title="Take a Snap"
          >
            <Camera className="w-7 h-7 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-25 pointer-events-none" />
          </button>

          {/* Gallery Access Action */}
          <button
            onClick={onOpenGallery}
            className={`relative flex flex-col items-center gap-1 py-2 px-5 rounded-2xl transition active:scale-95 cursor-pointer ${
              isDarkMode
                ? 'hover:bg-zinc-800/60 text-zinc-300 hover:text-white'
                : 'hover:bg-rose-50 text-zinc-700 hover:text-zinc-900'
            }`}
            title="Snap Gallery & Memories"
          >
            <div className="relative">
              <Images className="w-6 h-6" />
              {galleryCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold min-w-[16px] text-center shadow-md">
                  {galleryCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium tracking-tight">Gallery</span>
          </button>
        </div>

        {/* Small Romantic Anniversary Counter */}
        <button
          onClick={() => setShowAnniversaryModal(true)}
          className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer active:scale-95 ${
            isDarkMode
              ? 'bg-zinc-900/80 hover:bg-zinc-800 text-rose-300/90 hover:text-rose-200 border border-rose-500/20 shadow-sm'
              : 'bg-white/90 hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200/80 shadow-sm'
          }`}
          title="Click to view our love anniversary details"
          aria-label="Anniversary Counter"
        >
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-heart-pulse shrink-0" />
          <span>Together for <strong className="font-bold text-rose-500 dark:text-rose-400">{anniversaryMetrics.days}</strong> {anniversaryMetrics.days === 1 ? 'day' : 'days'}</span>
          <Sparkles className="w-2.5 h-2.5 text-rose-400 group-hover:rotate-12 transition-transform shrink-0" />
        </button>
      </footer>

      {/* FULLSCREEN SNAP MODAL */}
      {isFullScreen && lastSnap && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-white pt-2 px-2 z-10">
            <div className="flex items-center gap-2">
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-semibold">{partnerName}'s Snap</span>
            </div>
            <button
              onClick={() => setIsFullScreen(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div
            onClick={handleDoubleTapSnap}
            className="relative flex-1 flex items-center justify-center my-auto overflow-hidden"
          >
            <img
              src={lastSnap.imageUrl}
              alt="Fullscreen Snap"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            />
            {heartAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="w-32 h-32 text-rose-500 fill-rose-500 animate-heart-pulse drop-shadow-2xl" />
              </div>
            )}
          </div>

          <div className="text-center text-white/90 pb-4 px-4 space-y-1">
            {lastSnap.caption && (
              <p className="text-base font-medium">{lastSnap.caption}</p>
            )}
            <p className="text-xs text-zinc-400">
              {isFromPartner ? 'Received ' : 'Sent '}{formatTimeAgo(lastSnap.createdAt)}
            </p>
          </div>
        </div>
      )}

      {/* ANNIVERSARY STORY MODAL */}
      {showAnniversaryModal && (
        <div
          onClick={() => setShowAnniversaryModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border transition-all ${
              isDarkMode
                ? 'bg-zinc-900/95 border-rose-500/25 text-white shadow-rose-950/40'
                : 'bg-white text-zinc-900 border-rose-100 shadow-rose-200/60'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-heart-pulse" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base leading-tight">Love Anniversary</h3>
                  <p className="text-[11px] text-zinc-400">Our journey together</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnniversaryModal(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Couple Avatars & Sparkle */}
            <div className="py-3 flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex items-center justify-center -space-x-3 pt-1">
                <img
                  src={currentUser.photoUrl || '/neer-profile.jpg'}
                  alt={currentUser.displayName}
                  className="w-13 h-13 rounded-full object-cover ring-4 ring-rose-500/40 shadow-lg bg-zinc-800"
                />
                <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg z-10 animate-heart-pulse">
                  <Heart className="w-3.5 h-3.5 fill-white" />
                </div>
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  className="w-13 h-13 rounded-full object-cover ring-4 ring-rose-500/40 shadow-lg bg-zinc-800"
                />
              </div>

              <div>
                <h4 className="font-bold text-base tracking-tight">
                  {currentUser.displayName} &amp; {partnerName}
                </h4>
                <p className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Together since {anniversaryMetrics.formattedStart}</span>
                </p>
              </div>

              {/* Big Milestone Number */}
              <div className="p-4 rounded-2xl w-full bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold tracking-tight font-serif text-rose-500 dark:text-rose-400">
                  {anniversaryMetrics.days}
                </span>
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mt-0.5">
                  Days of Loving Each Other
                </span>
              </div>

              {/* Stat breakdown */}
              <div className="grid grid-cols-2 gap-2 w-full text-center">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDarkMode
                      ? 'bg-zinc-800/60 border-zinc-700/60'
                      : 'bg-rose-50/60 border-rose-100'
                  }`}
                >
                  <span className="text-base font-bold text-rose-400">
                    {anniversaryMetrics.months >= 1 ? anniversaryMetrics.months : '< 1'}
                  </span>
                  <p className="text-[10px] text-zinc-400">Months of Joy</p>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDarkMode
                      ? 'bg-zinc-800/60 border-zinc-700/60'
                      : 'bg-rose-50/60 border-rose-100'
                  }`}
                >
                  <span className="text-base font-bold text-rose-400">
                    {anniversaryMetrics.hours.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-zinc-400">Hours Cherished</p>
                </div>
              </div>

              {/* Romantic Note */}
              <p
                className={`text-xs italic leading-relaxed px-2 ${
                  isDarkMode ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                &ldquo;Every day shared with you is my favorite day. Here&apos;s to creating endless more memories together.&rdquo; 💕
              </p>

              {/* Custom Date editor toggle */}
              {isEditingDate ? (
                <div className="w-full pt-1 space-y-2 text-left">
                  <label className="text-[11px] text-zinc-400 block font-medium">
                    Adjust Your Anniversary Date:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      defaultValue={anniversaryMetrics.rawDate}
                      onChange={(e) => setNewDateValue(e.target.value)}
                      className={`flex-1 px-3 py-1.5 rounded-xl text-xs border ${
                        isDarkMode
                          ? 'bg-zinc-800 border-zinc-700 text-white'
                          : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                    <button
                      onClick={() =>
                        handleSaveCustomDate(newDateValue || anniversaryMetrics.rawDate)
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold active:scale-95 transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingDate(true)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 underline underline-offset-2 transition cursor-pointer pt-0.5 flex items-center justify-center gap-1 mx-auto"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Adjust our anniversary start date</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
