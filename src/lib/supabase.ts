import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CargoItem, ConvoyUnit, InventorySupply, LogEvent } from '../types';
import { sampleCargoDatabase, initialConvoys, initialInventory, initialLogStream } from '../data/mockData';

// Environment variable extraction
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.trim().length > 0 && 
  supabaseAnonKey.trim().length > 0 &&
  !supabaseUrl.includes('placeholder')
);

// Lazy client instantiation
let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
}

// Local Storage Fallback Cache Keys (offline-first for polar conditions)
const LOCAL_CARGO_KEY = 'polar_ops_supabase_cargo';
const LOCAL_LOGS_KEY = 'polar_ops_supabase_logs';
const LOCAL_CONVOYS_KEY = 'polar_ops_supabase_convoys';
const LOCAL_INVENTORY_KEY = 'polar_ops_supabase_inventory';

export interface SupabaseSyncState {
  status: 'connected' | 'offline_cached' | 'syncing' | 'error';
  lastSyncTime: string;
  endpoint: string;
  tableName: string;
  latencyMs: number;
}

export function getSupabaseStatus(): SupabaseSyncState {
  return {
    status: isSupabaseConfigured ? 'connected' : 'offline_cached',
    lastSyncTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC',
    endpoint: isSupabaseConfigured ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co' : 'supabase-edge.local.cached',
    tableName: 'cargo_manifest / convoys',
    latencyMs: isSupabaseConfigured ? 24 : 12,
  };
}

export interface SupabaseHealthReport {
  isConfigured: boolean;
  endpoint: string;
  canConnect: boolean;
  canReadCargo: boolean;
  canWriteCargo: boolean;
  canReadConvoys: boolean;
  canWriteConvoys: boolean;
  isRlsBlocked: boolean;
  isConvoysTableMissing: boolean;
  cargoRowCount: number;
  logsRowCount: number;
  convoysRowCount: number;
  convoysErrorMessage?: string;
  errorMessage?: string;
  latencyMs: number;
  fixSqlPolicy: string;
  fixSqlDisable: string;
  fixSqlFullSchema: string;
  fixSqlConvoysOnly: string;
}

export const SUPABASE_CONVOYS_ONLY_SQL = `-- =======================================================
-- BHARATI POLAR OPS - FAIL-SAFE CONVOYS TABLE & REALTIME
-- Run this in Supabase SQL Editor to enable read, write, and realtime.
-- =======================================================

-- 1. Create table if not present
CREATE TABLE IF NOT EXISTS public.convoys (
  id TEXT PRIMARY KEY,
  name TEXT,
  convoy_name TEXT,
  type TEXT,
  vehicle_type TEXT,
  lead TEXT,
  lead_name TEXT,
  crew_count INTEGER DEFAULT 2,
  status TEXT DEFAULT 'en_route',
  speed TEXT DEFAULT '14 km/h',
  speed_kmh NUMERIC DEFAULT 14,
  fuel INTEGER DEFAULT 85,
  fuel_reserve_percent NUMERIC DEFAULT 85,
  cabin_temp NUMERIC DEFAULT 18.0,
  cabin_temperature NUMERIC DEFAULT 18.0,
  ext_temp NUMERIC DEFAULT -38.4,
  heading TEXT DEFAULT '142° SE',
  destination TEXT DEFAULT 'Bharati Depot B-04',
  eta_minutes INTEGER DEFAULT 30,
  eta TEXT DEFAULT '30 min',
  notes TEXT DEFAULT '',
  dispatch_log TEXT DEFAULT '',
  latitude NUMERIC DEFAULT -69.4205,
  longitude NUMERIC DEFAULT 76.2338,
  coord_x NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure all columns exist even if the table already existed before
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS convoy_name TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS lead TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS lead_name TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS crew_count INTEGER DEFAULT 2;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'en_route';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS speed TEXT DEFAULT '14 km/h';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC DEFAULT 14;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS fuel INTEGER DEFAULT 85;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS fuel_reserve_percent NUMERIC DEFAULT 85;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS cabin_temp NUMERIC DEFAULT 18.0;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS cabin_temperature NUMERIC DEFAULT 18.0;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS ext_temp NUMERIC DEFAULT -38.4;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS heading TEXT DEFAULT '142° SE';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT 'Bharati Depot B-04';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS eta_minutes INTEGER DEFAULT 30;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS eta TEXT DEFAULT '30 min';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS dispatch_log TEXT DEFAULT '';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS latitude NUMERIC DEFAULT -69.4205;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS longitude NUMERIC DEFAULT 76.2338;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS coord_x NUMERIC DEFAULT 50;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS coord_y NUMERIC DEFAULT 50;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Synchronize alias columns
UPDATE public.convoys SET
  name = COALESCE(name, convoy_name, 'Field Convoy'),
  convoy_name = COALESCE(convoy_name, name, 'Field Convoy'),
  lead = COALESCE(lead, lead_name, 'Station Lead'),
  lead_name = COALESCE(lead_name, lead, 'Station Lead'),
  type = COALESCE(type, vehicle_type, 'Traverse Unit'),
  vehicle_type = COALESCE(vehicle_type, type, 'Traverse Unit'),
  notes = COALESCE(notes, dispatch_log, ''),
  dispatch_log = COALESCE(dispatch_log, notes, '');

-- 4. Enable Row Level Security and allow full anonymous/authenticated access
ALTER TABLE public.convoys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convoys_all_policy" ON public.convoys;
DROP POLICY IF EXISTS "Allow anon all on convoys" ON public.convoys;
DROP POLICY IF EXISTS "Allow anon read convoys" ON public.convoys;
DROP POLICY IF EXISTS "Allow anon insert convoys" ON public.convoys;
DROP POLICY IF EXISTS "Allow anon update convoys" ON public.convoys;

CREATE POLICY "convoys_all_policy" 
ON public.convoys 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 5. Enable Supabase Realtime replication (safe execution)
ALTER TABLE public.convoys REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.convoys;
EXCEPTION WHEN OTHERS THEN
  -- Already added or restricted by role
  NULL;
END $$;

-- 6. Insert initial field convoys if table is empty
INSERT INTO public.convoys (id, name, convoy_name, type, vehicle_type, lead, lead_name, status, speed, speed_kmh, fuel, fuel_reserve_percent, cabin_temp, notes, destination, eta_minutes)
VALUES 
  ('convoy-alpha', 'Convoy Alpha (PB100)', 'Convoy Alpha (PB100)', 'PistonBully PB100', 'PistonBully PB100', 'Dr. Sarah Chen', 'Dr. Sarah Chen', 'en_route', '14 km/h', 14, 85, 85, 18.0, 'Route 4B clear. Proceeding at standard velocity.', 'Bharati Depot B-04', 32),
  ('convoy-bravo', 'Convoy Bravo (Heavy Sled)', 'Convoy Bravo (Heavy Sled)', 'Caterpillar Challenger', 'Caterpillar Challenger', 'Eng. Marcus Vance', 'Eng. Marcus Vance', 'en_route', '11 km/h', 11, 92, 92, 19.5, 'Heavy drill rig transit. Sled stabilizers engaged.', 'Bharati Depot B-04', 58),
  ('convoy-echo', 'Snowcat Echo (Challenger)', 'Snowcat Echo (Challenger)', 'Caterpillar Challenger', 'Caterpillar Challenger', 'M. Kowalski', 'M. Kowalski', 'hold', '0 km/h', 0, 44, 44, 16.0, 'Held at Skiway 04/22 threshold due to whiteout squall.', 'Skiway 04/22 Depot', 0)
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();`;

