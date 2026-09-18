import React, { useState } from 'react';
import { 
  Compass, 
  QrCode, 
  MapPin, 
  Boxes, 
  ShieldAlert, 
  ChevronRight, 
  Zap, 
  Satellite, 
  Radio, 
  CheckCircle2, 
  Thermometer, 
  Wind, 
  Gauge, 
  AlertTriangle, 
  ArrowUpRight, 
  FileCheck, 
  Layers, 
  Flame, 
  Truck, 
  HardHat, 
  Sparkles, 
  ShieldCheck, 
  Terminal, 
  Clock, 
  ExternalLink,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { TabType, WeatherData } from '../types';
import { soundManager } from '../utils/audio';

interface LandingPageProps {
  weather: WeatherData;
  onLaunchConsole: (tab?: TabType) => void;
  onOpenSos: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  weather,
  onLaunchConsole,
  onOpenSos,
}) => {
  // Interactive Simulator States
  const [selectedDemoItem, setSelectedDemoItem] = useState<'fuel' | 'medical' | 'engine'>('fuel');
  const [isScanning, setIsScanning] = useState(false);
  const [scanVerified, setScanVerified] = useState(false);
  const [simTemp, setSimTemp] = useState<number>(-38);
  const [simWind, setSimWind] = useState<number>(42);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const demoItems = {
    fuel: {
      code: 'POL-FUEL-8821',
      title: 'Aviation Jet A-1 / Arctic Diesel Drum (200L)',
      spec: 'UN 1863 • Freeze Point: -58.0°C • Anti-Icing Additive Loaded',
      hazmat: 'HAZMAT CLASS 3',
      dest: 'Bharati Station Power Plant B-04',
      status: 'VERIFIED & COMMITTED',
    },
    medical: {
      code: 'POL-MED-0941',
      title: 'Deep Freeze Trauma & Cryo-Plasma Kit',
      spec: 'Vacuum Insulated Thermal Cryo-Vault • Active Temp: -20°C',
      hazmat: 'BIOLOGICAL CRITICAL',
      dest: 'Medical Bay Isolation Pod',
      status: 'PRIORITY COLD-CHAIN LOCK',
    },
    engine: {
      code: 'POL-ENG-3049',
      title: 'PistonBully PB100 Hydraulic High-Pressure Core',
      spec: 'Synthetic Ester Fluid Filled • Extreme Cold Grade 0W-10',
      hazmat: 'MECHANICAL TACTICAL',
      dest: 'Traverse Workshop Hangar Alpha',
      status: 'PRE-FLIGHT INSPECTED',
    },
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanVerified(false);
    soundManager.playScanBeep();

    setTimeout(() => {
      setIsScanning(false);
      setScanVerified(true);
      soundManager.playSuccessChime();
    }, 1200);
  };

  // Weather simulator calculations
  const calculateBurnMultiplier = (temp: number, wind: number) => {
    let mult = 1.0;
    if (temp < -25) mult += Math.abs(temp - -25) * 0.035;
    if (wind > 20) mult += (wind - 20) * 0.02;
    return parseFloat(mult.toFixed(2));
  };

  const currentBurnMult = calculateBurnMultiplier(simTemp, simWind);
  const simulatedBurnRateLiters = Math.round(180 * currentBurnMult);
  const simulatedDaysRemaining = (48000 / simulatedBurnRateLiters).toFixed(1);

  const faqs = [
    {
      q: 'How does optical scanning operate reliably in blinding snow-glare and -50°C temperatures?',
      a: 'The Polar Ops scanner utilizes adaptive high-contrast optical normalization. It actively rejects high-albedo polar snow reflection and inverse-thresholds frosted or iced-over QR surfaces. Built to execute entirely locally in hardware, it requires zero cloud processing latency.',
    },
    {
      q: 'What occurs during a complete satellite blackout or severe catabatic storm?',
      a: 'All cargo scans, fuel allotments, and checkpoint timestamps write immediately to an offline-first transactional database with tamper-evident hashing. As soon as Iridium SBD (Short Burst Data) or station VHF/HF relays re-establish a handshake, data resynchronizes in milliseconds.',
    },
    {
      q: 'How does the AI Blizzard Depletion Engine predict power plant fuel burn?',
      a: 'Our sub-zero mathematical model combines real-time wind chill indexes, barometric pressure gradients, and ambient exterior temperature deltas. In severe blizzards, habitat heat loss spikes dramatically, triggering automated conservation protocols before fuel reserves hit critical safety margins.',
    },
    {
      q: 'Is this software compliant with international Antarctic Treaty and IMO Polar Code standards?',
      a: 'Yes. The system natively enforces UN Hazmat Class 3 containment records, environmental spill prevention checklists, and chain-of-custody logging mandated under the Protocol on Environmental Protection to the Antarctic Treaty.',
    },
  ];

  return (
    <div className="flex flex-col space-y-16 sm:space-y-24">
      
      {/* 1. TOP DISPATCH BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900 via-slate-900 to-sky-950 text-white p-6 sm:p-8 shadow-xl border border-sky-800/40">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>EXP-44 SUMMER POLAR WINDOW ACTIVE</span>
              <span className="text-slate-400">•</span>
              <span>STATION LAT: 69°24′S 76°11′E</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Polar Ops & Sub-Zero Supply Chain Intelligence
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl font-normal leading-relaxed">
              Real-time optical cargo verification, traverse convoy GPS satellite telemetry, and AI generator fuel forecasting engineered for extreme Antarctic survival down to -58°C.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-shrink-0">
            <button
              type="button"
              id="hero-launch-console-btn"
              onClick={() => {
                soundManager.playScanBeep();
                onLaunchConsole('ops');
              }}
              className="h-12 px-6 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 active:scale-95"
            >
              <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>Launch Operations Hub</span>
            </button>

            <button
              type="button"
              id="hero-scanner-btn"
              onClick={() => {
                soundManager.playScanBeep();
                onLaunchConsole('cargo');
              }}
              className="h-12 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <QrCode className="w-4 h-4 text-sky-300" />
              <span>Open Scanner</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. REAL-TIME TELEMETRY RIBBON & CREDENTIALS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium">
            <span>STATION AIR TEMP</span>
            <Thermometer className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {weather.airTemp}°C
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Wind chill: <span className="text-sky-700 font-bold font-mono">{weather.windChill}°C</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium">
            <span>WIND & CATABATIC GUSTS</span>
            <Wind className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {weather.windSpeed} kts
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Vector: <span className="font-bold text-slate-700">{weather.windDirection}</span> • Blizz Lvl {weather.blizzardLevel}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium">
            <span>IRIDIUM SATELLITE LINK</span>
            <Satellite className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight flex items-center gap-2">
              <span>99.98%</span>
              <span className="text-xs font-sans text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                LOCK
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              24ms ping latency (SBD Uplink)
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium">
            <span>CRITICAL FUEL STORED</span>
            <Gauge className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              48,000 L
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Jet A-1 & Arctic Diesel • <span className="text-emerald-600 font-semibold">188 Days Safe</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE HERO PRODUCT PLAYGROUND */}
      <section className="bg-gradient-to-b from-white to-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>INTERACTIVE FIELD SIMULATOR</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Experience Optical Verification in Harsh Freeze Conditions
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Test the sub-zero barcode scanner right here. Select an expedition cargo item and simulate a high-speed optical scan under Arctic conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Item Selector & Details */}
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
              Select Expedition Item to Verify:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['fuel', 'medical', 'engine'] as const).map((key) => {
                const isSelected = selectedDemoItem === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDemoItem(key);
                      setScanVerified(false);
                      soundManager.playScanBeep();
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-[11px] font-mono font-bold text-sky-700">
                      {demoItems[key].code}
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1 capitalize">
                      {key} Unit
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected item metadata card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                  {demoItems[selectedDemoItem].code}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  {demoItems[selectedDemoItem].hazmat}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-900">
                {demoItems[selectedDemoItem].title}
              </h4>

              <p className="text-xs text-slate-600 font-mono leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {demoItems[selectedDemoItem].spec}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Destination:</span>
                <span className="font-semibold text-slate-800">{demoItems[selectedDemoItem].dest}</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="simulate-scan-trigger-btn"
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50"
                >
                  <QrCode className="w-4 h-4 text-sky-400" />
                  <span>{isScanning ? 'Decoding Optical Reticle...' : 'Simulate Optical Scan'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Optical Scanner Reticle Simulation */}
          <div className="lg:col-span-6">
            <div className="relative bg-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800 overflow-hidden">
              
              {/* Corner reticle brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-sky-400" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-sky-400" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-sky-400" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-sky-400" />

              {/* Scanline laser animation */}
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] animate-pulse transition-all duration-300 top-1/2 -translate-y-1/2 z-20" />
              )}

              <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-red-500 animate-ping' : 'bg-sky-400'}`} />
                  <span>OPTICAL LASER HUD: {isScanning ? 'ACTIVE BEAM' : 'STANDBY'}</span>
                </div>
                <span>FPS: 60.0 • SUB-ZERO FILTER</span>
              </div>

              {/* QR Mock graphic with state feedback */}
              <div className="my-8 flex flex-col items-center justify-center">
                <div className="relative w-40 h-40 rounded-2xl bg-slate-900 border-2 border-dashed border-sky-500/50 flex flex-col items-center justify-center p-4">
                  <QrCode className={`w-24 h-24 transition-all duration-300 ${
                    isScanning ? 'text-sky-400 scale-105' : scanVerified ? 'text-emerald-400' : 'text-slate-400'
                  }`} />
                  <div className="text-[10px] font-mono text-slate-400 mt-2">
                    {demoItems[selectedDemoItem].code}
                  </div>

                  {scanVerified && (
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-3 text-center animate-in fade-in duration-200">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-1" />
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        VERIFIED 100%
                      </span>
                      <span className="text-[10px] text-slate-300 mt-1 font-mono">
                        Checksum Validated
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                    scanVerified 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : isScanning
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {scanVerified 
                      ? 'POSTGRESQL AUDIT COMMITTED' 
                      : isScanning 
                      ? 'READING CRYOGENIC MATRIX...' 
                      : 'AWAITING OPTICAL TRIGGER'}
                  </span>
                </div>
              </div>

              {/* Footer status */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Waypoint: Fast-Ice Dock</span>
                <button
                  type="button"
                  onClick={() => onLaunchConsole('cargo')}
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                >
                  <span>Full Cargo Console</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 4. CORE FOUR OPERATIONAL PILLARS */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>CRITICAL MISSION CAPABILITIES</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Engineered Specifically for Extreme Polar Realities
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Off-the-shelf logistics software crashes in sub-zero cold and high-albedo glare. Here is how Polar Ops guarantees 100% mission uptime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Frost-Tolerant Optical QR
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Adaptive contrast inverse filtering decodes frost-obscured barcodes, dented drum labels, and high-glare surfaces at 60 FPS without network lag.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onLaunchConsole('cargo')}
                className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5"
              >
                <span>Launch Scanner Visor</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Traverse GPS & Hazard Zones
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Live topographical cartography plotting PistonBully snowcats, sled weights, dead-reckoning vectors, and Crevasse Hazard Zone CZ-7 safety limits.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onLaunchConsole('map')}
                className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5"
              >
                <span>View Cartographic Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Blizzard Fuel Depletion AI
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Dynamic burn-rate algorithms model heat loss and catabatic storm spikes, alerting power plant engineers weeks before wintering reserves run low.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onLaunchConsole('inventory')}
                className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5"
              >
                <span>Inspect Stock Forecasts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Dual-Latch Satellite SOS
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Safety-latched distress beacon triggering instant emergency broadcast bursts via Iridium constellation directly to Maritime Rescue (MRCC).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onLaunchConsole('emergency')}
                className="text-xs font-bold text-red-700 hover:text-red-800 flex items-center gap-1.5"
              >
                <span>Safety Protocols</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 5. WEATHER & BLIZZARD BURN RATE SIMULATION WIDGET */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold mb-2">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>DYNAMIC WINTERIZATION STRESS TEST</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Simulate How Catabatic Blizzards Impact Fuel Consumption
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Adjust external temperature and wind velocity to observe real-time AI generator consumption recalculations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSimTemp(-15);
                setSimWind(12);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Mild Polar Day
            </button>
            <button
              type="button"
              onClick={() => {
                setSimTemp(-38);
                setSimWind(42);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors"
            >
              Current Field
            </button>
            <button
              type="button"
              onClick={() => {
                setSimTemp(-54);
                setSimWind(78);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
            >
              Catabatic Storm
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Temp slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-sky-600" />
                  AMBIENT EXTERIOR AIR TEMPERATURE
                </span>
                <span className="text-base font-extrabold text-sky-700 font-mono">
                  {simTemp}°C
                </span>
              </div>
              <input
                type="range"
                min="-65"
                max="-10"
                step="1"
                value={simTemp}
                onChange={(e) => setSimTemp(parseInt(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>-65°C (Extreme Cryo)</span>
                <span>-38°C (Average)</span>
                <span>-10°C (Summer High)</span>
              </div>
            </div>

            {/* Wind slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-sky-600" />
                  WIND VELOCITY / CATABATIC DOWNDRAFT
                </span>
                <span className="text-base font-extrabold text-slate-900 font-mono">
                  {simWind} knots
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="85"
                step="1"
                value={simWind}
                onChange={(e) => setSimWind(parseInt(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>5 kts (Calm)</span>
                <span>40 kts (Gale Warning)</span>
                <span>85 kts (Severe Blizzard)</span>
              </div>
            </div>

            {/* Explanatory bullet */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
              <HardHat className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <p leading-relaxed>
                Antarctic station habitat heating relies on combined heat and power (CHP) generators. As wind chill intensifies, thermal conductivity through module bulkheads doubles, automatically accelerating generator fuel burn.
              </p>
            </div>

          </div>

          {/* AI Output Card */}
          <div className="lg:col-span-5 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>AI MODEL CALCULATION</span>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">
                  {currentBurnMult}x STRESS MULTIPLIER
                </span>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-400 font-mono">ESTIMATED DAILY DIESEL BURN</div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-1">
                  {simulatedBurnRateLiters} <span className="text-lg text-slate-400 font-normal">L / 24hrs</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400 font-mono">ESTIMATED REMAINING RUNTIME</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {simulatedDaysRemaining} Days
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Base Depot Stock: 48,000 Litres Jet A-1 & Arctic Blend
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLaunchConsole('inventory')}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
            >
              <span>Explore Central Stock Hub</span>
              <ArrowUpRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>

        </div>
      </section>

      {/* 6. EXPEDITION TIMELINE: 4-STEP CHAIN OF CUSTODY */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>FIELD WORKFLOW ARCHITECTURE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            From Ice Shelf Vessel to Central Power Depot
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Every litre of Arctic fuel and payload crate passes through rigorous optical checkpoints across the traverse route.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-mono font-bold">
              01
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Vessel Ice-Edge Offload
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Research vessel MV Vasiliy Golovnin secures to fast ice. Drums are lowered onto heavy sea-ice staging sleds.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
              Check: Seal & UN Hazmat Class
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center text-sm font-mono font-bold">
              02
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Optical QR Checkpoint
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Field scanners verify barrel barcodes through frost, categorize physical damage (Nominal / Frost / Dent), and stamp GPS.
            </p>
            <div className="text-[11px] font-mono text-sky-700 font-semibold pt-2 border-t border-slate-100">
              Output: Signed Hash Stored Offline
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-mono font-bold">
              03
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Overland Convoy Traverse
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              PistonBully PB100 vehicles haul 8-drum freight sleds along flagged crevasse-free corridors with live satellite pings.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
              Corridor: Route Romeo-3 (CZ-7 Cleared)
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-mono font-bold">
              04
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Heated Station Ingestion
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Final scan committed at Bharati Station Depot B-04. Volume transfers into central power plant reserves automatically.
            </p>
            <div className="text-[11px] font-mono text-emerald-700 font-semibold pt-2 border-t border-slate-100">
              Result: Power Grid Secured
            </div>
          </div>

        </div>
      </section>

      {/* 7. FIELD TESTIMONIALS & DISPATCHES */}
      <section className="bg-slate-100 rounded-3xl p-6 sm:p-10 border border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="text-xs font-mono font-bold text-sky-800 uppercase tracking-wider mb-2">
            FIELD LOG DISPATCHES • EXP-44
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            Trusted by Polar Station Personnel
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
              "When you are standing on fast ice in 45-knot winds with thick sub-zero mittens, you cannot fiddle with tiny smartphone touch interfaces. The oversized tactile buttons and instant optical reticle lock are literal lifesavers."
            </p>
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-900">Dr. Rajesh Varma</div>
              <div className="text-[11px] text-slate-500 font-mono">Lead Station Engineer • Bharati Base</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
              "Being able to see Convoy Alpha's real-time heading relative to the crevasse field hazard line CZ-7 while tracking fuel temperature gives our command bunker total peace of mind during whiteout conditions."
            </p>
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-900">Commander Sunita Rao</div>
              <div className="text-[11px] text-slate-500 font-mono">Traverse Logistics Chief • NCPOR EXP-44</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
              "The AI fuel depletion model alerted us 48 hours before a catabatic storm to preload auxiliary diesel preheaters. That single early warning prevented a critical generator stall in -48°C weather."
            </p>
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-900">Marcus Lindqvist</div>
              <div className="text-[11px] text-slate-500 font-mono">Polar Survival & Energy Specialist</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              <span>EXPEDITION TECHNICAL FAQ</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Operational & Technical Answers
            </h3>
          </div>

          <div className="divide-y divide-slate-200">
            {faqs.map((item, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left py-2 font-bold text-slate-900 hover:text-sky-700 transition-colors text-sm sm:text-base gap-4"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-sky-600' : ''
                    }`} />
                  </button>

                  {isOpen && (
                    <div className="pt-2 pb-3 text-xs sm:text-sm text-slate-600 leading-relaxed animate-in fade-in duration-150">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. BOTTOM LAUNCH CALL TO ACTION BANNER */}
      <section className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white text-center shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-mono font-semibold">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>COMMUNICATION ACTIVE • SATELLITE CH 16</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Begin Polar Station Operations?
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Access the full field suite: live telemetry dashboard, cargo optical scanner, geospatial contour map, inventory reserves, and emergency distress beacons.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              id="bottom-cta-launch-btn"
              onClick={() => {
                soundManager.playScanBeep();
                onLaunchConsole('ops');
              }}
              className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 active:scale-95"
            >
              <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>Enter Operations Console</span>
            </button>

            <button
              type="button"
              id="bottom-cta-scanner-btn"
              onClick={() => {
                soundManager.playScanBeep();
                onLaunchConsole('cargo');
              }}
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>Direct Scanner Visor</span>
            </button>
          </div>
        </div>
      </section>

      {/* 10. STATION FOOTER */}
      <footer className="pt-6 pb-12 border-t border-slate-200 text-slate-500 text-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">BHARATI ANTARCTIC RESEARCH BASE</div>
              <div className="font-mono text-[11px] text-slate-500">69°24′S 76°11′E • Larsemann Hills, East Antarctica</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <span>HF: 8.291 MHz</span>
            <span>•</span>
            <span>VHF: Marine Ch 16</span>
            <span>•</span>
            <span>Iridium SBD #7719</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">ALL SYSTEMS NOMINAL</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>
            Indian Antarctic Research Expedition EXP-44 • NCPOR MoES Govt of India
          </div>
          <div>
            Polar Ops Field Suite • Built with accessible light theme & sub-zero optical standards
          </div>
        </div>
      </footer>

    </div>
  );
};
