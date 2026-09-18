export type TabType = 'landing' | 'ops' | 'cargo' | 'map' | 'inventory' | 'emergency';

export interface WeatherData {
  airTemp: number; // e.g. -38.4
  windChill: number; // e.g. -51.0
  windSpeed: number; // knots e.g. 42
  windDirection: string; // e.g. 'ENE'
  pressure: number; // hPa e.g. 984
  solarWindowRemainingMinutes: number; // e.g. 160 min (2h 40m)
  blizzardLevel: 1 | 2 | 3;
  stationName: string;
  coordinates: string;
}

export type PhysicalCondition = 'nominal' | 'frosting' | 'damaged';

export interface CargoItem {
  id: string;
  code: string; // e.g. POL-FUEL-8821
  title: string;
  category: 'fuel' | 'medical' | 'equipment' | 'rations';
  hazmatClass?: string; // e.g. 'HAZMAT CLASS 3'
  unCode?: string; // e.g. 'UN 1863'
  spec: string; // e.g. '200 Litres • Freeze Point: -58.0°C'
  origin: string; // e.g. 'MV Vasiliy Golovnin (Dock Berth 1)'
  destination: string; // e.g. 'Bharati Depot B-04'
  program: string; // e.g. 'EXP-44 Summer'
  currentStep: number; // 1: Ice Shelf, 2: Convoy Alpha, 3: Bulk Depot
  totalSteps: number;
  condition: PhysicalCondition;
  loggedTime?: string;
  synced: boolean;
}

export interface ConvoyUnit {
  id: string;
  name: string;
  type: string; // e.g. 'PistonBully PB100'
  status: 'en_route' | 'idle' | 'hold';
  coordinates: string;
  speed: string;
  heading: string;
  crewCount: number;
  lead: string;
  fuelPct: number;
  cabinTemp: number;
  extTemp: number;
  distanceToDepotKm: number;
  etaMin: number;
  notes: string;
  x: number; // Map percentage or coordinate
  y: number;
}

export interface MapMarker {
  id: string;
  title: string;
  sub: string;
  type: 'base' | 'convoy' | 'sled' | 'person' | 'hazard' | 'fuel';
  x: number;
  y: number;
  status: string;
  telemetry?: Record<string, string | number>;
}

export interface InventorySupply {
  id: string;
  name: string;
  category: 'fuel' | 'rations' | 'medical' | 'mechanical';
  currentStock: number;
  unit: string;
  capacity: number;
  burnRatePerDay: number;
  blizzardBurnMultiplier: number;
  daysRemaining: number;
  status: 'optimal' | 'warning' | 'critical';
}

export interface LogEvent {
  id: string;
  time: string;
  type: 'qr_verify' | 'ai_depletion' | 'ping_sync' | 'alert' | 'route_change';
  title: string;
  detail: string;
  actor: string;
  status: string;
}
