import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  UploadCloud, 
  DownloadCloud, 
  X, 
  Terminal, 
  ExternalLink,
  ShieldAlert,
  Server
} from 'lucide-react';
import { 
  checkSupabaseHealth, 
  seedAllCargoToSupabase, 
  loadCargoFromSupabase,
  SupabaseHealthReport, 
  isSupabaseConfigured 
} from '../lib/supabase';
import { CargoItem } from '../types';
import { soundManager } from '../utils/audio';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  cargoList: CargoItem[];
  onUpdateCargoList: (newList: CargoItem[]) => void;
  onNotify: (msg: string) => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  cargoList,
  onUpdateCargoList,
  onNotify,
}) => {
  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [sqlMode, setSqlMode] = useState<'policy' | 'disable'>('policy');
  const [copied, setCopied] = useState(false);
  const [seedResult, setSeedResult] = useState<{ count?: number; error?: string } | null>(null);

  const runDiagnostics = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseHealth();
      setReport(res);
    } catch (err: unknown) {
      console.warn('Diagnostics failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
      setSeedResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    if (!report) return;
    const sql = sqlMode === 'policy' ? report.fixSqlPolicy : report.fixSqlDisable;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    soundManager.playScanBeep();
    setTimeout(() => setCopied(false), 2500);
    onNotify('SQL script copied to clipboard!');
  };

  const handleSeedAll = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    soundManager.playScanBeep();
    try {
      const res = await seedAllCargoToSupabase(cargoList);
      if (res.success) {
        setSeedResult({ count: res.insertedCount });
        onNotify(`Successfully synced ${res.insertedCount} cargo items to Supabase!`);
        runDiagnostics();
      } else {
        setSeedResult({ error: res.error });
        if (res.isRlsBlocked) {
          onNotify('Supabase write blocked by Row Level Security (RLS). Please apply the SQL fix.');
        } else {
          onNotify(`Sync failed: ${res.error}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedResult({ error: msg });
    } finally {
      setIsSeeding(false);
    }
  };

  const handlePullLatest = async () => {
    setIsPulling(true);
    soundManager.playScanBeep();
    try {
      const fresh = await loadCargoFromSupabase();
      if (fresh && fresh.length > 0) {
        onUpdateCargoList(fresh);
        onNotify(`Loaded ${fresh.length} cargo items from Supabase.`);
        runDiagnostics();
      } else {
        onNotify('Supabase cargo table returned 0 records.');
      }
    } catch (err) {
      onNotify('Failed to fetch from Supabase.');
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Supabase Cloud Synchronization
                {report && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
                    report.canWriteCargo 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : report.isRlsBlocked 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {report.canWriteCargo ? 'READ & WRITE' : report.isRlsBlocked ? 'RLS RESTRICTED' : 'READ ONLY'}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {report?.endpoint || 'Checking endpoint...'} • Latency: {report?.latencyMs || 24}ms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-sm">
          
          {/* Status Diagnostic Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Connection</span>
                <span className="text-sm font-bold text-slate-800">
                  {report?.canConnect ? 'Active Endpoint' : isChecking ? 'Testing...' : 'Offline'}
                </span>
              </div>
              {report?.canConnect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Read Permission</span>
                <span className="text-sm font-bold text-slate-800">
                  {report?.canReadCargo ? `${report.cargoRowCount} items in cloud` : isChecking ? 'Testing...' : 'No Access'}
                </span>
              </div>
              {report?.canReadCargo ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Write Permission</span>
                <span className="text-sm font-bold text-slate-800">
                  {report?.canWriteCargo 
                    ? 'Granted (Live)' 
                    : report?.isRlsBlocked 
                    ? 'Blocked (RLS)' 
                    : isChecking 
                    ? 'Probing...' 
                    : 'Unverified'}
                </span>
              </div>
              {report?.canWriteCargo ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              )}
            </div>
          </div>

          {/* RLS Policy Notice & SQL Fix */}
          {report?.isRlsBlocked && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-amber-900">
                    Database Write Blocked by Row Level Security (RLS)
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Your Supabase database tables (<code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">cargo_manifest</code> & <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">station_logs</code>) are connected, but Supabase requires a policy to allow public/anonymous write operations.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white/80 rounded-lg p-3 border border-amber-200 text-xs text-slate-700 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>How to fix in 30 seconds:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSqlMode('policy')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        sqlMode === 'policy' 
                          ? 'bg-amber-700 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Policy Grant (Best Practice)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlMode('disable')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        sqlMode === 'disable' 
                          ? 'bg-amber-700 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Disable RLS (Quickest)
                    </button>
                  </div>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Open your <strong>Supabase Dashboard</strong> and navigate to <strong>SQL Editor</strong>.</li>
                  <li>Click <strong>New query</strong>, paste the script below, and click <strong>Run</strong>.</li>
                  <li>Come back here and click <strong>Test Write Access</strong>!</li>
                </ol>
              </div>

              {/* SQL Code Box */}
              <div className="relative">
                <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-40">
                  {sqlMode === 'policy' ? report.fixSqlPolicy : report.fixSqlDisable}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* If write permission is successful */}
          {report?.canWriteCargo && (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold block">Supabase Realtime Cloud Sync is Fully Operational!</span>
                <span>Both Read and Write operations are verified. All QR scans, fuel audits, and logs sync directly to your Supabase tables.</span>
              </div>
            </div>
          )}

          {/* Seed Feedback */}
          {seedResult && (
            <div className={`p-3 rounded-xl border text-xs ${
              seedResult.count !== undefined
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {seedResult.count !== undefined ? (
                <span>✅ Successfully synchronized {seedResult.count} cargo items to Supabase table <code className="font-mono">cargo_manifest</code>.</span>
              ) : (
                <span>❌ Failed to sync: {seedResult.error}</span>
              )}
            </div>
          )}

          {/* Synchronize & Actions Panel */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Database Sync Operations
            </h4>
            
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={runDiagnostics}
                disabled={isChecking}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
                <span>{isChecking ? 'Testing Permissions...' : 'Test Write Access'}</span>
              </button>

              <button
                type="button"
                onClick={handleSeedAll}
                disabled={isSeeding || isChecking}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <UploadCloud className={`w-4 h-4 ${isSeeding ? 'animate-bounce' : ''}`} />
                <span>{isSeeding ? 'Pushing All Records...' : 'Push All Cargo to Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={handlePullLatest}
                disabled={isPulling || isChecking}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce text-sky-600' : 'text-slate-500'}`} />
                <span>{isPulling ? 'Pulling Records...' : 'Pull Latest from Supabase'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-mono">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>Tables: cargo_manifest • station_logs</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