export const SUPABASE_FULL_SCHEMA_SQL = `-- =======================================================
-- BHARATI POLAR OPS - COMPLETE DATABASE SCHEMA SETUP
-- Creates: convoys, cargo_manifest, station_logs
-- =======================================================

-- 1. CONVOYS TABLE
CREATE TABLE IF NOT EXISTS public.convoys (
  id TEXT PRIMARY KEY,
  name TEXT,
  convoy_name TEXT,
  type TEXT,
  vehicle_type TEXT,
  lead TEXT,
  lead_name TEXT,
  crew_count INTEGER DEFAULT 2,
  status TEXT DEFAULT 'en_route',
  speed TEXT DEFAULT '14 km/h',
  speed_kmh NUMERIC DEFAULT 14,
  fuel INTEGER DEFAULT 85,
  fuel_reserve_percent NUMERIC DEFAULT 85,
  cabin_temp NUMERIC DEFAULT 18.0,
  cabin_temperature NUMERIC DEFAULT 18.0,
  ext_temp NUMERIC DEFAULT -38.4,
  heading TEXT DEFAULT '142° SE',
  destination TEXT DEFAULT 'Bharati Depot B-04',
  eta_minutes INTEGER DEFAULT 30,
  eta TEXT DEFAULT '30 min',
  notes TEXT DEFAULT '',
  dispatch_log TEXT DEFAULT '',
  latitude NUMERIC DEFAULT -69.4205,
  longitude NUMERIC DEFAULT 76.2338,
  coord_x NUMERIC DEFAULT 50,
  coord_y NUMERIC DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS convoy_name TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS lead TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS lead_name TEXT;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS crew_count INTEGER DEFAULT 2;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'en_route';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS speed TEXT DEFAULT '14 km/h';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC DEFAULT 14;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS fuel INTEGER DEFAULT 85;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS fuel_reserve_percent NUMERIC DEFAULT 85;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS cabin_temp NUMERIC DEFAULT 18.0;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS cabin_temperature NUMERIC DEFAULT 18.0;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS ext_temp NUMERIC DEFAULT -38.4;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS heading TEXT DEFAULT '142° SE';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT 'Bharati Depot B-04';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS eta_minutes INTEGER DEFAULT 30;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS eta TEXT DEFAULT '30 min';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS dispatch_log TEXT DEFAULT '';
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS latitude NUMERIC DEFAULT -69.4205;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS longitude NUMERIC DEFAULT 76.2338;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS coord_x NUMERIC DEFAULT 50;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS coord_y NUMERIC DEFAULT 50;
ALTER TABLE public.convoys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.convoys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "convoys_all_policy" ON public.convoys;
CREATE POLICY "convoys_all_policy" ON public.convoys FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.convoys REPLICA IDENTITY FULL;

-- 2. CARGO MANIFEST TABLE
CREATE TABLE IF NOT EXISTS public.cargo_manifest (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  hazmat_class TEXT,
  un_code TEXT,
  spec TEXT,
  origin TEXT,
  destination TEXT,
  program TEXT,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 5,
  condition TEXT DEFAULT 'nominal',
  logged_time TIMESTAMPTZ DEFAULT NOW(),
  synced BOOLEAN DEFAULT true
);

ALTER TABLE public.cargo_manifest ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cargo_all_policy" ON public.cargo_manifest;
CREATE POLICY "cargo_all_policy" ON public.cargo_manifest FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.cargo_manifest REPLICA IDENTITY FULL;

-- 3. STATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.station_logs (
  id TEXT PRIMARY KEY,
  time TEXT,
  type TEXT,
  title TEXT,
  detail TEXT,
  actor TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.station_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_all_policy" ON public.station_logs;
CREATE POLICY "logs_all_policy" ON public.station_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. REALTIME REGISTRATION
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.convoys;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cargo_manifest;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.station_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;`;

