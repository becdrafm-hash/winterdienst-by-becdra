import type { EinsatzLog } from '../types.ts';
import { datumAlsIso } from './saisonZeitraum.ts';

export function teileWinterSaison(history: EinsatzLog[], von: string, bis: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(von) || !/^\d{4}-\d{2}-\d{2}$/.test(bis) || von > bis) {
    throw new Error('Ungültiger Zeitraum');
  }
  const enthalten = (log: EinsatzLog) =>
    Number.isFinite(log.timestamp)
    && datumAlsIso(new Date(log.timestamp)) >= von
    && datumAlsIso(new Date(log.timestamp)) <= bis;
  return {
    saison: history.filter(enthalten),
    verbleibend: history.filter(log => !enthalten(log))
  };
}

export const WINTER_TEST_KEYS = [
  'becdra_history',
  'becdra_saison_archiv',
  'becdra_active_kunde',
  'becdra_active_objekt',
  'becdra_starttime',
  'becdra_ankunftzeit',
  'becdra_gefahrene_km',
  'becdra_arbeitszeit',
  'becdra_manuelle_endzeit'
] as const;

export type WinterTestKey = typeof WINTER_TEST_KEYS[number];
export type WinterSicherungDaten = Record<WinterTestKey, string | null>;
export type WinterDatenStatus = 'unveraendert' | 'wiederhergestellt' | 'teilweise_veraendert';

export const WINTER_CHECKPOINT = 'becdra_winter_bereinigung_sicherung_v1';
export const WINTER_BACKUP_DB_NAME = 'becdra-winterdienst-sicherung-v1';
const WINTER_BACKUP_STORE_NAME = 'sicherung';
const WINTER_BACKUP_RECORD_KEY = 'checkpoint_v1';

export class WinterWartungsFehler extends Error {
  readonly datenStatus: WinterDatenStatus;
  readonly ursache: string;

  constructor(message: string, datenStatus: WinterDatenStatus, ursache: string) {
    super(message);
    this.name = 'WinterWartungsFehler';
    this.datenStatus = datenStatus;
    this.ursache = ursache;
  }
}

export interface WinterExternerSicherungSpeicher {
  getItem(): Promise<string | null> | string | null;
  setItem(value: string): Promise<void> | void;
  removeItem(): Promise<void> | void;
}

export interface WinterBereinigungErgebnis {
  status: 'bereinigt';
  sicherungsort: 'localStorage' | 'indexedDB';
}

export interface WinterArbeitszeitStatus {
  pauseBeginn: number | null;
  pausendauerMs: number;
}

export interface WinterAnzeigeState<
  THistory = EinsatzLog,
  TArchiv = unknown,
  TKunde = Record<string, unknown>,
  TObjekt = Record<string, unknown>
> {
  history: THistory[];
  archivListe: TArchiv[];
  activeKunde: TKunde | null;
  activeObjekt: TObjekt | null;
  startTime: Date | null;
  ankunftTime: Date | null;
  manuelleEndZeit: string;
  arbeitszeitStatus: WinterArbeitszeitStatus;
  gefahreneKm: string;
  accumulatedKm: number;
}

export interface WinterWartungsMeldung {
  typ: 'fehler' | 'erfolg';
  titel: string;
  text: string;
  datenStatus?: WinterDatenStatus;
}

export interface WinterStateCallbacks<
  THistory = EinsatzLog,
  TArchiv = unknown,
  TKunde = Record<string, unknown>,
  TObjekt = Record<string, unknown>
> {
  setHistory: (value: THistory[]) => void;
  setArchivListe: (value: TArchiv[]) => void;
  setActiveKunde: (value: TKunde | null) => void;
  setActiveObjekt: (value: TObjekt | null) => void;
  setStartTime: (value: Date | null) => void;
  setAnkunftTime: (value: Date | null) => void;
  setManuelleEndZeit: (value: string) => void;
  setArbeitszeitStatus: (value: WinterArbeitszeitStatus) => void;
  setGefahreneKm: (value: string) => void;
  setAccumulatedKm?: (value: number) => void;
  setWartungsMeldung?: (meldung: WinterWartungsMeldung) => void;
}

