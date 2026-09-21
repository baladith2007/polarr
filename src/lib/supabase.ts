import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CargoItem, InventorySupply, LogEvent } from '../types';
import { sampleCargoDatabase, initialInventory, initialLogStream } from '../data/mockData';

// Environment variable extraction
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
      clientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
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
    endpoint: isSupabaseConfigured ? supabaseUrl!.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co' : 'supabase-edge.local.cached',
    tableName: 'cargo_manifest',
    latencyMs: isSupabaseConfigured ? 24 : 12,
  };
}

/**
 * Sync a verified cargo item to Supabase table `cargo_manifest`
 */
export async function syncCargoToSupabase(cargo: CargoItem): Promise<{ success: boolean; source: 'supabase' | 'local_cache'; error?: string }> {
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
        console.warn('Supabase cargo upsert failed, fell back to local cache:', error.message);
        return { success: true, source: 'local_cache', error: error.message };
      }
      return { success: true, source: 'supabase' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: true, source: 'local_cache', error: msg };
    }
  }

  return { success: true, source: 'local_cache' };
}

/**
 * Log station event to Supabase table `station_logs`
 */
export async function logEventToSupabase(log: LogEvent): Promise<{ success: boolean; source: 'supabase' | 'local_cache' }> {
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
        return { success: true, source: 'local_cache' };
      }
      return { success: true, source: 'supabase' };
    } catch {
      return { success: true, source: 'local_cache' };
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
          currentStep: row.current_step,
          totalSteps: row.total_steps,
          condition: row.condition,
          loggedTime: row.logged_time,
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
