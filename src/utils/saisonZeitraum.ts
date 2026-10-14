import type { Liegenschaft } from '../types';

export function datumAlsIso(datum: Date): string {
  const jahr = datum.getFullYear();
  const monat = String(datum.getMonth() + 1).padStart(2, '0');
  const tag = String(datum.getDate()).padStart(2, '0');
  return `${jahr}-${monat}-${tag}`;
}

export function liegtImBetreuungszeitraum(
  liegenschaft: Pick<Liegenschaft, 'saisonStart' | 'saisonEnde'>,
  datum: string
): boolean {
  return (!liegenschaft.saisonStart || datum >= liegenschaft.saisonStart)
    && (!liegenschaft.saisonEnde || datum <= liegenschaft.saisonEnde);
}

export function formatiereSaisonDatum(datum: string | undefined): string {
  if (!datum) return 'offen';
  const [jahr, monat, tag] = datum.split('-');
  return jahr && monat && tag ? `${tag}.${monat}.` : datum;
}
