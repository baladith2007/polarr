import React from 'react';
import { 
  Radio, 
  Satellite, 
  Thermometer, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Compass,
  ShieldAlert,
  Globe,
  Terminal,
  Database
} from 'lucide-react';
import { TabType, WeatherData } from '../types';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  weather: WeatherData;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSos: () => void;
  currentTab?: TabType;
  onSelectTab?: (tab: TabType) => void;
  onOpenDatabaseSync?: () => void;
  isDatabaseRlsBlocked?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  weather,
  soundEnabled,
  onToggleSound,
  onOpenSos,
  currentTab = 'landing',
  onSelectTab,
  onOpenDatabaseSync,
  isDatabaseRlsBlocked = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-colors">
      {/* Top station & signal bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Station identification */}
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('landing')}
            className="flex items-center gap-3 min-w-0 text-left group transition-all"
            title="Return to Mission Overview Landing Page"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center shadow-md shadow-sky-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate group-hover:text-sky-700 transition-colors">
                  BHARATI POLAR OPS
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  EXP-44
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono truncate">
                {weather.coordinates}
              </span>
            </div>
          </button>

          {/* Quick telemetry pills (desktop & tablet) */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenDatabaseSync}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isDatabaseRlsBlocked
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
              title="Open Supabase Cloud Database Sync Manager"
            >
              <span className={`w-2 h-2 rounded-full animate-ping ${
                isDatabaseRlsBlocked ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <Database className={`w-3.5 h-3.5 ${
                isDatabaseRlsBlocked ? 'text-amber-600' : 'text-emerald-600'
              }`} />
              <span>{isDatabaseRlsBlocked ? 'SUPABASE (RLS FIX)' : 'SUPABASE'}</span>
              <span className={`font-mono font-normal ${
                isDatabaseRlsBlocked ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {isDatabaseRlsBlocked ? 'ACTION REQ' : '24ms'}
              </span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-800">
              <Satellite className="w-3.5 h-3.5 text-sky-600" />
              <span>IRIDIUM SATELLITE ACTIVE</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-medium text-slate-700">
              <Thermometer className="w-3.5 h-3.5 text-sky-600" />
              <span>{weather.airTemp}°C</span>
              <span className="text-slate-400">/</span>
              <span>{weather.pressure} hPa</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Quick Landing vs Console switch */}
            {onSelectTab && (
              currentTab === 'landing' ? (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playScanBeep();
                    onSelectTab('ops');
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open Console</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playScanBeep();
                    onSelectTab('landing');
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  <span>Overview</span>
                </button>
              )
            )}
            {/* Audio toggle */}
            <button
              type="button"
              id="sound-toggle-btn"
              onClick={onToggleSound}
              className={`p-2.5 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-slate-100 border-slate-300 text-sky-700 hover:bg-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={soundEnabled ? 'Mute tactical audio' : 'Unmute tactical audio'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Emergency SOS latch button */}
            <button
              type="button"
              id="sos-button"
              onClick={() => {
                soundManager.playAlarmPulse();
                onOpenSos();
              }}
              className="h-10 sm:h-11 px-3 sm:px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all shadow-md shadow-red-600/30 active:scale-95"
            >
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <span>SOS</span>
            </button>
          </div>

        </div>

        {/* Mobile secondary bar */}
        <div className="flex lg:hidden items-center justify-between py-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenDatabaseSync}
              className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border ${
                isDatabaseRlsBlocked
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <Database className="w-3 h-3 text-emerald-600" />
              <span>{isDatabaseRlsBlocked ? 'SUPABASE RLS FIX' : 'SUPABASE 24ms'}</span>
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-mono">IRIDIUM LOCK</span>
          </div>
          <div className="font-mono text-slate-700 font-semibold">
            {weather.airTemp}°C (Chill: {weather.windChill}°C)
          </div>
        </div>
      </div>
    </header>
  );
};
