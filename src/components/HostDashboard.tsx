import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Search,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  UserCheck,
  Radio,
  SlidersHorizontal,
  Music,
  Share2,
  Copy,
  Sparkles,
  Smartphone,
  Laptop,
  Tablet,
  Speaker,
  HelpCircle,
  Clock,
  ListMusic,
  FileText,
  Repeat,
  Shuffle,
  ThumbsUp,
} from 'lucide-react';
import { Track, GuestDevice, HostSettings, formatTime, addToQueue, removeFromQueue, reorderQueue, voteTrack } from '../utils/syncEngine';
import { MOCK_CATALOG } from '../data/mockCatalog';
import { audioPlayer } from '../utils/audioPlayer';
import { realtimeBus } from '../utils/realtimeBus';
import { AudioVisualizer } from './AudioVisualizer';

interface HostDashboardProps {
  roomCode: string;
  onOpenSettings: () => void;
  onLaunchSimulator: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  roomCode,
  onOpenSettings,
  onLaunchSimulator,
}) => {
  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track>(MOCK_CATALOG[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);

  // Queue state
  const [queue, setQueue] = useState<Track[]>([
    MOCK_CATALOG[1],
    MOCK_CATALOG[2],
    MOCK_CATALOG[4],
  ]);

  // Connected devices & pending requests
  const [guests, setGuests] = useState<GuestDevice[]>([
    {
      id: 'demo-iphone',
      name: "Harsha's iPhone 15 Pro",
      deviceType: 'iphone',
      status: 'accepted',
      latencyMs: 14,
      jitterMs: 2,
      volume: 85,
      muted: false,
      joinedAt: Date.now() - 120000,
    },
    {
      id: 'demo-macbook',
      name: 'Studio MacBook Pro',
      deviceType: 'macbook',
      status: 'accepted',
      latencyMs: 18,
      jitterMs: 3,
      volume: 70,
      muted: false,
      joinedAt: Date.now() - 60000,
    },
  ]);

  // Settings
  const [hostSettings, setHostSettings] = useState<HostSettings>({
    allowGuestSongRequests: true,
    allowGuestPlaybackControl: false,
    autoAcceptGuests: false,
    targetSyncPrecisionMs: 20,
    broadcastQuality: 'hi-res',
  });

  // Active tab in lower panel: 'catalog' | 'queue' | 'devices' | 'lyrics'
  const [activeTab, setActiveTab] = useState<'catalog' | 'queue' | 'devices' | 'lyrics'>('catalog');

  // Search & Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<'all' | 'spotify' | 'youtube'>('all');
  const [copiedCode, setCopiedCode] = useState(false);

  // Set up audio updates and realtime event handling
  useEffect(() => {
    audioPlayer.onTimeUpdate((time) => {
      setCurrentTime(time);
      if (currentTrack && time >= currentTrack.duration) {
        handleNextTrack();
      }
    });

    const unsubscribe = realtimeBus.subscribe((msg) => {
      if (msg.roomCode !== roomCode) return;

      if (msg.type === 'GUEST_JOIN_REQUEST') {
        const guestData = msg.guest;
        if (hostSettings.autoAcceptGuests) {
          guestData.status = 'accepted';
          setGuests((prev) => [...prev.filter((g) => g.id !== guestData.id), guestData]);
          realtimeBus.broadcast({
            type: 'HOST_JOIN_DECISION',
            roomCode,
            guestId: guestData.id,
            decision: 'accepted',
            hostReplyTime: Date.now(),
          });
        } else {
          // Add as pending
          setGuests((prev) => {
            const exists = prev.find((g) => g.id === guestData.id);
            if (exists) return prev;
            return [...prev, { ...guestData, status: 'pending' }];
          });
        }
      }

      if (msg.type === 'GUEST_SONG_REQUEST') {
        if (hostSettings.allowGuestSongRequests) {
          setQueue((prev) => addToQueue(prev, msg.track, msg.guestName));
        }
      }

      if (msg.type === 'SYNC_PING') {
        realtimeBus.broadcast({
          type: 'SYNC_PONG',
          roomCode,
          guestId: msg.guestId,
          t0: msg.t0,
          t1: Date.now(),
          t2: Date.now() + 1,
        });
      }
    });

    return () => {
      unsubscribe();
      audioPlayer.pause();
    };
  }, [roomCode, hostSettings, currentTrack]);

  // Periodic broadcast of host playback state to all devices
  useEffect(() => {
    const broadcastState = () => {
      realtimeBus.broadcast({
        type: 'HOST_STATE_UPDATE',
        roomCode,
        track: currentTrack,
        isPlaying,
        position: currentTime,
        serverTimestamp: Date.now(),
        queue,
      });
    };

    broadcastState();
    const interval = setInterval(broadcastState, 800);
    return () => clearInterval(interval);
  }, [roomCode, currentTrack, isPlaying, currentTime, queue]);

  // Playback handlers
  const handleTogglePlay = async () => {
    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      await audioPlayer.play(currentTrack.id, currentTime, currentTrack.bpm);
      setIsPlaying(true);
    }
  };

  const handleSeek = (newSec: number) => {
    setCurrentTime(newSec);
    audioPlayer.seek(newSec);
  };

  const handleNextTrack = () => {
    if (queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrentTrack(next);
      setCurrentTime(0);
      if (isPlaying) {
        audioPlayer.play(next.id, 0, next.bpm);
      }
    } else {
      audioPlayer.seek(0);
      setCurrentTime(0);
      if (!isRepeat) {
        setIsPlaying(false);
        audioPlayer.pause();
      }
    }
  };

  const handlePrevTrack = () => {
    if (currentTime > 3) {
      handleSeek(0);
    } else {
      handleSeek(0);
    }
  };

  const handleVolumeChange = (newVal: number) => {
    setMasterVolume(newVal);
    if (isMuted && newVal > 0) {
      setIsMuted(false);
    }
    audioPlayer.setVolume(newVal);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioPlayer.setVolume(masterVolume);
    } else {
      setIsMuted(true);
      audioPlayer.setVolume(0);
    }
  };

  // Guest Management
  const handleAcceptGuest = (guestId: string) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, status: 'accepted' } : g))
    );
    realtimeBus.broadcast({
      type: 'HOST_JOIN_DECISION',
      roomCode,
      guestId,
      decision: 'accepted',
      hostReplyTime: Date.now(),
    });
  };

  const handleDeclineGuest = (guestId: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    realtimeBus.broadcast({
      type: 'HOST_JOIN_DECISION',
      roomCode,
      guestId,
      decision: 'declined',
      hostReplyTime: Date.now(),
    });
  };

  const handleKickGuest = (guestId: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    realtimeBus.broadcast({
      type: 'HOST_KICK_GUEST',
      roomCode,
      guestId,
    });
  };

  const handleToggleMuteGuest = (guestId: string) => {
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id === guestId) {
          const nextMuted = !g.muted;
          realtimeBus.broadcast({
            type: 'HOST_MUTE_GUEST',
            roomCode,
            guestId,
            muted: nextMuted,
          });
          return { ...g, muted: nextMuted };
        }
        return g;
      })
    );
  };

  // Filtering songs for catalog
  const filteredCatalog = MOCK_CATALOG.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource =
      selectedSource === 'all' || t.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  const pendingGuests = guests.filter((g) => g.status === 'pending');
  const acceptedGuests = guests.filter((g) => g.status === 'accepted');

  const getDeviceIcon = (type: GuestDevice['deviceType']) => {
    switch (type) {
      case 'iphone':
      case 'pixel':
        return <Smartphone className="w-4 h-4 text-cyan-400" />;
      case 'macbook':
        return <Laptop className="w-4 h-4 text-indigo-400" />;
      case 'ipad':
        return <Tablet className="w-4 h-4 text-purple-400" />;
      case 'speaker':
        return <Speaker className="w-4 h-4 text-emerald-400" />;
      default:
        return <Smartphone className="w-4 h-4 text-slate-400" />;
    }
  };

  // Current active lyrics line
  const activeLyricIndex =
    currentTrack.lyrics?.findIndex((item, i, arr) => {
      const next = arr[i + 1];
      if (!next) return currentTime >= item.time;
      return currentTime >= item.time && currentTime < next.time;
    }) ?? -1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* Top Host Stats Banner */}
      <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Broadcast Room:
              </span>
              <span className="font-mono text-lg font-extrabold text-cyan-400 tracking-wider">
                {roomCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 1500);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Copy Room Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Host Master Node • Sub-20ms NTP Multi-Device Audio Protocol
            </p>
          </div>
        </div>

        {/* Sync Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-emerald-300">Phase Locked</span>
            <span className="text-[10px] text-emerald-400/80 font-mono">±14ms</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{acceptedGuests.length} Devices Synced</span>
          </div>

          <button
            onClick={onLaunchSimulator}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Open Simulator</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Master Player (Left) + Operations / Queue / Devices (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Master Audio Player Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="relative rounded-3xl bg-gradient-to-b from-[#181d2c] to-[#121520] border border-white/10 p-6 sm:p-7 shadow-2xl overflow-hidden flex flex-col justify-between">
            {/* Ambient Backdrop Glow */}
            <div
              className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-25"
              style={{
                backgroundImage: `url(${currentTrack.coverUrl})`,
                backgroundSize: 'cover',
              }}
            />

            {/* Album Artwork & Visualizer */}
            <div className="relative">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 group">
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Source Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-[11px] font-semibold text-white">
                  {currentTrack.source === 'spotify' ? (
                    <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#FF0000]" />
                  )}
                  <span className="capitalize">{currentTrack.source}</span>
                </div>

                {/* Live BPM tag */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono font-medium text-cyan-300">
                  {currentTrack.bpm || 120} BPM
                </div>
              </div>

              {/* Real-time Frequency Visualizer */}
              <div className="mt-4">
                <AudioVisualizer isPlaying={isPlaying} height={48} barCount={32} />
              </div>
            </div>

            {/* Track Info */}
            <div className="mt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                    {currentTrack.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-400 mt-0.5">
                    {currentTrack.artist} • <span className="text-slate-500">{currentTrack.album}</span>
                  </p>
                </div>
              </div>

              {/* Scrubber Progress Bar */}
              <div className="mt-5 space-y-1.5">
                <div className="relative group">
                  <input
                    type="range"
                    min={0}
                    max={currentTrack.duration}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full bg-slate-800 appearance-none cursor-pointer accent-indigo-500 group-hover:h-2 transition-all"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 font-medium">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(currentTrack.duration)}</span>
                </div>
              </div>

              {/* Master Control Buttons */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-2 rounded-full transition-colors ${
                    isShuffle ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevTrack}
                    className="p-3 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Previous"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 hover:from-indigo-600 hover:to-cyan-500 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
                    title={isPlaying ? 'Pause' : 'Play'}
                    aria-label={isPlaying ? 'Pause master audio' : 'Play master audio'}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className="p-3 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Next Track"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-2 rounded-full transition-colors ${
                    isRepeat ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Repeat"
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>

              {/* Master Volume Slider */}
              <div className="mt-6 pt-5 border-t border-white/5 flex items-center gap-3">
                <button
                  onClick={handleToggleMute}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  {isMuted || masterVolume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-slate-300" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : masterVolume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="flex-1 h-1.5 rounded-full bg-slate-800 appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="font-mono text-xs text-slate-400 w-8 text-right font-medium">
                  {isMuted ? '0%' : `${masterVolume}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Tabbed Workspace (Catalog, Queue, Devices, Lyrics) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Pending Guest Requests Alert (If any) */}
          {pendingGuests.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {pendingGuests.length}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200">
                    Connection Request Pending
                  </h4>
                  <p className="text-[11px] text-amber-300/80">
                    {pendingGuests[0].name} wants to connect to audio mesh.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAcceptGuest(pendingGuests[0].id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDeclineGuest(pendingGuests[0].id)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between p-1.5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-1 overflow-x-auto w-full">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'catalog'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search & Catalog</span>
              </button>

              <button
                onClick={() => setActiveTab('queue')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'queue'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Queue ({queue.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('devices')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === 'devices'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Devices ({acceptedGuests.length})</span>
                {pendingGuests.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('lyrics')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'lyrics'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Live Lyrics</span>
              </button>
            </div>
          </div>

          {/* Tab Content Panel */}
          <div className="rounded-3xl bg-[#141824] border border-white/10 p-5 sm:p-6 shadow-2xl min-h-[460px] flex flex-col justify-between">
            {/* TAB 1: Search & Catalog */}
            {activeTab === 'catalog' && (
              <div className="space-y-4 flex-1">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search Spotify or YouTube catalog..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => setSelectedSource('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedSource === 'all'
                          ? 'bg-white/10 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedSource('spotify')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        selectedSource === 'spotify'
                          ? 'bg-[#1DB954]/20 text-[#1DB954] font-bold border border-[#1DB954]/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                      Spotify
                    </button>
                    <button
                      onClick={() => setSelectedSource('youtube')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        selectedSource === 'youtube'
                          ? 'bg-[#FF0000]/20 text-[#FF0000] font-bold border border-[#FF0000]/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000]" />
                      YouTube
                    </button>
                  </div>
                </div>

                {/* Catalog Tracks List */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredCatalog.map((track) => (
                    <div
                      key={track.id}
                      className="group p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                            {track.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {track.artist} • <span className="capitalize text-slate-500">{track.source}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">
                          {formatTime(track.duration)}
                        </span>
                        <button
                          onClick={() => {
                            setCurrentTrack(track);
                            setCurrentTime(0);
                            audioPlayer.play(track.id, 0, track.bpm);
                            setIsPlaying(true);
                          }}
                          className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white transition-all"
                          title="Play Now"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => setQueue((prev) => addToQueue(prev, track, 'Host'))}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                          title="Add to Up Next Queue"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Queue */}
            {activeTab === 'queue' && (
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Up Next ({queue.length} tracks)
                  </span>
                  {queue.length > 0 && (
                    <button
                      onClick={() => setQueue([])}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                    >
                      Clear Queue
                    </button>
                  )}
                </div>

                {queue.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <ListMusic className="w-10 h-10 mb-2 opacity-40 text-indigo-400" />
                    <p className="text-sm font-semibold text-slate-300">The queue is empty</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Search the catalog or allow connected guests to request songs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {queue.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-slate-500 w-4 text-center">
                            {index + 1}
                          </span>
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{item.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {item.artist}
                              {item.requestedBy && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-semibold border border-cyan-500/20">
                                  via {item.requestedBy}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Upvote button */}
                          <button
                            onClick={() => setQueue((prev) => voteTrack(prev, item.id, 1))}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors flex items-center gap-1"
                            title="Upvote song"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono font-bold text-emerald-400">
                              {item.votes || 0}
                            </span>
                          </button>

                          {/* Reorder Up/Down */}
                          <button
                            disabled={index === 0}
                            onClick={() => setQueue((prev) => reorderQueue(prev, index, index - 1))}
                            className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            disabled={index === queue.length - 1}
                            onClick={() => setQueue((prev) => reorderQueue(prev, index, index + 1))}
                            className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Remove */}
                          <button
                            onClick={() => setQueue((prev) => removeFromQueue(prev, item.id))}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remove from Queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Connected Devices & Access Control */}
            {activeTab === 'devices' && (
              <div className="space-y-5 flex-1">
                {/* Pending Requests Section */}
                {pendingGuests.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
                      Pending Approvals ({pendingGuests.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingGuests.map((g) => (
                        <div
                          key={g.id}
                          className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                              {getDeviceIcon(g.deviceType)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{g.name}</p>
                              <p className="text-[10px] text-amber-300 font-mono">
                                Latency ~{g.latencyMs}ms
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptGuest(g.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineGuest(g.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 font-semibold text-xs"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Synced Devices List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Synced Devices ({acceptedGuests.length})
                    </h4>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> All Devices Phase Synced
                    </span>
                  </div>

                  {acceptedGuests.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-slate-500">
                      <Radio className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
                      <p className="text-xs">No guest devices connected yet.</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Share room code <span className="font-mono text-cyan-400">{roomCode}</span> to join.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {acceptedGuests.map((g) => (
                        <div
                          key={g.id}
                          className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
                              {getDeviceIcon(g.deviceType)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{g.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-emerald-400">
                                  {g.latencyMs}ms delay
                                </span>
                                <span className="text-[10px] text-slate-500">•</span>
                                <span className="text-[10px] font-mono text-cyan-400">
                                  Jitter {g.jitterMs}ms
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Device Mute */}
                            <button
                              onClick={() => handleToggleMuteGuest(g.id)}
                              className={`p-2 rounded-xl border transition-colors ${
                                g.muted
                                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                              }`}
                              title={g.muted ? 'Unmute Device' : 'Mute Device'}
                            >
                              {g.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>

                            {/* Kick Device */}
                            <button
                              onClick={() => handleKickGuest(g.id)}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              title="Disconnect Device"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Host Control Permissions Toggles */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Host Policy & Permissions
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-white/5 cursor-pointer">
                      <span className="text-slate-300">Allow Guest Song Requests</span>
                      <input
                        type="checkbox"
                        checked={hostSettings.allowGuestSongRequests}
                        onChange={(e) =>
                          setHostSettings((prev) => ({
                            ...prev,
                            allowGuestSongRequests: e.target.checked,
                          }))
                        }
                        className="rounded accent-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-white/5 cursor-pointer">
                      <span className="text-slate-300">Auto-Accept New Guests</span>
                      <input
                        type="checkbox"
                        checked={hostSettings.autoAcceptGuests}
                        onChange={(e) =>
                          setHostSettings((prev) => ({
                            ...prev,
                            autoAcceptGuests: e.target.checked,
                          }))
                        }
                        className="rounded accent-indigo-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Live Synced Lyrics */}
            {activeTab === 'lyrics' && (
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Karaoke Synced Lyrics
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono font-medium">
                    Auto-scrolling with audio
                  </span>
                </div>

                <div className="flex-1 max-h-[360px] overflow-y-auto space-y-4 py-6 px-2 text-center">
                  {currentTrack.lyrics && currentTrack.lyrics.length > 0 ? (
                    currentTrack.lyrics.map((line, idx) => {
                      const isActive = idx === activeLyricIndex;
                      return (
                        <div
                          key={idx}
                          className={`transition-all duration-300 cursor-pointer ${
                            isActive
                              ? 'text-white text-base sm:text-lg font-bold scale-105 text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                              : 'text-slate-500 text-xs sm:text-sm font-medium hover:text-slate-300'
                          }`}
                          onClick={() => handleSeek(line.time)}
                        >
                          {line.text}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500">No synchronized lyrics for this track.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
