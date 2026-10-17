import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  FileText,
  Search,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Music2,
  ShieldAlert,
  Smartphone,
  CheckCircle,
  Activity,
  Layers,
  Send,
} from 'lucide-react';
import {
  Track,
  GuestDevice,
  formatTime,
  calculateClockSync,
  computeSyncTargetTime,
  calculateSyncDrift,
} from '../utils/syncEngine';
import { MOCK_CATALOG } from '../data/mockCatalog';
import { audioPlayer } from '../utils/audioPlayer';
import { realtimeBus, RealtimeMessage } from '../utils/realtimeBus';
import { AudioVisualizer } from './AudioVisualizer';

interface ConnectorViewProps {
  roomCode: string;
  guestName: string;
  onLeaveRoom: () => void;
  onOpenSettings: () => void;
  onLaunchSimulator: () => void;
}

export const ConnectorView: React.FC<ConnectorViewProps> = ({
  roomCode,
  guestName,
  onLeaveRoom,
  onOpenSettings,
  onLaunchSimulator,
}) => {
  // Connection state: 'pending' | 'accepted' | 'declined' | 'kicked'
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'accepted' | 'declined' | 'kicked'>('pending');
  const [guestId] = useState<string>(() => `guest-${Math.random().toString(36).substring(2, 9)}`);
  
  // Synced audio playback state from host
  const [currentTrack, setCurrentTrack] = useState<Track | null>(MOCK_CATALOG[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [localAudioTime, setLocalAudioTime] = useState<number>(0);
  const [localVolume, setLocalVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hostMuted, setHostMuted] = useState<boolean>(false);

  // Sync metrics
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(14);
  const [jitterMs, setJitterMs] = useState<number>(2);
  const [driftMs, setDriftMs] = useState<number>(0);

  // Tab: 'player' | 'lyrics' | 'request'
  const [activeTab, setActiveTab] = useState<'player' | 'lyrics' | 'request'>('player');

  // Song Request Search
  const [searchQuery, setSearchQuery] = useState('');
  const [requestSent, setRequestSent] = useState<string | null>(null);

  const localTimeRef = useRef<number>(0);

  // Send Join Request to Host upon mount
  useEffect(() => {
    const guest: GuestDevice = {
      id: guestId,
      name: guestName,
      deviceType: 'iphone',
      status: 'pending',
      latencyMs: 14,
      jitterMs: 2,
      volume: localVolume,
      muted: false,
      joinedAt: Date.now(),
    };

    realtimeBus.broadcast({
      type: 'GUEST_JOIN_REQUEST',
      roomCode,
      guest,
      clientSendTime: Date.now(),
    });

    // Start NTP ping loop
    const pingInterval = setInterval(() => {
      realtimeBus.broadcast({
        type: 'SYNC_PING',
        roomCode,
        guestId,
        t0: Date.now(),
      });
    }, 4000);

    return () => {
      clearInterval(pingInterval);
      audioPlayer.pause();
    };
  }, [roomCode, guestId, guestName]);

  // Listen to Host state updates & decisions
  useEffect(() => {
    const unsubscribe = realtimeBus.subscribe((msg: RealtimeMessage) => {
      if (msg.roomCode !== roomCode) return;

      if (msg.type === 'HOST_JOIN_DECISION' && msg.guestId === guestId) {
        if (msg.decision === 'accepted') {
          setConnectionStatus('accepted');
        } else {
          setConnectionStatus('declined');
        }
      }

      if (msg.type === 'HOST_KICK_GUEST' && msg.guestId === guestId) {
        setConnectionStatus('kicked');
        audioPlayer.pause();
      }

      if (msg.type === 'HOST_MUTE_GUEST' && msg.guestId === guestId) {
        setHostMuted(msg.muted);
        if (msg.muted) {
          audioPlayer.setVolume(0);
        } else {
          audioPlayer.setVolume(isMuted ? 0 : localVolume);
        }
      }

      if (msg.type === 'SYNC_PONG' && msg.guestId === guestId) {
        const t3 = Date.now();
        const syncRes = calculateClockSync(msg.t0, msg.t1, msg.t2, t3);
        setClockOffset(syncRes.clockOffset);
        setLatencyMs(Math.round(syncRes.roundTripDelay / 2));
      }

      if (msg.type === 'HOST_STATE_UPDATE') {
        // If host accepted us automatically or via dashboard
        if (connectionStatus === 'pending') {
          setConnectionStatus('accepted');
        }

        const hostTrack = msg.track;
        if (!hostTrack) return;

        // Compute expected time on guest
        const now = Date.now();
        const targetSeconds = computeSyncTargetTime(
          msg.position,
          msg.serverTimestamp,
          now,
          clockOffset,
          msg.isPlaying
        );

        // Track change
        if (!currentTrack || currentTrack.id !== hostTrack.id) {
          setCurrentTrack(hostTrack);
          if (msg.isPlaying) {
            audioPlayer.play(hostTrack.id, targetSeconds, hostTrack.bpm);
          } else {
            audioPlayer.seek(targetSeconds);
            audioPlayer.pause();
          }
        } else {
          // Play/Pause sync
          if (msg.isPlaying !== isPlaying) {
            if (msg.isPlaying) {
              audioPlayer.play(hostTrack.id, targetSeconds, hostTrack.bpm);
            } else {
              audioPlayer.pause();
            }
          }
          // Drift check
          const currentAudioTime = audioPlayer.getCurrentTime();
          const drift = calculateSyncDrift(currentAudioTime, targetSeconds);
          setDriftMs(drift.driftMs);

          if (drift.action === 'hard-seek') {
            audioPlayer.seek(targetSeconds);
          } else if (drift.action === 'soft-correct') {
            audioPlayer.setPlaybackRate(drift.playbackRateModifier);
          } else {
            audioPlayer.setPlaybackRate(1.0);
          }
        }

        setIsPlaying(msg.isPlaying);
      }
    });

    audioPlayer.onTimeUpdate((time) => {
      setLocalAudioTime(time);
      localTimeRef.current = time;
    });

    return () => {
      unsubscribe();
    };
  }, [roomCode, guestId, connectionStatus, currentTrack, isPlaying, clockOffset, localVolume, isMuted]);

  // Volume slider
  const handleVolumeChange = (newVal: number) => {
    setLocalVolume(newVal);
    if (!hostMuted) {
      if (isMuted && newVal > 0) setIsMuted(false);
      audioPlayer.setVolume(newVal);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (!hostMuted) audioPlayer.setVolume(localVolume);
    } else {
      setIsMuted(true);
      audioPlayer.setVolume(0);
    }
  };

  const handleSendSongRequest = (track: Track) => {
    realtimeBus.broadcast({
      type: 'GUEST_SONG_REQUEST',
      roomCode,
      track,
      guestName,
    });
    setRequestSent(track.id);
    setTimeout(() => setRequestSent(null), 2500);
  };

  // Active lyrics line
  const activeLyricIndex =
    currentTrack?.lyrics?.findIndex((item, i, arr) => {
      const next = arr[i + 1];
      if (!next) return localAudioTime >= item.time;
      return localAudioTime >= item.time && localAudioTime < next.time;
    }) ?? -1;

  // 1. PENDING WAITING ROOM STATE
  if (connectionStatus === 'pending') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="relative rounded-3xl bg-[#141824] border border-white/10 p-8 shadow-2xl flex flex-col items-center">
          {/* Animated Radar Pulse */}
          <div className="relative w-28 h-28 my-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping opacity-60" />
            <div className="absolute inset-2 rounded-full bg-indigo-500/20 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/25">
              <Radio className="w-8 h-8" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight">
            Waiting for Host Approval
          </h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
            Connecting as <span className="text-cyan-400 font-semibold">{guestName}</span> to Room{' '}
            <span className="font-mono text-white font-bold">{roomCode}</span>.
          </p>

          <div className="mt-6 w-full p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Host notification sent • Awaiting access</span>
          </div>

          {/* Quick Demo Helper */}
          <div className="mt-6 pt-6 border-t border-white/5 w-full">
            <p className="text-[11px] text-slate-500 mb-3">Testing in a single browser window?</p>
            <button
              onClick={onLaunchSimulator}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open Split-Screen Multi-Device Demo</span>
            </button>
          </div>

          <button
            onClick={onLeaveRoom}
            className="mt-4 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel & Exit
          </button>
        </div>
      </div>
    );
  }

  // 2. DECLINED OR KICKED STATE
  if (connectionStatus === 'declined' || connectionStatus === 'kicked') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="rounded-3xl bg-[#141824] border border-white/10 p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {connectionStatus === 'declined' ? 'Connection Declined' : 'Disconnected from Host'}
          </h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xs">
            {connectionStatus === 'declined'
              ? 'The host declined your join request for this audio session.'
              : 'The session host has disconnected this device.'}
          </p>
          <button
            onClick={onLeaveRoom}
            className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
          >
            Return to Welcome Screen
          </button>
        </div>
      </div>
    );
  }

  // 3. ACCEPTED SYNCHRONIZED PLAYBACK SCREEN
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-20 animate-fade-in">
      {/* Top Synced Status Bar */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl flex items-center justify-between gap-4 mb-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Synchronized Speaker</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-semibold border border-emerald-500/20">
                LOCKED {latencyMs}ms
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Room <span className="font-mono text-cyan-400 font-bold">{roomCode}</span> • Host Master Controlled
            </p>
          </div>
        </div>

        {/* Sync Drift Badge */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-[11px] font-mono text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Drift: {Math.abs(driftMs)}ms</span>
          </div>

          <button
            onClick={() => setActiveTab(activeTab === 'request' ? 'player' : 'request')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeTab === 'request'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-white/5 text-cyan-400 border-cyan-500/20 hover:bg-white/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Track</span>
          </button>
        </div>
      </div>

      {/* Host Mute Alert Banner */}
      {hostMuted && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <VolumeX className="w-4 h-4 shrink-0" />
          <span>Host has temporarily muted audio output on this device.</span>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'request' ? (
        /* Song Request View */
        <div className="rounded-3xl bg-[#141824] border border-white/10 p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white">Suggest a Track to Host</h3>
              <p className="text-xs text-slate-400">
                Submitted songs are automatically queued into the party mix.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('player')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Back to Player
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search songs or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="mt-4 space-y-2 max-h-[340px] overflow-y-auto">
              {MOCK_CATALOG.filter((t) =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.artist.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((track) => (
                <div
                  key={track.id}
                  className="p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{track.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendSongRequest(track)}
                    disabled={requestSent === track.id}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {requestSent === track.id ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Queued!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>Request</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Player & Lyrics View */
        <div className="rounded-3xl bg-gradient-to-b from-[#181d2c] to-[#121520] border border-white/10 p-6 sm:p-8 shadow-2xl">
          {currentTrack && (
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* Album Art with Ambient Glow */}
              <div className="relative w-56 sm:w-64 aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 shrink-0">
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white capitalize">
                  {currentTrack.source}
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Synced
                </div>
              </div>

              {/* Player Details & Visualizer */}
              <div className="flex-1 w-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                      Now Playing
                    </span>
                    <span className="text-xs text-slate-500">• {currentTrack.bpm || 120} BPM</span>
                  </div>

                  <h2 className="text-2xl font-bold text-white mt-1 tracking-tight">
                    {currentTrack.title}
                  </h2>
                  <p className="text-sm font-medium text-slate-400 mt-0.5">
                    {currentTrack.artist}
                  </p>
                </div>

                {/* Real-time Visualizer */}
                <div className="my-4">
                  <AudioVisualizer isPlaying={isPlaying && !hostMuted && !isMuted} height={42} barCount={26} />
                </div>

                {/* Synced Scrub Progress (Controlled by Host) */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.min(100, (localAudioTime / (currentTrack.duration || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>{formatTime(localAudioTime)}</span>
                    <span className="text-slate-500">Host Controlled</span>
                    <span>{formatTime(currentTrack.duration)}</span>
                  </div>
                </div>

                {/* Local Output Volume Slider */}
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-3">
                  <button
                    onClick={handleToggleMute}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || localVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : localVolume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    className="flex-1 h-1.5 rounded-full bg-slate-800 appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="font-mono text-xs text-slate-400 w-8 text-right font-medium">
                    {isMuted ? '0%' : `${localVolume}%`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Synced Lyrics Accordion */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Synced Karaoke Lyrics
                </h4>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono font-medium">
                Phase-matched to host
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2.5 p-4 rounded-2xl bg-slate-950/40 border border-white/5 text-center">
              {currentTrack?.lyrics && currentTrack.lyrics.length > 0 ? (
                currentTrack.lyrics.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  return (
                    <div
                      key={idx}
                      className={`transition-all duration-300 ${
                        isActive
                          ? 'text-cyan-300 font-bold text-sm sm:text-base drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                          : 'text-slate-500 text-xs'
                      }`}
                    >
                      {line.text}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500">Lyrics unavailable</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
