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
  Server,
  Truck,
  Sparkles
} from 'lucide-react';
import { 
  checkSupabaseHealth, 
  seedAllCargoToSupabase, 
  loadCargoFromSupabase,
  loadConvoysFromSupabase,
  fetchConvoysWithDiagnostics,
  seedAllConvoysToSupabase,
  SupabaseHealthReport, 
  isSupabaseConfigured 
} from '../lib/supabase';
import { CargoItem, ConvoyUnit } from '../types';
import { soundManager } from '../utils/audio';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  cargoList: CargoItem[];
  onUpdateCargoList: (newList: CargoItem[]) => void;
  convoysList?: ConvoyUnit[];
  onUpdateConvoysList?: (newList: ConvoyUnit[]) => void;
  onNotify: (msg: string) => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  cargoList,
  onUpdateCargoList,
  convoysList = [],
  onUpdateConvoysList,
  onNotify,
}) => {
  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingConvoys, setIsSeedingConvoys] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPullingConvoys, setIsPullingConvoys] = useState(false);
  const [sqlMode, setSqlMode] = useState<'full' | 'convoys' | 'disable'>('convoys');
  const [copied, setCopied] = useState(false);
  const [seedResult, setSeedResult] = useState<{ count?: number; error?: string; target?: string } | null>(null);

  const runDiagnostics = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseHealth();
      setReport(res);
      if (res.isConvoysTableMissing) {
        setSqlMode('convoys');
      }
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

  const getActiveSql = () => {
    if (!report) return '';
    if (sqlMode === 'convoys') return report.fixSqlConvoysOnly || report.fixSqlPolicy;
    if (sqlMode === 'disable') return report.fixSqlDisable;
    return report.fixSqlFullSchema || report.fixSqlPolicy;
  };

  const handleCopySql = () => {
    const sql = getActiveSql();
    navigator.clipboard.writeText(sql);
    setCopied(true);
    soundManager.playScanBeep();
    setTimeout(() => setCopied(false), 2500);
    onNotify('SQL script copied to clipboard!');
  };

  const handleSeedCargo = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    soundManager.playScanBeep();
    try {
      const res = await seedAllCargoToSupabase(cargoList);
      if (res.success) {
        setSeedResult({ count: res.insertedCount, target: 'cargo items' });
        onNotify(`Successfully synced ${res.insertedCount} cargo items to Supabase!`);
        runDiagnostics();
      } else {
        setSeedResult({ error: res.error, target: 'cargo items' });
        if (res.isRlsBlocked) {
          onNotify('Supabase write blocked by Row Level Security (RLS). Please apply the SQL fix.');
        } else {
          onNotify(`Sync failed: ${res.error}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedResult({ error: msg, target: 'cargo items' });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSeedConvoys = async () => {
    setIsSeedingConvoys(true);
    setSeedResult(null);
    soundManager.playScanBeep();
    try {
      const res = await seedAllConvoysToSupabase(convoysList);
      if (res.success) {
        setSeedResult({ count: res.insertedCount, target: 'active convoys' });
        onNotify(`Successfully synced ${res.insertedCount} field convoys to Supabase table convoys!`);
        runDiagnostics();
      } else {
        setSeedResult({ error: res.error, target: 'active convoys' });
        if (res.isTableMissing) {
          setSqlMode('convoys');
          onNotify('Table "convoys" does not exist in Supabase! Please copy and run the SQL below in Supabase.');
        } else if (res.isRlsBlocked) {
          setSqlMode('convoys');
          onNotify('Supabase write blocked by Row Level Security (RLS). Please apply the SQL fix below.');
        } else {
          onNotify(`Convoy sync failed: ${res.error}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSeedResult({ error: msg, target: 'active convoys' });
    } finally {
      setIsSeedingConvoys(false);
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
    } catch {
      onNotify('Failed to fetch from Supabase.');
    } finally {
      setIsPulling(false);
    }
  };

  const handlePullConvoys = async () => {
    setIsPullingConvoys(true);
    soundManager.playScanBeep();
    try {
      const diag = await fetchConvoysWithDiagnostics();
      if (diag.success && diag.data && diag.data.length > 0) {
        if (onUpdateConvoysList) {
          onUpdateConvoysList(diag.data);
        }
        onNotify(`Loaded ${diag.data.length} active field convoys directly from Supabase!`);
        runDiagnostics();
      } else if (diag.isTableMissing) {
        setSqlMode('convoys');
        onNotify('Table "convoys" does not exist in Supabase. Please copy and run the SQL script.');
      } else if (diag.isRlsBlocked) {
        setSqlMode('convoys');
        onNotify('Supabase RLS is blocking access to convoys. Run the SQL script below to allow access.');
      } else {
        onNotify(diag.error || 'Supabase convoys table returned 0 records.');
      }
    } catch {
      onNotify('Failed to fetch convoys from Supabase.');
    } finally {
      setIsPullingConvoys(false);
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
                Supabase Cloud Database Sync
                {report && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
                    report.canWriteCargo && report.canWriteConvoys
                      ? 'bg-emerald-100 text-emerald-800' 
                      : report.isConvoysTableMissing
                      ? 'bg-red-100 text-red-800'
                      : report.isRlsBlocked 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {report.canWriteCargo && report.canWriteConvoys 
                      ? 'SYNC ACTIVE' 
                      : report.isConvoysTableMissing 
                      ? 'CONVOYS TABLE MISSING'
                      : report.isRlsBlocked 
                      ? 'RLS SETUP REQUIRED' 
                      : 'READ ONLY'}
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
                <span className="text-xs text-slate-500 block font-medium">Cargo Manifest</span>
                <span className="text-sm font-bold text-slate-800">
                  {report?.canReadCargo ? `${report.cargoRowCount} rows in cloud` : isChecking ? 'Testing...' : 'No Access'}
                </span>
              </div>
              {report?.canReadCargo ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Active Convoys</span>
                <span className={`text-sm font-bold ${
                  report?.isConvoysTableMissing 
                    ? 'text-red-700' 
                    : report?.convoysRowCount && report.convoysRowCount > 0
                    ? 'text-emerald-700'
                    : 'text-slate-800'
                }`}>
                  {isChecking 
                    ? 'Testing...' 
                    : report?.isConvoysTableMissing 
                    ? 'Table Missing' 
                    : report?.canReadConvoys 
                    ? `${report.convoysRowCount} live convoys` 
                    : 'No Access'}
                </span>
              </div>
              {report?.canReadConvoys && !report.isConvoysTableMissing ? (
                <Truck className="w-5 h-5 text-sky-600" />
              ) : report?.isConvoysTableMissing ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              )}
            </div>
          </div>

          {/* Missing Convoys Table Notification */}
          {report?.isConvoysTableMissing && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-900">
                    Supabase Database: Table "convoys" Needs to Be Created
                  </h4>
                  <p className="text-xs text-red-800 mt-1 leading-relaxed">
                    The application is connected to Supabase, but the <code className="bg-red-100 font-mono px-1 py-0.5 rounded font-semibold text-red-900">convoys</code> table has not been created yet in your project.
                    Run the SQL script below in your Supabase SQL Editor to create it with full real-time synchronization in 5 seconds.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* RLS Policy Notice & SQL Fix */}
          {(report?.isRlsBlocked || report?.isConvoysTableMissing || !report?.canWriteCargo || !report?.canWriteConvoys) && (
            <div className="p-4 rounded-xl border border-sky-300 bg-sky-50/70 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-sky-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-sky-950">
                    {report?.isConvoysTableMissing 
                      ? 'One-Click Supabase Schema & Realtime Setup' 
                      : 'Database Permissions & Realtime Setup'}
                  </h4>
                  <p className="text-xs text-sky-900 mt-1 leading-relaxed">
                    This SQL script creates and configures the <code className="bg-sky-100/90 px-1 py-0.5 rounded font-mono font-semibold">convoys</code> and <code className="bg-sky-100/90 px-1 py-0.5 rounded font-mono font-semibold">cargo_manifest</code> tables, enables anonymous read/write policies, and registers them with Supabase Realtime.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white/90 rounded-lg p-3 border border-sky-200 text-xs text-slate-700 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <span>How to apply in 30 seconds:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSqlMode('convoys')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        sqlMode === 'convoys' 
                          ? 'bg-sky-700 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Convoys Table Fix
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlMode('full')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        sqlMode === 'full' 
                          ? 'bg-sky-700 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Full App Schema
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlMode('disable')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        sqlMode === 'disable' 
                          ? 'bg-sky-700 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Disable RLS
                    </button>
                  </div>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Open your <strong>Supabase Dashboard</strong> and navigate to <strong>SQL Editor</strong>.</li>
                  <li>Click <strong>New query</strong>, paste the script below, and click <strong>Run</strong>.</li>
                  <li>Come back here and click <strong>Test Diagnostics</strong> below!</li>
                </ol>
              </div>

              {/* SQL Code Box */}
              <div className="relative">
                <pre className="p-3.5 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-48">
                  {getActiveSql()}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Operational Banner */}
          {report?.canWriteCargo && report?.canWriteConvoys && !report?.isConvoysTableMissing && (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold block">Supabase Realtime Cloud Sync is Fully Operational!</span>
                <span>Both Read and Write permissions are active across <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">convoys</code> and <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">cargo_manifest</code>. Remote live updates stream automatically.</span>
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
                <span>✅ Successfully synchronized {seedResult.count} {seedResult.target || 'records'} to Supabase cloud database.</span>
              ) : (
                <span>❌ Failed to sync {seedResult.target || 'records'}: {seedResult.error}</span>
              )}
            </div>
          )}

          {/* Synchronize & Actions Panel */}
          <div className="border-t border-slate-200 pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Database Sync Operations
            </h4>

            {/* Convoy Sync Row */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-sky-600" />
                  Active Field Convoys & Traverses:
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {convoysList.length} local / {report?.convoysRowCount ?? 0} in Supabase
                </span>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleSeedConvoys}
                  disabled={isSeedingConvoys || isChecking}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  <Truck className={`w-4 h-4 ${isSeedingConvoys ? 'animate-bounce' : ''}`} />
                  <span>{isSeedingConvoys ? 'Pushing Convoys...' : 'Push Convoys to Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullConvoys}
                  disabled={isPullingConvoys || isChecking}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-sky-300 hover:bg-sky-100/60 bg-white text-sky-900 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <DownloadCloud className={`w-4 h-4 ${isPullingConvoys ? 'animate-bounce text-sky-600' : 'text-sky-600'}`} />
                  <span>{isPullingConvoys ? 'Pulling Convoys...' : 'Pull Convoys from Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={runDiagnostics}
                  disabled={isChecking}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-medium transition-colors disabled:opacity-50 ml-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
                  <span>{isChecking ? 'Testing...' : 'Test Diagnostics'}</span>
                </button>
              </div>
            </div>

            {/* Cargo Sync Row */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Cargo Manifest Database:
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {cargoList.length} items / {report?.cargoRowCount ?? 0} in Supabase
                </span>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleSeedCargo}
                  disabled={isSeeding || isChecking}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  <UploadCloud className={`w-4 h-4 ${isSeeding ? 'animate-bounce' : ''}`} />
                  <span>{isSeeding ? 'Pushing Cargo...' : 'Push Cargo to Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullLatest}
                  disabled={isPulling || isChecking}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-white bg-white text-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce text-emerald-600' : 'text-slate-500'}`} />
                  <span>{isPulling ? 'Pulling Cargo...' : 'Pull Cargo from Cloud'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-mono">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>Tables: convoys • cargo_manifest • station_logs</span>
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
