import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  Radio,
  Volume2,
  VolumeX,
  Music2,
  CheckCircle,
  Play,
  Pause,
  Plus,
  Send,
  Zap,
} from 'lucide-react';
import { Track, GuestDevice, formatTime } from '../utils/syncEngine';
import { realtimeBus, RealtimeMessage } from '../utils/realtimeBus';
import { MOCK_CATALOG } from '../data/mockCatalog';
import { AudioVisualizer } from './AudioVisualizer';

interface MultiDeviceSimulatorProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MultiDeviceSimulator: React.FC<MultiDeviceSimulatorProps> = ({
  roomCode,
  isOpen,
  onClose,
}) => {
  // Simulated Guest 1 (iPhone 15 Pro)
  const [device1Status, setDevice1Status] = useState<'connected' | 'pending' | 'disconnected'>('connected');
  const [device1Track, setDevice1Track] = useState<Track | null>(MOCK_CATALOG[0]);
  const [device1Playing, setDevice1Playing] = useState<boolean>(false);
  const [device1Position, setDevice1Position] = useState<number>(0);
  const [device1Volume, setDevice1Volume] = useState<number>(85);
  const [device1Latency, setDevice1Latency] = useState<number>(14);

  // Simulated Guest 2 (Living Room Smart Speaker)
  const [device2Status, setDevice2Status] = useState<'connected' | 'pending' | 'disconnected'>('connected');
  const [device2Volume, setDevice2Volume] = useState<number>(70);
  const [device2Latency, setDevice2Latency] = useState<number>(18);

  const [activeSimDevice, setActiveSimDevice] = useState<'iphone' | 'speaker'>('iphone');
  const [requestSentNotice, setRequestSentNotice] = useState(false);

  useEffect(() => {
    const unsubscribe = realtimeBus.subscribe((msg: RealtimeMessage) => {
      if (msg.roomCode !== roomCode) return;

      if (msg.type === 'HOST_STATE_UPDATE') {
        if (msg.track) {
          setDevice1Track(msg.track);
        }
        setDevice1Playing(msg.isPlaying);
        setDevice1Position(msg.position);
      }

      if (msg.type === 'HOST_JOIN_DECISION') {
        if (msg.guestId === 'sim-iphone') {
          setDevice1Status(msg.decision === 'accepted' ? 'connected' : 'disconnected');
        }
        if (msg.guestId === 'sim-speaker') {
          setDevice2Status(msg.decision === 'accepted' ? 'connected' : 'disconnected');
        }
      }

      if (msg.type === 'HOST_KICK_GUEST') {
        if (msg.guestId === 'sim-iphone') setDevice1Status('disconnected');
        if (msg.guestId === 'sim-speaker') setDevice2Status('disconnected');
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  if (!isOpen) return null;

  // Trigger a new join request from simulated guest
  const handleSimulateNewJoin = (deviceId: string, name: string) => {
    if (deviceId === 'sim-iphone') setDevice1Status('pending');
    if (deviceId === 'sim-speaker') setDevice2Status('pending');

    const guest: GuestDevice = {
      id: deviceId,
      name,
      deviceType: deviceId === 'sim-iphone' ? 'iphone' : 'speaker',
      status: 'pending',
      latencyMs: Math.floor(Math.random() * 8) + 12,
      jitterMs: 2,
      volume: 80,
      muted: false,
      joinedAt: Date.now(),
    };

    realtimeBus.broadcast({
      type: 'GUEST_JOIN_REQUEST',
      roomCode,
      guest,
      clientSendTime: Date.now(),
    });
  };

  const handleSimulateSongRequest = () => {
    // Pick an unqueued song from catalog
    const randomTrack = MOCK_CATALOG[3];
    realtimeBus.broadcast({
      type: 'GUEST_SONG_REQUEST',
      roomCode,
      track: randomTrack,
      guestName: "Simulated iPhone",
    });
    setRequestSentNotice(true);
    setTimeout(() => setRequestSentNotice(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0f111a]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col justify-between p-5 animate-slide-left">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Multi-Device Studio Simulator
              </h3>
              <p className="text-[11px] text-slate-400">
                Live interactive guest preview synchronized to Room {roomCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
            aria-label="Close simulator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Switcher Pills */}
        <div className="mt-4 flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-white/5">
          <button
            onClick={() => setActiveSimDevice('iphone')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSimDevice === 'iphone'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone 15 Pro</span>
          </button>
          <button
            onClick={() => setActiveSimDevice('speaker')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSimDevice === 'speaker'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Living Room Speaker</span>
          </button>
        </div>

        {/* Simulated Phone Shell */}
        <div className="mt-5 rounded-3xl bg-slate-950 p-4 border-2 border-slate-700/80 shadow-2xl relative overflow-hidden">
          {/* Dynamic Island Notch */}
          <div className="w-24 h-4 rounded-full bg-black mx-auto mb-3 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[8px] font-mono text-slate-400">VSC</span>
          </div>

          {activeSimDevice === 'iphone' ? (
            <div>
              {device1Status === 'connected' ? (
                <div className="space-y-3">
                  {/* Status chip */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Phase Locked • {device1Latency}ms
                    </span>
                    <span className="text-slate-400 font-medium">Guest Device</span>
                  </div>

                  {/* Album Cover & Track Info */}
                  {device1Track && (
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/90 border border-white/5">
                      <img
                        src={device1Track.coverUrl}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                          Now Playing
                        </span>
                        <p className="text-xs font-bold text-white truncate">{device1Track.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{device1Track.artist}</p>
                      </div>
                    </div>
                  )}

                  {/* Frequency Visualizer */}
                  <AudioVisualizer isPlaying={device1Playing} height={36} barCount={20} />

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                        style={{
                          width: `${Math.min(100, (device1Position / (device1Track?.duration || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>{formatTime(device1Position)}</span>
                      <span>{device1Playing ? 'Playing' : 'Paused'}</span>
                      <span>{formatTime(device1Track?.duration || 0)}</span>
                    </div>
                  </div>

                  {/* Guest Local Volume */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={device1Volume}
                      onChange={(e) => setDevice1Volume(parseInt(e.target.value))}
                      className="flex-1 h-1 rounded bg-slate-800 accent-indigo-500"
                    />
                    <span className="text-[10px] font-mono text-slate-400">{device1Volume}%</span>
                  </div>
                </div>
              ) : device1Status === 'pending' ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                    <Radio className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-white">Pending Approval...</p>
                  <p className="text-[10px] text-slate-400">
                    Host must click "Accept" in the Host Dashboard to approve this iPhone.
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-slate-400">Device is currently disconnected.</p>
                  <button
                    onClick={() => handleSimulateNewJoin('sim-iphone', "Alex's iPhone 15 Pro")}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow"
                  >
                    Simulate Connect Request
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Smart Speaker view */
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Stereo Hub Active
                </span>
                <span className="text-slate-400">Smart Speaker</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 text-center">
                <Radio className="w-8 h-8 text-cyan-400 mx-auto mb-1 animate-pulse" />
                <p className="text-xs font-bold text-white">Living Room Smart Speaker</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Phase Drift ~0.02ms • Stream Quality: 320kbps
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={device2Volume}
                  onChange={(e) => setDevice2Volume(parseInt(e.target.value))}
                  className="flex-1 h-1 rounded bg-slate-800 accent-cyan-400"
                />
                <span className="text-[10px] font-mono text-slate-400">{device2Volume}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Simulator Interactions */}
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Test Real-Time Actions
          </p>

          <button
            onClick={handleSimulateSongRequest}
            disabled={requestSentNotice}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {requestSentNotice ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Track Pushed to Host Queue!</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Guest Requests Song to Host</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleSimulateNewJoin('sim-guest-new', 'Guest AirPods Max')}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Simulate New Guest Joining Room</span>
          </button>
        </div>
      </div>

      {/* Simulator Footer */}
      <div className="pt-4 border-t border-white/10 text-center">
        <p className="text-[10px] text-slate-500">
          Powered by Web Audio API & BroadcastChannel for zero-latency inter-device emulation.
        </p>
      </div>
    </div>
  );
};
