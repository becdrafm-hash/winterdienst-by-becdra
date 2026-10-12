import { useCallback, useEffect, useState } from 'react';
import {
  DWD_REGIONEN,
  ladeDwdWinterwarnungen,
  type DwdRegionId,
  type DwdWinterwarnung
} from '../services/dwdWetter';

interface DwdWetterBannerProps {
  regionen: DwdRegionId[];
  darkMode: boolean;
  bgCard: string;
  textApp: string;
  textSub: string;
  borderCard: string;
}

type Ladezustand = 'laden' | 'geladen' | 'fehler';

function zeitpunkt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function DwdWetterBanner({
  regionen,
  darkMode,
  bgCard,
  textApp,
  textSub,
  borderCard
}: DwdWetterBannerProps) {
  const [warnungen, setWarnungen] = useState<DwdWinterwarnung[]>([]);
  const [ladezustand, setLadezustand] = useState<Ladezustand>('laden');
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktualisiert, setAktualisiert] = useState<Date | null>(null);
  const [ladeVersion, setLadeVersion] = useState(0);
  const [ausgeklappt, setAusgeklappt] = useState(false);

  const ladeWarnungen = useCallback(async (signal: AbortSignal) => {
    setLadezustand('laden');
    setFehler(null);

    try {
      const aktuelleWarnungen = await ladeDwdWinterwarnungen(regionen, signal);
      if (signal.aborted) return;
      setWarnungen(aktuelleWarnungen);
      setAktualisiert(new Date());
      setLadezustand('geladen');
    } catch (error) {
      if (signal.aborted) return;
      setFehler(error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden der DWD-Warnungen.');
      setLadezustand('fehler');
    }
  }, [regionen]);

  const regionsNamen = DWD_REGIONEN
    .filter(region => regionen.includes(region.id))
    .map(region => region.name)
    .join(', ');

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => {
      void ladeWarnungen(controller.signal);
    }, 0);

    const timer = window.setInterval(() => {
      void ladeWarnungen(controller.signal);
    }, 10 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [ladeWarnungen, ladeVersion]);

  const hatWarnung = warnungen.length > 0;
  const akzentfarbe = ladezustand === 'fehler'
    ? (darkMode ? '#f87171' : '#dc2626')
    : hatWarnung
      ? (darkMode ? '#fbbf24' : '#b45309')
      : '#8cc63f';
  const statusHintergrund = ladezustand === 'fehler'
    ? (darkMode ? '#3b1f23' : '#fef2f2')
    : hatWarnung
      ? (darkMode ? '#3b2f16' : '#fff7ed')
      : (darkMode ? '#1d2b1b' : '#f4fce3');
  const statusText = ladezustand === 'geladen' && !hatWarnung && regionen.length > 0
    ? (darkMode ? '#a3d977' : '#3f6212')
    : akzentfarbe;
  const statusMeldung = ladezustand === 'fehler'
    ? 'DWD-Warnung nicht verfügbar'
    : regionen.length === 0
      ? 'Keine DWD-Region ausgewählt'
      : ladezustand === 'laden'
        ? 'DWD-Warnungen werden geladen …'
        : hatWarnung
          ? `${warnungen.length} akute Winterwarnung${warnungen.length === 1 ? '' : 'en'}`
          : 'Keine akute Winterwarnung';

  return (
    <section style={{ backgroundColor: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', color: textApp, overflow: 'hidden' }}>
      <div style={{ alignItems: 'center', backgroundColor: statusHintergrund, display: 'flex', gap: '8px', minHeight: '38px', padding: '0 8px' }}>
        <button
          type="button"
          onClick={() => hatWarnung && setAusgeklappt(value => !value)}
          aria-expanded={hatWarnung ? ausgeklappt : undefined}
          aria-controls={hatWarnung ? 'dwd-warnungsdetails' : undefined}
          disabled={!hatWarnung}
          style={{
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            color: statusText,
            cursor: hatWarnung ? 'pointer' : 'default',
            display: 'flex',
            flex: 1,
            fontSize: '0.78rem',
            gap: '7px',
            minWidth: 0,
            padding: '8px 0',
            textAlign: 'left'
          }}
        >
          <span aria-hidden="true">{ladezustand === 'fehler' ? '⚠️' : hatWarnung ? '⚠️' : '🌨️'}</span>
          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusMeldung}</strong>
          {hatWarnung && <span aria-hidden="true">{ausgeklappt ? '▴' : '▾'}</span>}
        </button>
        {aktualisiert && (
          <span style={{ color: textSub, flexShrink: 0, fontSize: '0.65rem' }}>
            {aktualisiert.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          type="button"
          onClick={() => setLadeVersion(version => version + 1)}
          disabled={ladezustand === 'laden'}
          aria-label="DWD-Warnungen aktualisieren"
          style={{
            background: 'transparent',
            border: 'none',
            color: textSub,
            cursor: ladezustand === 'laden' ? 'wait' : 'pointer',
            flexShrink: 0,
            fontSize: '1rem',
            lineHeight: 1,
            padding: '5px'
          }}
        >
          ↻
        </button>
      </div>

      {ladezustand === 'fehler' && (
        <p style={{ backgroundColor: bgCard, color: textSub, fontSize: '0.75rem', lineHeight: 1.4, margin: 0, padding: '8px 10px' }}>
          DWD-Warnungen{regionsNamen && ` für ${regionsNamen}`} konnten nicht geladen werden: {fehler}
        </p>
      )}

      {hatWarnung && (
        <div
          id="dwd-warnungsdetails"
          hidden={!ausgeklappt}
          style={{ backgroundColor: bgCard, borderTop: `1px solid ${borderCard}`, display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}
        >
          {warnungen.map((warnung, index) => (
            <article key={`${warnung.event}-${warnung.start}-${index}`} style={{ borderLeft: `3px solid ${akzentfarbe}`, paddingLeft: '9px' }}>
              <strong style={{ color: textApp, fontSize: '0.8rem' }}>{warnung.headline}</strong>
              <div style={{ color: textSub, fontSize: '0.7rem', marginTop: '2px' }}>
                {warnung.regionName} · gültig {zeitpunkt(warnung.start)}–{zeitpunkt(warnung.end)}
              </div>
              <p style={{ color: textApp, fontSize: '0.78rem', lineHeight: 1.45, margin: '5px 0 0' }}>{warnung.description}</p>
              {warnung.instruction && (
                <p style={{ color: textSub, fontSize: '0.75rem', lineHeight: 1.4, margin: '4px 0 0' }}>{warnung.instruction}</p>
              )}
            </article>
          ))}
          {aktualisiert && (
            <span style={{ color: textSub, fontSize: '0.65rem' }}>
              Aktualisiert: {aktualisiert.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
