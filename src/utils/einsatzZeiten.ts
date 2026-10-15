export interface EinsatzZeiten {
  echteMinuten: number;
  kundenMinuten: number;
}

export function berechneEinsatzZeiten(arbeitsdauerMs: number): EinsatzZeiten {
  const sichereArbeitsdauerMs = Number.isFinite(arbeitsdauerMs)
    ? Math.max(0, arbeitsdauerMs)
    : 0;
  const echteMinuten = Math.max(1, Math.round(sichereArbeitsdauerMs / 60000));

  return {
    echteMinuten,
    kundenMinuten: Math.ceil(echteMinuten / 15) * 15
  };
}
