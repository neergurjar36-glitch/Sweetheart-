import { doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { CallSession } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class CallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentFacingMode: 'user' | 'environment' = 'user';

  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onCallStateCallback: ((status: CallSession['status']) => void) | null = null;

  public setCallbacks(
    onRemote: (stream: MediaStream) => void,
    onState: (status: CallSession['status']) => void
  ) {
    this.onRemoteStreamCallback = onRemote;
    this.onCallStateCallback = onState;
  }

  public async getLocalMedia(video = true, audio = true): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { facingMode: this.currentFacingMode } : false,
        audio: audio,
      });
      return this.localStream;
    } catch (err) {
      console.error('Failed to get local media:', err);
      // Fallback to audio-only if camera access denied
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        return this.localStream;
      } catch (audioErr) {
        throw new Error('Could not access microphone or camera. Please check permissions.');
      }
    }
  }

  public async initiateCall(
    connectionId: string,
    callerId: string,
    receiverId: string,
    callerName: string,
    callerPhoto?: string
  ): Promise<void> {
    if (connectionId.startsWith('sandbox_') || connectionId === 'neer_annu_sweetheart' || !auth.currentUser) {
      await this.getLocalMedia();
      return;
    }

    await this.getLocalMedia();
    this.createPeerConnection(connectionId, true);

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    const callDocRef = doc(db, 'calls', connectionId);
    try {
      await setDoc(callDocRef, {
        connectionId,
        callerId,
        receiverId,
        callerName,
        callerPhoto: callerPhoto || '',
        status: 'calling',
        offer: JSON.stringify(offer),
        answer: '',
        callerCandidates: '[]',
        receiverCandidates: '[]',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `calls/${connectionId}`);
    }
  }

  public async acceptCall(connectionId: string): Promise<void> {
    if (connectionId.startsWith('sandbox_') || connectionId === 'neer_annu_sweetheart' || !auth.currentUser) {
      await this.getLocalMedia();
      return;
    }

    await this.getLocalMedia();
    this.createPeerConnection(connectionId, false);

    // Read current offer and respond
    const callDocRef = doc(db, 'calls', connectionId);
    const unsubs = onSnapshot(callDocRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as CallSession;
      if (data.offer && !this.peerConnection?.remoteDescription) {
        const offerDesc = new RTCSessionDescription(JSON.parse(data.offer));
        await this.peerConnection?.setRemoteDescription(offerDesc);

        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);

        await updateDoc(callDocRef, {
          status: 'connected',
          answer: JSON.stringify(answer),
          updatedAt: new Date().toISOString(),
        });
      }

      if (data.callerCandidates && this.peerConnection) {
        try {
          const candidates: RTCIceCandidateInit[] = JSON.parse(data.callerCandidates);
          for (const cand of candidates) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch {}
      }
    });
  }

  private createPeerConnection(connectionId: string, isCaller: boolean) {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    this.remoteStream = new MediaStream();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream!);
      }
    };

    const pendingCandidates: RTCIceCandidateInit[] = [];
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        pendingCandidates.push(event.candidate.toJSON());
        const callDocRef = doc(db, 'calls', connectionId);
        try {
          await updateDoc(callDocRef, {
            [isCaller ? 'callerCandidates' : 'receiverCandidates']: JSON.stringify(pendingCandidates),
          });
        } catch {}
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === 'connected') {
        if (this.onCallStateCallback) this.onCallStateCallback('connected');
      } else if (
        this.peerConnection?.connectionState === 'disconnected' ||
        this.peerConnection?.connectionState === 'failed'
      ) {
        if (this.onCallStateCallback) this.onCallStateCallback('ended');
      }
    };
  }

  public async declineCall(connectionId: string) {
    if (connectionId.startsWith('sandbox_') || connectionId === 'neer_annu_sweetheart' || !auth.currentUser) {
      this.cleanup();
      return;
    }
    const callDocRef = doc(db, 'calls', connectionId);
    try {
      await updateDoc(callDocRef, {
        status: 'declined',
        updatedAt: new Date().toISOString(),
      });
    } catch {}
    this.cleanup();
  }

  public async endCall(connectionId: string) {
    if (connectionId.startsWith('sandbox_') || connectionId === 'neer_annu_sweetheart' || !auth.currentUser) {
      this.cleanup();
      return;
    }
    const callDocRef = doc(db, 'calls', connectionId);
    try {
      await updateDoc(callDocRef, {
        status: 'ended',
        updatedAt: new Date().toISOString(),
      });
      setTimeout(() => {
        deleteDoc(callDocRef).catch(() => {});
      }, 3000);
    } catch {}
    this.cleanup();
  }

  public toggleMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public toggleVideo(videoEnabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = videoEnabled;
      });
    }
  }

  public async switchCamera(): Promise<void> {
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => track.stop());
    }
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: this.currentFacingMode },
      audio: true,
    });
    const newVideoTrack = newStream.getVideoTracks()[0];
    if (this.peerConnection) {
      const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && newVideoTrack) {
        await sender.replaceTrack(newVideoTrack);
      }
    }
    this.localStream = newStream;
  }

  public cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }
}

export const callService = new CallService();
