import { useCallback, useEffect, useState } from 'react';
import {
  ladeAktuellesWetter,
  ladeDwdWinterwarnungen,
  type DwdAktuellesWetter,
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

type Ladezustand = 'laden' | 'geladen';

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
  const [warnungenGeprueft, setWarnungenGeprueft] = useState(false);
  const [wetter, setWetter] = useState<DwdAktuellesWetter | null>(null);
  const [wetterLaedt, setWetterLaedt] = useState(true);
  const [wetterFehlgeschlagen, setWetterFehlgeschlagen] = useState(false);
  const [aktualisiert, setAktualisiert] = useState<Date | null>(null);
  const [ladeVersion, setLadeVersion] = useState(0);
  const [ausgeklappt, setAusgeklappt] = useState(false);

  const ladeWarnungen = useCallback(async (signal: AbortSignal) => {
    setLadezustand('laden');
    setWarnungenGeprueft(false);
    setAktualisiert(null);

    try {
      const aktuelleWarnungen = await ladeDwdWinterwarnungen(regionen, signal);
      if (signal.aborted) return;
      setWarnungen(aktuelleWarnungen);
      setAktualisiert(new Date());
      setWarnungenGeprueft(true);
      setLadezustand('geladen');
    } catch {
      if (signal.aborted) return;
      setWarnungen([]);
      setLadezustand('geladen');
    }
  }, [regionen]);

  const ladeWetter = useCallback(async (signal: AbortSignal) => {
    setWetterLaedt(true);
    setWetterFehlgeschlagen(false);

    try {
      const aktuellesWetter = await ladeAktuellesWetter(signal);
      if (signal.aborted) return;
      setWetter(aktuellesWetter);
      setWetterFehlgeschlagen(false);
    } catch {
      if (signal.aborted) return;
      setWetter(null);
      setWetterFehlgeschlagen(true);
    } finally {
      if (!signal.aborted) setWetterLaedt(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => {
      void ladeWarnungen(controller.signal);
      void ladeWetter(controller.signal);
    }, 0);

    const timer = window.setInterval(() => {
      void ladeWarnungen(controller.signal);
      void ladeWetter(controller.signal);
    }, 10 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [ladeWetter, ladeWarnungen, ladeVersion]);

  const hatWarnung = warnungen.length > 0;
  const akzentfarbe = hatWarnung ? (darkMode ? '#fbbf24' : '#b45309') : '#8cc63f';
  const statusHintergrund = hatWarnung
    ? (darkMode ? '#3b2f16' : '#fff7ed')
    : (darkMode ? '#1d2b1b' : '#f4fce3');
  const statusMeldung = regionen.length === 0
    ? 'Keine DWD-Region ausgewählt'
    : ladezustand === 'laden'
      ? 'DWD-Warnungen werden geladen …'
      : !warnungenGeprueft
        ? null
        : hatWarnung
          ? `${warnungen.length} akute Winterwarnung${warnungen.length === 1 ? '' : 'en'}`
          : `Keine amtlichen Warnungen aktiv – ${wetter && wetter.temperatur <= 2 ? 'Hinweis: Temperaturen nahe dem Gefrierpunkt' : 'Stabile Lage'}`;
  const wetterText = wetter
    ? `Aktuelles Wetter: ${wetter.temperatur.toLocaleString('de-DE', { maximumFractionDigits: 1 })} °C | Niederschlag: ${wetter.niederschlag.toLocaleString('de-DE', { maximumFractionDigits: 1 })} mm`
    : wetterLaedt
      ? 'Aktuelles Wetter wird geladen …'
      : wetterFehlgeschlagen
        ? 'Aktuelles Live-Wetter derzeit nicht verfügbar'
        : 'Aktuelles Wetter wird geladen …';

  return (
    <section style={{ backgroundColor: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', color: textApp, overflow: 'hidden' }}>
      <div style={{ alignItems: 'center', backgroundColor: bgCard, borderBottom: `1px solid ${borderCard}`, display: 'flex', gap: '8px', justifyContent: 'space-between', padding: '9px 10px' }}>
        <div>
          <strong style={{ color: textApp, fontSize: '0.78rem' }}>{wetterText}</strong>
          {wetter && wetter.temperatur <= 2 && (hatWarnung || regionen.length === 0 || !warnungenGeprueft) && (
            <div style={{ color: textSub, fontSize: '0.7rem', marginTop: '3px' }}>
              Hinweis: Temperaturen nahe dem Gefrierpunkt
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setLadeVersion(version => version + 1)}
          aria-label="Wetter und DWD-Warnungen aktualisieren"
          style={{ background: 'transparent', border: 'none', color: textSub, cursor: 'pointer', flexShrink: 0, fontSize: '1rem', lineHeight: 1, padding: '5px' }}
        >
          ↻
        </button>
      </div>
      {statusMeldung && <div style={{ alignItems: 'center', backgroundColor: statusHintergrund, display: 'flex', gap: '8px', minHeight: '38px', padding: '0 8px' }}>
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
            color: hatWarnung ? akzentfarbe : (darkMode ? '#a3d977' : '#3f6212'),
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
          <span aria-hidden="true">{hatWarnung ? '⚠️' : '🌨️'}</span>
          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusMeldung}</strong>
          {hatWarnung && <span aria-hidden="true">{ausgeklappt ? '▴' : '▾'}</span>}
        </button>
        {aktualisiert && (
          <span style={{ color: textSub, flexShrink: 0, fontSize: '0.65rem' }}>
            {aktualisiert.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>}

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
