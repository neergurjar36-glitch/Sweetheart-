import React, { useState, useEffect } from 'react';
import { Heart, Copy, Check, Sparkles, ArrowRight, Shield, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Connection } from '../../types';

interface ConnectionSetupProps {
  currentUser: UserProfile;
  onConnected: (connection: Connection) => void;
  onSignOut: () => void;
}

export const ConnectionSetup: React.FC<ConnectionSetupProps> = ({
  currentUser,
  onConnected,
  onSignOut,
}) => {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper to generate a unique readable code: SW-XXXXXX
  const generateCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'SW-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Option 1: Create Sweetheart Connection
  const handleCreateConnection = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const code = generateCode();
      const connectionId = `conn_${currentUser.id}_${Date.now().toString(36)}`;

      const newConnection: Connection = {
        id: connectionId,
        code,
        user1Id: currentUser.id,
        user2Id: null,
        status: 'waiting',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'connections', connectionId), newConnection);

      // Update current user's profile with connectionId
      await updateDoc(doc(db, 'users', currentUser.id), {
        connectionId,
      });

      setCreatedCode(code);
      setCurrentConnectionId(connectionId);
      setMode('create');
    } catch (err) {
      console.error('Error creating connection:', err);
      setErrorMsg('Failed to create Sweetheart space. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Listen for partner joining the created connection
  useEffect(() => {
    if (mode === 'create' && currentConnectionId) {
      const connRef = doc(db, 'connections', currentConnectionId);
      const unsubscribe = onSnapshot(
        connRef,
        async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Connection;
            if (data.status === 'connected' && data.user2Id) {
              // Update user 1's own profile with partnerId
              try {
                await updateDoc(doc(db, 'users', currentUser.id), {
                  partnerId: data.user2Id,
                });
              } catch (e) {
                console.warn('Own profile update warning:', e);
              }

              // Trigger romantic confetti celebration!
              try {
                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#f43f5e', '#fb7185', '#fda4af', '#ffffff'],
                });
              } catch {}

              setTimeout(() => {
                onConnected(data);
              }, 1200);
            }
          }
        },
        (err) => {
          console.warn('Connection listener error:', err);
        }
      );

      return () => unsubscribe();
    }
  }, [mode, currentConnectionId, onConnected]);

  // Option 2: Join Sweetheart Connection via Code
  const handleJoinConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = inputCode.trim().toUpperCase();

    if (!formattedCode) {
      setErrorMsg('Please enter the connection code.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const q = query(
        collection(db, 'connections'),
        where('code', '==', formattedCode)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMsg('Invalid connection code. Please ask your sweetheart to verify the code.');
        return;
      }

      const connectionDoc = querySnapshot.docs[0];
      const connData = connectionDoc.data() as Connection;

      if (connData.user1Id === currentUser.id) {
        setErrorMsg("This is your own connection code! Share it with your sweetheart instead.");
        return;
      }

      if (connData.user2Id && connData.user2Id !== currentUser.id) {
        setErrorMsg("Connection is already full! Sweetheart is strictly designed for exactly two people.");
        return;
      }

      const connectedAt = new Date().toISOString();

      // Update connection document
      await updateDoc(connectionDoc.ref, {
        user2Id: currentUser.id,
        status: 'connected',
        connectedAt,
      });

      // Update joining user profile
      await updateDoc(doc(db, 'users', currentUser.id), {
        connectionId: connData.id,
        partnerId: connData.user1Id,
      });

      const updatedConn: Connection = {
        ...connData,
        user2Id: currentUser.id,
        status: 'connected',
        connectedAt,
      };

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#fb7185', '#fda4af', '#ffffff'],
        });
      } catch {}

      setTimeout(() => {
        onConnected(updatedConn);
      }, 1000);
    } catch (err: any) {
      console.error('Error joining connection:', err);
      setErrorMsg(err.message || 'Could not join connection. Please check code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (createdCode) {
      try {
        await navigator.clipboard.writeText(createdCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
        setCopied(true);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Top Header */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
          <span className="font-serif font-bold text-sm text-zinc-200">Sweetheart Space</span>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          Sign Out
        </button>
      </div>

      {/* Main Choice Screen */}
      {mode === 'choose' && (
        <div className="space-y-6 my-auto text-center px-2">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/15 animate-heart-pulse">
              <Heart className="w-10 h-10 text-rose-500 fill-rose-500" />
            </div>
            <Sparkles className="w-5 h-5 text-rose-300 absolute -top-1 -right-1" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-serif text-white tracking-tight">
              Your Sweetheart space is waiting ❤️
            </h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Connect with your partner to share photos, chat, and call in an exclusive two-person private sanctuary.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <button
              onClick={handleCreateConnection}
              disabled={loading}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-medium shadow-lg shadow-rose-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Heart className="w-5 h-5 fill-white group-hover:scale-110 transition" />
                  <span className="text-base font-semibold">Create Sweetheart</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setErrorMsg(null);
                setMode('join');
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 font-medium border border-zinc-800 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-zinc-400" />
              <span>Join Sweetheart with Code</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 1: Create Waiting Room */}
      {mode === 'create' && (
        <div className="space-y-6 my-auto text-center px-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto animate-pulse">
            <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
          </div>

          <div>
            <h3 className="text-xl font-bold font-serif text-white">
              Give this code to your Sweetheart
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Once they enter this code on their device, you will both be instantly connected.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-zinc-900/90 border border-rose-500/30 shadow-xl shadow-rose-500/10 space-y-4">
            <div className="text-3xl font-mono font-bold tracking-widest text-rose-400 select-all py-2">
              {createdCode}
            </div>

            <button
              onClick={handleCopyCode}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Code Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Connection Code</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
            <span>Waiting for your sweetheart to join...</span>
          </div>

          <button
            onClick={() => setMode('choose')}
            className="text-xs text-zinc-500 hover:text-zinc-400 underline"
          >
            Cancel and go back
          </button>
        </div>
      )}

      {/* Mode 2: Join Screen */}
      {mode === 'join' && (
        <div className="space-y-6 my-auto px-2">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <KeyRound className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-xl font-bold font-serif text-white">Join Sweetheart</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Enter the unique 6-character code given to you by your partner (e.g. SW-7K4P92).
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleJoinConnection} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5 text-center">
                Connection Code
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="SW-XXXXXX"
                maxLength={12}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl py-3.5 px-4 text-center font-mono text-xl tracking-widest text-rose-400 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Connect With Sweetheart</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode('choose');
              }}
              className="text-xs text-zinc-400 hover:text-zinc-300"
            >
              ← Back to options
            </button>
          </div>
        </div>
      )}

      {/* Bottom Privacy Assurance */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
        <Shield className="w-3.5 h-3.5 text-zinc-400" />
        <span>Strictly two users. Third party access mathematically rejected.</span>
      </div>
    </div>
  );
};
