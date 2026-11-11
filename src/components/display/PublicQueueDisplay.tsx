import React, { useState, useEffect } from 'react';
import { queueService, subscribeLocalQueue } from '../../services/queueService';
import { clinicService } from '../../services/clinicService';
import { useRealtime } from '../../context/RealtimeContext';
import { QueueEntry, Clinic } from '../../types/database';
import { formatTime } from '../../lib/utils';
import { 
  Tv, 
  Volume2, 
  Clock, 
  Wifi, 
  WifiOff, 
  Activity, 
  MapPin, 
  Building2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const PublicQueueDisplay: React.FC = () => {
  const { connectionStatus, lastPingMs, recentQueueEvent } = useRealtime();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());

  // Clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshDisplayQueue = async () => {
    const [cList, qList] = await Promise.all([
      clinicService.getClinics(),
      queueService.getQueueEntries(),
    ]);
    setClinics(cList);
    setQueueEntries(qList);
    setLastSyncTime(new Date());
  };

  useEffect(() => {
    refreshDisplayQueue();

    // Same-tab listener (when display is in same tab as receptionist)
    const unsub = subscribeLocalQueue(() => {
      refreshDisplayQueue();
    });

    // Cross-tab listener: fires instantly when another tab writes to localStorage
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'hospital_local_queue_v1' && e.newValue) {
        // Re-use the full refresh so entries are properly hydrated with
        // patient / clinic / doctor sub-objects from INITIAL_ arrays
        refreshDisplayQueue();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Polling fallback every 5 s (catches any edge-cases the events miss)
    const interval = setInterval(refreshDisplayQueue, 5000);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(interval);
    };
  }, []);

  // Filter for display
  const currentClinic = clinics.find(c => c.id === selectedClinicId);
  const filteredQueue = selectedClinicId 
    ? queueEntries.filter(q => q.clinic_id === selectedClinicId)
    : queueEntries;

  // Most prominent actively called or recalled token
  const activeCalledToken = filteredQueue.find(q => q.status === 'called' || q.status === 'recalled');

  // Recently called / in-consultation tokens list
  const recentCalls = filteredQueue
    .filter(q => ['called', 'recalled', 'consulting'].includes(q.status))
    .slice(0, 8);

  const waitingTokens = filteredQueue
    .filter(q => q.status === 'waiting')
    .slice(0, 10);

  // Optional voice/chime audio announcement using Web Speech API
  const playAnnouncement = (tokenNum: string, room: string, isRecall: boolean) => {
    if (!isAudioEnabled || !('speechSynthesis' in window)) return;
    try {
      const text = isRecall
        ? `Attention. Recall notice. Token ${tokenNum}, please report to ${room}.`
        : `Token ${tokenNum}, please proceed to ${room}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Announce when new token called
  useEffect(() => {
    if (activeCalledToken && isAudioEnabled) {
      playAnnouncement(
        activeCalledToken.token_number,
        activeCalledToken.counter_or_room || 'Room 101',
        activeCalledToken.status === 'recalled'
      );
    }
  }, [activeCalledToken?.id, activeCalledToken?.status, activeCalledToken?.recall_count]);

  const isDisconnected = connectionStatus === 'disconnected';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
      {/* Top TV Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shadow-lg">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">IDH / NIID HOSPITAL</h1>
              <span className="px-2.5 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Waiting Hall Board
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">National Institute of Infectious Diseases • Project G05 Queue System</p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-4">
          {/* Clinic Selector for Multi-Screen setups */}
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <Building2 className="w-4 h-4 text-sky-400" />
            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Hospital Clinics</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors ${
              isAudioEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Voice Announcements"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isAudioEnabled ? 'Voice Chime ON' : 'Audio Muted'}</span>
          </button>

          {/* Digital Clock */}
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-sky-300">{currentTime}</div>
            <div className="text-[10px] text-slate-400">
              Synced: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      </header>

      {/* Disconnection Stale-Data Warning Banner */}
      {isDisconnected && (
        <div className="bg-rose-600 text-white px-6 py-2.5 flex items-center justify-center space-x-2 text-xs font-bold animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>DISPLAY OFFLINE: Connection lost. Reconnecting to hospital server...</span>
        </div>
      )}

      {/* Main Waiting Room Display Area */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BIG NOW CALLING HERO BOARD (Cols 1-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-sm font-bold uppercase tracking-widest text-sky-400">Now Calling</span>
            </div>

            {activeCalledToken?.status === 'recalled' && (
              <div className="px-3 py-1 bg-rose-600/30 border border-rose-500 text-rose-300 text-xs font-black uppercase rounded-full flex items-center space-x-1.5 animate-bounce">
                <RotateCcw className="w-4 h-4" />
                <span>Second Recall Notice</span>
              </div>
            )}
          </div>

          {activeCalledToken ? (
            <div className="my-auto py-8 text-center space-y-6 relative z-10">
              <div className="inline-block px-8 py-3 bg-slate-800/80 rounded-full border border-slate-700/80 text-slate-300 text-sm font-bold uppercase tracking-wider">
                {activeCalledToken.clinic?.name || currentClinic?.name || 'General Outpatient Clinic'}
              </div>

              {/* Huge Token Typography */}
              <div className="text-7xl sm:text-8xl md:text-9xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_35px_rgba(56,189,248,0.5)] animate-pulse">
                {activeCalledToken.token_number}
              </div>

              {/* Destination Room */}
              <div className="flex items-center justify-center space-x-3 text-sky-400">
                <MapPin className="w-8 h-8 text-emerald-400 animate-bounce" />
                <span className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white">
                  {activeCalledToken.counter_or_room || 'ROOM 101'}
                </span>
              </div>

              <div className="text-xs text-slate-400 max-w-md mx-auto">
                Please proceed directly to the consultation counter indicated above.
              </div>
            </div>
          ) : (
            <div className="my-auto py-16 text-center space-y-4">
              <Tv className="w-16 h-16 mx-auto text-slate-700 animate-pulse" />
              <div className="text-3xl font-bold text-slate-400">ALL STATIONS READY</div>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Consultation stations are currently preparing for the next patient. Please keep your token ready.
              </p>
            </div>
          )}

          {/* Footer instruction banner */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 relative z-10">
            <span>Hospital Public Display Interface</span>
            <span className="flex items-center space-x-1">
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>Realtime Channel Active</span>
            </span>
          </div>
        </div>

        {/* SIDE PANELS: RECENTLY CALLED & UPCOMING QUEUE (Cols 8-12) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Active Called & Consulting Board */}
          <div className="flex-1 bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center space-x-2">
                <span>Active Consultations</span>
              </h2>
              <span className="text-xs text-sky-400 font-mono font-bold">Counter Assignment</span>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1">
              {recentCalls.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No active calls right now.</div>
              ) : (
                recentCalls.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      item.status === 'called' || item.status === 'recalled'
                        ? 'bg-sky-950/60 border-sky-500/50 text-white'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-black font-mono text-white tracking-tight">
                        {item.token_number}
                      </span>
                      {item.status === 'recalled' && (
                        <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                          RECALL
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-sky-400">{item.counter_or_room || 'Room 101'}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{item.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Next in Waiting Queue */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming Next in Line</h3>
              <span className="text-xs text-amber-400 font-bold">{waitingTokens.length} Waiting</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {waitingTokens.length === 0 ? (
                <div className="text-slate-500 text-xs py-2">Queue is clear.</div>
              ) : (
                waitingTokens.map((w) => (
                  <div
                    key={w.id}
                    className="px-3.5 py-2 bg-slate-800 border border-slate-700/80 rounded-xl font-mono font-bold text-sm text-slate-200"
                  >
                    {w.token_number}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
