import React, { useState } from 'react';
import { Radio, Settings, Smartphone, Copy, Check, LogOut, Wifi } from 'lucide-react';

interface HeaderProps {
  roomCode?: string;
  mode: 'landing' | 'host' | 'connector';
  syncStatus?: string;
  onOpenSettings: () => void;
  onToggleSimulator: () => void;
  isSimulatorOpen: boolean;
  onLeaveRoom: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  mode,
  syncStatus = 'Synced',
  onOpenSettings,
  onToggleSimulator,
  isSimulatorOpen,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0f1117]/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
            aria-label="VSC-connect Home"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <div className="w-full h-full bg-[#12151f] rounded-[15px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse-subtle" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  VSC
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide uppercase">
                  connect
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Multi-Device Sound Sync
              </p>
            </div>
          </button>
        </div>

        {/* Center Room Code Pill if inside room */}
        {roomCode && mode !== 'landing' && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 shadow-inner">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Room:</span>
            <span className="font-mono text-xs font-bold text-cyan-400">{roomCode}</span>
            <button
              onClick={handleCopyCode}
              aria-label="Copy room code"
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Actions Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Indicator */}
          {mode !== 'landing' && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Wifi className="w-3.5 h-3.5" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* Multi-Device Simulator Toggle */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              isSimulatorOpen
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-transparent shadow-lg shadow-indigo-500/25'
                : 'bg-slate-900/80 text-slate-300 border-white/10 hover:text-white hover:border-white/20'
            }`}
            title="Toggle Live 2-Device Simulator Preview"
            aria-label="Toggle Multi-Device Simulator"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Device Simulator</span>
          </button>

          {/* API Keys Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
            title="Music API Settings"
            aria-label="Open Music API Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Exit Room */}
          {mode !== 'landing' && (
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
