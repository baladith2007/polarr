import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  PhoneCall, 
  LifeBuoy, 
  Wind, 
  Thermometer, 
  CheckSquare, 
  Users 
} from 'lucide-react';
import { WeatherData } from '../types';
import { soundManager } from '../utils/audio';

interface EmergencyProtocolViewProps {
  weather: WeatherData;
  onOpenSosModal: () => void;
  onShowToast: (message: string) => void;
}

export const EmergencyProtocolView: React.FC<EmergencyProtocolViewProps> = ({
  weather,
  onOpenSosModal,
  onShowToast,
}) => {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    step1: true,
    step2: true,
    step3: false,
    step4: false,
  });

  const toggleCheck = (key: string) => {
    soundManager.playScanBeep();
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      
      {/* Emergency Protocol Hero Banner */}
      <div className="bg-white rounded-2xl border border-red-200 p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-red-600">
                  EXPEDITION SAFETY MANUAL 44-A
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Antarctic Whiteout & Blizzard Protocols
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSosModal}
              className="h-11 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-600/30 active:scale-95 transition-all"
            >
              <Radio className="w-4 h-4 animate-ping" />
              <span>Arm Satellite SOS</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            During Level {weather.blizzardLevel} Blizzard conditions (Air: <span className="font-mono font-bold text-slate-800">{weather.airTemp}°C</span>, Wind Chill: <span className="font-mono font-bold text-amber-700">{weather.windChill}°C</span>, Wind: <span className="font-mono font-bold text-slate-800">{weather.windSpeed} kt</span>), outdoor movement between station modules without fixed lifeline cables is strictly forbidden.
          </p>
        </div>
      </div>

      {/* Immediate Action Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Muster & Field Team Safety Checklist
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {Object.values(checklist).filter(Boolean).length}/4 VERIFIED
          </span>
        </div>

        <div className="space-y-2.5">
          {[
            {
              id: 'step1',
              title: 'Module Habitability & Thermal Airlocks',
              detail: 'Verify airlock seals in Habitation Module C and check turbine heat circulation valves.',
            },
            {
              id: 'step2',
              title: 'Lifeline Guide Cables Engaged',
              detail: 'Deploy high-visibility storm tether lines between Main Module, Generator Room, and Helipad Depot.',
            },
            {
              id: 'step3',
              title: 'Field Convoy Radio Check-In',
              detail: 'Establish hourly VHF check-in with Convoy Alpha and Convoy Bravo teams traversing Larsemann Hills.',
            },
            {
              id: 'step4',
              title: 'Standby Rescue Snowcat PB-400',
              detail: 'Keep engine block warmers plugged into auxiliary power grid at Vehicle Maintenance Bay 1.',
            },
          ].map((item) => {
            const isChecked = checklist[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isChecked
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="w-5 h-5 mt-0.5 accent-emerald-600 rounded cursor-pointer"
                />
                <div>
                  <h4 className={`text-sm font-bold ${isChecked ? 'text-emerald-950' : 'text-slate-900'}`}>
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Emergency Frequencies & Communication Links */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-sky-600" />
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
            Station Emergency Communication Channels
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">VHF Distress Marine</span>
            <span className="text-base font-bold text-slate-900 block">CHANNEL 16</span>
            <span className="text-slate-500 text-[11px]">156.800 MHz • Monitored 24/7</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Iridium Satellite Voice</span>
            <span className="text-base font-bold text-sky-700 block">+8816 777 4410</span>
            <span className="text-slate-500 text-[11px]">Direct to NCPOR Operations Desk</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">COSPAS-SARSAT Beacon</span>
            <span className="text-base font-bold text-red-600 block">406.025 MHz</span>
            <span className="text-slate-500 text-[11px]">Hex ID: 1D38A4900FF</span>
          </div>
        </div>
      </div>

    </div>
  );
};
