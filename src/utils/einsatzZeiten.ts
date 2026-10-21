export interface EinsatzZeiten {
  echteMinuten: number;
  zeitFensterAnzeige: string;
}

export function formatiereEinsatzZeitfenster(
  startTimestamp?: number,
  endTimestamp?: number
): string {
  if (
    typeof startTimestamp !== 'number'
    || !Number.isFinite(startTimestamp)
    || typeof endTimestamp !== 'number'
    || !Number.isFinite(endTimestamp)
  ) {
    return 'Nicht erfasst';
  }

  const formatiereUhrzeit = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${formatiereUhrzeit(startTimestamp)} - ${formatiereUhrzeit(endTimestamp)}`;
}

export function berechneEinsatzZeiten(
  startZeit: Date,
  endZeit: Date,
  pausendauerMs = 0
): EinsatzZeiten {
  const startMs = startZeit.getTime();
  const endMs = endZeit.getTime();
  const sicherePausendauerMs = Number.isFinite(pausendauerMs)
    ? Math.max(0, pausendauerMs)
    : 0;
  const arbeitsdauerMs = Number.isFinite(startMs) && Number.isFinite(endMs)
    ? Math.max(0, endMs - startMs - sicherePausendauerMs)
    : 0;
  const echteMinuten = Math.max(1, Math.round(arbeitsdauerMs / 60000));

  return {
    echteMinuten,
    zeitFensterAnzeige: formatiereEinsatzZeitfenster(startMs, endMs)
  };
}
