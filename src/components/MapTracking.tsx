import React, { useState } from 'react';
import { 
  Radar, 
  Compass, 
  Navigation, 
  MapPin, 
  AlertTriangle, 
  Radio, 
  CheckCircle, 
  Plus, 
  Minus, 
  Crosshair, 
  Layers, 
  Truck, 
  Users, 
  Flame, 
  Fuel, 
  Heart,
  Thermometer,
  RefreshCw
} from 'lucide-react';
import { ConvoyUnit } from '../types';
import { soundManager } from '../utils/audio';

interface MapTrackingProps {
  convoys: ConvoyUnit[];
  selectedConvoyId?: string;
  onSelectConvoyId: (id: string) => void;
  onUpdateConvoy?: (convoy: ConvoyUnit) => void;
  onShowToast: (message: string) => void;
}

type FilterCategory = 'all' | 'vehicles' | 'teams' | 'crevasses' | 'fuel';

export const MapTracking: React.FC<MapTrackingProps> = ({
  convoys,
  selectedConvoyId,
  onSelectConvoyId,
  onUpdateConvoy,
  onShowToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>(
    selectedConvoyId || (convoys[0]?.id || 'convoy-alpha')
  );

  React.useEffect(() => {
    if (selectedConvoyId) {
      setSelectedEntityKey(selectedConvoyId);
    }
  }, [selectedConvoyId]);

  const selectedConvoy = convoys.find((c) => c.id === selectedEntityKey) || convoys[0];

  const handleEntityClick = (key: string, name: string) => {
    setSelectedEntityKey(key);
    onSelectConvoyId(key);
    soundManager.playScanBeep();
    onShowToast(`Tracking beacon locked: ${name}`);
  };

  const handleRadioPing = () => {
    soundManager.playRadioPing();
    if (selectedConvoy && onUpdateConvoy) {
      const pingTime = new Date().toLocaleTimeString('en-GB');
      onUpdateConvoy({
        ...selectedConvoy,
        notes: `High-frequency VHF radio ping acknowledged at ${pingTime}. Telemetry nominal.`,
      });
    }
    onShowToast(`High-frequency VHF radio ping dispatched to ${selectedConvoy?.name || 'Unit'}`);
  };

  const handleRequestCheckin = () => {
    soundManager.playSuccessChime();
    if (selectedConvoy && onUpdateConvoy) {
      const checkinTime = new Date().toLocaleTimeString('en-GB');
      onUpdateConvoy({
        ...selectedConvoy,
        notes: `Biometric & vital signs verified at ${checkinTime} UTC. Crew: ${selectedConvoy.crewCount} personnel nominal.`,
      });
    }
    onShowToast(`Biometric & telemetry check-in acknowledged by ${selectedConvoy?.lead || 'Crew'}`);
  };

  const handleToggleHold = () => {
    if (!selectedConvoy || !onUpdateConvoy) return;
    soundManager.playScanBeep();
    const nextStatus = selectedConvoy.status === 'en_route' ? 'hold' : 'en_route';
    const updatedNotes = nextStatus === 'hold'
      ? `Held for weather/ice condition at ${new Date().toLocaleTimeString('en-GB')}.`
      : `Traverse resumed at ${new Date().toLocaleTimeString('en-GB')}.`;
    onUpdateConvoy({
      ...selectedConvoy,
      status: nextStatus,
      notes: updatedNotes,
    });
    onShowToast(`${selectedConvoy.name} status updated to ${nextStatus === 'hold' ? 'HOLD' : 'EN ROUTE'}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Tactical HUD Precision Band */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-sky-700 font-bold">
            <Radar className="w-4 h-4 text-sky-600 animate-spin" />
            <span className="uppercase tracking-wider">GNSS HDOP 0.9 • 14 SATELLITES LOCKED</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="uppercase tracking-wide">CARTOGRAPHIC CACHE 100%</span>
          </div>
        </div>

        {/* GPS Precision Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Grid Zone</span>
            <span className="text-slate-900 font-mono font-bold text-sm">UTM 43S ED50</span>
            <span className="text-[10px] text-slate-500 block">Ellipsoidal WGS84 Datum</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Magnetic Declination</span>
            <span className="text-slate-900 font-mono font-bold text-sm">-52.3° W (Larsemann)</span>
            <span className="text-[10px] text-slate-500 block">Annual Drift: +0.08°/yr</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Pack Ice Shear</span>
            <span className="text-emerald-700 font-mono font-bold text-sm">0.02 m/h [STABLE]</span>
            <span className="text-[10px] text-slate-500 block">No tidal rift detected</span>
          </div>
        </div>
      </div>

      {/* Layer Filter Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'All Units (12)', icon: <Layers className="w-4 h-4" /> },
          { id: 'vehicles', label: 'Vehicles (3)', icon: <Truck className="w-4 h-4" /> },
          { id: 'teams', label: 'Field Teams (4)', icon: <Users className="w-4 h-4" /> },
          { id: 'crevasses', label: 'Crevasses (7)', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'fuel', label: 'Fuel Depots (5)', icon: <Fuel className="w-4 h-4" /> },
        ].map((chip) => {
          const isSelected = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setActiveFilter(chip.id as FilterCategory);
                soundManager.playScanBeep();
              }}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {chip.icon}
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Tactical Polar Cartographic Viewport */}
      <div className="relative w-full h-[420px] rounded-2xl overflow-hidden bg-slate-100 border border-slate-300 shadow-md">
        
        {/* Background polar satellite/topo map texture */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300"
          style={{
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAigNDtX3EiqRdjrfeUipen3PjuoBs527ZOTV85VNZH-41IMUPINmDvWiyt4v_UCkxBepsFY8Q5vINl-vok-gpHo67mHG1e49xftXrEekLiGwia4Oeo_-5TLu3SHWHX2VTyIKD7AOgLX9KzIlwOEJiEuxBYxv-qbMU_uuA5CkU-4iJ2aUdYlzCqmzXTgAuJeRCZGBfNvsOSOAxRD7033K7KYQmKRHZJiSyey-8hEE4qltlrR-R964-uww')",
            filter: 'contrast(105%) brightness(110%)',
            transform: `scale(${zoomLevel})`,
          }}
        />

        {/* Soft polar light-theme overlay */}
        <div className="absolute inset-0 bg-sky-100/25 mix-blend-overlay pointer-events-none" />

        {/* Tactical Vector Overlay SVG (Contour lines, tracks, hazard zones) */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none" 
          viewBox="0 0 400 420"
          preserveAspectRatio="none"
        >
          {/* Topographical elevation contours */}
          <path d="M-10,90 Q90,120 180,95 T370,110 T420,80" fill="none" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="4,4" strokeOpacity="0.4" />
          <path d="M-10,180 Q110,160 210,195 T390,170" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeOpacity="0.5" />
          <path d="M-10,260 Q130,280 230,250 T410,270" fill="none" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="5,5" strokeOpacity="0.4" />
          <path d="M-10,340 Q150,330 270,350 T410,330" fill="none" stroke="#0284c7" strokeWidth="1.2" strokeOpacity="0.3" />

          {/* Crevasse Hazard Zone CZ-7 (Crimson transparent polygon with warning stripes) */}
          {(activeFilter === 'all' || activeFilter === 'crevasses') && (
            <>
              <polygon points="40,190 130,185 155,245 90,275 30,240" fill="#dc2626" fillOpacity="0.2" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="5,3" />
              <text x="50" y="235" fill="#991b1b" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold" letterSpacing="1">
                ZONE CZ-7 [CREVASSE]
              </text>
            </>
          )}

          {/* Active Supply Traverse Waypoint Track (Sky blue dashed route vector) */}
          <path 
            d="M195,115 L220,175 L205,240 L260,310" 
            fill="none" 
            stroke="#0284c7" 
            strokeWidth="3" 
            strokeDasharray="6,4" 
            strokeOpacity="0.85" 
          />
        </svg>

        {/* Top-Left Compass Rose & Elevation Gauge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Compass className="w-4 h-4 text-sky-700 animate-pulse" />
          <div className="text-[11px] font-mono">
            <span className="font-bold text-slate-900 block">GRID NORTH 002°</span>
            <span className="text-slate-500">ELEVATION 128m</span>
          </div>
        </div>

        {/* Top-Right Long-Range Maitri Vector Indicator */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Navigation className="w-4 h-4 text-amber-600 rotate-45" />
          <div className="text-[11px] font-mono">
            <span className="font-bold text-amber-800 block">MAITRI BASE (IND)</span>
            <span className="text-slate-500">2,840 KM • AZIMUTH 084° E</span>
          </div>
        </div>

        {/* Clickable Marker 1: Bharati Base HQ */}
        <button
          type="button"
          onClick={() => handleEntityClick('bharati', 'Bharati Base Hub')}
          className="absolute top-[85px] left-[185px] -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-10 h-10 rounded-full bg-sky-500/20 animate-ping" />
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
              <MapPin className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="mt-1 px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 shadow-sm text-center">
            <span className="text-[10px] font-mono font-bold text-sky-800 tracking-wider">
              BHARATI HQ
            </span>
          </div>
        </button>

        {/* Clickable Vehicle Markers for all active convoys */}
        {(activeFilter === 'all' || activeFilter === 'vehicles') &&
          convoys.map((c, idx) => {
            const isSelected = selectedEntityKey === c.id;
            // Provide stable coordinates for known units or staggered offsets for additional units
            const topPos = idx === 0 ? 230 : idx === 1 ? 310 : 200 + (idx * 40);
            const leftPos = idx === 0 ? 205 : idx === 1 ? 145 : 180 + (idx * 30);
            return (
              <button
                key={c.id}
                type="button"
                id={`map-marker-${c.id}`}
                onClick={() => handleEntityClick(c.id, `${c.name} (${c.type})`)}
                style={{ top: `${topPos}px`, left: `${leftPos}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none z-10"
              >
                <div className="relative flex items-center justify-center">
                  {isSelected && (
                    <span className="absolute w-12 h-12 rounded-full bg-sky-400/30 animate-pulse" />
                  )}
                  <div
                    className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ${
                      isSelected
                        ? 'bg-sky-700 ring-sky-400 scale-110'
                        : c.status === 'en_route'
                        ? 'bg-sky-600 ring-sky-200'
                        : 'bg-amber-600 ring-amber-300'
                    } transition-all`}
                  >
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold">
                    {idx === 0 ? 'α' : idx === 1 ? 'β' : `${idx + 1}`}
                  </span>
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-mono font-bold text-slate-900 block truncate max-w-[90px]">
                    {c.name.split(' ')[0]} {idx === 0 ? 'α' : idx === 1 ? 'β' : ''}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-semibold block ${
                      c.status === 'en_route' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {c.speed} • {c.status === 'en_route' ? 'EN ROUTE' : 'HELD'}
                  </span>
                </div>
              </button>
            );
          })}

        {/* Clickable Marker 3: Cargo Sled #03 (Drill Rig) */}
        {(activeFilter === 'all' || activeFilter === 'vehicles' || activeFilter === 'fuel') && (
          <button
            type="button"
            onClick={() => handleEntityClick('sled-3', 'Cargo Sled #03 (Scientific Drill Rig)')}
            className="absolute top-[280px] left-[255px] -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-md border border-white">
              <Fuel className="w-4 h-4" />
            </div>
            <div className="mt-1 px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 shadow-sm text-center">
              <span className="text-[9px] font-mono text-slate-800 font-bold">
                SLED #03 (RIG)
              </span>
            </div>
          </button>
        )}

        {/* Clickable Marker 4: Dr. V. Sen (Field Scientist Biometrics) */}
        {(activeFilter === 'all' || activeFilter === 'teams') && (
          <button
            type="button"
            onClick={() => handleEntityClick('dr-sen', 'Dr. V. Sen (Glaciologist)')}
            className="absolute top-[160px] left-[95px] -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                <Users className="w-4 h-4" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse ring-1 ring-white" />
            </div>
            <div className="mt-1 px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 shadow-sm text-center">
              <span className="text-[9px] font-mono text-slate-800 font-bold block">
                SEN • 78 BPM
              </span>
            </div>
          </button>
        )}

        {/* Zoom & Centering Controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.0))}
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shadow-md active:scale-95"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 1.0))}
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shadow-md active:scale-95"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
              setSelectedEntityKey('convoy-alpha');
              soundManager.playScanBeep();
              onShowToast('Map recentered to Convoy Alpha target');
            }}
            className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center shadow-md active:scale-95"
            title="Recenter"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Tactical Entity Inspection Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        
        {/* Header of Entity Card */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shadow-sm flex-shrink-0">
              {selectedEntityKey === 'dr-sen' ? (
                <Users className="w-6 h-6" />
              ) : selectedEntityKey === 'bharati' ? (
                <MapPin className="w-6 h-6" />
              ) : selectedEntityKey === 'sled-3' ? (
                <Fuel className="w-6 h-6" />
              ) : (
                <Truck className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {selectedEntityKey === 'dr-sen'
                    ? 'Dr. V. Sen (Field Glaciology Team)'
                    : selectedEntityKey === 'bharati'
                    ? 'Bharati Base Central Operations Hub'
                    : selectedEntityKey === 'sled-3'
                    ? 'Heavy Cargo Sled #03 (Core Rig)'
                    : selectedConvoy.name}
                </h3>
                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-mono font-bold uppercase">
                  {selectedEntityKey === 'dr-sen' ? 'CREW' : selectedEntityKey === 'bharati' ? 'STATION' : 'UNIT'}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {selectedEntityKey === 'dr-sen'
                  ? '69°23\'50"S • 76°09\'30"E (Ice Dome B)'
                  : selectedEntityKey === 'bharati'
                  ? '69°24\'28"S • 76°11\'14"E (Station Promontory)'
                  : selectedEntityKey === 'sled-3'
                  ? '69°26\'02"S • 76°15\'40"E (Tethered to PB100)'
                  : selectedConvoy.coordinates}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>TRANSPONDER ACTIVE</span>
            </span>
          </div>
        </div>

        {/* Telemetry Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Fuel / Battery Remaining */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 uppercase font-semibold">Arctic Diesel Remaining</span>
              <span className="font-bold text-slate-900">
                {selectedConvoy ? `${selectedConvoy.fuelPct}% (~${Math.round(selectedConvoy.fuelPct * 4.7)} L)` : '68% (320 L)'}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-sky-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${selectedConvoy?.fuelPct || 68}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 font-mono block">
              Consumption Rate: 18.2 L/h • {Math.round((selectedConvoy?.fuelPct || 68) * 0.25)}h operational range
            </span>
          </div>

          {/* Cabin & External Climate */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase block font-mono">
                Cabin Internal Climate
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 flex items-center gap-1">
                <span>+{selectedConvoy?.cabinTemp || 18.0}°C</span>
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                  HEATED
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                External Ambient: {selectedConvoy?.extTemp || -38.4}°C
              </span>
            </div>
            <Thermometer className="w-8 h-8 text-sky-600" />
          </div>
        </div>

        {/* Proximity & Navigation progress */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-slate-900">
                Proximity to Bharati Depot B-04
              </span>
            </div>
            <span className="text-sm font-bold font-mono text-sky-700">
              {selectedConvoy?.distanceToDepotKm || 4.8} KM REMAINING
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 font-mono pt-1 border-t border-slate-200/80">
            <span>Ground Speed: {selectedConvoy?.speed || '14 km/h'} ({selectedConvoy?.bearing || 'Vector 142° SE'})</span>
            <span className="font-bold text-slate-800">ETA: ~{selectedConvoy?.etaMin || 32} MINUTES</span>
          </div>
        </div>

        {/* Tactical Glove-Ready Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            id="radio-ping-btn"
            onClick={handleRadioPing}
            className="h-13 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 active:scale-95 transition-all"
          >
            <Radio className="w-4 h-4" />
            <span>Radio Ping</span>
          </button>

          <button
            type="button"
            id="request-checkin-btn"
            onClick={handleRequestCheckin}
            className="h-13 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Biometric Check-In</span>
          </button>

          {selectedConvoy && onUpdateConvoy && (
            <button
              type="button"
              id="map-toggle-hold-btn"
              onClick={handleToggleHold}
              className={`h-13 rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all border ${
                selectedConvoy.status === 'en_route'
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{selectedConvoy.status === 'en_route' ? 'Hold Traverse' : 'Resume Route'}</span>
            </button>
          )}
        </div>

        {/* Local hazard route / dispatch note */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed space-y-1">
            <p>
              <span className="font-bold">Active Navigation Log: </span>
              {selectedConvoy?.notes || 'Traverse proceeding along marked GPS safe waypoints.'}
            </p>
            <p className="text-[11px] text-amber-800/80 font-mono">
              Status: {selectedConvoy?.status === 'en_route' ? 'EN ROUTE (TRANSIT)' : 'HELD AT CHECKPOINT'} • Lead: {selectedConvoy?.lead || 'Station Command'} • Crew: {selectedConvoy?.crewCount || 3}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
