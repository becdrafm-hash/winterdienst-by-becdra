export interface EinsatzZeiten {
  echteMinuten: number;
  kundenMinuten: number;
  zeitFensterAnzeige: string;
}

export function berechneEinsatzZeitenRückwärts(
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
  const kundenMinuten = Math.ceil(echteMinuten / 15) * 15;
  const fensterBeginn = new Date(endMs - kundenMinuten * 60000);

  return {
    echteMinuten,
    kundenMinuten,
    zeitFensterAnzeige: `von ${fensterBeginn.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} bis ${endZeit.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  };
}
