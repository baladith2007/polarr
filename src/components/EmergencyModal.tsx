import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  MapPin, 
  AlertTriangle, 
  CheckSquare, 
  X, 
  CheckCircle,
  PhoneCall
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [sosArmed, setSosArmed] = useState<boolean>(false);
  const [sosTriggered, setSosTriggered] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTriggerSOS = () => {
    soundManager.playAlarmPulse();
    setSosTriggered(true);
    onShowToast('POLAR DISTRESS BEACON TRANSMITTED VIA IRIDIUM SATELLITE TO NCPOR GOA & COSPAS-SARSAT');
  };

  const handleCancelSOS = () => {
    setSosTriggered(false);
    setSosArmed(false);
    onShowToast('SOS distress beacon cancelled.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 relative animate-in fade-in zoom-in duration-150">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-red-600 uppercase tracking-wider">
              CRITICAL FIELD PROTOCOL
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Antarctic Emergency SOS Distress
            </h2>
          </div>
        </div>

        {/* Active Warning Box */}
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>LEVEL 1 POLAR DISTRESS BEACON</span>
          </div>
          <p className="text-xs text-red-900/90 leading-relaxed">
            Activating this beacon sends an immediate emergency telemetry burst with high-accuracy GNSS coordinates (<span className="font-mono font-bold">69°24′S 76°11′E</span>) to the Bharati Station Watch Desk, Indian Coast Guard Maritime Rescue Center (MRCC), and NCPOR Headquarters.
          </p>
        </div>

        {/* Action button latch */}
        {!sosTriggered ? (
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={sosArmed}
                onChange={(e) => setSosArmed(e.target.checked)}
                className="w-5 h-5 accent-red-600 rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">
                Unlock Emergency Latch: Confirm genuine polar life hazard
              </span>
            </label>

            <button
              type="button"
              disabled={!sosArmed}
              onClick={handleTriggerSOS}
              className={`h-16 w-full rounded-2xl font-bold font-mono text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-3 transition-all ${
                sosArmed
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30 active:scale-95 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Radio className="w-6 h-6 animate-ping" />
              <span>BROADCAST SATELLITE SOS BEACON</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-red-600 text-white space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm font-mono font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>DISTRESS TRANSMISSION BROADCASTING</span>
            </div>
            <p className="text-xs leading-relaxed opacity-95">
              Distress burst received. Rescue snowcats PB-400 on standby at Station Bay 1. Keep beacon unobstructed from drifting snow.
            </p>
            <button
              type="button"
              onClick={handleCancelSOS}
              className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-bold font-mono text-xs uppercase"
            >
              Cancel Distress Beacon
            </button>
          </div>
        )}

        {/* Station Emergency Muster Points & Shelters */}
        <div className="space-y-2 text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wide block font-mono">
            Designated Station Blizzard Shelters:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2">
              <MapPin className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Main Habitation Module</span>
                <span className="text-slate-500 font-mono text-[11px]">Primary Life Support Pod</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2">
              <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Hut Bravo (Ice Dome)</span>
                <span className="text-slate-500 font-mono text-[11px]">30 Days Emergency Survival Packs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
          <span>COSPAS-SARSAT: 406.025 MHz</span>
          <span className="text-sky-700 font-bold">VHF CH-16 ACTIVE</span>
        </div>

      </div>
    </div>
  );
};
