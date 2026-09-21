import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Wind, 
  Sun, 
  Users, 
  Truck, 
  Bell, 
  QrCode, 
  Fuel, 
  Megaphone, 
  Navigation2, 
  Clock, 
  Camera, 
  CheckCircle2, 
  Search,
  PlusCircle,
  ExternalLink,
  Database
} from 'lucide-react';
import { ConvoyUnit, LogEvent, WeatherData } from '../types';
import { soundManager } from '../utils/audio';
import { isSupabaseConfigured } from '../lib/supabase';

interface OpsDashboardProps {
  weather: WeatherData;
  convoys: ConvoyUnit[];
  logStream: LogEvent[];
  onAddLog: (newLog: Omit<LogEvent, 'id' | 'time'>) => void;
  onNavigateTab: (tab: 'cargo' | 'map' | 'inventory' | 'emergency') => void;
  onSelectConvoy: (convoyId: string) => void;
  onOpenDatabaseSync?: () => void;
  isDatabaseRlsBlocked?: boolean;
}

export const OpsDashboard: React.FC<OpsDashboardProps> = ({
  weather,
  convoys,
  logStream,
  onAddLog,
  onNavigateTab,
  onSelectConvoy,
  onOpenDatabaseSync,
  isDatabaseRlsBlocked = false,
}) => {
  const [logFilter, setLogFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBroadcastOpen, setIsBroadcastOpen] = useState<boolean>(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [activeCam, setActiveCam] = useState<'cam1' | 'cam2' | null>(null);

  const filteredLogs = logStream.filter((item) => {
    if (logFilter !== 'all' && item.type !== logFilter) return false;
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.detail.toLowerCase().includes(q) ||
      item.actor.toLowerCase().includes(q)
    );
  });

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    soundManager.playSuccessChime();
    onAddLog({
      type: 'alert',
      title: 'STATION BROADCAST: Weather Alert',
      detail: broadcastMessage.trim(),
      actor: 'Station Commander (Ops Desk)',
      status: 'TRANSMITTED',
    });
    setBroadcastMessage('');
    setIsBroadcastOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Weather & Blizzard Warning Banner */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-50 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header pill */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertOctagon className="w-5 h-5 text-amber-700 animate-pulse" />
              </span>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-amber-800">
                  MET REPORT • LEVEL {weather.blizzardLevel} BLIZZARD ADVISORY
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Active Polar Squall Over Larsemann Hills
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-semibold font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
              <span>MET-STATION V44 ACTIVE</span>
            </div>
          </div>

          {/* Meteorological Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Air Temp & Wind Chill */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Air Temp / Wind Chill
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-sky-700">
                  {weather.airTemp}°C
                </span>
                <span className="text-sm font-semibold font-mono text-amber-700">
                  / Chill: {weather.windChill}°C
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                Extreme sub-zero frostbite hazard within 8 min
              </span>
            </div>

            {/* Wind Vector */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Wind Vector & Gusts
                </span>
                <Wind className="w-4 h-4 text-sky-600" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                  {weather.windSpeed} kt
                </span>
                <span className="text-sm font-semibold font-mono text-sky-700">
                  {weather.windDirection} (78 km/h)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                Pressure: {weather.pressure} hPa • Surface whiteout
              </span>
            </div>

            {/* Solar Daylight Window */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Solar Daylight Window
                </span>
                <Sun className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs font-mono font-bold text-slate-700 mb-1">
                  <span>2h 40m REMAINING</span>
                  <span className="text-amber-700">Sunset 17:35 UTC</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full w-1/4" />
                </div>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                All field teams muster to depot before twilight
              </span>
            </div>
          </div>

          {/* Quick broadcast link */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-600 border-t border-slate-100">
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Last Met Sounding: 8 minutes ago (Barometric trend: Falling)
            </span>

            <button
              type="button"
              id="open-broadcast-modal-btn"
              onClick={() => setIsBroadcastOpen(true)}
              className="inline-flex items-center gap-1.5 font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast Notice to Convoys</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metric Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Station Crew
            </span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900">24</span>
              <span className="text-base font-semibold font-mono text-slate-500">/ 6 in field</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              30 expedition members accounted for
            </p>
          </div>
        </div>

        {/* Cargo In Transit */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cargo In Transit
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900">142</span>
              <span className="text-sm font-bold font-mono text-emerald-700">Metric Tons</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Jet fuel, drill rigs, cryo medical units
            </p>
          </div>
        </div>

        {/* Supabase Cloud DB Health */}
        <div 
          onClick={onOpenDatabaseSync}
          className={`rounded-xl border p-4 shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${
            isDatabaseRlsBlocked
              ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
          title="Click to Open Supabase Cloud DB Sync Manager"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Supabase Cloud DB
            </span>
            <span className={`p-1.5 rounded-lg ${
              isDatabaseRlsBlocked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <Database className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-bold font-mono ${
                isDatabaseRlsBlocked ? 'text-amber-700' : 'text-emerald-600'
              }`}>
                {isDatabaseRlsBlocked ? 'RLS RESTRICTED' : isSupabaseConfigured ? 'LIVE SYNC' : 'LOCAL CACHE'}
              </span>
              <span className="text-xs font-mono text-slate-500 font-semibold">
                {isDatabaseRlsBlocked ? 'FIX' : '24ms'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500 truncate">
                {isDatabaseRlsBlocked ? 'Click to copy RLS SQL fix' : 'Table: cargo_manifest • SBD channel'}
              </p>
              <span className="text-[10px] font-semibold text-sky-600 hover:underline flex-shrink-0 ml-1">
                Manage ↗
              </span>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Flags
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Bell className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-amber-700">01</span>
              <span className="text-sm font-semibold font-mono text-slate-500">AI Depletion Warning</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              00 Emergency SOS alerts active
            </p>
          </div>
        </div>
      </div>

      {/* Primary Tactical Actions (52px comfortable buttons) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          id="action-scan-cargo"
          onClick={() => {
            soundManager.playScanBeep();
            onNavigateTab('cargo');
          }}
          className="h-14 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-md shadow-sky-600/20 transition-all active:scale-[0.98]"
        >
          <QrCode className="w-5 h-5" />
          <span className="tracking-wide">Scan Cargo Barcode</span>
        </button>

        <button
          type="button"
          id="action-view-map"
          onClick={() => {
            soundManager.playRadioPing();
            onNavigateTab('map');
          }}
          className="h-14 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.98]"
        >
          <Navigation2 className="w-5 h-5 text-sky-600" />
          <span className="tracking-wide">Field GPS Navigation</span>
        </button>

        <button
          type="button"
          id="action-check-inventory"
          onClick={() => {
            soundManager.playScanBeep();
            onNavigateTab('inventory');
          }}
          className="h-14 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.98]"
        >
          <Fuel className="w-5 h-5 text-amber-600" />
          <span className="tracking-wide">Check POL Fuel Reserve</span>
        </button>
      </div>

      {/* Field Traversal & Active Convoys */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Active Field Convoys & Traverses
            </h3>
          </div>
          <span className="text-xs font-semibold font-mono text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
            2 CONVOYS DISPATCHED
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {convoys.map((convoy) => (
            <div
              key={convoy.id}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-4 transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                        convoy.status === 'en_route'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {convoy.status === 'en_route' ? 'EN ROUTE' : 'HELD FOR WEATHER'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {convoy.crewCount} Crew
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-1">
                    {convoy.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {convoy.type} • Lead: {convoy.lead}
                  </p>
                </div>

                <button
                  type="button"
                  id={`locate-convoy-${convoy.id}`}
                  onClick={() => {
                    soundManager.playRadioPing();
                    onSelectConvoy(convoy.id);
                    onNavigateTab('map');
                  }}
                  className="p-2 rounded-lg bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 hover:border-sky-300 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold"
                  title="Locate on Map"
                >
                  <Navigation2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Track</span>
                </button>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Speed</span>
                  <span className="font-semibold font-mono text-slate-800">{convoy.speed}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Fuel Reserve</span>
                  <span className="font-semibold font-mono text-emerald-700">{convoy.fuelPct}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Cabin Temp</span>
                  <span className="font-semibold font-mono text-slate-800">+{convoy.cabinTemp}°C</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Depot ETA</span>
                  <span className="font-semibold font-mono text-sky-700">{convoy.etaMin} min</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="font-semibold text-slate-700">Dispatch Log: </span>
                {convoy.notes}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Event-Driven Operations Socket Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Real-Time Operations Socket Log
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 w-36 sm:w-48"
              />
            </div>

            {/* Filter */}
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500 font-medium text-slate-700"
            >
              <option value="all">All Events</option>
              <option value="qr_verify">QR Scans</option>
              <option value="ai_depletion">AI Alerts</option>
              <option value="ping_sync">Satellite Pings</option>
              <option value="alert">Alerts</option>
            </select>
          </div>
        </div>

        {/* Logs list */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No log entries match your filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        log.type === 'qr_verify'
                          ? 'bg-sky-100 text-sky-800'
                          : log.type === 'ai_depletion'
                          ? 'bg-amber-100 text-amber-800'
                          : log.type === 'alert'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {log.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {log.title}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    {log.time}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {log.detail}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                  <span>Log Origin: {log.actor}</span>
                  <span className="font-semibold text-sky-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-sky-600" />
                    {log.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Station Deck Optical Feeds */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Station Optical Telemetry Feeds
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">LIVE SENSOR STREAM</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cam 1 */}
          <div 
            onClick={() => setActiveCam('cam1')}
            className="group relative h-44 rounded-xl overflow-hidden bg-slate-900 cursor-pointer shadow-inner border border-slate-200"
          >
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEEgHvwXzza5PFnJ4H-2n9lFhGHLtryM8uMEXbkLexJ7IhOuCCuYq349WeHUkglIZyqF26NbNVe0RAeldcPCNoQ_2B415jSIs79RqKgj7IUZHzuDHtlTmG1hZ8h59-YgbvY6bf35aQx0ojIei6uI4MfeEWxKNDyzyp5FvzEu_RDZMIxOp2bKy7H0dNGlgur1IVyDMEh3QHyKAZ0sD6OO-fwMpNvw9dLSj8EyTbrrlL7IrwqxB-dYpWuA" 
              alt="Bharati Antarctic Station main research facility" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE • CAM-01</span>
            </div>
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs font-mono">
              <span className="font-semibold">BHARATI MAIN MODULE PROMONTORY</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
            </div>
          </div>

          {/* Cam 2 */}
          <div 
            onClick={() => setActiveCam('cam2')}
            className="group relative h-44 rounded-xl overflow-hidden bg-slate-900 cursor-pointer shadow-inner border border-slate-200"
          >
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_chl_ksm3FZhtBRAK6JJQPzjD6eyPjey5azbK7zWGYo8_7lC1LF0plBqSHh1zjT39wUZnNGRFRJ6PRILriNdsO_2ZIY30-7W0zJZ2-aEUiKZorO-ICffgSufr1TWec4uHLT73TJIelShwIonqk-rDDnTKGjfy1uaWOBULW7m6EflOJQb9u29NkK46BorUIQvNmzWit53bl3I2S1DhVL1wYgDbzhX2BG0tkSzGkL3jev2buWxtBuwxRw" 
              alt="Arctic snowcat convoy moving across snowfield in twilight" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE • CAM-04</span>
            </div>
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs font-mono">
              <span className="font-semibold">HELIPAD ACCESS & TANK DEPOT</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-sky-700">
              <Megaphone className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">
                Broadcast Weather Advisory
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              This notice will be transmitted immediately across station VHF channels and posted to all convoy field terminals.
            </p>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="E.g., Surface visibility below 100m. Convoy Alpha proceed with caution to Waypoint 4..."
                rows={3}
                required
                className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-900"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20"
                >
                  Transmit Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Fullscreen Modal */}
      {activeCam && (
        <div 
          onClick={() => setActiveCam(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-3xl w-full border border-slate-700 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveCam(null)}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 text-white text-xs font-mono hover:bg-black"
            >
              CLOSE [ESC]
            </button>
            <img
              src={
                activeCam === 'cam1'
                  ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEEgHvwXzza5PFnJ4H-2n9lFhGHLtryM8uMEXbkLexJ7IhOuCCuYq349WeHUkglIZyqF26NbNVe0RAeldcPCNoQ_2B415jSIs79RqKgj7IUZHzuDHtlTmG1hZ8h59-YgbvY6bf35aQx0ojIei6uI4MfeEWxKNDyzyp5FvzEu_RDZMIxOp2bKy7H0dNGlgur1IVyDMEh3QHyKAZ0sD6OO-fwMpNvw9dLSj8EyTbrrlL7IrwqxB-dYpWuA'
                  : 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_chl_ksm3FZhtBRAK6JJQPzjD6eyPjey5azbK7zWGYo8_7lC1LF0plBqSHh1zjT39wUZnNGRFRJ6PRILriNdsO_2ZIY30-7W0zJZ2-aEUiKZorO-ICffgSufr1TWec4uHLT73TJIelShwIonqk-rDDnTKGjfy1uaWOBULW7m6EflOJQb9u29NkK46BorUIQvNmzWit53bl3I2S1DhVL1wYgDbzhX2BG0tkSzGkL3jev2buWxtBuwxRw'
              }
              alt="Station Optical Feed Zoom"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400">● POLAR OPTICAL FEED • HIGH DEFINITION 1080P</span>
              <span className="text-slate-400">LAT: 69°24′S LON: 76°11′E</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
