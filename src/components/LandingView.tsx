import React, { useState } from 'react';
import { Radio, Users, Sparkles, Music2, Disc3, Shield, ArrowRight, Play, Cpu, Layers } from 'lucide-react';
import { normalizeRoomCode, isValidRoomCode } from '../utils/syncEngine';

interface LandingViewProps {
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string, guestName: string) => void;
  onLaunchDemoSimulator: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onCreateRoom,
  onJoinRoom,
  onLaunchDemoSimulator,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [guestName, setGuestName] = useState('My iPhone 15 Pro');
  const [showQuickJoinModal, setShowQuickJoinModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(inputCode);
    if (!isValidRoomCode(normalized)) {
      setErrorMsg('Please enter a valid 4-character code (e.g. VSC-8492 or 8492)');
      return;
    }
    if (!guestName.trim()) {
      setErrorMsg('Please specify a device display name');
      return;
    }
    setErrorMsg('');
    onJoinRoom(normalized, guestName.trim());
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-cyan-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-indigo-900/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Main Hero & Action Cards */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 flex-1 flex flex-col items-center text-center justify-center">
        {/* Top Mobbin pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md shadow-lg shadow-indigo-500/10 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Real-time Mesh Audio Protocol
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            v2.4
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-white">
          Sync Your Sound{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent">
            Across All Devices
          </span>
        </h1>

        {/* Tagline */}
        <p className="mt-5 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl font-normal leading-relaxed">
          Transform smartphones, laptops, and speakers into a synchronized multi-room audio system.
          Sub-20ms phase lock, master queue moderation, and synchronized lyrics.
        </p>

        {/* 2 Main Action Cards (Host & Connector) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Create Room Card */}
          <div className="relative group rounded-3xl bg-gradient-to-b from-[#171b29] to-[#121520] border border-white/10 p-7 text-left shadow-2xl hover:border-indigo-500/40 hover:shadow-indigo-500/15 transition-all duration-300 flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
              <Disc3 className="w-24 h-24 text-indigo-400" />
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5 shadow-inner">
                <Radio className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Create Room</h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mt-1">Host Mode</p>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Broadcast music, approve or decline guest connection requests, search Spotify & YouTube tracks, and maintain master playback control.
              </p>
            </div>

            <div className="mt-8">
              <button
                onClick={onCreateRoom}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>Create Room as Host</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="relative group rounded-3xl bg-gradient-to-b from-[#171b29] to-[#121520] border border-white/10 p-7 text-left shadow-2xl hover:border-cyan-500/40 hover:shadow-cyan-500/15 transition-all duration-300 flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-24 h-24 text-cyan-400" />
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-5 shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Join Room</h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mt-1">Connector Mode</p>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Enter a 6-digit room code to join an active sound session. Enjoy millisecond-synced playback, live scrolling lyrics, and song requests.
              </p>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowQuickJoinModal(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>Enter Room Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Demo Simulator CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onLaunchDemoSimulator}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-slate-900/90 border border-white/15 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-semibold shadow-md transition-all active:scale-95 group"
          >
            <Layers className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span>Launch Multi-Device Studio Simulator</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase">
              Side-by-Side
            </span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl text-left">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
            <Cpu className="w-5 h-5 text-indigo-400 mb-2.5" />
            <h3 className="text-sm font-bold text-white">NTP Clock Drift Sync</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Calculates round-trip delay and dynamically modulates playback rate to eliminate audio phasing.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
            <Music2 className="w-5 h-5 text-cyan-400 mb-2.5" />
            <h3 className="text-sm font-bold text-white">Dual Streaming Search</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Search and play curated Spotify and YouTube Music libraries with API key options.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
            <Shield className="w-5 h-5 text-emerald-400 mb-2.5" />
            <h3 className="text-sm font-bold text-white">Host Access Control</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Accept or decline incoming connections, mute specific speaker zones, and moderate track suggestions.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
            <Sparkles className="w-5 h-5 text-amber-400 mb-2.5" />
            <h3 className="text-sm font-bold text-white">Live Synced Lyrics</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Karaoke lyrics scroll automatically in sync with the audio track across all listener devices.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Join Modal */}
      {showQuickJoinModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[#141824] border border-white/10 p-6 sm:p-8 shadow-2xl text-slate-100">
            <h3 className="text-xl font-bold text-white">Join Sound Session</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter the 6-digit room code shown on the host's screen.
            </p>

            <form onSubmit={handleQuickJoinSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Room Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. VSC-8492 or 8492"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setErrorMsg('');
                  }}
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-center font-mono text-lg font-bold tracking-widest text-cyan-400 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Device Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Harsha's AirPods, Living Room Speaker"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  {errorMsg}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickJoinModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
                >
                  Connect Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