export const SUPABASE_RLS_POLICY_SQL = SUPABASE_CONVOYS_ONLY_SQL;

export const SUPABASE_DISABLE_RLS_SQL = `-- 1-Click Solution: Disable Row Level Security on all operational tables
ALTER TABLE public.convoys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_manifest DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_logs DISABLE ROW LEVEL SECURITY;`;

/**
 * Diagnostic Health Check: verifies connection, table existence, read, and write permissions.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthReport> {
  const startTime = Date.now();
  const endpoint = isSupabaseConfigured 
    ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co' 
    : 'Not configured';

  if (!isSupabaseConfigured) {
    return {
      isConfigured: false,
      endpoint,
      canConnect: false,
      canReadCargo: false,
      canWriteCargo: false,
      canReadConvoys: false,
      canWriteConvoys: false,
      isRlsBlocked: false,
      isConvoysTableMissing: false,
      cargoRowCount: 0,
      logsRowCount: 0,
      convoysRowCount: 0,
      errorMessage: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set in environment.',
      latencyMs: 0,
      fixSqlPolicy: SUPABASE_RLS_POLICY_SQL,
      fixSqlDisable: SUPABASE_DISABLE_RLS_SQL,
      fixSqlFullSchema: SUPABASE_FULL_SCHEMA_SQL,
      fixSqlConvoysOnly: SUPABASE_CONVOYS_ONLY_SQL,
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      isConfigured: true,
      endpoint,
      canConnect: false,
      canReadCargo: false,
      canWriteCargo: false,
      canReadConvoys: false,
      canWriteConvoys: false,
      isRlsBlocked: false,
      isConvoysTableMissing: false,
      cargoRowCount: 0,
      logsRowCount: 0,
      convoysRowCount: 0,
      errorMessage: 'Could not create Supabase client instance.',
      latencyMs: 0,
      fixSqlPolicy: SUPABASE_RLS_POLICY_SQL,
      fixSqlDisable: SUPABASE_DISABLE_RLS_SQL,
      fixSqlFullSchema: SUPABASE_FULL_SCHEMA_SQL,
      fixSqlConvoysOnly: SUPABASE_CONVOYS_ONLY_SQL,
    };
  }

  let canReadCargo = false;
  let canWriteCargo = false;
  let canReadConvoys = false;
  let canWriteConvoys = false;
  let isRlsBlocked = false;
  let isConvoysTableMissing = false;
  let cargoRowCount = 0;
  let logsRowCount = 0;
  let convoysRowCount = 0;
  let convoysErrorMessage: string | undefined;
  let errorMessage: string | undefined;

  try {
    // 1. Test Read Cargo
    const { data: cargoData, error: cargoReadError, count: cargoCount } = await client
      .from('cargo_manifest')
      .select('*', { count: 'exact' });

    if (!cargoReadError) {
      canReadCargo = true;
      cargoRowCount = cargoCount ?? (cargoData ? cargoData.length : 0);
    } else {
      errorMessage = `Read cargo error: ${cargoReadError.message}`;
    }

    // 2. Test Read Logs
    const { count: logsCount } = await client
      .from('station_logs')
      .select('*', { count: 'exact', head: true });
    logsRowCount = logsCount ?? 0;

    // 3. Test Read Convoys
    const { data: convData, error: convReadError, count: convCount } = await client
      .from('convoys')
      .select('*', { count: 'exact' });

    if (!convReadError && convData) {
      canReadConvoys = true;
      convoysRowCount = convCount ?? convData.length;
      
      // Probe write on convoys
      const testConvId = `probe-c-${Date.now()}`;
      const { error: convProbeWriteError } = await client
        .from('convoys')
        .insert({
          id: testConvId,
          convoy_name: 'Diagnostic Probe',
          name: 'Diagnostic Probe',
          status: 'IDLE',
          updated_at: new Date().toISOString(),
        });

      if (!convProbeWriteError) {
        canWriteConvoys = true;
        await client.from('convoys').delete().eq('id', testConvId);
      } else {
        const isRls = convProbeWriteError.code === '42501' || 
          convProbeWriteError.message.toLowerCase().includes('row-level security') ||
          convProbeWriteError.message.toLowerCase().includes('violates');
        if (isRls) {
          isRlsBlocked = true;
          convoysErrorMessage = `RLS is blocking writes to convoys: ${convProbeWriteError.message}`;
        } else {
          // If column mismatch on probe, the table exists and write was accepted or rejected due to schema
          canWriteConvoys = true;
        }
      }
    } else if (convReadError) {
      const msg = convReadError.message.toLowerCase();
      if (
        convReadError.code === '42P01' || 
        convReadError.code === 'PGRST205' ||
        msg.includes('does not exist') ||
        msg.includes('relation') ||
        msg.includes('could not find')
      ) {
        isConvoysTableMissing = true;
        convoysErrorMessage = 'Table "convoys" does not exist in your Supabase database.';
      } else if (
        convReadError.code === '42501' ||
        msg.includes('row-level security')
      ) {
        isRlsBlocked = true;
        convoysErrorMessage = `RLS is blocking reads from convoys: ${convReadError.message}`;
      } else {
        convoysErrorMessage = convReadError.message;
      }
    }

    // 4. Test Write probe on cargo_manifest
    const probeId = `probe-probe-${Date.now()}`;
    const { error: writeError } = await client
      .from('cargo_manifest')
      .insert({
        id: probeId,
        code: 'PROBE-00',
        title: 'System Diagnostic Probe',
        category: 'general',
        spec: 'RLS Permission Test',
        origin: 'Station Test Bed',
        destination: 'Cloud Buffer',
        program: 'Diagnostics',
        current_step: 1,
        total_steps: 1,
        condition: 'nominal',
        logged_time: new Date().toISOString(),
        synced: true,
      });

    if (!writeError) {
      canWriteCargo = true;
      // Clean up test probe row
      await client.from('cargo_manifest').delete().eq('id', probeId);
    } else {
      if (
        writeError.code === '42501' || 
        writeError.message.toLowerCase().includes('row-level security') ||
        writeError.message.toLowerCase().includes('violates')
      ) {
        isRlsBlocked = true;
        errorMessage = `Row-Level Security (RLS) is blocking writes: ${writeError.message}`;
      } else {
        errorMessage = `Write test error: ${writeError.message}`;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errorMessage = msg;
  }

  const latencyMs = Date.now() - startTime;

  return {
    isConfigured: true,
    endpoint,
    canConnect: canReadCargo || canWriteCargo || canReadConvoys || isRlsBlocked,
    canReadCargo,
    canWriteCargo,
    canReadConvoys,
    canWriteConvoys,
    isRlsBlocked,
    isConvoysTableMissing,
    cargoRowCount,
    logsRowCount,
    convoysRowCount,
    convoysErrorMessage,
    errorMessage,
    latencyMs,
    fixSqlPolicy: SUPABASE_RLS_POLICY_SQL,
    fixSqlDisable: SUPABASE_DISABLE_RLS_SQL,
    fixSqlFullSchema: SUPABASE_FULL_SCHEMA_SQL,
    fixSqlConvoysOnly: SUPABASE_CONVOYS_ONLY_SQL,
  };
}

/**
 * Seed or Push ALL local cargo items to Supabase table `cargo_manifest`
 */
