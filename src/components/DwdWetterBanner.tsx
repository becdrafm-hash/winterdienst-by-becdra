import { useCallback, useEffect, useState } from 'react';
import {
  DWD_REGIONEN,
  ladeDwdWinterwarnungen,
  type DwdRegionId,
  type DwdWinterwarnung
} from '../services/dwdWetter';

interface DwdWetterBannerProps {
  regionen: DwdRegionId[];
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

export default function DwdWetterBanner({ regionen }: DwdWetterBannerProps) {
  const [warnungen, setWarnungen] = useState<DwdWinterwarnung[]>([]);
  const [ladezustand, setLadezustand] = useState<Ladezustand>('laden');
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktualisiert, setAktualisiert] = useState<Date | null>(null);
  const [ladeVersion, setLadeVersion] = useState(0);

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

  const rahmenfarbe = ladezustand === 'fehler'
    ? '#dc2626'
    : warnungen.length > 0
      ? '#dc2626'
      : '#8cc63f';
  const hintergrund = ladezustand === 'fehler'
    ? '#fef2f2'
    : warnungen.length > 0
      ? '#fff7ed'
      : '#f4fce3';

  return (
    <section
      aria-live="polite"
      style={{
        backgroundColor: hintergrund,
        border: `1px solid ${rahmenfarbe}`,
        borderRadius: '12px',
        color: '#111827',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px 14px'
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '0.9rem' }}>
          {warnungen.length > 0 ? '⚠️ DWD-Winterwarnung' : '🌨️ DWD-Wetterwarnung'}
        </strong>
        <button
          type="button"
          onClick={() => setLadeVersion(version => version + 1)}
          disabled={ladezustand === 'laden'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#374151',
            cursor: ladezustand === 'laden' ? 'wait' : 'pointer',
            fontSize: '0.75rem',
            textDecoration: 'underline'
          }}
        >
          {ladezustand === 'laden' ? 'Lädt …' : 'Aktualisieren'}
        </button>
      </div>

      {ladezustand === 'fehler' ? (
        <p style={{ fontSize: '0.8rem', lineHeight: 1.4, margin: 0 }}>
          DWD-Warnungen{regionsNamen && ` für ${regionsNamen}`} konnten nicht geladen werden: {fehler}
        </p>
      ) : warnungen.length > 0 ? (
        warnungen.map((warnung, index) => (
          <div key={`${warnung.event}-${warnung.start}-${index}`} style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
            <strong>{warnung.headline}</strong>
            <div>{warnung.regionName} · gültig bis {zeitpunkt(warnung.end)}</div>
            <div>{warnung.description}</div>
          </div>
        ))
      ) : (
        <p style={{ fontSize: '0.8rem', lineHeight: 1.4, margin: 0 }}>
          {regionen.length === 0
            ? 'Keine Landkreise zur Überwachung ausgewählt. Die Auswahl kannst du im Bereich „Lager“ ändern.'
            : ladezustand === 'laden'
              ? `DWD-Warnungen für ${regionsNamen} werden geladen …`
              : `Keine akute Schnee- oder Glättewarnung für ${regionsNamen}.`}
        </p>
      )}

      {aktualisiert && (
        <span style={{ color: '#4b5563', fontSize: '0.7rem' }}>
          Stand: {aktualisiert.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </section>
  );
}
