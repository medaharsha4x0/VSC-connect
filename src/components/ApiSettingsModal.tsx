import React, { useState } from 'react';
import { X, Key, Music, Video, CheckCircle, ExternalLink, Info, ShieldCheck } from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [spotifyClientId, setSpotifyClientId] = useState(() => localStorage.getItem('vsc_spotify_client_id') || '');
  const [spotifyClientSecret, setSpotifyClientSecret] = useState(() => localStorage.getItem('vsc_spotify_client_secret') || '');
  const [youtubeApiKey, setYoutubeApiKey] = useState(() => localStorage.getItem('vsc_youtube_api_key') || '');
  const [useSimulation, setUseSimulation] = useState<boolean>(() => {
    const val = localStorage.getItem('vsc_use_simulation');
    return val !== null ? val === 'true' : true;
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('vsc_spotify_client_id', spotifyClientId);
    localStorage.setItem('vsc_spotify_client_secret', spotifyClientSecret);
    localStorage.setItem('vsc_youtube_api_key', youtubeApiKey);
    localStorage.setItem('vsc_use_simulation', String(useSimulation));
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#141824] border border-white/10 p-6 sm:p-8 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 id="api-settings-title" className="text-xl font-bold tracking-tight text-white">
                Music Streaming APIs
              </h2>
              <p className="text-xs text-slate-400">Configure Spotify Web API & YouTube Music endpoints</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close API settings modal"
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simulation Mode Toggle Card */}
        <div className="mt-6 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white">Simulated Demo Mode (Recommended)</h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Uses our pre-cached, zero-latency catalog with real audio synthesis and lyrics. Works instantly without requiring external developer accounts.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={useSimulation}
            onClick={() => setUseSimulation(!useSimulation)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              useSimulation ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                useSimulation ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Spotify Section */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
                <Music className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">Spotify Web API</h3>
            </div>
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              Get Keys <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Spotify Client ID
              </label>
              <input
                type="text"
                placeholder="e.g. 4a8e63b... (Leave blank for simulation)"
                value={spotifyClientId}
                onChange={(e) => setSpotifyClientId(e.target.value)}
                disabled={useSimulation}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Spotify Client Secret
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={spotifyClientSecret}
                onChange={(e) => setSpotifyClientSecret(e.target.value)}
                disabled={useSimulation}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* YouTube Section */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#FF0000]/20 flex items-center justify-center text-[#FF0000]">
                <Video className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">YouTube Data API v3</h3>
            </div>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              GCP Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Google Cloud API Key (YouTube Data API v3)
            </label>
            <input
              type="password"
              placeholder="AIzaSy... (Leave blank for simulation)"
              value={youtubeApiKey}
              onChange={(e) => setYoutubeApiKey(e.target.value)}
              disabled={useSimulation}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Notice Info */}
        <div className="mt-6 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Keys are stored strictly in client-side storage (`localStorage`) and never transmitted to external telemetry servers.
          </span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold tracking-wide shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" /> Saved!
              </>
            ) : (
              'Save API Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
