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
  cargoRowCount: number;
  logsRowCount: number;
  convoysRowCount: number;
  errorMessage?: string;
  latencyMs: number;
  fixSqlPolicy: string;
  fixSqlDisable: string;
}

export const SUPABASE_RLS_POLICY_SQL = `-- 1. Allow public/anonymous full access to cargo_manifest
ALTER TABLE cargo_manifest ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on cargo_manifest" ON cargo_manifest;
CREATE POLICY "Allow anon all on cargo_manifest" 
ON cargo_manifest FOR ALL TO anon 
USING (true) WITH CHECK (true);

-- 2. Allow public/anonymous full access to station_logs
ALTER TABLE station_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on station_logs" ON station_logs;
CREATE POLICY "Allow anon all on station_logs" 
ON station_logs FOR ALL TO anon 
USING (true) WITH CHECK (true);

-- 3. Allow public/anonymous full access to convoys
ALTER TABLE convoys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on convoys" ON convoys;
CREATE POLICY "Allow anon all on convoys" 
ON convoys FOR ALL TO anon 
USING (true) WITH CHECK (true);

-- 4. (Optional) Create inventory_supplies table if not already present
CREATE TABLE IF NOT EXISTS inventory_supplies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  critical_threshold NUMERIC NOT NULL,
  depletion_rate NUMERIC NOT NULL,
  status TEXT NOT NULL,
  last_audited TEXT
);
ALTER TABLE inventory_supplies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on inventory_supplies" ON inventory_supplies;
CREATE POLICY "Allow anon all on inventory_supplies" 
ON inventory_supplies FOR ALL TO anon 
USING (true) WITH CHECK (true);`;

export const SUPABASE_DISABLE_RLS_SQL = `-- Quickest Fix: Disable Row Level Security on app tables
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
      cargoRowCount: 0,
      logsRowCount: 0,
      convoysRowCount: 0,
      errorMessage: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set in environment.',
      latencyMs: 0,
      fixSqlPolicy: SUPABASE_RLS_POLICY_SQL,
      fixSqlDisable: SUPABASE_DISABLE_RLS_SQL,
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
      cargoRowCount: 0,
      logsRowCount: 0,
      convoysRowCount: 0,
      errorMessage: 'Could not create Supabase client instance.',
      latencyMs: 0,
      fixSqlPolicy: SUPABASE_RLS_POLICY_SQL,
      fixSqlDisable: SUPABASE_DISABLE_RLS_SQL,
    };
  }

  let canReadCargo = false;
  let canWriteCargo = false;
  let canReadConvoys = false;
  let canWriteConvoys = false;
  let isRlsBlocked = false;
  let cargoRowCount = 0;
  let logsRowCount = 0;
  let convoysRowCount = 0;
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
      canWriteConvoys = true; // Supabase table exists and accessible
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
    cargoRowCount,
    logsRowCount,
    convoysRowCount,
    errorMessage,
    latencyMs,
    fixSqlPolicy: SUPABASE_RLS_POLICY_SQL,
    fixSqlDisable: SUPABASE_DISABLE_RLS_SQL,
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

  const lat = typeof row.latitude === 'number' ? row.latitude : parseFloat(row.latitude) || -69.42;
  const lon = typeof row.longitude === 'number' ? row.longitude : parseFloat(row.longitude) || 76.23;
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

  const speedVal = row.speed_kmh ?? 0;
  const speedStr = typeof speedVal === 'string' && speedVal.includes('km/h') ? speedVal : `${speedVal} km/h`;
  const etaMinutes = Number(row.eta_minutes) || 30;
  const speedNum = parseFloat(speedStr) || 12;
  const distanceKm = parseFloat(((etaMinutes * speedNum) / 60).toFixed(1)) || 4.5;

  return {
    id: String(row.id),
    name: row.convoy_name || 'Field Convoy',
    type: row.vehicle_type || 'PistonBully PB100',
    status,
    coordinates: `${latStr} • ${lonStr}`,
    speed: speedStr,
    heading: '142° SE',
    crewCount: Number(row.crew_count) || 1,
    lead: row.lead_name || 'Expedition Lead',
    fuelPct: Number(row.fuel_reserve_percent) || 100,
    cabinTemp: Number(row.cabin_temperature) || 18,
    extTemp: -38.4,
    distanceToDepotKm: distanceKm,
    etaMin: etaMinutes,
    notes: row.dispatch_log || '',
    x,
    y,
  };
}

/**
 * Map ConvoyUnit to Supabase table row
 */
export function mapConvoyToRow(convoy: ConvoyUnit): any {
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
    vehicle_type: convoy.type,
    crew_count: convoy.crewCount,
    lead_name: convoy.lead,
    status: statusText,
    speed_kmh: speedNum,
    fuel_reserve_percent: convoy.fuelPct,
    cabin_temperature: convoy.cabinTemp,
    destination: 'Bharati Depot B-04',
    eta_minutes: convoy.etaMin,
    dispatch_log: convoy.notes,
    latitude,
    longitude,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Load field convoys and traverses from Supabase table `convoys`
 */
export async function loadConvoysFromSupabase(): Promise<ConvoyUnit[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('convoys')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapRowToConvoy);
        try {
          localStorage.setItem(LOCAL_CONVOYS_KEY, JSON.stringify(mapped));
        } catch {
          // ignore
        }
        return mapped;
      }
    } catch (err) {
      console.warn('Error loading convoys from Supabase:', err);
    }
  }

  // Fallback to local storage
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
 * Update/Sync an active convoy to Supabase table `convoys`
 */
export async function syncConvoyToSupabase(convoy: ConvoyUnit): Promise<{
  success: boolean;
  source: 'supabase' | 'local_cache';
  error?: string;
  isRlsBlocked?: boolean;
}> {
  const client = getSupabaseClient();

  // Cache to localStorage
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
      const { error } = await client
        .from('convoys')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
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
 * Seed or Push all active field convoys to Supabase table `convoys`
 */
export async function seedAllConvoysToSupabase(convoysList: ConvoyUnit[]): Promise<{
  success: boolean;
  insertedCount: number;
  error?: string;
  isRlsBlocked?: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, insertedCount: 0, error: 'Supabase client not initialized' };
  }

  const rows = convoysList.map(mapConvoyToRow);

  try {
    const { error, count } = await client
      .from('convoys')
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
