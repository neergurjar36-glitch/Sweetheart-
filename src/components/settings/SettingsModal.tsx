import React, { useState } from 'react';
import {
  X,
  Heart,
  Copy,
  Check,
  Bell,
  Sun,
  Moon,
  LogOut,
  Unlink,
  Shield,
  Sparkles,
  Info,
} from 'lucide-react';
import { SweetheartLogo } from '../common/SweetheartLogo';
import { notificationService } from '../../services/notificationService';
import { UserProfile, Connection, AppTheme } from '../../types';

interface SettingsModalProps {
  currentUser: UserProfile;
  partner: UserProfile | null;
  connection: Connection;
  theme: AppTheme;
  onToggleTheme: () => void;
  onDisconnect: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  partner,
  connection,
  theme,
  onToggleTheme,
  onDisconnect,
  onSignOut,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission === 'granted'
      : false
  );
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const isDarkMode = theme === 'dark';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(connection.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestNotifs = async () => {
    const granted = await notificationService.requestPermission();
    setNotifGranted(granted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 space-y-6 shadow-2xl transition-colors ${
          isDarkMode
            ? 'bg-zinc-900 border border-zinc-800 text-white'
            : 'bg-white border border-rose-100 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <SweetheartLogo variant="header" size="sm" showText={false} />
            <h3 className="text-lg font-bold font-serif">Sweetheart Settings</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition ${
              isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-rose-100 text-zinc-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. OUR CONNECTION */}
        <div
          className={`p-4 rounded-2xl border space-y-3 ${
            isDarkMode
              ? 'bg-zinc-950/60 border-rose-500/20'
              : 'bg-rose-50/60 border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Connected Couple
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              STRICTLY TWO
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <img
                src={currentUser.photoUrl}
                alt={currentUser.displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/40"
              />
              <div>
                <p className="text-xs font-bold leading-tight">{currentUser.displayName}</p>
                <p className="text-[10px] text-zinc-400">You</p>
              </div>
            </div>

            <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-heart-pulse shrink-0" />

            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-xs font-bold leading-tight">
                  {partner?.displayName || 'Waiting...'}
                </p>
                <p className="text-[10px] text-zinc-400">Sweetheart</p>
              </div>
              <img
                src={
                  partner?.photoUrl ||
                  `https://api.dicebear.com/7.x/adventurer/svg?seed=partner`
                }
                alt={partner?.displayName || 'Partner'}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/40"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Connection Code:</span>
            <button
              onClick={handleCopyCode}
              className="font-mono font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition"
            >
              <span>{connection.code}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 2. PREFERENCES & CONTROLS */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block px-1">
            Preferences
          </span>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className={`w-full p-3.5 rounded-xl flex items-center justify-between transition ${
              isDarkMode ? 'hover:bg-zinc-800 bg-zinc-800/40' : 'hover:bg-rose-50 bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-sm font-medium">Appearance</span>
            </div>
            <span className="text-xs text-zinc-400 capitalize">
              {isDarkMode ? 'Dark Theme' : 'Light Theme'}
            </span>
          </button>

          {/* Notifications */}
          <button
            onClick={handleRequestNotifs}
            className={`w-full p-3.5 rounded-xl flex items-center justify-between transition ${
              isDarkMode ? 'hover:bg-zinc-800 bg-zinc-800/40' : 'hover:bg-rose-50 bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-rose-400" />
              <div className="text-left">
                <span className="text-sm font-medium block">Push Notifications</span>
                <span className="text-[10px] text-zinc-400 block">
                  Alerts for new Snaps & Calls
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                notifGranted
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-700/50 text-zinc-400'
              }`}
            >
              {notifGranted ? 'Enabled' : 'Enable'}
            </span>
          </button>
        </div>

        {/* 3. LOGO PLACEHOLDER ARCHITECTURE NOTE */}
        <div
          className={`p-3.5 rounded-xl text-xs space-y-1 ${
            isDarkMode
              ? 'bg-zinc-950/80 border border-zinc-800 text-zinc-400'
              : 'bg-zinc-50 border border-zinc-200 text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium text-zinc-300">
            <Info className="w-3.5 h-3.5 text-rose-400" />
            <span>Logo Placeholder Configured</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            The application uses a modular temporary placeholder logo in <code>SweetheartLogo.tsx</code>. Once you supply the final logo image asset, it replaces everywhere with zero logic changes.
          </p>
        </div>

        {/* 4. DANGER ZONE: DISCONNECT & LOGOUT */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          {!confirmDisconnect ? (
            <button
              onClick={() => setConfirmDisconnect(true)}
              className="w-full py-3 px-4 rounded-xl hover:bg-red-500/10 text-red-400 text-xs font-medium flex items-center justify-center gap-2 transition"
            >
              <Unlink className="w-4 h-4" />
              <span>Disconnect Sweetheart</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-center space-y-2">
              <p className="text-xs text-red-200 font-medium">
                Are you sure you want to disconnect from your sweetheart?
              </p>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={() => setConfirmDisconnect(false)}
                  className="py-1.5 px-3 rounded-lg bg-zinc-800 text-zinc-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={onDisconnect}
                  className="py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                >
                  Yes, Disconnect
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onSignOut}
            className="w-full py-3 px-4 rounded-xl hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
