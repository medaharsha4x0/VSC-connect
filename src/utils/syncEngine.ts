/**
 * VSC-connect Sync Engine & Audio Synchronization Core
 * Pure logic module for room management, queue arbitration, and NTP-style multi-device audio clock sync.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  source: 'spotify' | 'youtube' | 'local';
  votes?: number;
  requestedBy?: string;
  bpm?: number;
  lyrics?: { time: number; text: string }[];
  audioUrl?: string; // real or synthesized audio stream
}

export interface GuestDevice {
  id: string;
  name: string;
  deviceType: 'iphone' | 'macbook' | 'pixel' | 'ipad' | 'speaker' | 'other';
  status: 'pending' | 'accepted' | 'declined' | 'disconnected';
  latencyMs: number;
  jitterMs: number;
  volume: number; // 0-100
  muted: boolean;
  joinedAt: number;
  ipMock?: string;
}

export interface HostSettings {
  allowGuestSongRequests: boolean;
  allowGuestPlaybackControl: boolean;
  autoAcceptGuests: boolean;
  targetSyncPrecisionMs: number; // default 20ms
  broadcastQuality: 'standard' | 'hi-res';
}

export interface SyncPacket {
  roomCode: string;
  trackId: string;
  trackPosition: number; // seconds into track
  isPlaying: boolean;
  serverTimestamp: number; // host millisecond timestamp
  playbackRate: number;
}

/**
 * Generate a clean 6-digit or VSC-XXXX room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous 0, O, 1, I
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VSC-${code}`;
}

/**
 * Validates and normalizes room codes (supports "VSC-8492" or "8492" or "vsc8492")
 */
export function normalizeRoomCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('VSC') && cleaned.length >= 7) {
    return `VSC-${cleaned.substring(3, 7)}`;
  }
  if (cleaned.length === 4) {
    return `VSC-${cleaned}`;
  }
  if (cleaned.startsWith('VSC')) {
    const rest = cleaned.substring(3);
    return rest.length ? `VSC-${rest}` : 'VSC-';
  }
  return cleaned ? `VSC-${cleaned.substring(0, 4)}` : '';
}

export function isValidRoomCode(code: string): boolean {
  return /^VSC-[A-Z0-9]{4}$/.test(code.trim().toUpperCase());
}

/**
 * NTP-style Clock Sync & Round-trip Delay Calculation
 * t0: client send time
 * t1: host receive time
 * t2: host reply transmit time
 * t3: client receive time
 */
export function calculateClockSync(t0: number, t1: number, t2: number, t3: number): {
  roundTripDelay: number;
  clockOffset: number;
} {
  const roundTripDelay = (t3 - t0) - (t2 - t1);
  const clockOffset = ((t1 - t0) + (t2 - t3)) / 2;
  return {
    roundTripDelay: Math.max(0, roundTripDelay),
    clockOffset,
  };
}

/**
 * Compute the exact target audio position (in seconds) the guest device
 * should currently be playing, given host's sync packet and local time.
 */
export function computeSyncTargetTime(
  hostPosition: number,
  hostPacketTime: number,
  clientCurrentLocalTime: number,
  clockOffset: number,
  isPlaying: boolean,
  playbackRate: number = 1.0
): number {
  if (!isPlaying) {
    return hostPosition;
  }
  // Convert client local time to host estimated time
  const estimatedHostTime = clientCurrentLocalTime + clockOffset;
  const elapsedSincePacketSeconds = Math.max(0, (estimatedHostTime - hostPacketTime) / 1000);
  return hostPosition + (elapsedSincePacketSeconds * playbackRate);
}

/**
 * Determine what correction action to take based on drift between
 * client current playback position and target position.
 */
export function calculateSyncDrift(
  clientAudioPosition: number,
  targetAudioPosition: number
): {
  driftMs: number;
  action: 'none' | 'soft-correct' | 'hard-seek';
  playbackRateModifier: number;
} {
  const driftSeconds = clientAudioPosition - targetAudioPosition;
  const driftMs = Math.round(driftSeconds * 1000);
  const absDriftMs = Math.abs(driftMs);

  if (absDriftMs <= 25) {
    // Within imperceptible tolerance (<25ms)
    return {
      driftMs,
      action: 'none',
      playbackRateModifier: 1.0,
    };
  }

  if (absDriftMs < 250) {
    // Soft pitch-preserving correction (speed up slightly if behind, slow down if ahead)
    // If driftMs is negative, client is behind -> speed up (1.03x)
    // If driftMs is positive, client is ahead -> slow down (0.97x)
    const rate = driftMs < 0 ? 1.035 : 0.965;
    return {
      driftMs,
      action: 'soft-correct',
      playbackRateModifier: rate,
    };
  }

  // Large drift -> hard seek immediately
  return {
    driftMs,
    action: 'hard-seek',
    playbackRateModifier: 1.0,
  };
}

/**
 * Queue Operations
 */
export function addToQueue(queue: Track[], track: Track, requestedBy?: string): Track[] {
  const newTrack: Track = {
    ...track,
    id: `${track.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    votes: 0,
    requestedBy: requestedBy || 'Host',
  };
  return [...queue, newTrack];
}

export function removeFromQueue(queue: Track[], trackId: string): Track[] {
  return queue.filter((t) => t.id !== trackId);
}

export function reorderQueue(queue: Track[], fromIndex: number, toIndex: number): Track[] {
  if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length) {
    return queue;
  }
  const result = [...queue];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

export function voteTrack(queue: Track[], trackId: string, delta: 1 | -1): Track[] {
  return queue
    .map((track) => {
      if (track.id === trackId) {
        return { ...track, votes: (track.votes || 0) + delta };
      }
      return track;
    })
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));
}

/**
 * Device permissions check
 */
export function canGuestControl(
  guestStatus: GuestDevice['status'],
  settings: HostSettings,
  action: 'request_song' | 'seek' | 'skip'
): boolean {
  if (guestStatus !== 'accepted') {
    return false;
  }
  if (action === 'request_song') {
    return settings.allowGuestSongRequests;
  }
  if (action === 'seek' || action === 'skip') {
    return settings.allowGuestPlaybackControl;
  }
  return false;
}

/**
 * Formats time from seconds into "m:ss"
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