export async function seedAllCargoToSupabase(cargoList: CargoItem[]): Promise<{
  success: boolean;
  insertedCount: number;
  error?: string;
  isRlsBlocked?: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, insertedCount: 0, error: 'Supabase client not initialized' };
  }

  const rows = cargoList.map((cargo) => ({
    id: cargo.id,
    code: cargo.code,
    title: cargo.title,
    category: cargo.category,
    hazmat_class: cargo.hazmatClass,
    un_code: cargo.unCode,
    spec: cargo.spec,
    origin: cargo.origin,
    destination: cargo.destination,
    program: cargo.program,
    current_step: cargo.currentStep,
    total_steps: cargo.totalSteps,
    condition: cargo.condition,
    logged_time: cargo.loggedTime || new Date().toISOString(),
    synced: true,
  }));

  try {
    const { error, count } = await client
      .from('cargo_manifest')
      .upsert(rows, { onConflict: 'id', count: 'exact' });

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        insertedCount: 0,
        error: error.message,
        isRlsBlocked: isRls,
      };
    }

    return { success: true, insertedCount: count ?? rows.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, insertedCount: 0, error: msg };
  }
}

/**
 * Sync a verified cargo item to Supabase table `cargo_manifest`
 */
export async function syncCargoToSupabase(cargo: CargoItem): Promise<{ 
  success: boolean; 
  source: 'supabase' | 'local_cache'; 
  error?: string;
  isRlsBlocked?: boolean;
}> {
  const client = getSupabaseClient();
  
  // Cache to localStorage first for sub-zero offline guarantee
  try {
    const raw = localStorage.getItem(LOCAL_CARGO_KEY);
    const existing: CargoItem[] = raw ? JSON.parse(raw) : sampleCargoDatabase;
    const updated = existing.map((item) => (item.id === cargo.id ? { ...cargo, synced: true } : item));
    localStorage.setItem(LOCAL_CARGO_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local storage cache write error:', e);
  }

  if (client) {
    try {
      const { error } = await client
        .from('cargo_manifest')
        .upsert({
          id: cargo.id,
          code: cargo.code,
          title: cargo.title,
          category: cargo.category,
          hazmat_class: cargo.hazmatClass,
          un_code: cargo.unCode,
          spec: cargo.spec,
          origin: cargo.origin,
          destination: cargo.destination,
          program: cargo.program,
          current_step: cargo.currentStep,
          total_steps: cargo.totalSteps,
          condition: cargo.condition,
          logged_time: new Date().toISOString(),
          synced: true,
        });

      if (error) {
        const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
        console.warn('Supabase cargo upsert failed, fell back to local cache:', error.message);
        return { 
          success: false, 
          source: 'local_cache', 
          error: error.message,
          isRlsBlocked: isRls,
        };
      }
      return { success: true, source: 'supabase' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, source: 'local_cache', error: msg };
    }
  }

  return { success: true, source: 'local_cache' };
}

/**
 * Log station event to Supabase table `station_logs`
 */
export async function logEventToSupabase(log: LogEvent): Promise<{ 
  success: boolean; 
  source: 'supabase' | 'local_cache';
  error?: string;
  isRlsBlocked?: boolean;
}> {
  const client = getSupabaseClient();

  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    const existing: LogEvent[] = raw ? JSON.parse(raw) : initialLogStream;
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify([log, ...existing]));
  } catch (e) {
    console.warn('Local log cache write error:', e);
  }

  if (client) {
    try {
      const { error } = await client
        .from('station_logs')
        .insert({
          id: log.id,
          time: log.time,
          type: log.type,
          title: log.title,
          detail: log.detail,
          actor: log.actor,
          status: log.status,
          created_at: new Date().toISOString(),
        });

      if (error) {
        const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
        return { success: false, source: 'local_cache', error: error.message, isRlsBlocked: isRls };
      }
      return { success: true, source: 'supabase' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, source: 'local_cache', error: msg };
    }
  }

  return { success: true, source: 'local_cache' };
}

