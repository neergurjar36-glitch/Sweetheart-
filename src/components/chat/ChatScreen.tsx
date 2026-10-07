import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Heart,
  Camera,
  Video,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  MoreVertical,
  Smile,
  Sparkles,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { notificationService } from '../../services/notificationService';
import { UserProfile, Connection, Message, AppTheme } from '../../types';

interface ChatScreenProps {
  currentUser: UserProfile;
  partner: UserProfile | null;
  connection: Connection;
  theme: AppTheme;
  onBack: () => void;
  onOpenSnapCamera: () => void;
  onStartVideoCall?: () => void;
  sandboxMessages?: Message[];
  onSandboxSendMessage?: (text: string) => void;
  onSandboxDeleteMessage?: (id: string) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  currentUser,
  partner,
  connection,
  theme,
  onBack,
  onOpenSnapCamera,
  onStartVideoCall,
  sandboxMessages,
  onSandboxSendMessage,
  onSandboxDeleteMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDarkMode = theme === 'dark';
  const partnerName = partner?.displayName || 'Your Sweetheart';
  const partnerAvatar =
    partner?.photoUrl ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${partner?.id || 'partner'}`;

  // Scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Real-time Firestore listener for messages in this connection
  useEffect(() => {
    if (sandboxMessages || onSandboxSendMessage || !auth.currentUser) {
      if (sandboxMessages) {
        setMessages(sandboxMessages);
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('connectionId', '==', connection.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Message;
          msgs.push({ ...data, id: docSnap.id });

          // If message is from partner and not yet seen, mark as seen
          if (data.senderId !== currentUser.id && data.status !== 'seen') {
            updateDoc(docSnap.ref, {
              status: 'seen',
              seenAt: new Date().toISOString(),
            }).catch(() => {});
          }
        });

        setMessages(msgs);
        setTimeout(() => scrollToBottom('smooth'), 100);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `messages`);
      }
    );

    return () => unsubscribe();
  }, [connection.id, currentUser.id, sandboxMessages, onSandboxSendMessage]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !partner) return;

    if (!textToSend) {
      setInputText('');
    }

    if (onSandboxSendMessage || !auth.currentUser) {
      if (onSandboxSendMessage) {
        onSandboxSendMessage(text);
      }
      return;
    }

    try {
      const newMsg = {
        connectionId: connection.id,
        senderId: currentUser.id,
        receiverId: partner.id,
        text,
        createdAt: new Date().toISOString(),
        status: 'sent',
      };

      await addDoc(collection(db, 'messages'), newMsg);

      // Trigger notification
      notificationService.notifyMessage(currentUser.displayName, text);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Could not send message. Please check your connection.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (onSandboxDeleteMessage || !auth.currentUser) {
      if (onSandboxDeleteMessage) {
        onSandboxDeleteMessage(messageId);
      }
      setSelectedMessage(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'messages', messageId));
      setSelectedMessage(null);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleCopyText = (msg: Message) => {
    navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => {
      setCopiedId(null);
      setSelectedMessage(null);
    }, 1200);
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full transition-colors duration-300 ${
        isDarkMode ? 'bg-zinc-950 text-white' : 'bg-rose-50/40 text-zinc-900'
      }`}
    >
      {/* 1. CHAT HEADER */}
      <header
        className={`px-4 py-3 flex items-center justify-between border-b shrink-0 z-10 transition-colors ${
          isDarkMode
            ? 'bg-zinc-900/80 border-zinc-800/80 backdrop-blur-md'
            : 'bg-white/90 border-rose-100 backdrop-blur-md shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-2 rounded-full transition active:scale-95 ${
              isDarkMode
                ? 'hover:bg-zinc-800 text-zinc-300'
                : 'hover:bg-rose-100 text-zinc-700'
            }`}
            aria-label="Back to Last Snap"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/40 bg-zinc-800"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                isDarkMode ? 'border-zinc-900' : 'border-white'
              } ${partner?.isOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm leading-tight">{partnerName}</h2>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            </div>
            <p className="text-[11px] text-zinc-400">
              {partner?.isOnline ? 'Online now' : 'Private chat'}
            </p>
          </div>
        </div>

        {/* Upper Profile Action Buttons: Call & Camera */}
        <div className="flex items-center gap-2">
          {onStartVideoCall && (
            <button
              onClick={onStartVideoCall}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-500/25 active:scale-95 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold group"
              title={`Call ${partnerName}`}
              aria-label={`Call ${partnerName}`}
            >
              <Video className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Call</span>
            </button>
          )}

          <button
            onClick={onOpenSnapCamera}
            className="p-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 active:scale-95 transition cursor-pointer"
            title="Send a Snap"
            aria-label="Send a Snap"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MESSAGES CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Intimate Privacy Note at Top of Chat */}
        <div className="py-4 text-center">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs mx-auto border ${
              isDarkMode
                ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400'
                : 'bg-white border-rose-200 text-zinc-600 shadow-sm'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Messages are private between you two</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <Heart className="w-6 h-6 fill-rose-500" />
            </div>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Start your private conversation. Share warm words, sweet notes, and thoughts.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  onClick={() => setSelectedMessage(msg)}
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl relative cursor-pointer active:scale-[0.99] transition shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-br-xs'
                      : isDarkMode
                      ? 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/60 rounded-bl-xs'
                      : 'bg-white text-zinc-900 border border-rose-100 rounded-bl-xs'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                      isMe ? 'text-rose-100/80' : 'text-zinc-400'
                    }`}
                  >
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isMe && (
                      <span className="ml-0.5">
                        {msg.status === 'seen' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-rose-200" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 opacity-75" />
                        ) : (
                          <Check className="w-3.5 h-3.5 opacity-75" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. INPUT BAR */}
      <footer
        className={`p-3 border-t shrink-0 z-10 transition-colors ${
          isDarkMode
            ? 'bg-zinc-900/90 border-zinc-800 backdrop-blur-md'
            : 'bg-white border-rose-100 backdrop-blur-md'
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Quick Heart button */}
          <button
            type="button"
            onClick={() => handleSendMessage('❤️')}
            className="p-2.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 active:scale-90 transition shrink-0"
            title="Send love"
          >
            <Heart className="w-5 h-5 fill-rose-500" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${partnerName}...`}
            maxLength={1000}
            className={`flex-1 py-3 px-4 rounded-2xl text-sm focus:outline-none transition ${
              isDarkMode
                ? 'bg-zinc-800/80 border border-zinc-700/60 text-white placeholder-zinc-500 focus:border-rose-500'
                : 'bg-zinc-100/90 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-rose-400'
            }`}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

      {/* MESSAGE ACTION MODAL (Copy, Delete, React) */}
      {selectedMessage && (
        <div
          onClick={() => setSelectedMessage(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl p-4 space-y-2 shadow-2xl animate-in slide-in-from-bottom duration-200 ${
              isDarkMode
                ? 'bg-zinc-900 border border-zinc-800 text-white'
                : 'bg-white border border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="p-3 rounded-xl bg-zinc-800/40 text-xs text-zinc-400 line-clamp-2">
              "{selectedMessage.text}"
            </div>

            <button
              onClick={() => handleCopyText(selectedMessage)}
              className="w-full py-3 px-4 rounded-xl hover:bg-zinc-800/50 flex items-center gap-3 text-sm font-medium transition"
            >
              {copiedId === selectedMessage.id ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            {selectedMessage.senderId === currentUser.id && (
              <button
                onClick={() => handleDeleteMessage(selectedMessage.id)}
                className="w-full py-3 px-4 rounded-xl hover:bg-red-500/10 text-red-400 flex items-center gap-3 text-sm font-medium transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Message</span>
              </button>
            )}

            <button
              onClick={() => setSelectedMessage(null)}
              className="w-full py-2.5 rounded-xl text-center text-xs text-zinc-500 hover:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
