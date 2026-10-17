import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { HostDashboard } from './components/HostDashboard';
import { ConnectorView } from './components/ConnectorView';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { MultiDeviceSimulator } from './components/MultiDeviceSimulator';
import { generateRoomCode } from './utils/syncEngine';

export default function App() {
  const [mode, setMode] = useState<'landing' | 'host' | 'connector'>('landing');
  const [roomCode, setRoomCode] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('My Device');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);

  // Check URL query parameters (e.g., ?autostart=1 or ?room=VSC-8492)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' || params.get('mode') === 'host') {
      const code = params.get('room') || 'VSC-8492';
      setRoomCode(code);
      setMode('host');
    } else if (params.get('mode') === 'connector' && params.get('room')) {
      setRoomCode(params.get('room')!);
      setGuestName(params.get('name') || "Harsha's iPhone");
      setMode('connector');
    }
  }, []);

  // Handlers
  const handleCreateRoom = () => {
    const newCode = generateRoomCode();
    setRoomCode(newCode);
    setMode('host');
  };

  const handleJoinRoom = (code: string, name: string) => {
    setRoomCode(code);
    setGuestName(name);
    setMode('connector');
  };

  const handleLaunchDemoSimulator = () => {
    const demoCode = 'VSC-8492';
    setRoomCode(demoCode);
    setMode('host');
    setIsSimulatorOpen(true);
  };

  const handleLeaveRoom = () => {
    setMode('landing');
    setRoomCode('');
    setIsSimulatorOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Global Navigation Header */}
      <Header
        roomCode={roomCode}
        mode={mode}
        syncStatus={mode === 'host' ? 'Host Master • Locked' : 'Synced • Drift < 15ms'}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleSimulator={() => setIsSimulatorOpen((prev) => !prev)}
        isSimulatorOpen={isSimulatorOpen}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {mode === 'landing' && (
          <LandingView
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onLaunchDemoSimulator={handleLaunchDemoSimulator}
          />
        )}

        {mode === 'host' && (
          <HostDashboard
            roomCode={roomCode}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLaunchSimulator={() => setIsSimulatorOpen(true)}
          />
        )}

        {mode === 'connector' && (
          <ConnectorView
            roomCode={roomCode}
            guestName={guestName}
            onLeaveRoom={handleLeaveRoom}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLaunchSimulator={() => setIsSimulatorOpen(true)}
          />
        )}
      </main>

      {/* Music API Credentials Settings Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Multi-Device Interactive Studio Simulator Drawer */}
      <MultiDeviceSimulator
        roomCode={roomCode || 'VSC-8492'}
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
}