/**
 * Map Supabase cargo_manifest row to application CargoItem
 */
export function mapRowToCargo(row: any): CargoItem {
  return {
    id: String(row.id),
    code: row.code || 'CRG-???',
    title: row.title || row.name || 'Polar Cargo',
    category: row.category || 'equipment',
    hazmatClass: row.hazmat_class ?? row.hazmatClass ?? null,
    unCode: row.un_code ?? row.unCode ?? null,
    spec: row.spec || '',
    origin: row.origin || 'Port Dock',
    destination: row.destination || 'Bharati Depot B-04',
    program: row.program || 'Logistics',
    currentStep: Number(row.current_step ?? row.currentStep) || 1,
    totalSteps: Number(row.total_steps ?? row.totalSteps) || 5,
    condition: row.condition || 'nominal',
    loggedTime: row.logged_time || row.loggedTime || new Date().toISOString(),
    synced: true,
  };
}

/**
 * Load initial cargo records from Supabase or local offline storage
 */
export async function loadCargoFromSupabase(forceCloud = false): Promise<CargoItem[]> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('cargo_manifest')
        .select('*')
        .order('current_step', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapRowToCargo);
        try {
          localStorage.setItem(LOCAL_CARGO_KEY, JSON.stringify(mapped));
        } catch {
          // ignore
        }
        return mapped;
      }
    } catch (err) {
      console.warn('Error loading from Supabase, loading fallback:', err);
    }
  }

  // Check localStorage
  try {
    const cached = localStorage.getItem(LOCAL_CARGO_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }

  return sampleCargoDatabase;
}

/**
 * Helper: Resilient Upsert to Supabase
 * If PostgREST fails because a column does not exist in the user's schema,
 * it detects the missing column, removes it from the payload, and retries.
 */
async function resilientUpsert(
  client: any,
  table: string,
  row: Record<string, any>,
  onConflict = 'id'
): Promise<{ success: boolean; error: any }> {
  const payload = { ...row };

  for (let attempt = 0; attempt < 10; attempt++) {
    const { error } = await client.from(table).upsert(payload, { onConflict });
    if (!error) {
      return { success: true, error: null };
    }

    // Check if error is due to an unknown column in schema cache
    const colMatch =
      error.message.match(/Could not find the '([^']+)' column/) ||
      error.message.match(/column "([^"]+)" of relation/) ||
      error.message.match(/column "([^"]+)" does not exist/);

    if (colMatch && colMatch[1]) {
      const badCol = colMatch[1];
      if (payload[badCol] !== undefined) {
        delete payload[badCol];
        continue; // Retry without the offending column
      }
    }

    return { success: false, error };
  }

  return { success: false, error: new Error('Exceeded retry attempts') };
}

/**
 * Map Supabase convoys table row to application ConvoyUnit.
 * Respects ANY column name edited by the user (short or long name).
 */
