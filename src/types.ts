export interface Liegenschaft {
  id: number;
  kundeId: number;
  name: string;
  address: string;
  size: string;
  material: string;
  reihenfolge: number;
  raeumPlan?: string;
  nurWochenendeFeiertag?: boolean;
  lat?: number;
  lon?: number;
}

export interface Kunde {
  id: number;
  firma: string;
  email: string;
  whatsapp: string;
}

export interface EinsatzLog {
  id: number;
  kundeName: string;
  objName: string;
  date: string;
  timestamp: number;
  wetter: string;
  wetterVorOrt?: string;
  type: string;
  duration: string;
  materialUsed: string;
  materialVerbrauchKg?: number;
  kmGefahren: string;
  spritKosten: string;
  fotoName?: string;
  fotoUrl?: string;
  hindernisInfo?: string;
  hindernisFoto?: string;
  hindernisFotoUrl?: string;
}

export interface SaisonArchiv {
  id: number;
  name: string;
  vonDatum: string;
  bisDatum: string;
  einsätze: EinsatzLog[];
  gesamtSaecke: number;
  gesamtMaterialKg?: number;
  gesamtKm: number;
  gesamtSprit: number;
}
