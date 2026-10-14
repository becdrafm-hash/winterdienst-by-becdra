import { useEffect, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { LEISTUNGSARTEN, type Kunde, type Leistungsart, type Liegenschaft } from '../types';

interface AktiverEinsatzProps {
  activeKunde: Kunde;
  activeObjekt: Liegenschaft;
  startPunkt: string;
  darkMode: boolean;
  textApp: string;
  textSub: string;
  borderCard: string;
  bgCard: string;
  wetterLage: string;
  startTime: Date | null;
  pauseBeginn: number | null;
  pausendauerMs: number;
  onTogglePause: () => void;
  einsatzType: Leistungsart;
  setEinsatzType: Dispatch<SetStateAction<Leistungsart>>;
  materialVerbrauchKg: string;
  setMaterialVerbrauchKg: Dispatch<SetStateAction<string>>;
  materialEinheit: string;
  gefahreneKm: string;
  setGefahreneKm: Dispatch<SetStateAction<string>>;
  aufgenommenesFoto: string | null;
  hindernisNotiz: string;
  setHindernisNotiz: Dispatch<SetStateAction<string>>;
  hindernisFoto: string | null;
  showActiveRaeumPlanPopup: boolean;
  setShowActiveRaeumPlanPopup: Dispatch<SetStateAction<boolean>>;
  handleFotoCapture: (event: ChangeEvent<HTMLInputElement>) => void;
  handleHindernisFotoCapture: (event: ChangeEvent<HTMLInputElement>) => void;
  cancelEinsatz: () => void;
  finishEinsatz: () => void;
}

export default function AktiverEinsatz({
  activeKunde,
  activeObjekt,
  startPunkt,
  darkMode,
  textApp,
  textSub,
  borderCard,
  bgCard,
  wetterLage,
  startTime,
  pauseBeginn,
  pausendauerMs,
  onTogglePause,
  einsatzType,
  setEinsatzType,
  materialVerbrauchKg,
  setMaterialVerbrauchKg,
  materialEinheit,
  gefahreneKm,
  setGefahreneKm,
  aufgenommenesFoto,
  hindernisNotiz,
  setHindernisNotiz,
  hindernisFoto,
  showActiveRaeumPlanPopup,
  setShowActiveRaeumPlanPopup,
  handleFotoCapture,
  handleHindernisFotoCapture,
  cancelEinsatz,
  finishEinsatz
}: AktiverEinsatzProps) {
  const [jetzt, setJetzt] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setJetzt(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const aktuellePauseMs = pauseBeginn === null ? 0 : Math.max(0, jetzt - pauseBeginn);
  const arbeitszeitMs = startTime
    ? Math.max(0, jetzt - startTime.getTime() - pausendauerMs - aktuellePauseMs)
    : 0;
  const gesamtePausenMs = pausendauerMs + aktuellePauseMs;

  const formatiereDauer = (dauerMs: number) => {
    const sekunden = Math.floor(dauerMs / 1000);
    const stunden = Math.floor(sekunden / 3600);
    const minuten = Math.floor((sekunden % 3600) / 60);
    const restSekunden = sekunden % 60;
    return [stunden, minuten, restSekunden].map(wert => wert.toString().padStart(2, '0')).join(':');
  };

  return (
    <>
      <div style={{ backgroundColor: bgCard, padding: '20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '2px solid #8cc63f', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <button onClick={cancelEinsatz} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
            ← Zurück zur Übersicht
          </button>
        </div>

        <div style={{ borderBottom: '1px solid ' + borderCard, paddingBottom: '10px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#8cc63f', textTransform: 'uppercase' }}>Aktiver Einsatz ({activeKunde.firma})</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '2px 0', color: textApp }}>{activeObjekt.name}</h2>
          <p style={{ fontSize: '0.8rem', color: textSub, margin: 0 }}>📍 {activeObjekt.address} • {activeObjekt.size} m² (Pos: #{activeObjekt.reihenfolge})</p>
        </div>

        {activeObjekt.raeumPlan && (
          <button onClick={() => setShowActiveRaeumPlanPopup(true)} style={{ backgroundColor: '#111827', color: '#ffffff', padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}>
            🗺️ Räumplan anzeigen
          </button>
        )}

        <section style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', border: '1px solid ' + borderCard, borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }} aria-live="off">
          <strong style={{ color: textApp, fontSize: '0.8rem' }}>⏱️ Arbeitszeit erfassen</strong>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div>
              <span style={{ color: textSub, display: 'block', fontSize: '0.7rem' }}>Arbeitszeit</span>
              <strong style={{ color: textApp, fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>{formatiereDauer(arbeitszeitMs)}</strong>
            </div>
            <div>
              <span style={{ color: textSub, display: 'block', fontSize: '0.7rem' }}>Pausenzeit</span>
              <strong style={{ color: textApp, fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>{formatiereDauer(gesamtePausenMs)}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onTogglePause}
            style={{
              backgroundColor: pauseBeginn === null ? '#fef3c7' : '#dcfce7',
              border: '1px solid ' + (pauseBeginn === null ? '#f59e0b' : '#8cc63f'),
              borderRadius: '8px',
              color: '#111827',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              padding: '10px'
            }}
          >
            {pauseBeginn === null ? '⏸️ Pause starten' : '▶️ Arbeit fortsetzen'}
          </button>
          {pauseBeginn !== null && (
            <span style={{ color: '#92400e', fontSize: '0.75rem', textAlign: 'center' }}>Pause läuft – die Arbeitszeit ist angehalten.</span>
          )}
        </section>

        <div style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', padding: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid ' + borderCard }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: textSub }}>🕒 Startpunkt:</span>
          <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#8cc63f' }}>{startPunkt}</span>
        </div>

        <div style={{ backgroundColor: darkMode ? '#14171a' : '#eef6e6', padding: '10px', borderRadius: '10px', border: '1px solid #8cc63f' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#598f1e', textTransform: 'uppercase', display: 'block' }}>📡 Automatisches Live-Wetter</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: textApp }}>{wetterLage}</span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Art des Einsatzes</label>
          <select
            value={einsatzType}
            onChange={event => {
              const leistungsart = LEISTUNGSARTEN.find(option => option === event.target.value);
              if (leistungsart) setEinsatzType(leistungsart);
            }}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }}
          >
            {LEISTUNGSARTEN.map(leistungsart => (
              <option key={leistungsart} value={leistungsart}>{leistungsart}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label htmlFor="materialverbrauch-kg" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Streumittelverbrauch</label>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input id="materialverbrauch-kg" type="number" min="0" step="0.1" required value={materialVerbrauchKg} onChange={event => setMaterialVerbrauchKg(event.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }} />
              <span style={{ fontSize: '0.75rem', color: textSub }}>{materialEinheit}</span>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Gefahrene km (Auto-GPS)</label>
            <input type="number" value={gefahreneKm} onChange={event => setGefahreneKm(event.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, textAlign: 'center', fontWeight: 'bold' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Fotodokumentation</label>
          <label style={{ display: 'block', width: '100%', border: '2px dashed #8cc63f', backgroundColor: darkMode ? '#14171a' : '#f4fce3', color: '#8cc63f', padding: '10px', borderRadius: '10px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem', boxSizing: 'border-box' }}>
            📷 {aufgenommenesFoto ? `✓ Foto komprimiert (${aufgenommenesFoto})` : 'Kamera öffnen & Fläche fotografieren'}
            <input type="file" accept="image/*" capture="environment" onChange={handleFotoCapture} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ backgroundColor: darkMode ? '#14171a' : '#fff1f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="einsatz-notiz" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#dc2626' }}>⚠️ Besonderheiten / Hindernisse (optional)</label>
          <textarea
            id="einsatz-notiz"
            rows={3}
            value={hindernisNotiz}
            onChange={event => setHindernisNotiz(event.target.value)}
            placeholder="z. B. PKW blockierte Einfahrt, besondere Glättestelle..."
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: bgCard, color: textApp, fontSize: '0.8rem', boxSizing: 'border-box', resize: 'vertical' }}
          />
          <label style={{ display: 'block', width: '100%', border: '2px dashed #dc2626', backgroundColor: darkMode ? '#14171a' : '#ffffff', color: '#dc2626', padding: '8px', borderRadius: '8px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem', boxSizing: 'border-box' }}>
            📷 {hindernisFoto ? `✓ Hindernis-Foto (${hindernisFoto})` : 'Hindernis fotografieren'}
            <input type="file" accept="image/*" capture="environment" onChange={handleHindernisFotoCapture} style={{ display: 'none' }} />
          </label>
        </div>

        <button onClick={finishEinsatz} style={{ width: '100%', backgroundColor: '#8cc63f', color: '#111827', padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(140, 198, 63, 0.3)' }}>
          ✓ Einsatz abschließen & Speichern
        </button>
      </div>

      {showActiveRaeumPlanPopup && (
        <div role="dialog" aria-modal="true" aria-labelledby="active-raeumplan-title" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 4000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', borderRadius: '16px', maxWidth: '900px', width: '100%', height: 'min(90vh, 900px)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="active-raeumplan-title" style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>🗺️ Räumplan: {activeObjekt.name}</h3>
              <button type="button" aria-label="Räumplan schließen" onClick={() => setShowActiveRaeumPlanPopup(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', color: textApp, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ width: '100%', flex: 1, minHeight: 0, backgroundColor: '#111', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              {activeObjekt.raeumPlan ? (
                activeObjekt.raeumPlan.toLowerCase().startsWith('data:application/pdf')
                  || /\.pdf(?:$|[?#])/i.test(activeObjekt.raeumPlan)
                  ? <iframe title={`Räumplan ${activeObjekt.name}`} src={activeObjekt.raeumPlan} style={{ width: '100%', height: '100%', border: 0, backgroundColor: '#ffffff' }} />
                  : <img src={activeObjekt.raeumPlan} alt={`Räumplan ${activeObjekt.name}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Kein Räumplan für dieses Objekt hinterlegt.</p>
              )}
            </div>
            <button type="button" onClick={() => setShowActiveRaeumPlanPopup(false)} style={{ backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