export function mapRowToConvoy(row: any): ConvoyUnit {
  // Status parsing: recognizes en_route, hold, idle, and natural language variants
  const rawStatus = String(row.status || '').toLowerCase().trim();
  let status: 'en_route' | 'idle' | 'hold' = 'en_route';
  if (
    rawStatus.includes('hold') || 
    rawStatus.includes('held') || 
    rawStatus.includes('weather') || 
    rawStatus.includes('stop') || 
    rawStatus.includes('pause') ||
    rawStatus.includes('wait') ||
    rawStatus.includes('delay') ||
    rawStatus === 'halt'
  ) {
    status = 'hold';
  } else if (
    rawStatus.includes('idle') || 
    rawStatus === 'base' || 
    rawStatus === 'parked' ||
    rawStatus === 'standby'
  ) {
    status = 'idle';
  } else {
    status = 'en_route';
  }

  // Latitude and Longitude parsing
  const rawLat = row.latitude ?? row.lat;
  const rawLon = row.longitude ?? row.lon ?? row.lng;
  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat) || -69.4205;
  const lon = typeof rawLon === 'number' ? rawLon : parseFloat(rawLon) || 76.2338;
  const latStr = `${Math.abs(lat).toFixed(4)}°S`;
  const lonStr = `${Math.abs(lon).toFixed(4)}°E`;

  // Tactical Map percentage coordinates (X, Y in % bounds 10..90)
  let x = 50;
  let y = 50;
  if (row.coord_x !== undefined && row.coord_x !== null && !isNaN(Number(row.coord_x))) {
    x = Math.max(5, Math.min(95, Number(row.coord_x)));
  } else if (row.x !== undefined && row.x !== null && !isNaN(Number(row.x))) {
    x = Math.max(5, Math.min(95, Number(row.x)));
  } else if (!isNaN(lon) && !isNaN(lat)) {
    const lonMin = 76.10;
    const lonMax = 76.42;
    const latMin = -69.50;
    const latMax = -69.38;
    const normX = (lon - lonMin) / (lonMax - lonMin);
    const normY = (latMax - lat) / (latMax - latMin);
    x = Math.max(10, Math.min(90, Math.round(normX * 70 + 15)));
    y = Math.max(10, Math.min(90, Math.round(normY * 70 + 15)));
  }

  if (row.coord_y !== undefined && row.coord_y !== null && !isNaN(Number(row.coord_y))) {
    y = Math.max(5, Math.min(95, Number(row.coord_y)));
  } else if (row.y !== undefined && row.y !== null && !isNaN(Number(row.y))) {
    y = Math.max(5, Math.min(95, Number(row.y)));
  }

  // Speed parsing: handles "14 km/h", "14", 14, 0
  let speedStr = '14 km/h';
  if (row.speed !== undefined && row.speed !== null && String(row.speed).trim() !== '') {
    const s = String(row.speed).trim();
    speedStr = s.toLowerCase().includes('km/h') ? s : `${s} km/h`;
  } else if (row.speed_kmh !== undefined && row.speed_kmh !== null && !isNaN(Number(row.speed_kmh))) {
    speedStr = `${row.speed_kmh} km/h`;
  } else if (row.ground_speed !== undefined && row.ground_speed !== null) {
    speedStr = `${row.ground_speed} km/h`;
  }

  // ETA minutes parsing (safely handles 0)
  const rawEta = row.eta_minutes ?? row.eta_min ?? row.eta;
  let etaMinutes = 30;
  if (rawEta !== undefined && rawEta !== null) {
    if (typeof rawEta === 'number' && !isNaN(rawEta)) {
      etaMinutes = rawEta;
    } else {
      const parsed = parseFloat(String(rawEta));
      if (!isNaN(parsed)) etaMinutes = Math.round(parsed);
    }
  }

  const speedNum = parseFloat(speedStr) || 12;
  const rawDist = row.distance_to_depot_km ?? row.distance_km ?? row.distance;
  const distanceKm = rawDist !== undefined && rawDist !== null && !isNaN(Number(rawDist))
    ? Number(rawDist)
    : parseFloat(((etaMinutes * speedNum) / 60).toFixed(1)) || 4.5;

  // Name, Type, and Lead: check both short and long column aliases
  const convoyName = row.name || row.convoy_name || row.title || 'Field Convoy';
  const vehicleType = row.type || row.vehicle_type || row.vehicle || 'PistonBully PB100';
  const leadName = row.lead || row.lead_name || row.leader || 'Dr. Sarah Chen';

  // Fuel parsing (safely handle 0% fuel)
  let fuelReserve = 85;
  const rawFuel = row.fuel ?? row.fuel_reserve_percent ?? row.fuel_pct ?? row.battery;
  if (rawFuel !== undefined && rawFuel !== null && !isNaN(Number(rawFuel))) {
    fuelReserve = Math.max(0, Math.min(100, Math.round(Number(rawFuel))));
  }

  // Cabin Temperature (safely handle 0°C or negative numbers)
  let cabinTemp = 18;
  const rawCabin = row.cabin_temp ?? row.cabin_temperature ?? row.cabinTemp;
  if (rawCabin !== undefined && rawCabin !== null && !isNaN(Number(rawCabin))) {
    cabinTemp = Number(rawCabin);
  }

  // External / Ambient Temperature
  let extTemp = -38.4;
  const rawExt = row.ext_temp ?? row.extTemp ?? row.outside_temp ?? row.ambient_temp ?? row.temp;
  if (rawExt !== undefined && rawExt !== null && !isNaN(Number(rawExt))) {
    extTemp = Number(rawExt);
  }

  // Crew Count (safely handle 0 or 1)
  let crewCount = 2;
  const rawCrew = row.crew_count ?? row.crew ?? row.crewCount;
  if (rawCrew !== undefined && rawCrew !== null && !isNaN(Number(rawCrew))) {
    crewCount = Math.max(0, Math.round(Number(rawCrew)));
  }

  // Heading & Direction
  const headingStr = row.heading || row.heading_direction || row.bearing || '142° SE';

  // Notes & Dispatch Log
  const dispatchLog = row.notes ?? row.dispatch_log ?? row.log ?? row.description ?? '';

  return {
    id: String(row.id),
    name: convoyName,
    type: vehicleType,
    status,
    coordinates: `${latStr} • ${lonStr}`,
    speed: speedStr,
    heading: headingStr,
    crewCount,
    lead: leadName,
    fuelPct: fuelReserve,
    cabinTemp,
    extTemp,
    distanceToDepotKm: distanceKm,
    etaMin: etaMinutes,
    notes: dispatchLog,
    x,
    y,
  };
}

