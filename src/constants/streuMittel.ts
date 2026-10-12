export const STREUMITTEL = [
  { id: 'Salz', name: 'Streusalz (NaCl)', einheit: 'kg', gefahrGrenze: 200, farbe: '#3b82f6' },
  { id: 'Splitt', name: 'Splitt / Kies', einheit: 'kg', gefahrGrenze: 100, farbe: '#10b981' },
  { id: 'Sand', name: 'Sand-Salz-Gemisch', einheit: 'kg', gefahrGrenze: 150, farbe: '#f59e0b' },
  { id: 'Lava', name: 'Lavagranulat', einheit: 'kg', gefahrGrenze: 100, farbe: '#ef4444' },
  { id: 'Acetat', name: 'Acetat / Spezialstreu', einheit: 'Liter', gefahrGrenze: 50, farbe: '#8b5cf6' }
] as const;

export type StreuMittelId = typeof STREUMITTEL[number]['id'];
export type StreuMittelEinheit = typeof STREUMITTEL[number]['einheit'];
export type LagerBestaende = Record<StreuMittelId, number>;

export function normalisiereStreuMittelId(material: string): StreuMittelId {
  if (material === 'Lavagranulat') return 'Lava';
  return STREUMITTEL.find(streuMittel => streuMittel.id === material)?.id ?? 'Salz';
}
