import React, { useState } from 'react';
import { 
  Fuel, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  TrendingDown, 
  Plus, 
  Package, 
  ShieldCheck,
  RefreshCw,
  Zap
} from 'lucide-react';
import { InventorySupply } from '../types';
import { soundManager } from '../utils/audio';

interface InventoryAIProps {
  inventory: InventorySupply[];
  onUpdateStock: (id: string, amountToAdd: number) => void;
  onShowToast: (message: string) => void;
}

export const InventoryAI: React.FC<InventoryAIProps> = ({
  inventory,
  onUpdateStock,
  onShowToast,
}) => {
  const [simTemp, setSimTemp] = useState<number>(-38.4);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [restockModalItem, setRestockModalItem] = useState<InventorySupply | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(500);

  // Dynamic storm burn rate calculation based on temperature
  // Below -30°C, every 5°C drop adds ~8% turbine consumption for life support heating
  const tempDelta = Math.max(0, -30 - simTemp);
  const dynamicMultiplier = 1.0 + (tempDelta / 5) * 0.08;

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    soundManager.playScanBeep();

    setTimeout(() => {
      setIsOptimizing(false);
      soundManager.playSuccessChime();
      onShowToast('AI Turbine Heat Balancer engaged: Non-essential lab pods lowered to +14°C (+3.2 days reserve extended)');
    }, 1200);
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    onUpdateStock(restockModalItem.id, restockAmount);
    soundManager.playSuccessChime();
    onShowToast(`Logged +${restockAmount} ${restockModalItem.unit} to ${restockModalItem.name}`);
    setRestockModalItem(null);
  };

  return (
    <div className="space-y-6">
      
      {/* AI Depletion Predictive Analysis Banner */}
      <div className="bg-white rounded-2xl border border-sky-200 p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sky-700">
              <span className="p-2 rounded-xl bg-sky-100 text-sky-800">
                <Sparkles className="w-5 h-5 animate-spin" />
              </span>
              <div>
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-sky-700">
                  AI PREDICTIVE LOGISTICS ENGINE V4.2
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Sub-Zero Depletion & Storm Burn Forecasting
                </h2>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-mono text-xs font-bold border border-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>STORM BURN MULTIPLIER: {dynamicMultiplier.toFixed(2)}x</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Turbine generator fuel consumption spikes exponentially during severe polar storms. At ambient <span className="font-mono font-bold text-slate-800">{simTemp.toFixed(1)}°C</span>, thermal habitat demand increases heating load to <span className="font-mono font-bold text-amber-700">{(580 * dynamicMultiplier).toFixed(0)} L/day</span>.
          </p>

          {/* Interactive Simulation Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                <Sliders className="w-4 h-4 text-sky-600" />
                <span>Simulate Ambient Cold Stress:</span>
              </div>
              <span className="text-sky-700 font-bold text-sm">{simTemp.toFixed(1)}°C</span>
            </div>

            <input
              type="range"
              min="-60"
              max="-15"
              step="0.5"
              value={simTemp}
              onChange={(e) => setSimTemp(parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />

            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>-60°C (Deep Winter Crisis)</span>
              <span>-38.4°C (Current Storm)</span>
              <span>-15°C (Summer Mild)</span>
            </div>
          </div>

          {/* AI Optimization Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Turbine Reserve Safe Buffer: &gt; 12 Days Required</span>
            </div>

            <button
              type="button"
              id="ai-optimize-btn"
              disabled={isOptimizing}
              onClick={handleRunOptimization}
              className="h-11 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 shadow-md shadow-sky-600/20 active:scale-95 transition-all"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CALCULATING THERMAL ROUTING...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute AI Habitat Conservation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stock Reserves Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Polar Station Expedition Stock Reserves
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">6 MONITORED COMMODITIES</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inventory.map((item) => {
            const pct = Math.min(100, Math.round((item.currentStock / item.capacity) * 100));
            const isWarning = item.status === 'warning' || pct < 50;

            // Calculated projected days under current simulated weather
            const effectiveBurn = item.burnRatePerDay * (item.category === 'fuel' ? dynamicMultiplier : 1.0);
            const dynamicDays = (item.currentStock / effectiveBurn).toFixed(1);

            return (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
                            isWarning
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-sky-100 text-sky-800 border border-sky-200'
                          }`}
                        >
                          {item.category}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {pct}% CAPACITY
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1">
                        {item.name}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRestockModalItem(item);
                        soundManager.playScanBeep();
                      }}
                      className="p-2 rounded-lg bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold"
                      title="Adjust or Restock"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Stock</span>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs font-mono text-slate-600 font-semibold">
                      <span>{item.currentStock.toLocaleString()} {item.unit}</span>
                      <span className="text-slate-400">Cap: {item.capacity.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWarning
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                            : 'bg-gradient-to-r from-sky-500 to-sky-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Telemetry info row */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1 text-slate-500">
                    <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
                    <span>Burn: {effectiveBurn.toFixed(0)} {item.unit}/day</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Reserve:</span>
                    <span className={`font-bold ${isWarning ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {dynamicDays} Days
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Restock Dialog Modal */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Log Incoming Delivery
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {restockModalItem.name}
              </p>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-4">
              <div>
                <label className="text-xs font-mono font-bold text-slate-600 block mb-1">
                  Quantity ({restockModalItem.unit}):
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20"
                >
                  Add To Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