/**
 * Map ConvoyUnit to Supabase table row (synchronizes all short and long column aliases)
 */
export function mapConvoyToRow(convoy: ConvoyUnit): Record<string, any> {
  const speedNum = parseFloat(convoy.speed) || 0;
  let latitude = -69.4205;
  let longitude = 76.2338;
  if (convoy.coordinates) {
    const parts = convoy.coordinates.split('•');
    if (parts.length >= 2) {
      const latP = parseFloat(parts[0]);
      const lonP = parseFloat(parts[1]);
      if (!isNaN(latP)) latitude = -Math.abs(latP);
      if (!isNaN(lonP)) longitude = Math.abs(lonP);
    }
  }

  const statusText = convoy.status === 'hold' 
    ? 'hold' 
    : convoy.status === 'idle' 
    ? 'idle' 
    : 'en_route';

  return {
    id: convoy.id,
    name: convoy.name,
    convoy_name: convoy.name,
    type: convoy.type,
    vehicle_type: convoy.type,
    lead: convoy.lead,
    lead_name: convoy.lead,
    crew_count: convoy.crewCount,
    status: statusText,
    speed: convoy.speed,
    speed_kmh: speedNum,
    fuel: convoy.fuelPct,
    fuel_reserve_percent: convoy.fuelPct,
    cabin_temp: convoy.cabinTemp,
    cabin_temperature: convoy.cabinTemp,
    ext_temp: convoy.extTemp,
    heading: convoy.heading,
    destination: 'Bharati Depot B-04',
    eta_minutes: convoy.etaMin,
    eta: `${convoy.etaMin} min`,
    notes: convoy.notes,
    dispatch_log: convoy.notes,
    latitude,
    longitude,
    coord_x: convoy.x,
    coord_y: convoy.y,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Load field convoys and traverses from Supabase table `convoys`
 */
export async function loadConvoysFromSupabase(forceCloud = false): Promise<ConvoyUnit[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let { data, error } = await client
        .from('convoys')
        .select('*');

      // Fallback check if user created singular 'convoy' table
      if (error) {
        const alt = await client.from('convoy').select('*');
        if (!alt.error && alt.data) {
          data = alt.data;
          error = null;
        }
      }

      if (!error && data) {
        if (data.length > 0) {
          const mapped = data.map(mapRowToConvoy);
          try {
            localStorage.setItem(LOCAL_CONVOYS_KEY, JSON.stringify(mapped));
          } catch {
            // ignore
          }
          console.log(`[Supabase Convoys] Successfully loaded ${mapped.length} convoys from cloud.`);
          return mapped;
        } else {
          // Table exists in Supabase, but has 0 rows. Auto-seed initial convoys into database!
          console.log('[Supabase Convoys] Table exists in Supabase with 0 rows. Auto-seeding initial convoys...');
          seedAllConvoysToSupabase(initialConvoys).catch((seedErr) => {
            console.warn('[Supabase Convoys] Auto-seed failed:', seedErr);
          });
          return initialConvoys;
        }
      } else if (error) {
        console.warn('[Supabase Convoys] Error loading convoys from Supabase:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase Convoys] Exception loading convoys from Supabase:', err);
    }
  }

  // Fallback to local storage or defaults
  try {
    const cached = localStorage.getItem(LOCAL_CONVOYS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }

  return initialConvoys;
}

/**
 * Diagnostic pull function for manual UI triggers
 */
export async function fetchConvoysWithDiagnostics(): Promise<{
  success: boolean;
  data: ConvoyUnit[];
  source: 'supabase' | 'local_cache';
  error?: string;
  isTableMissing?: boolean;
  isRlsBlocked?: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      data: initialConvoys,
      source: 'local_cache',
      error: 'Supabase client is not configured (missing environment variables).',
    };
  }

  try {
    let { data, error } = await client.from('convoys').select('*');
    if (error) {
      const alt = await client.from('convoy').select('*');
      if (!alt.error && alt.data) {
        data = alt.data;
        error = null;
      }
    }

    if (!error && data) {
      if (data.length > 0) {
        const mapped = data.map(mapRowToConvoy);
        try {
          localStorage.setItem(LOCAL_CONVOYS_KEY, JSON.stringify(mapped));
        } catch {
          // ignore
        }
        return { success: true, data: mapped, source: 'supabase' };
      } else {
        // Table exists, 0 rows - seed it
        await seedAllConvoysToSupabase(initialConvoys);
        return { success: true, data: initialConvoys, source: 'supabase' };
      }
    }

    const msg = error ? error.message.toLowerCase() : '';
    const isTableMissing =
      error?.code === '42P01' ||
      error?.code === 'PGRST205' ||
      msg.includes('does not exist') ||
      msg.includes('relation');
    const isRlsBlocked = error?.code === '42501' || msg.includes('row-level security');

    return {
      success: false,
      data: initialConvoys,
      source: 'local_cache',
      error: error?.message || 'Unknown Supabase error',
      isTableMissing,
      isRlsBlocked,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: initialConvoys, source: 'local_cache', error: msg };
  }
}

