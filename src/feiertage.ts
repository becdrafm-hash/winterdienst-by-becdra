function ostersonntag(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, monat - 1, tag);
}

function datumsschluessel(datum: Date): string {
  return `${datum.getFullYear()}-${datum.getMonth()}-${datum.getDate()}`;
}

function nrwFeiertage(year: number): Set<string> {
  const ostern = ostersonntag(year);
  const tage = [
    new Date(year, 0, 1),
    new Date(year, 4, 1),
    new Date(year, 9, 3),
    new Date(year, 10, 1),
    new Date(year, 11, 25),
    new Date(year, 11, 26),
    new Date(year, ostern.getMonth(), ostern.getDate() - 2),
    new Date(year, ostern.getMonth(), ostern.getDate() + 1),
    new Date(year, ostern.getMonth(), ostern.getDate() + 39),
    new Date(year, ostern.getMonth(), ostern.getDate() + 50),
    new Date(year, ostern.getMonth(), ostern.getDate() + 60)
  ];

  return new Set(tage.map(datumsschluessel));
}

export function istWochenendeOderFeiertag(datum: Date = new Date()): boolean {
  const feiertage = nrwFeiertage(datum.getFullYear());
  if (feiertage.has(datumsschluessel(datum))) return true;

  const wochentag = datum.getDay();
  if (wochentag === 0 || wochentag === 6) return true;
  if (datum.getHours() < 18) return false;

  const vorabend = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() + 1);
  return vorabend.getDay() === 0
    || vorabend.getDay() === 6
    || nrwFeiertage(vorabend.getFullYear()).has(datumsschluessel(vorabend));
}
