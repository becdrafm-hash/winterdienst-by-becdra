import type { EinsatzLog } from '../types';
import { datumAlsIso } from './saisonZeitraum';

export function teileWinterSaison(history: EinsatzLog[], von: string, bis: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(von) || !/^\d{4}-\d{2}-\d{2}$/.test(bis) || von > bis) throw new Error('Ungültiger Zeitraum');
  const enthalten = (log: EinsatzLog) => Number.isFinite(log.timestamp) && datumAlsIso(new Date(log.timestamp)) >= von && datumAlsIso(new Date(log.timestamp)) <= bis;
  return { saison: history.filter(enthalten), verbleibend: history.filter(log => !enthalten(log)) };
}

export const WINTER_TEST_KEYS = ['becdra_history', 'becdra_saison_archiv', 'becdra_active_kunde', 'becdra_active_objekt', 'becdra_starttime', 'becdra_ankunftzeit', 'becdra_gefahrene_km', 'becdra_arbeitszeit', 'becdra_manuelle_endzeit'] as const;
export const WINTER_CHECKPOINT = 'becdra_winter_bereinigung_sicherung_v1';

// Only these winter execution keys may be changed. Customers, properties,
// settings, inventory and the garden IndexedDB are deliberately outside this API.
export function bereinigeWinterTestdaten(storage: Storage) {
  if (storage.getItem(WINTER_CHECKPOINT)) throw new Error('Eine frühere Bereinigungssicherung ist vorhanden. Bitte zuerst wiederherstellen.');
  const vorher = Object.fromEntries(WINTER_TEST_KEYS.map(key => [key, storage.getItem(key)]));
  storage.setItem(WINTER_CHECKPOINT, JSON.stringify(vorher));
  try {
    for (const key of WINTER_TEST_KEYS) {
      if (key === 'becdra_history' || key === 'becdra_saison_archiv') storage.setItem(key, '[]');
      else storage.removeItem(key);
    }
  } catch (error) {
    // Retain the checkpoint even if restoring fails because storage is unavailable.
    for (const key of WINTER_TEST_KEYS) {
      try { const value = vorher[key]; if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { /* checkpoint retained */ }
    }
    throw error;
  }
}

export function stelleWinterTestdatenWiederHer(storage: Storage) {
  const raw = storage.getItem(WINTER_CHECKPOINT);
  if (!raw) throw new Error('Keine Bereinigungssicherung vorhanden.');
  const data = JSON.parse(raw) as Record<string, unknown>;
  if (!data || WINTER_TEST_KEYS.some(key => data[key] !== null && typeof data[key] !== 'string')) throw new Error('Ungültige Bereinigungssicherung.');
  for (const key of WINTER_TEST_KEYS) {
    const value = data[key]; if (typeof value === 'string') storage.setItem(key, value); else storage.removeItem(key);
  }
  storage.removeItem(WINTER_CHECKPOINT);
}