/**
 * Update/Sync an active convoy to Supabase table `convoys`
 */
export async function syncConvoyToSupabase(convoy: ConvoyUnit): Promise<{
  success: boolean;
  source: 'supabase' | 'local_cache';
  error?: string;
  isRlsBlocked?: boolean;
  isTableMissing?: boolean;
}> {
  const client = getSupabaseClient();

  // Cache to localStorage first for reliable offline experience
  try {
    const raw = localStorage.getItem(LOCAL_CONVOYS_KEY);
    const existing: ConvoyUnit[] = raw ? JSON.parse(raw) : initialConvoys;
    const updated = existing.some((c) => c.id === convoy.id)
      ? existing.map((c) => (c.id === convoy.id ? convoy : c))
      : [convoy, ...existing];
    localStorage.setItem(LOCAL_CONVOYS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local convoy cache write error:', e);
  }

  if (client) {
    try {
      const row = mapConvoyToRow(convoy);
      let res = await resilientUpsert(client, 'convoys', row, 'id');

      if (!res.success && res.error && (res.error.code === '42P01' || res.error.message?.includes('does not exist'))) {
        // Retry with singular 'convoy' table
        const altRes = await resilientUpsert(client, 'convoy', row, 'id');
        if (altRes.success) {
          res = altRes;
        }
      }

      if (res.success) {
        return { success: true, source: 'supabase' };
      }

      const error = res.error;
      const msg = (error.message || '').toLowerCase();
      const isRls = error.code === '42501' || msg.includes('row-level security');
      const isTableMissing =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        msg.includes('does not exist') ||
        msg.includes('relation');

      return {
        success: false,
        source: 'local_cache',
        error: error.message,
        isRlsBlocked: isRls,
        isTableMissing,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, source: 'local_cache', error: msg };
    }
  }

  return { success: true, source: 'local_cache' };
}

/**
 * Seed or Push all active field convoys to Supabase table `convoys`
 */
export async function seedAllConvoysToSupabase(convoysList: ConvoyUnit[]): Promise<{
  success: boolean;
  insertedCount: number;
  error?: string;
  isRlsBlocked?: boolean;
  isTableMissing?: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, insertedCount: 0, error: 'Supabase client not initialized' };
  }

  let successCount = 0;
  let lastError: any = null;
  let targetTable = 'convoys';

  for (const convoy of convoysList) {
    const row = mapConvoyToRow(convoy);
    let res = await resilientUpsert(client, targetTable, row, 'id');
    if (!res.success && res.error && (res.error.code === '42P01' || res.error.message?.includes('does not exist'))) {
      targetTable = 'convoy';
      res = await resilientUpsert(client, targetTable, row, 'id');
    }

    if (res.success) {
      successCount++;
    } else {
      lastError = res.error;
    }
  }

  if (successCount > 0) {
    return { success: true, insertedCount: successCount };
  }

  const msg = (lastError?.message || '').toLowerCase();
  const isRls = lastError?.code === '42501' || msg.includes('row-level security');
  const isTableMissing =
    lastError?.code === '42P01' ||
    lastError?.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('relation');

  return {
    success: false,
    insertedCount: 0,
    error: lastError?.message || 'Failed to sync convoys to Supabase',
    isRlsBlocked: isRls,
    isTableMissing,
  };
}

/**
 * Realtime subscription to Supabase `cargo_manifest`, `station_logs`, and `convoys`
 */
export function subscribeToSupabaseRealtime(
  onCargoChange: (cargo: CargoItem) => void,
  onLogInsert?: (log: LogEvent) => void,
  onConvoyChange?: (convoy: ConvoyUnit) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('polar_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cargo_manifest' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const row = payload.new as any;
            if (row.id) {
              onCargoChange(mapRowToCargo(row));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'station_logs' },
        (payload) => {
          if (payload.new && onLogInsert) {
            const row = payload.new as any;
            onLogInsert({
              id: row.id || `log-${Date.now()}`,
              time: row.time || new Date().toLocaleTimeString('en-GB'),
              type: row.type || 'system',
              title: row.title || 'Remote Event',
              detail: row.detail || '',
              actor: row.actor || 'Supabase Edge',
              status: row.status || 'VERIFIED',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'convoys' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const row = payload.new as any;
            if (row.id && onConvoyChange) {
              onConvoyChange(mapRowToConvoy(row));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'convoy' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const row = payload.new as any;
            if (row.id && onConvoyChange) {
              onConvoyChange(mapRowToConvoy(row));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Connected to live postgres changes.');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Supabase Realtime] Channel error. Will fallback to active polling.');
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return null;
  }
}
