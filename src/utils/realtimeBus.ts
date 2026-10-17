/**
 * Real-time event bus for multi-device audio syncing in VSC-connect.
 * Utilizes BroadcastChannel for cross-tab / cross-window synchronization,
 * with storage event fallback and NTP latency calculations.
 */

import { GuestDevice, SyncPacket, Track, calculateClockSync } from './syncEngine';

export type RealtimeMessage =
  | { type: 'HOST_STATE_UPDATE'; roomCode: string; track: Track | null; isPlaying: boolean; position: number; serverTimestamp: number; queue: Track[] }
  | { type: 'GUEST_JOIN_REQUEST'; roomCode: string; guest: GuestDevice; clientSendTime: number }
  | { type: 'HOST_JOIN_DECISION'; roomCode: string; guestId: string; decision: 'accepted' | 'declined'; hostReplyTime: number }
  | { type: 'GUEST_SONG_REQUEST'; roomCode: string; track: Track; guestName: string }
  | { type: 'HOST_KICK_GUEST'; roomCode: string; guestId: string }
  | { type: 'HOST_MUTE_GUEST'; roomCode: string; guestId: string; muted: boolean }
  | { type: 'SYNC_PING'; roomCode: string; guestId: string; t0: number }
  | { type: 'SYNC_PONG'; roomCode: string; guestId: string; t0: number; t1: number; t2: number };

type MessageHandler = (msg: RealtimeMessage) => void;

class RealtimeSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<MessageHandler> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('vsc_connect_sync_bus');
        this.channel.onmessage = (event) => {
          this.notify(event.data as RealtimeMessage);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported or restricted, falling back to local events', e);
      }
    }

    // Storage fallback for broader browser compatibility
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'vsc_connect_bus_msg' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notify(data);
          } catch {
            // Ignore parse errors
          }
        }
      });
    }
  }

  public subscribe(handler: MessageHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public broadcast(msg: RealtimeMessage): void {
    // Deliver locally first
    this.notify(msg);

    // Broadcast to other tabs/windows
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.warn('BroadcastChannel post error:', err);
      }
    }

    // Storage event trigger for multi-tab
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vsc_connect_bus_msg', JSON.stringify({ ...msg, _t: Date.now() }));
      } catch {
        // Storage quota / sandbox safety
      }
    }
  }

  private notify(msg: RealtimeMessage): void {
    this.listeners.forEach((fn) => {
      try {
        fn(msg);
      } catch (err) {
        console.error('Error in realtime message handler:', err);
      }
    });
  }
}

export const realtimeBus = new RealtimeSyncBus();
