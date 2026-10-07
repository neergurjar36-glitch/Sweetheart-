import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  FlipHorizontal,
  Sparkles,
  Heart,
  Volume2,
} from 'lucide-react';
import { callService } from '../../services/callService';
import { auth } from '../../lib/firebase';
import { UserProfile, Connection, CallSession } from '../../types';

interface VideoCallModalProps {
  currentUser: UserProfile;
  partner: UserProfile | null;
  connection: Connection;
  incomingCall: CallSession | null;
  isCaller: boolean;
  onClose: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  currentUser,
  partner,
  connection,
  incomingCall,
  isCaller,
  onClose,
}) => {
  const [callStatus, setCallStatus] = useState<CallSession['status']>(
    incomingCall ? 'calling' : isCaller ? 'calling' : 'connected'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const partnerName = partner?.displayName || 'Your Sweetheart';
  const partnerAvatar =
    partner?.photoUrl ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${partner?.id || 'partner'}`;

  // Call duration counter once connected
  useEffect(() => {
    let timer: any;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  // Set up call service listeners
  useEffect(() => {
    callService.setCallbacks(
      (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus('connected');
      },
      (newStatus) => {
        if (newStatus === 'ended' || newStatus === 'declined') {
          setCallStatus(newStatus);
          setTimeout(() => onClose(), 1200);
        } else {
          setCallStatus(newStatus);
        }
      }
    );

    // If I am the caller, initiate the call
    if (isCaller && partner) {
      if (connection.id.startsWith('sandbox_') || connection.id === 'neer_annu_sweetheart' || !auth.currentUser) {
        callService
          .getLocalMedia()
          .then((stream) => {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            setTimeout(() => {
              setCallStatus('connected');
            }, 2000);
          })
          .catch((err) => {
            console.warn('Sandbox call local media fallback:', err);
            setTimeout(() => {
              setCallStatus('connected');
            }, 1200);
          });
      } else {
        callService
          .initiateCall(
            connection.id,
            currentUser.id,
            partner.id,
            currentUser.displayName,
            currentUser.photoUrl
          )
          .then(() => {
            return callService.getLocalMedia();
          })
          .then((stream) => {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.error('Call initiation error:', err);
            alert('Could not start call. Please check camera and mic permissions.');
            onClose();
          });
      }
    }

    return () => {
      callService.cleanup();
    };
  }, [isCaller, connection.id, currentUser, partner, onClose]);

  const handleAcceptCall = async () => {
    try {
      setCallStatus('connected');
      if (auth.currentUser && !connection.id.startsWith('sandbox_') && connection.id !== 'neer_annu_sweetheart') {
        await callService.acceptCall(connection.id);
      }
      const stream = await callService.getLocalMedia();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accepting call:', err);
      alert('Could not access media devices.');
      onClose();
    }
  };

  const handleDeclineCall = async () => {
    if (auth.currentUser && !connection.id.startsWith('sandbox_') && connection.id !== 'neer_annu_sweetheart') {
      await callService.declineCall(connection.id);
    } else {
      callService.cleanup();
    }
    onClose();
  };

  const handleEndCall = async () => {
    if (auth.currentUser && !connection.id.startsWith('sandbox_') && connection.id !== 'neer_annu_sweetheart') {
      await callService.endCall(connection.id);
    } else {
      callService.cleanup();
    }
    onClose();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    callService.toggleMute(next);
  };

  const handleToggleVideo = () => {
    const next = !isVideoEnabled;
    setIsVideoEnabled(next);
    callService.toggleVideo(next);
  };

  const handleSwitchCamera = async () => {
    try {
      await callService.switchCamera();
      const stream = await callService.getLocalMedia();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Switch camera failed:', err);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. INCOMING CALL SCREEN (Callee viewing incoming call)
  if (incomingCall && callStatus === 'calling' && !isCaller) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col justify-between p-8 text-white animate-in fade-in duration-300">
        <div className="text-center pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            <Video className="w-4 h-4" />
            <span>Incoming Private Video Call</span>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-6 my-auto">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-rose-500/40 p-1 bg-zinc-800 shadow-2xl animate-heart-pulse">
              <img
                src={incomingCall.callerPhoto || partnerAvatar}
                alt={incomingCall.callerName}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-2xl font-bold font-serif">{incomingCall.callerName}</h3>
            <p className="text-xs text-rose-400 font-mono tracking-widest uppercase">
              Sweetheart Calling...
            </p>
          </div>
        </div>

        {/* Action Buttons: Decline / Accept */}
        <div className="flex items-center justify-around pb-8 px-6">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleDeclineCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-600/30 active:scale-95 transition"
              title="Decline"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-zinc-400 font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAcceptCall}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 active:scale-95 transition animate-bounce"
              title="Accept"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-xs text-emerald-400 font-medium">Accept</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE OR OUTGOING CALL SCREEN
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between text-white animate-in fade-in duration-200">
      {/* REMOTE VIDEO (FULLSCREEN BACKGROUND) */}
      <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center overflow-hidden">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Fallback if remote video hasn't connected or partner camera is disabled */}
        {callStatus === 'calling' ? (
          <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-rose-500/40 p-1 bg-zinc-800 shadow-2xl animate-heart-pulse">
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold font-serif">{partnerName}</h3>
              <p className="text-xs text-rose-300 font-mono tracking-widest uppercase animate-pulse">
                Ringing...
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* TOP OVERLAY: CALL DURATION & STATUS */}
      <div className="relative z-20 px-6 pt-5 pb-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">{partnerName}</h4>
            <p className="text-[11px] text-zinc-300 font-mono">
              {callStatus === 'connected' ? formatTimer(callDuration) : 'Connecting...'}
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>ENCRYPTED</span>
        </div>
      </div>

      {/* FLOATING LOCAL PREVIEW (PICTURE-IN-PICTURE) */}
      <div className="relative z-20 self-end mr-4 mb-2 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900 group">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
        />
        {!isVideoEnabled && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-400 p-2 text-center text-[10px]">
            <VideoOff className="w-5 h-5 mb-1" />
            <span>Camera Off</span>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="relative z-20 px-6 py-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-center gap-4">
        {/* Toggle Mic */}
        <button
          onClick={handleToggleMute}
          className={`p-3.5 rounded-full backdrop-blur-md transition active:scale-90 ${
            isMuted
              ? 'bg-red-500/80 text-white'
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Toggle Video */}
        <button
          onClick={handleToggleVideo}
          className={`p-3.5 rounded-full backdrop-blur-md transition active:scale-90 ${
            !isVideoEnabled
              ? 'bg-red-500/80 text-white'
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
          title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
        >
          {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>

        {/* Flip Camera */}
        <button
          onClick={handleSwitchCamera}
          className="p-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition active:scale-90"
          title="Switch camera"
        >
          <FlipHorizontal className="w-6 h-6" />
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/40 active:scale-90 transition"
          title="End Call"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
