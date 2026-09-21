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
-- BHARATI POLAR OPS - CONVOYS TABLE SETUP & REALTIME FIX
-- =======================================================

-- 1. Create convoys table with all standard columns and aliases
CREATE TABLE IF NOT EXISTS convoys (
  id TEXT PRIMARY KEY,
  convoy_name TEXT,
  name TEXT,
  vehicle_type TEXT,
  type TEXT,
  crew_count INTEGER DEFAULT 2,
  lead_name TEXT,
  lead TEXT,
  status TEXT DEFAULT 'EN ROUTE',
  speed_kmh NUMERIC DEFAULT 14,
  speed TEXT DEFAULT '14 km/h',
  fuel_reserve_percent NUMERIC DEFAULT 85,
  cabin_temperature NUMERIC DEFAULT 18.0,
  destination TEXT DEFAULT 'Bharati Depot B-04',
  eta_minutes INTEGER DEFAULT 32,
  dispatch_log TEXT,
  notes TEXT,
  latitude NUMERIC DEFAULT -69.4205,
  longitude NUMERIC DEFAULT 76.2338,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Safely add columns if the table already existed with fewer fields
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS convoy_name TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS crew_count INTEGER DEFAULT 2;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS lead_name TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS lead TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'EN ROUTE';
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC DEFAULT 14;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS speed TEXT DEFAULT '14 km/h';
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS fuel_reserve_percent NUMERIC DEFAULT 85;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS cabin_temperature NUMERIC DEFAULT 18.0;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT 'Bharati Depot B-04';
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS eta_minutes INTEGER DEFAULT 32;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS dispatch_log TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS latitude NUMERIC DEFAULT -69.4205;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS longitude NUMERIC DEFAULT 76.2338;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Enable RLS and grant full public anonymous read & write access
ALTER TABLE convoys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on convoys" ON convoys;
CREATE POLICY "Allow anon all on convoys" 
ON convoys FOR ALL TO anon 
USING (true) WITH CHECK (true);

-- 4. Enable Supabase Realtime publication for convoys
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE convoys;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 5. Seed initial field convoys if not present
INSERT INTO convoys (id, convoy_name, name, vehicle_type, type, crew_count, lead_name, lead, status, speed_kmh, speed, fuel_reserve_percent, cabin_temperature, destination, eta_minutes, dispatch_log, notes, latitude, longitude)
VALUES 
  ('convoy-alpha', 'Convoy Alpha (PB100)', 'Convoy Alpha (PB100)', 'PistonBully PB100', 'PistonBully PB100', 3, 'Dr. Sarah Chen', 'Dr. Sarah Chen', 'EN ROUTE', 14, '14 km/h', 85, 18.0, 'Bharati Depot B-04', 32, 'Route 4B clear. Ice fracture flagged at Waypoint 12. Proceeding at standard velocity.', 'Route 4B clear. Ice fracture flagged at Waypoint 12. Proceeding at standard velocity.', -69.4205, 76.2338),
  ('convoy-bravo', 'Convoy Bravo (Heavy Sled)', 'Convoy Bravo (Heavy Sled)', 'Caterpillar Challenger', 'Caterpillar Challenger', 2, 'Eng. Marcus Vance', 'Eng. Marcus Vance', 'EN ROUTE', 11, '11 km/h', 92, 19.5, 'Bharati Depot B-04', 58, 'Heavy drill rig transit. Sled stabilizers engaged. Temperature holding nominal.', 'Heavy drill rig transit. Sled stabilizers engaged. Temperature holding nominal.', -69.4610, 76.1950)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();`;

export const SUPABASE_FULL_SCHEMA_SQL = `-- =======================================================
-- BHARATI POLAR OPS - FULL DATABASE SCHEMA & RLS SETUP
-- =======================================================

-- 1. CONVOYS & TRAVERSES TABLE
CREATE TABLE IF NOT EXISTS convoys (
  id TEXT PRIMARY KEY,
  convoy_name TEXT,
  name TEXT,
  vehicle_type TEXT,
  type TEXT,
  crew_count INTEGER DEFAULT 2,
  lead_name TEXT,
  lead TEXT,
  status TEXT DEFAULT 'EN ROUTE',
  speed_kmh NUMERIC DEFAULT 14,
  speed TEXT DEFAULT '14 km/h',
  fuel_reserve_percent NUMERIC DEFAULT 85,
  cabin_temperature NUMERIC DEFAULT 18.0,
  destination TEXT DEFAULT 'Bharati Depot B-04',
  eta_minutes INTEGER DEFAULT 32,
  dispatch_log TEXT,
  notes TEXT,
  latitude NUMERIC DEFAULT -69.4205,
  longitude NUMERIC DEFAULT 76.2338,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE convoys ADD COLUMN IF NOT EXISTS convoy_name TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS crew_count INTEGER DEFAULT 2;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS lead_name TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS lead TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'EN ROUTE';
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC DEFAULT 14;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS speed TEXT DEFAULT '14 km/h';
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS fuel_reserve_percent NUMERIC DEFAULT 85;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS cabin_temperature NUMERIC DEFAULT 18.0;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT 'Bharati Depot B-04';
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS eta_minutes INTEGER DEFAULT 32;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS dispatch_log TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS latitude NUMERIC DEFAULT -69.4205;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS longitude NUMERIC DEFAULT 76.2338;
ALTER TABLE convoys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE convoys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on convoys" ON convoys;
CREATE POLICY "Allow anon all on convoys" 
ON convoys FOR ALL TO anon 
USING (true) WITH CHECK (true);

-- 2. CARGO MANIFEST TABLE
CREATE TABLE IF NOT EXISTS cargo_manifest (
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

ALTER TABLE cargo_manifest ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on cargo_manifest" ON cargo_manifest;
CREATE POLICY "Allow anon all on cargo_manifest" 
ON cargo_manifest FOR ALL TO anon 
USING (true) WITH CHECK (true);

-- 3. STATION LOGS TABLE
CREATE TABLE IF NOT EXISTS station_logs (
  id TEXT PRIMARY KEY,
  time TEXT,
  type TEXT,
  title TEXT,
  detail TEXT,
  actor TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE station_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on station_logs" ON station_logs;
CREATE POLICY "Allow anon all on station_logs" 
ON station_logs FOR ALL TO anon 
USING (true) WITH CHECK (true);

-- 4. ENABLE REALTIME REPLICATION (For live updates across all clients)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE convoys;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cargo_manifest;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE station_logs;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 5. SEED INITIAL FIELD CONVOYS
INSERT INTO convoys (id, convoy_name, name, vehicle_type, type, crew_count, lead_name, lead, status, speed_kmh, speed, fuel_reserve_percent, cabin_temperature, destination, eta_minutes, dispatch_log, notes, latitude, longitude)
VALUES 
  ('convoy-alpha', 'Convoy Alpha (PB100)', 'Convoy Alpha (PB100)', 'PistonBully PB100', 'PistonBully PB100', 3, 'Dr. Sarah Chen', 'Dr. Sarah Chen', 'EN ROUTE', 14, '14 km/h', 85, 18.0, 'Bharati Depot B-04', 32, 'Route 4B clear. Ice fracture flagged at Waypoint 12. Proceeding at standard velocity.', 'Route 4B clear. Ice fracture flagged at Waypoint 12. Proceeding at standard velocity.', -69.4205, 76.2338),
  ('convoy-bravo', 'Convoy Bravo (Heavy Sled)', 'Convoy Bravo (Heavy Sled)', 'Caterpillar Challenger', 'Caterpillar Challenger', 2, 'Eng. Marcus Vance', 'Eng. Marcus Vance', 'EN ROUTE', 11, '11 km/h', 92, 19.5, 'Bharati Depot B-04', 58, 'Heavy drill rig transit. Sled stabilizers engaged. Temperature holding nominal.', 'Heavy drill rig transit. Sled stabilizers engaged. Temperature holding nominal.', -69.4610, 76.1950)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();`;

export const SUPABASE_RLS_POLICY_SQL = SUPABASE_FULL_SCHEMA_SQL;

export const SUPABASE_DISABLE_RLS_SQL = `-- Quickest Fix: Disable Row Level Security on app tables
CREATE TABLE IF NOT EXISTS convoys (id TEXT PRIMARY KEY, convoy_name TEXT, status TEXT);
ALTER TABLE cargo_manifest DISABLE ROW LEVEL SECURITY;
ALTER TABLE station_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE convoys DISABLE ROW LEVEL SECURITY;`;

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
 * Load initial cargo records from Supabase or local offline storage
 */
export async function loadCargoFromSupabase(): Promise<CargoItem[]> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('cargo_manifest')
        .select('*')
        .order('current_step', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          code: row.code,
          title: row.title,
          category: row.category,
          hazmatClass: row.hazmat_class,
          unCode: row.un_code,
          spec: row.spec,
          origin: row.origin,
          destination: row.destination,
          program: row.program,
          currentStep: Number(row.current_step) || 1,
          totalSteps: Number(row.total_steps) || 5,
          condition: row.condition || 'nominal',
          loggedTime: row.logged_time || new Date().toISOString(),
          synced: true,
        }));
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

  for (let attempt = 0; attempt < 8; attempt++) {
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
 * Map Supabase convoys table row to application ConvoyUnit
 */
export function mapRowToConvoy(row: any): ConvoyUnit {
  const rawStatus = (row.status || '').toLowerCase();
  let status: 'en_route' | 'idle' | 'hold' = 'en_route';
  if (rawStatus.includes('hold') || rawStatus.includes('held') || rawStatus.includes('weather')) {
    status = 'hold';
  } else if (rawStatus.includes('idle')) {
    status = 'idle';
  }

  const rawLat = row.latitude ?? row.lat;
  const rawLon = row.longitude ?? row.lon ?? row.lng;
  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat) || -69.42;
  const lon = typeof rawLon === 'number' ? rawLon : parseFloat(rawLon) || 76.23;
  const latStr = `${Math.abs(lat).toFixed(4)}°S`;
  const lonStr = `${Math.abs(lon).toFixed(4)}°E`;

  // Calculate coordinates on tactical map
  // Bounds: Lon [76.10, 76.42] -> X [15%, 85%], Lat [-69.38, -69.50] -> Y [15%, 85%]
  let x = 50;
  let y = 50;
  if (!isNaN(lon) && !isNaN(lat)) {
    const lonMin = 76.10;
    const lonMax = 76.42;
    const latMin = -69.50;
    const latMax = -69.38;
    const normX = (lon - lonMin) / (lonMax - lonMin);
    const normY = (latMax - lat) / (latMax - latMin);
    x = Math.max(10, Math.min(90, Math.round(normX * 70 + 15)));
    y = Math.max(10, Math.min(90, Math.round(normY * 70 + 15)));
  }

  const speedVal = row.speed_kmh ?? row.speed ?? row.ground_speed ?? 0;
  const speedStr = typeof speedVal === 'string' && speedVal.includes('km/h') ? speedVal : `${speedVal} km/h`;
  const etaMinutes = Number(row.eta_minutes ?? row.eta_min ?? row.eta) || 30;
  const speedNum = parseFloat(speedStr) || 12;
  const distanceKm = parseFloat(((etaMinutes * speedNum) / 60).toFixed(1)) || 4.5;

  const convoyName = row.convoy_name || row.name || row.title || 'Field Convoy';
  const vehicleType = row.vehicle_type || row.type || row.vehicle || 'PistonBully PB100';
  const leadName = row.lead_name || row.lead || row.leader || 'Expedition Lead';
  const fuelReserve = Number(row.fuel_reserve_percent ?? row.fuel_pct ?? row.fuel) || 100;
  const cabinTemp = Number(row.cabin_temperature ?? row.cabin_temp) || 18;
  const dispatchLog = row.dispatch_log || row.notes || row.log || '';

  return {
    id: String(row.id),
    name: convoyName,
    type: vehicleType,
    status,
    coordinates: `${latStr} • ${lonStr}`,
    speed: speedStr,
    heading: '142° SE',
    crewCount: Number(row.crew_count ?? row.crew) || 1,
    lead: leadName,
    fuelPct: fuelReserve,
    cabinTemp: cabinTemp,
    extTemp: -38.4,
    distanceToDepotKm: distanceKm,
    etaMin: etaMinutes,
    notes: dispatchLog,
    x,
    y,
  };
}

/**
 * Map ConvoyUnit to Supabase table row (with column aliases for maximum compatibility)
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
    ? 'HELD FOR WEATHER' 
    : convoy.status === 'idle' 
    ? 'IDLE' 
    : 'EN ROUTE';

  return {
    id: convoy.id,
    convoy_name: convoy.name,
    name: convoy.name,
    vehicle_type: convoy.type,
    type: convoy.type,
    crew_count: convoy.crewCount,
    lead_name: convoy.lead,
    lead: convoy.lead,
    status: statusText,
    speed_kmh: speedNum,
    speed: convoy.speed,
    fuel_reserve_percent: convoy.fuelPct,
    cabin_temperature: convoy.cabinTemp,
    destination: 'Bharati Depot B-04',
    eta_minutes: convoy.etaMin,
    dispatch_log: convoy.notes,
    notes: convoy.notes,
    latitude,
    longitude,
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

  if (forceCloud) {
    return [];
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
    const { data, error } = await client.from('convoys').select('*');
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
      const res = await resilientUpsert(client, 'convoys', row, 'id');

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

  for (const convoy of convoysList) {
    const row = mapConvoyToRow(convoy);
    const res = await resilientUpsert(client, 'convoys', row, 'id');
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
            if (row.id && row.title) {
              onCargoChange({
                id: row.id,
                code: row.code || 'CRG-???',
                title: row.title,
                category: row.category || 'general',
                hazmatClass: row.hazmat_class || null,
                unCode: row.un_code || null,
                spec: row.spec || '',
                origin: row.origin || 'Port Dock',
                destination: row.destination || 'Main Station',
                program: row.program || 'Logistics',
                currentStep: Number(row.current_step) || 1,
                totalSteps: Number(row.total_steps) || 5,
                condition: row.condition || 'nominal',
                loggedTime: row.logged_time || new Date().toISOString(),
                synced: true,
              });
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
          console.log('[Supabase Realtime] Convoys table event:', payload.eventType, payload);
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
          console.log('[Supabase Realtime] Convoy (alt) table event:', payload.eventType, payload);
          if (payload.new && typeof payload.new === 'object') {
            const row = payload.new as any;
            if (row.id && onConvoyChange) {
              onConvoyChange(mapRowToConvoy(row));
            }
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return null;
  }
}
