import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Flashlight, 
  FlashlightOff, 
  SwitchCamera, 
  Volume2, 
  VolumeX, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  CloudCheck, 
  Sparkles, 
  PackageCheck, 
  ShieldCheck, 
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  Check,
  AlertCircle
} from 'lucide-react';
import { CargoItem, PhysicalCondition } from '../types';
import { soundManager } from '../utils/audio';

interface CargoScannerProps {
  cargoList: CargoItem[];
  currentScanned: CargoItem;
  onSelectCargo: (cargo: CargoItem) => void;
  onConfirmScan: (updatedCargo: CargoItem) => void;
}

export const CargoScanner: React.FC<CargoScannerProps> = ({
  cargoList,
  currentScanned,
  onSelectCargo,
  onConfirmScan,
}) => {
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'rugged_visor' | 'optic_high_contrast'>('rugged_visor');
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitSuccess, setCommitSuccess] = useState<boolean>(false);
  const [selectedCondition, setSelectedCondition] = useState<PhysicalCondition>(currentScanned.condition || 'nominal');
  const [activeStep, setActiveStep] = useState<number>(currentScanned.currentStep || 2);
  const [scanBeamY, setScanBeamY] = useState<number>(20);

  // Sync state if external cargo selection changed
  useEffect(() => {
    setSelectedCondition(currentScanned.condition);
    setActiveStep(currentScanned.currentStep);
  }, [currentScanned]);

  // Scanline animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setScanBeamY((prev) => (prev >= 80 ? 15 : prev + 3));
    }, 45);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmMovement = () => {
    setIsCommitting(true);
    soundManager.playScanBeep();

    setTimeout(() => {
      setIsCommitting(false);
      setCommitSuccess(true);
      soundManager.playSuccessChime();

      const updated: CargoItem = {
        ...currentScanned,
        condition: selectedCondition,
        currentStep: activeStep,
        loggedTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC',
        synced: true,
      };

      onConfirmScan(updated);

      setTimeout(() => {
        setCommitSuccess(false);
      }, 2500);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Scanner Status Notification Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-sky-500 ring-4 ring-sky-100 animate-ping" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider text-sky-700 uppercase">
                LASER OPTIC HUD V4.8
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                ONLINE
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              POLAR SENSOR TEMP: -12.4°C [NOMINAL CALIBRATION]
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600">
          <CloudCheck className="w-4 h-4 text-emerald-600" />
          <span>SOCKET 10.44.0.12 • STATION DB SYNCED</span>
        </div>
      </div>

      {/* Interactive Cargo Switcher Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Cargo Tag to Simulate Barcode Acquire:
          </span>
          <span className="text-xs font-mono text-sky-700">5 MANIFEST ITEMS</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {cargoList.map((item) => {
            const isSelected = item.id === currentScanned.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`select-cargo-${item.code}`}
                onClick={() => {
                  soundManager.playScanBeep();
                  onSelectCargo(item);
                }}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 ring-2 ring-sky-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>#{item.code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulated Scanner Reticle Viewport */}
      <div className="relative w-full aspect-[4/3] max-h-[380px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 shadow-lg flex flex-col justify-between p-4 sm:p-5">
        
        {/* Visor background image */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-all duration-300 ${
            torchActive ? 'opacity-70 filter brightness-125' : 'opacity-40'
          }`}
          style={{
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB82yQ59ieWwyAMt48hd4RMo1nlRDw7XCv5_Pk87rMY9OGuUBTMiQq05n-DTc2ONgpJU1gYk7BM3saqt8GCIzB6EPQBPtjWjt1hmcc9EUbXeD_zU5DDQJb2tSCNCgfVTrUbyNfWztsXu66YvdSoTA7HmJIzVx5sBcS539AbZaQrE5ZPVvlc4pN7r59b9wPwSJhMOOQIgeYnhlFRATZW4_oVMlTr2YHQq9HSfFDEfDL0k_qYfTZDmwEHFw')",
          }}
        />

        {/* Torch beam simulation */}
        {torchActive && (
          <div className="absolute inset-0 bg-radial from-amber-100/30 via-transparent to-transparent pointer-events-none" />
        )}

        {/* Grid HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:28px_28px]" />

        {/* Glowing laser scanline */}
        <div 
          className="absolute left-6 right-6 h-0.5 bg-sky-400 shadow-[0_0_12px_#38bdf8] pointer-events-none transition-all duration-75"
          style={{ top: `${scanBeamY}%` }}
        />

        {/* Top HUD Controls */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-black/70 text-sky-300 uppercase tracking-wider backdrop-blur-sm">
            FOCAL LOCK • 1200 DPI
          </span>

          <div className="flex items-center gap-2">
            {/* Torch toggle */}
            <button
              type="button"
              id="torch-toggle-btn"
              onClick={() => {
                setTorchActive(!torchActive);
                soundManager.playScanBeep();
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 ${
                torchActive 
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-400/40' 
                  : 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm'
              }`}
              title="Toggle Torch Illumination"
            >
              {torchActive ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
            </button>

            {/* Camera switch */}
            <button
              type="button"
              id="camera-toggle-btn"
              onClick={() => {
                setCameraMode(cameraMode === 'rugged_visor' ? 'optic_high_contrast' : 'rugged_visor');
                soundManager.playScanBeep();
              }}
              className="w-10 h-10 rounded-xl bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all active:scale-95 backdrop-blur-sm shadow-md"
              title="Flip Optical Sensor"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            {/* Sound toggle */}
            <button
              type="button"
              id="sound-optics-btn"
              onClick={() => {
                const next = !soundActive;
                setSoundActive(next);
                soundManager.enabled = next;
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 backdrop-blur-sm shadow-md ${
                soundActive ? 'bg-sky-500 text-white' : 'bg-black/60 text-slate-400'
              }`}
              title="Scanner Audio"
            >
              {soundActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Center Reticle Frame with High-Contrast Target */}
        <div className="relative z-10 mx-auto w-48 h-48 flex items-center justify-center pointer-events-none">
          {/* Target Corner Brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 flex flex-col justify-start items-start">
            <div className="w-8 h-1.5 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            <div className="w-1.5 h-7 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          </div>
          <div className="absolute top-0 right-0 w-8 h-8 flex flex-col justify-start items-end">
            <div className="w-8 h-1.5 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            <div className="w-1.5 h-7 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          </div>
          <div className="absolute bottom-0 left-0 w-8 h-8 flex flex-col justify-end items-start">
            <div className="w-1.5 h-7 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            <div className="w-8 h-1.5 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 flex flex-col justify-end items-end">
            <div className="w-1.5 h-7 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            <div className="w-8 h-1.5 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          </div>

          {/* Barcode/QR Center Target Card */}
          <div className="p-3 bg-black/85 rounded-xl flex flex-col items-center gap-1 shadow-2xl border border-sky-400/50 backdrop-blur-md">
            <QrCode className="w-10 h-10 text-sky-400 animate-pulse" />
            <span className="font-mono text-xs font-bold text-white tracking-widest uppercase">
              {currentScanned.code}
            </span>
          </div>
        </div>

        {/* Bottom Reticle Telemetry Overlay */}
        <div className="relative z-10 flex items-center justify-between text-slate-300 font-mono text-[11px] font-semibold">
          <span className="bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm">
            LAT 69°24'12"S
          </span>
          <span className="text-emerald-400 bg-black/70 px-2.5 py-0.5 rounded font-bold animate-pulse">
            ● ACQUIRED & IDENTIFIED
          </span>
          <span className="bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm">
            AZIMUTH 148° SE
          </span>
        </div>
      </div>

      {/* ACTIVE SCAN RESULT CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        
        {/* Header of Scanned Asset */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {currentScanned.hazmatClass && (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-sm">
                  {currentScanned.hazmatClass}
                </span>
              )}
              <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                #{currentScanned.code}
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {currentScanned.program}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {currentScanned.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">
              {currentScanned.spec}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center text-amber-700">
              <Flame className="w-6 h-6" />
              <span className="text-[10px] font-mono font-bold">
                {currentScanned.unCode || 'UN HAZ'}
              </span>
            </div>
          </div>
        </div>

        {/* Transit Manifest Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">
              Cargo Origin Source
            </span>
            <span className="font-bold text-slate-800 text-sm block">
              {currentScanned.origin}
            </span>
            <span className="text-slate-500 text-[11px]">
              Vessel Wharf Offload Point
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">
              Target Destination
            </span>
            <span className="font-bold text-sky-800 text-sm block">
              {currentScanned.destination}
            </span>
            <span className="text-slate-500 text-[11px]">
              Polar Thermal Enclosure
            </span>
          </div>
        </div>

        {/* Checkpoint Waypoint Progress Track */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500">
              Logistics Route Waypoint Tracker
            </span>
            <span className="text-xs font-mono font-bold text-sky-700">
              STEP {activeStep} OF {currentScanned.totalSteps}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { step: 1, name: '1. Ice Shelf Wharf', sub: 'OFFLOADED' },
              { step: 2, name: '2. Convoy Alpha', sub: 'IN TRANSIT' },
              { step: 3, name: '3. Bulk Station Depot', sub: 'FINAL STORE' },
            ].map((wp) => {
              const isPassed = wp.step < activeStep;
              const isCurrent = wp.step === activeStep;
              return (
                <button
                  key={wp.step}
                  type="button"
                  onClick={() => {
                    setActiveStep(wp.step);
                    soundManager.playScanBeep();
                  }}
                  className={`h-16 px-2 rounded-xl flex flex-col items-center justify-center transition-all text-center border ${
                    isCurrent
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                      : isPassed
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[11px] font-bold font-mono truncate w-full">
                    {wp.name}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-sky-100' : isPassed ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {isCurrent ? 'CURRENT' : isPassed ? 'COMPLETED' : 'PENDING'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Physical Condition Assessment */}
        <div className="space-y-2">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500">
            Drum Physical Condition Inspection:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                id: 'nominal',
                label: 'Intact / Sub-Zero Nominal',
                tag: 'PASS',
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
                activeStyle: 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 text-emerald-900',
              },
              {
                id: 'frosting',
                label: 'Surface Frosting / Obscured',
                tag: 'WARN',
                icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
                activeStyle: 'bg-amber-50 border-amber-400 ring-2 ring-amber-200 text-amber-900',
              },
              {
                id: 'damaged',
                label: 'Seal Cracked or Leakage',
                tag: 'CRIT',
                icon: <AlertCircle className="w-4 h-4 text-red-600" />,
                activeStyle: 'bg-red-50 border-red-400 ring-2 ring-red-200 text-red-900',
              },
            ].map((cond) => {
              const isSelected = selectedCondition === cond.id;
              return (
                <button
                  key={cond.id}
                  type="button"
                  id={`condition-${cond.id}`}
                  onClick={() => {
                    setSelectedCondition(cond.id as PhysicalCondition);
                    soundManager.playScanBeep();
                  }}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? cond.activeStyle
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {cond.icon}
                    <span className="text-xs font-semibold">{cond.label}</span>
                  </div>
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                    {cond.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tactical Commit Action Button (Big & glove-friendly) */}
        <button
          type="button"
          id="confirm-scan-log-btn"
          disabled={isCommitting}
          onClick={handleConfirmMovement}
          className={`h-16 w-full rounded-2xl font-bold font-mono text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.99] ${
            commitSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/30'
          }`}
        >
          {isCommitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>COMMITTING SCAN TO STATION DB...</span>
            </>
          ) : commitSuccess ? (
            <>
              <Check className="w-6 h-6 stroke-[3]" />
              <span>LOGGED & UPLINK VERIFIED</span>
            </>
          ) : (
            <>
              <PackageCheck className="w-6 h-6" />
              <span>Confirm Scan & Log Movement</span>
            </>
          )}
        </button>
      </div>

      {/* Recent Scanned Batch Manifest #084 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Recent Scanned Batch Session #084
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
            PostgreSQL Synced • 24ms
          </span>
        </div>

        <div className="space-y-2.5">
          {cargoList.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                soundManager.playScanBeep();
                onSelectCargo(item);
              }}
              className="p-3.5 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200 transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sky-700 flex-shrink-0 shadow-sm">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      #{item.code}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">
                      STEP {item.currentStep}/3
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 truncate block">
                    {item.title}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0 font-mono text-xs">
                <span className="text-slate-800 font-semibold">{item.loggedTime || '08:04 UTC'}</span>
                <span className="text-emerald-700 font-bold flex items-center gap-0.5 text-[11px]">
                  <CloudCheck className="w-3.5 h-3.5" />
                  PG-SYNC
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Polar Environmental Tip */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-600 flex-shrink-0" />
          <span>Optical barcode heater is active. Ensure camera lens window is wiped free of frost before scanning Hazmat Class 3 drums.</span>
        </div>
      </div>

    </div>
  );
};