export type WinterStateSyncErgebnis<
  THistory = EinsatzLog,
  TArchiv = unknown,
  TKunde = Record<string, unknown>,
  TObjekt = Record<string, unknown>
> =
  | {
      ok: true;
      state: WinterAnzeigeState<THistory, TArchiv, TKunde, TObjekt>;
    }
  | {
      ok: false;
      fehler: string;
      meldung: WinterWartungsMeldung;
    };

let winterWartungAktiv = false;

export function istWinterWartungAktiv(): boolean {
  return winterWartungAktiv;
}

function pruefeKeineAktiveWinterWartung(): void {
  if (winterWartungAktiv) {
    const msg = 'Eine Winterdienst-Wartung (Bereinigung oder Rücknahme) läuft bereits. Bitte warten, bis der Vorgang abgeschlossen ist.';
    throw new WinterWartungsFehler(
      `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
      'unveraendert',
      msg
    );
  }
}

function fehlerText(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return 'Speicherfehler';
}

export function erzeugeIndexedDbWinterSicherungSpeicher(
  idbFactory: IDBFactory | undefined = typeof indexedDB !== 'undefined' ? indexedDB : undefined
): WinterExternerSicherungSpeicher {
  function openDb(): Promise<IDBDatabase> {
    if (!idbFactory) {
      return Promise.reject(new Error('IndexedDB ist in dieser Umgebung nicht verfügbar.'));
    }
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = idbFactory.open(WINTER_BACKUP_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WINTER_BACKUP_STORE_NAME)) {
          db.createObjectStore(WINTER_BACKUP_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB konnte nicht geöffnet werden.'));
      request.onblocked = () => reject(new Error('IndexedDB-Sicherung ist durch einen anderen Tab blockiert.'));
    });
  }

  return {
    async getItem(): Promise<string | null> {
      const db = await openDb();
      try {
        return await new Promise<string | null>((resolve, reject) => {
          const tx = db.transaction(WINTER_BACKUP_STORE_NAME, 'readonly');
          const store = tx.objectStore(WINTER_BACKUP_STORE_NAME);
          const req = store.get(WINTER_BACKUP_RECORD_KEY);
          req.onsuccess = () => {
            const result: unknown = req.result;
            if (result === undefined || result === null) {
              resolve(null);
            } else if (typeof result === 'string') {
              resolve(result);
            } else {
              reject(new Error('Ungültiger Datentyp im IndexedDB-Sicherungseintrag.'));
            }
          };
          req.onerror = () => reject(req.error ?? new Error('IndexedDB-Sicherung konnte nicht gelesen werden.'));
          tx.onabort = () => reject(tx.error ?? new Error('Lesen der IndexedDB-Sicherung wurde abgebrochen.'));
        });
      } finally {
        db.close();
      }
    },
    async setItem(value: string): Promise<void> {
      const db = await openDb();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(WINTER_BACKUP_STORE_NAME, 'readwrite');
          const store = tx.objectStore(WINTER_BACKUP_STORE_NAME);
          store.put(value, WINTER_BACKUP_RECORD_KEY);
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error ?? new Error('Speichern der IndexedDB-Sicherung fehlgeschlagen.'));
          tx.onerror = () => {
            // Ablehnung erfolgt über tx.onabort
          };
        });
      } finally {
        db.close();
      }
    },
    async removeItem(): Promise<void> {
      const db = await openDb();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(WINTER_BACKUP_STORE_NAME, 'readwrite');
          const store = tx.objectStore(WINTER_BACKUP_STORE_NAME);
          store.delete(WINTER_BACKUP_RECORD_KEY);
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error ?? new Error('Entfernen der IndexedDB-Sicherung fehlgeschlagen.'));
          tx.onerror = () => {
            // Ablehnung erfolgt über tx.onabort
          };
        });
      } finally {
        db.close();
      }
    }
  };
}

export function parseWinterSicherung(raw: unknown): WinterSicherungDaten | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const daten = {} as WinterSicherungDaten;
    for (const key of WINTER_TEST_KEYS) {
      const val = record[key];
      if (val !== null && typeof val !== 'string') return null;
      daten[key] = val;
    }
    return daten;
  } catch {
    return null;
  }
}

function istPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function leseWinterAnzeigeState<
  THistory = EinsatzLog,
  TArchiv = unknown,
  TKunde = Record<string, unknown>,
  TObjekt = Record<string, unknown>
>(
  storage: Pick<Storage, 'getItem'>,
  quelle?: WinterSicherungDaten
): WinterAnzeigeState<THistory, TArchiv, TKunde, TObjekt> {
  const rohwerte = {} as Record<WinterTestKey, string | null>;

  for (const key of WINTER_TEST_KEYS) {
    let val: unknown;
    if (quelle !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(quelle, key)) {
        throw new Error(`Schlüssel "${key}" fehlt in der angegebenen Datenquelle.`);
      }
      val = quelle[key];
    } else {
      try {
        val = storage.getItem(key);
      } catch (error) {
        throw new Error(`Schlüssel "${key}" konnte nicht aus dem Speicher gelesen werden (${fehlerText(error)}).`, {
          cause: error
        });
      }
    }
    if (val !== null && typeof val !== 'string') {
      throw new Error(`Schlüssel "${key}" hat einen ungültigen Datentyp.`);
    }
    rohwerte[key] = val;
  }

  let history: THistory[] = [];
  if (rohwerte.becdra_history !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rohwerte.becdra_history);
    } catch {
      throw new Error('Winterdienst-Historie (becdra_history) enthält ungültiges JSON.');
    }
    if (!Array.isArray(parsed) || parsed.some(eintrag => !istPlainObject(eintrag))) {
      throw new Error('Winterdienst-Historie (becdra_history) hat ein ungültiges Datenformat.');
    }
    history = parsed as THistory[];
  }

  let archivListe: TArchiv[] = [];
  if (rohwerte.becdra_saison_archiv !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rohwerte.becdra_saison_archiv);
    } catch {
      throw new Error('Winterdienst-Archiv (becdra_saison_archiv) enthält ungültiges JSON.');
    }
    if (!Array.isArray(parsed) || parsed.some(eintrag => !istPlainObject(eintrag))) {
      throw new Error('Winterdienst-Archiv (becdra_saison_archiv) hat ein ungültiges Datenformat.');
    }
    archivListe = parsed as TArchiv[];
  }

  let activeKunde: TKunde | null = null;
  if (rohwerte.becdra_active_kunde !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rohwerte.becdra_active_kunde);
    } catch {
      throw new Error('Aktiver Kunde (becdra_active_kunde) enthält ungültiges JSON.');
    }
    if (!istPlainObject(parsed)) {
      throw new Error('Aktiver Kunde (becdra_active_kunde) hat ein ungültiges Datenformat.');
    }
    activeKunde = parsed as TKunde;
  }

  let activeObjekt: TObjekt | null = null;
  if (rohwerte.becdra_active_objekt !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rohwerte.becdra_active_objekt);
    } catch {
      throw new Error('Aktives Objekt (becdra_active_objekt) enthält ungültiges JSON.');
    }
    if (!istPlainObject(parsed)) {
      throw new Error('Aktives Objekt (becdra_active_objekt) hat ein ungültiges Datenformat.');
    }
    activeObjekt = parsed as TObjekt;
  }

  let startTime: Date | null = null;
  if (rohwerte.becdra_starttime !== null) {
    if (!rohwerte.becdra_starttime.trim()) {
      throw new Error('Startzeit (becdra_starttime) ist leer.');
    }
    const parsedStart = new Date(rohwerte.becdra_starttime);
    if (Number.isNaN(parsedStart.getTime())) {
      throw new Error('Startzeit (becdra_starttime) ist kein gültiges Datum.');
    }
    startTime = parsedStart;
  }

  let ankunftTime: Date | null = null;
  if (rohwerte.becdra_ankunftzeit !== null) {
    if (!rohwerte.becdra_ankunftzeit.trim()) {
      throw new Error('Ankunftszeit (becdra_ankunftzeit) ist leer.');
    }
    const parsedAnkunft = new Date(rohwerte.becdra_ankunftzeit);
    if (Number.isNaN(parsedAnkunft.getTime())) {
      throw new Error('Ankunftszeit (becdra_ankunftzeit) ist kein gültiges Datum.');
    }
    ankunftTime = parsedAnkunft;
  }

  const manuelleEndZeit = rohwerte.becdra_manuelle_endzeit ?? '';

  let arbeitszeitStatus: WinterArbeitszeitStatus = { pauseBeginn: null, pausendauerMs: 0 };
  if (rohwerte.becdra_arbeitszeit !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rohwerte.becdra_arbeitszeit);
    } catch {
      throw new Error('Arbeitszeitstatus (becdra_arbeitszeit) enthält ungültiges JSON.');
    }
    if (!istPlainObject(parsed)) {
      throw new Error('Arbeitszeitstatus (becdra_arbeitszeit) hat ein ungültiges Datenformat.');
    }
    const pauseBeginn = parsed.pauseBeginn;
    const pausendauerMs = parsed.pausendauerMs;
    if (pauseBeginn !== null && (typeof pauseBeginn !== 'number' || !Number.isFinite(pauseBeginn))) {
      throw new Error('Arbeitszeitstatus (becdra_arbeitszeit) enthält einen ungültigen Pausenbeginn.');
    }
    if (typeof pausendauerMs !== 'number' || !Number.isFinite(pausendauerMs) || pausendauerMs < 0) {
      throw new Error('Arbeitszeitstatus (becdra_arbeitszeit) enthält eine ungültige Pausendauer.');
    }
    arbeitszeitStatus = { pauseBeginn, pausendauerMs };
  }

  let gefahreneKm = '0';
  let accumulatedKm = 0;
  if (rohwerte.becdra_gefahrene_km !== null) {
    if (!rohwerte.becdra_gefahrene_km.trim()) {
      throw new Error('Gefahrene Kilometer (becdra_gefahrene_km) sind leer.');
    }
    const kmNum = Number(rohwerte.becdra_gefahrene_km);
    if (!Number.isFinite(kmNum) || kmNum < 0) {
      throw new Error('Gefahrene Kilometer (becdra_gefahrene_km) sind keine gültige Zahl.');
    }
    gefahreneKm = rohwerte.becdra_gefahrene_km;
    accumulatedKm = kmNum;
  }

  return {
    history,
    archivListe,
    activeKunde,
    activeObjekt,
    startTime,
    ankunftTime,
    manuelleEndZeit,
    arbeitszeitStatus,
    gefahreneKm,
    accumulatedKm
  };
}

export function synchronisiereWinterStateAusStorage<
  THistory = EinsatzLog,
  TArchiv = unknown,
  TKunde = Record<string, unknown>,
  TObjekt = Record<string, unknown>
>(
  storage: Pick<Storage, 'getItem'>,
  callbacks: WinterStateCallbacks<THistory, TArchiv, TKunde, TObjekt>,
  quelle?: WinterSicherungDaten
): WinterStateSyncErgebnis<THistory, TArchiv, TKunde, TObjekt> {
  let state: WinterAnzeigeState<THistory, TArchiv, TKunde, TObjekt>;
  try {
    state = leseWinterAnzeigeState<THistory, TArchiv, TKunde, TObjekt>(storage, quelle);
  } catch (error) {
    // Kein einziger State-Setter wird aufgerufen, damit bestehender React-State erhalten bleibt
    // und Speichereffekte keine leeren Ersatzwerte (wie [] oder null) in localStorage zurückschreiben.
    const ursache = fehlerText(error);
    const meldung: WinterWartungsMeldung = {
      typ: 'fehler',
      titel: 'Winterdienstdaten konnten nicht geladen werden',
      text: `Lese- oder Parsefehler beim Synchronisieren der Winterdienstdaten (${ursache}). Der bisherige Anzeigezustand wurde unverändert erhalten, damit keine verbliebenen Daten überschrieben werden.`
    };
    callbacks.setWartungsMeldung?.(meldung);
    return { ok: false, fehler: ursache, meldung };
  }

  callbacks.setHistory(state.history);
  callbacks.setArchivListe(state.archivListe);
  callbacks.setActiveKunde(state.activeKunde);
  callbacks.setActiveObjekt(state.activeObjekt);
  callbacks.setStartTime(state.startTime);
  callbacks.setAnkunftTime(state.ankunftTime);
  callbacks.setManuelleEndZeit(state.manuelleEndZeit);
  callbacks.setArbeitszeitStatus(state.arbeitszeitStatus);
  callbacks.setGefahreneKm(state.gefahreneKm);
  callbacks.setAccumulatedKm?.(state.accumulatedKm);

  return { ok: true, state };
}

function stimmtSicherungMitStandUeberein(
  zurueckgelesenRaw: unknown,
  sollStand: WinterSicherungDaten
): boolean {
  const geparst = parseWinterSicherung(zurueckgelesenRaw);
  if (!geparst) return false;
  return WINTER_TEST_KEYS.every(key => geparst[key] === sollStand[key]);
}

function leseAktuellenWinterStand(storage: Pick<Storage, 'getItem'>): WinterSicherungDaten {
  try {
    const eintraege: Array<[WinterTestKey, string | null]> = [];
    for (const key of WINTER_TEST_KEYS) {
      const val: unknown = storage.getItem(key);
      if (val !== null && typeof val !== 'string') {
        throw new Error(`Ungültiger Datentyp für Schlüssel "${key}".`);
      }
      eintraege.push([key, val]);
    }
    return Object.fromEntries(eintraege) as WinterSicherungDaten;
  } catch (error) {
    const ursache = fehlerText(error);
    throw new WinterWartungsFehler(
      `Winterdienstdaten konnten nicht gelesen werden (${ursache}). Datenstatus: Unverändert – es wurden keine Daten verändert.`,
      'unveraendert',
      ursache
    );
  }
}

function schreibeUndPruefeLocalStorageSicherung(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  vorher: WinterSicherungDaten
): void {
  const serialisiert = JSON.stringify(vorher);
  try {
    storage.setItem(WINTER_CHECKPOINT, serialisiert);
    const zurueckgelesen = storage.getItem(WINTER_CHECKPOINT);
    if (!stimmtSicherungMitStandUeberein(zurueckgelesen, vorher)) {
      throw new Error('Rücknahmesicherung konnte nach dem Schreiben nicht identisch zurückgelesen werden.');
    }
  } catch (error) {
    try {
      if (storage.getItem(WINTER_CHECKPOINT) !== null) {
        storage.removeItem(WINTER_CHECKPOINT);
      }
    } catch {
      // Unvollständigen Sicherungseintrag nach Möglichkeit entfernen
    }
    throw error;
  }
}

function fuehreBereinigungNachSicherungAus(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  vorher: WinterSicherungDaten,
  sicherungsort: 'localStorage' | 'indexedDB'
): WinterBereinigungErgebnis {
  try {
    for (const key of WINTER_TEST_KEYS) {
      if (key === 'becdra_history' || key === 'becdra_saison_archiv') {
        storage.setItem(key, '[]');
      } else {
        storage.removeItem(key);
      }
    }
    for (const key of WINTER_TEST_KEYS) {
      const erwartet = key === 'becdra_history' || key === 'becdra_saison_archiv' ? '[]' : null;
      if (storage.getItem(key) !== erwartet) {
        throw new Error(`Bereinigung von "${key}" konnte nicht verifiziert werden.`);
      }
    }
    return { status: 'bereinigt', sicherungsort };
  } catch (error) {
    // Retain the checkpoint even if restoring fails because storage is unavailable.
    for (const key of WINTER_TEST_KEYS) {
      try {
        const value = vorher[key];
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        /* checkpoint retained */
      }
    }

    let vollstaendigWiederhergestellt = true;
    for (const key of WINTER_TEST_KEYS) {
      try {
        if (storage.getItem(key) !== vorher[key]) {
          vollstaendigWiedergestelltFalse();
        }
      } catch {
        vollstaendigWiedergestelltFalse();
      }
    }
    function vollstaendigWiedergestelltFalse() {
      vollstaendigWiederhergestellt = false;
    }

    const ursache = fehlerText(error);
    if (vollstaendigWiederhergestellt) {
      throw new WinterWartungsFehler(
        `Bereinigung abgebrochen (${ursache}). Datenstatus: Wiederhergestellt – alle Winterdienstdaten wurden auf den vorherigen Stand zurückgesetzt; die Rücknahmesicherung bleibt gespeichert.`,
        'wiederhergestellt',
        ursache
      );
    }
    throw new WinterWartungsFehler(
      `Bereinigung unterbrochen (${ursache}). Datenstatus: Teilweise verändert – nicht alle Winterdienst-Einträge konnten automatisch zurückgesetzt werden. Die geprüfte Rücknahmesicherung ist gespeichert und kann über „Winterdienst-Bereinigung zurücknehmen“ wiederhergestellt werden.`,
      'teilweise_veraendert',
      ursache
    );
  }
}

function stelleDatenAusGepruefterSicherungWiederHer(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  zielDaten: WinterSicherungDaten,
  vorWiederherstellung: WinterSicherungDaten
): void {
  try {
    for (const key of WINTER_TEST_KEYS) {
      const value = zielDaten[key];
      if (typeof value === 'string') {
        storage.setItem(key, value);
      } else {
        storage.removeItem(key);
      }
    }
    for (const key of WINTER_TEST_KEYS) {
      if (storage.getItem(key) !== zielDaten[key]) {
        throw new Error(`Wiederherstellung von "${key}" konnte nicht verifiziert werden.`);
      }
    }
  } catch (error) {
    // Sicherung bleibt erhalten! Versuch, den Zustand vor der Wiederherstellung zurückzusetzen.
    let rollbackVollstaendig = true;
    for (const key of WINTER_TEST_KEYS) {
      try {
        const vorherWert = vorWiederherstellung[key];
        if (vorherWert === null) storage.removeItem(key);
        else storage.setItem(key, vorherWert);
      } catch {
        rollbackVollstaendig = false;
      }
    }
    for (const key of WINTER_TEST_KEYS) {
      try {
        if (storage.getItem(key) !== vorWiederherstellung[key]) {
          rollbackVollstaendig = false;
        }
      } catch {
        rollbackVollstaendig = false;
      }
    }

    const ursache = fehlerText(error);
    if (rollbackVollstaendig) {
      throw new WinterWartungsFehler(
        `Wiederherstellung abgebrochen (${ursache}). Datenstatus: Wiederhergestellt – der Stand vor dem Wiederherstellungsversuch wurde wiederhergestellt und die Rücknahmesicherung bleibt unverändert erhalten.`,
        'wiederhergestellt',
        ursache
      );
    }
    throw new WinterWartungsFehler(
      `Wiederherstellung unterbrochen (${ursache}). Datenstatus: Teilweise verändert – die Rücknahmesicherung wurde nicht gelöscht und kann erneut wiederhergestellt werden.`,
      'teilweise_veraendert',
      ursache
    );
  }
}

export function hatWinterBereinigungsSicherung(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return parseWinterSicherung(storage.getItem(WINTER_CHECKPOINT)) !== null;
  } catch {
    return false;
  }
}

export async function hatWinterBereinigungsSicherungAsync(
  storage: Pick<Storage, 'getItem'>,
  externerSpeicher: WinterExternerSicherungSpeicher = erzeugeIndexedDbWinterSicherungSpeicher()
): Promise<boolean> {
  if (hatWinterBereinigungsSicherung(storage)) return true;
  try {
    const idbRaw = await externerSpeicher.getItem();
    return parseWinterSicherung(idbRaw) !== null;
  } catch {
    return false;
  }
}

// Only these winter execution keys may be changed. Customers, properties,
// settings, inventory and the garden IndexedDB are deliberately outside this API.
export function bereinigeWinterTestdaten(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): WinterBereinigungErgebnis {
  pruefeKeineAktiveWinterWartung();
  winterWartungAktiv = true;
  try {
    let vorhandeneSicherung: unknown;
    try {
      vorhandeneSicherung = storage.getItem(WINTER_CHECKPOINT);
    } catch (error) {
      const ursache = fehlerText(error);
      throw new WinterWartungsFehler(
        `Bereinigung abgebrochen (${ursache}). Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        ursache
      );
    }

    if (vorhandeneSicherung !== null) {
      const msg = 'Eine frühere Bereinigungssicherung ist vorhanden. Bitte zuerst wiederherstellen.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    const vorher = leseAktuellenWinterStand(storage);

    try {
      schreibeUndPruefeLocalStorageSicherung(storage, vorher);
    } catch (error) {
      const ursache = fehlerText(error);
      throw new WinterWartungsFehler(
        `Bereinigung abgebrochen: Die Rücknahmesicherung konnte nicht gespeichert und zurückgelesen werden (${ursache}). Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        ursache
      );
    }

    return fuehreBereinigungNachSicherungAus(storage, vorher, 'localStorage');
  } finally {
    winterWartungAktiv = false;
  }
}

async function schreibeUndPruefeIndexedDbSicherung(
  externerSpeicher: WinterExternerSicherungSpeicher,
  vorher: WinterSicherungDaten
): Promise<void> {
  const serialisiert = JSON.stringify(vorher);
  try {
    await externerSpeicher.setItem(serialisiert);
    const idbZurueckgelesen = await externerSpeicher.getItem();
    if (!stimmtSicherungMitStandUeberein(idbZurueckgelesen, vorher)) {
      throw new Error('IndexedDB-Rücknahmesicherung konnte nach dem Schreiben nicht identisch zurückgelesen werden.');
    }
  } catch (error) {
    try {
      await externerSpeicher.removeItem();
    } catch {
      // Unvollständige IndexedDB-Sicherung nach Möglichkeit aufräumen
    }
    throw error;
  }
}

export async function bereinigeWinterTestdatenAsync(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  externerSpeicher: WinterExternerSicherungSpeicher = erzeugeIndexedDbWinterSicherungSpeicher()
): Promise<WinterBereinigungErgebnis> {
  pruefeKeineAktiveWinterWartung();
  winterWartungAktiv = true;
  try {
    let vorhandeneLocalSicherung: unknown;
    try {
      vorhandeneLocalSicherung = storage.getItem(WINTER_CHECKPOINT);
    } catch (error) {
      const ursache = fehlerText(error);
      throw new WinterWartungsFehler(
        `Bereinigung abgebrochen (${ursache}). Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        ursache
      );
    }

    if (vorhandeneLocalSicherung !== null) {
      const msg = 'Eine frühere Bereinigungssicherung ist vorhanden. Bitte zuerst wiederherstellen.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    // Bei Lesefehlern der IndexedDB oder unbekanntem Sicherungsstatus zwingend unverändert abbrechen,
    // damit beim anschließenden Fallback niemals eine bereits vorhandene Sicherung überschrieben werden kann.
    let vorhandeneIdbSicherung: unknown;
    try {
      vorhandeneIdbSicherung = await externerSpeicher.getItem();
    } catch (error) {
      const ursache = fehlerText(error);
      throw new WinterWartungsFehler(
        `Bereinigung abgebrochen: Der Sicherungsstatus in der IndexedDB konnte nicht geprüft werden (${ursache}). Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        ursache
      );
    }

    if (vorhandeneIdbSicherung !== null) {
      const msg =
        typeof vorhandeneIdbSicherung === 'string' && parseWinterSicherung(vorhandeneIdbSicherung) !== null
          ? 'Eine frühere Bereinigungssicherung ist vorhanden. Bitte zuerst wiederherstellen.'
          : 'Ein ungültiger oder beschädigter Eintrag ist in der IndexedDB-Sicherung vorhanden und darf nicht überschrieben werden.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    const vorher = leseAktuellenWinterStand(storage);

    // 1. Versuch: Dauerhafte Sicherung in localStorage speichern und zurücklesen, BEVOR Daten verändert werden.
    let sicherungsort: 'localStorage' | 'indexedDB' = 'localStorage';
    try {
      schreibeUndPruefeLocalStorageSicherung(storage, vorher);
    } catch (localError) {
      // Kein vorheriges Leeren bei QuotaExceededError!
      // Stattdessen getrennte IndexedDB-Sicherung schreiben und zurücklesen, BEVOR Winterdienstdaten verändert werden.
      try {
        await schreibeUndPruefeIndexedDbSicherung(externerSpeicher, vorher);
        sicherungsort = 'indexedDB';
      } catch (idbError) {
        const localUrsache = fehlerText(localError);
        const idbUrsache = fehlerText(idbError);
        const kombinierteUrsache = `${localUrsache}; IndexedDB-Sicherung: ${idbUrsache}`;
        throw new WinterWartungsFehler(
          `Bereinigung abgebrochen: Die Rücknahmesicherung konnte weder in localStorage (${localUrsache}) noch in der getrennten IndexedDB (${idbUrsache}) gespeichert und zurückgelesen werden. Datenstatus: Unverändert – es wurden keine Daten verändert.`,
          'unveraendert',
          kombinierteUrsache
        );
      }
    }

    return fuehreBereinigungNachSicherungAus(storage, vorher, sicherungsort);
  } finally {
    winterWartungAktiv = false;
  }
}

export function stelleWinterTestdatenWiederHer(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): WinterSicherungDaten {
  pruefeKeineAktiveWinterWartung();
  winterWartungAktiv = true;
  try {
    let raw: unknown;
    try {
      raw = storage.getItem(WINTER_CHECKPOINT);
    } catch (error) {
      const ursache = fehlerText(error);
      throw new WinterWartungsFehler(
        `Wiederherstellung abgebrochen (${ursache}). Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        ursache
      );
    }

    if (raw === null) {
      const msg = 'Keine Bereinigungssicherung vorhanden.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    const data = parseWinterSicherung(raw);
    if (!data) {
      const msg = 'Ungültige Bereinigungssicherung.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    const vorWiederherstellung = leseAktuellenWinterStand(storage);
    stelleDatenAusGepruefterSicherungWiederHer(storage, data, vorWiederherstellung);
    storage.removeItem(WINTER_CHECKPOINT);
    return data;
  } finally {
    winterWartungAktiv = false;
  }
}

export async function stelleWinterTestdatenWiederHerAsync(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  externerSpeicher: WinterExternerSicherungSpeicher = erzeugeIndexedDbWinterSicherungSpeicher()
): Promise<WinterSicherungDaten> {
  pruefeKeineAktiveWinterWartung();
  winterWartungAktiv = true;
  try {
    let localRaw: unknown;
    try {
      localRaw = storage.getItem(WINTER_CHECKPOINT);
    } catch (error) {
      const ursache = fehlerText(error);
      throw new WinterWartungsFehler(
        `Wiederherstellung abgebrochen (${ursache}). Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        ursache
      );
    }

    if (localRaw !== null && typeof localRaw !== 'string') {
      const msg = 'Ungültiger Datentyp in der localStorage-Bereinigungssicherung.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    let idbRaw: unknown;
    try {
      idbRaw = await externerSpeicher.getItem();
    } catch (error) {
      const ursache = fehlerText(error);
      throw new WinterWartungsFehler(
        `Wiederherstellung abgebrochen: IndexedDB-Sicherung konnte nicht gelesen werden (${ursache}). Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        ursache
      );
    }

    if (idbRaw !== null && typeof idbRaw !== 'string') {
      const msg = 'Ungültiger Datentyp in der IndexedDB-Bereinigungssicherung.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    if (localRaw === null && idbRaw === null) {
      const msg = 'Keine Bereinigungssicherung vorhanden.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    if (localRaw !== null && idbRaw !== null) {
      const localData = parseWinterSicherung(localRaw);
      const idbData = parseWinterSicherung(idbRaw);
      if (!localData || !idbData || WINTER_TEST_KEYS.some(key => localData[key] !== idbData[key])) {
        const msg = 'Widersprüchliche oder beschädigte Bereinigungssicherungen in localStorage und IndexedDB gefunden.';
        throw new WinterWartungsFehler(
          `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
          'unveraendert',
          msg
        );
      }
    }

    const wirksamesRaw = localRaw ?? idbRaw;
    const data = parseWinterSicherung(wirksamesRaw);
    if (!data) {
      const msg = 'Ungültige Bereinigungssicherung.';
      throw new WinterWartungsFehler(
        `${msg} Datenstatus: Unverändert – es wurden keine Daten verändert.`,
        'unveraendert',
        msg
      );
    }

    const vorWiederherstellung = leseAktuellenWinterStand(storage);
    stelleDatenAusGepruefterSicherungWiederHer(storage, data, vorWiederherstellung);

    if (localRaw !== null) {
      storage.removeItem(WINTER_CHECKPOINT);
    }
    if (idbRaw !== null) {
      await externerSpeicher.removeItem();
    }
    return data;
  } finally {
    winterWartungAktiv = false;
  }
}
