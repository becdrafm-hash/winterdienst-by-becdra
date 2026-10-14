const DWD_WARNUNGEN_URL = 'https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json';
const OPEN_METEO_WETTER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=51.75&longitude=6.40&current=temperature_2m,precipitation,weather_code';

export interface DwdAktuellesWetter {
  temperatur: number;
  niederschlag: number;
  wetterCode: number;
}

export const DWD_REGIONEN = [
  { id: 'kreis-kleve', name: 'Kreis Kleve' },
  { id: 'kreis-wesel', name: 'Kreis Wesel' },
  { id: 'kreis-borken', name: 'Kreis Borken' }
] as const;

export type DwdRegionId = (typeof DWD_REGIONEN)[number]['id'];

export const DWD_STANDARD_REGIONEN: DwdRegionId[] = ['kreis-kleve'];

export interface DwdWinterwarnung {
  event: string;
  headline: string;
  description: string;
  instruction: string;
  regionName: string;
  level: number;
  start: number;
  end: number;
}

interface DwdWarnmeldung extends DwdWinterwarnung {
  [key: string]: unknown;
}

interface DwdWarnDaten {
  warnings: Record<string, DwdWarnmeldung[]>;
}

function istDwdWarnmeldung(value: unknown): value is DwdWarnmeldung {
  if (typeof value !== 'object' || value === null) return false;

  const meldung = value as Record<string, unknown>;
  return typeof meldung.event === 'string'
    && typeof meldung.headline === 'string'
    && typeof meldung.description === 'string'
    && typeof meldung.instruction === 'string'
    && typeof meldung.regionName === 'string'
    && typeof meldung.level === 'number'
    && typeof meldung.start === 'number'
    && typeof meldung.end === 'number';
}

function leseWarnDaten(text: string): DwdWarnDaten {
  const json = text.trim()
    .replace(/^warnWetter\.loadWarnings\(/, '')
    .replace(/\);?$/, '');
  const daten: unknown = JSON.parse(json);

  if (typeof daten !== 'object' || daten === null || !('warnings' in daten)) {
    throw new Error('Die DWD-Warnungsantwort hat ein unerwartetes Format.');
  }

  const warnings = daten.warnings;
  if (typeof warnings !== 'object' || warnings === null || Array.isArray(warnings)) {
    throw new Error('Die DWD-Warnungsliste ist ungültig.');
  }

  for (const meldungen of Object.values(warnings)) {
    if (!Array.isArray(meldungen) || !meldungen.every(istDwdWarnmeldung)) {
      throw new Error('Die DWD-Warnungsliste enthält ungültige Meldungen.');
    }
  }

  return { warnings: warnings as Record<string, DwdWarnmeldung[]> };
}

function istWinterwarnung(meldung: DwdWarnmeldung): boolean {
  return /glatteis|glätte|eisregen|schnee/i.test(
    `${meldung.event} ${meldung.headline} ${meldung.description}`
  );
}

export async function ladeAktuellesWetter(signal?: AbortSignal): Promise<DwdAktuellesWetter> {
  const response = await fetch(OPEN_METEO_WETTER_URL, { signal });
  if (!response.ok) {
    throw new Error(`Das aktuelle Wetter konnte nicht geladen werden (HTTP ${response.status}).`);
  }

  const daten: unknown = await response.json();
  if (typeof daten !== 'object' || daten === null || !('current' in daten)) {
    throw new Error('Die Wetterantwort hat ein unerwartetes Format.');
  }

  const aktuell = daten.current;
  if (typeof aktuell !== 'object' || aktuell === null) {
    throw new Error('Die aktuellen Wetterdaten sind ungültig.');
  }

  const werte = aktuell as Record<string, unknown>;
  if (typeof werte.temperature_2m !== 'number' || !Number.isFinite(werte.temperature_2m)
    || typeof werte.precipitation !== 'number' || !Number.isFinite(werte.precipitation)
    || typeof werte.weather_code !== 'number' || !Number.isFinite(werte.weather_code)) {
    throw new Error('Die aktuellen Wetterdaten sind unvollständig.');
  }

  return {
    temperatur: werte.temperature_2m,
    niederschlag: werte.precipitation,
    wetterCode: werte.weather_code
  };
}

export async function ladeDwdWinterwarnungen(
  regionen: readonly DwdRegionId[],
  signal?: AbortSignal
): Promise<DwdWinterwarnung[]> {
  const ausgewaehlteRegionen = DWD_REGIONEN.filter(region => regionen.includes(region.id));
  if (ausgewaehlteRegionen.length !== regionen.length) {
    throw new Error('Die Auswahl enthält eine unbekannte DWD-Region.');
  }
  if (ausgewaehlteRegionen.length === 0) return [];

  const response = await fetch(DWD_WARNUNGEN_URL, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`DWD-Warnungen konnten nicht geladen werden (HTTP ${response.status}).`);
  }

  const daten = leseWarnDaten(await response.text());
  const jetzt = Date.now();
  const regionsNamen = ausgewaehlteRegionen.map(region => region.name.toLocaleLowerCase('de-DE'));

  return Object.values(daten.warnings)
    .flat()
    .filter(meldung =>
      regionsNamen.some(region => meldung.regionName.toLocaleLowerCase('de-DE').includes(region))
      && meldung.start <= jetzt
      && meldung.end >= jetzt
      && istWinterwarnung(meldung)
    )
    .filter((meldung, index, meldungen) =>
      meldungen.findIndex(kandidat =>
        kandidat.regionName === meldung.regionName
        && kandidat.event === meldung.event
        && kandidat.start === meldung.start
        && kandidat.end === meldung.end
      ) === index
    )
    .sort((a, b) => b.level - a.level || a.end - b.end);
}
