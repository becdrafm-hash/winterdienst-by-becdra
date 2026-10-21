export const LEISTUNGSARTEN = [
  'räumen + streuen',
  'streuen',
  'Streugut entfernen'
] as const;

export type Leistungsart = typeof LEISTUNGSARTEN[number];
export type BevorzugterKanal = 'whatsapp' | 'email' | 'keine';
export type StreuMittelId = 'Salz' | 'Splitt' | 'Sand' | 'Lava' | 'Acetat';
export type MaterialPreisBasis = 'sack25kg' | 'tonne' | 'liter';

export interface MaterialEinkaufspreis {
  betrag: number;
  basis: MaterialPreisBasis;
}

export type MaterialEinkaufspreise = Partial<Record<StreuMittelId, MaterialEinkaufspreis>>;

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
  saisonStart?: string;
  saisonEnde?: string;
  lat?: number;
  lon?: number;
}

export interface Kunde {
  id: number;
  firma: string;
  email: string;
  whatsapp: string;
  bevorzugterKanal?: BevorzugterKanal;
}

export interface EinsatzLog {
  kundeId?: number;
  objektId?: number;
  id: number;
  kundeName: string;
  objName: string;
  objAddress?: string;
  date: string;
  timestamp: number;
  startTimestamp?: number;
  endTimestamp?: number;
  wetter: string;
  wetterVorOrt?: string;
  type: Leistungsart;
  duration: string;
  echteMinuten?: number;
  zeitFensterAnzeige?: string;
  materialUsed: string;
  materialId?: StreuMittelId;
  materialVerbrauchMenge?: number;
  materialVerbrauchKg?: number;
  materialVerbrauchEinheit?: string;
  materialPreisProEinheit?: number;
  kmGefahren: string;
  spritKosten: string;
  verbrauchAuf100Km?: number;
  spritPreisProLiter?: number;
  fotoName?: string;
  fotoUrl?: string;
  hindernisInfo?: string;
  hindernisFoto?: string;
  hindernisFotoUrl?: string;
  berichtStatus?: 'gesendet_whatsapp' | 'gesendet_email' | 'gesendet_teilen' | 'offen' | 'keine_meldung_gewuenscht';
  berichtGesendetAm?: string;
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

export interface EinsatzKostenAnalyse {
  kundeName: string;
  objName: string;
  anzahlEinsaetze: number;
  kilometer: number;
  spritKosten: number;
  materialKg: number;
  materialLiter: number;
  saecke: number;
  materialKosten: number;
}
