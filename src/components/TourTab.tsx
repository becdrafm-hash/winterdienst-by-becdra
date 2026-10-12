import { useEffect, useState } from 'react';
import type { Kunde, Liegenschaft } from '../types';
import { istWochenendeOderFeiertag } from '../feiertage';
import DwdWetterBanner from './DwdWetterBanner';
import type { DwdRegionId } from '../services/dwdWetter';
import { optimiereTour } from '../utils/routeOptimizer';

interface TourLiegenschaft {
  kunde: Kunde | undefined;
  liege: Liegenschaft;
}

interface TourTabProps {
  startPunkt: string;
  dwdRegionen: DwdRegionId[];
  alleLiegenschaftenSortiert: TourLiegenschaft[];
  onOptimizeRoute: (route: TourLiegenschaft[]) => string;
  zeigeMeldung: (text: string) => void;
  darkMode: boolean;
  textApp: string;
  textSub: string;
  borderCard: string;
  bgCard: string;
  isObjektErledigtVorKurzem: (objName: string) => boolean;
  oeffneRaeumPlanAnsicht: (planUrl?: string) => void;
  startEinsatzMitWaze: (kunde: Kunde, obj: Liegenschaft) => void;
}

export default function TourTab({
  startPunkt,
  dwdRegionen,
  alleLiegenschaftenSortiert,
  onOptimizeRoute,
  zeigeMeldung,
  darkMode,
  textApp,
  textSub,
  borderCard,
  bgCard,
  isObjektErledigtVorKurzem,
  oeffneRaeumPlanAnsicht,
  startEinsatzMitWaze
}: TourTabProps) {
  const [jetzt, setJetzt] = useState(() => new Date());
  const [ausgeklappteWochenendObjekte, setAusgeklappteWochenendObjekte] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const naechsteMinute = 60_000 - (Date.now() % 60_000);
    const timer = window.setTimeout(() => setJetzt(new Date()), naechsteMinute);
    return () => window.clearTimeout(timer);
  }, [jetzt]);

  const wochenendModusAktiv = istWochenendeOderFeiertag(jetzt);
  const anzahlMitKoordinaten = alleLiegenschaftenSortiert.filter(
    ({ liege }) => typeof liege.lat === 'number'
      && Number.isFinite(liege.lat)
      && typeof liege.lon === 'number'
      && Number.isFinite(liege.lon)
  ).length;
  const optimiereRouteUndMelde = () => {
    try {
      const optimierteRoute = optimiereTour(
        alleLiegenschaftenSortiert.map(item => ({ ...item.liege, tourItem: item }))
      ).map(({ tourItem }) => tourItem);
      zeigeMeldung(onOptimizeRoute(optimierteRoute));
    } catch (error) {
      console.error('GPS-Routenoptimierung fehlgeschlagen:', error);
      zeigeMeldung('Die GPS-Route konnte nicht optimiert werden.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <DwdWetterBanner
        regionen={dwdRegionen}
        darkMode={darkMode}
        bgCard={bgCard}
        textApp={textApp}
        textSub={textSub}
        borderCard={borderCard}
      />
      <div style={{ background: darkMode ? bgCard : 'linear-gradient(135deg, #ffffff, #f9fafb)', color: textApp, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <h2 style={{ fontWeight: 'bold', fontSize: '1.05rem', margin: 0, color: darkMode ? '#f3f4f6' : '#111827' }}>Guten Tag, Micha! 👋</h2>
          <p style={{ fontSize: '0.75rem', color: '#8cc63f', margin: '4px 0 0 0', fontWeight: 'bold' }}>Aktueller Startpunkt: {startPunkt}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={optimiereRouteUndMelde}
            title={anzahlMitKoordinaten < 2 ? 'Mindestens zwei Liegenschaften mit GPS-Koordinaten erforderlich.' : undefined}
            style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            🧭 Route optimieren (GPS)
          </button>
        </div>
        {anzahlMitKoordinaten < alleLiegenschaftenSortiert.length && anzahlMitKoordinaten > 0 && (
          <p style={{ color: textSub, fontSize: '0.7rem', margin: 0 }}>
            Liegenschaften ohne GPS-Koordinaten bleiben am Ende der Tour.
          </p>
        )}
      </div>

      {alleLiegenschaftenSortiert.length === 0 ? (
        <p style={{ textAlign: 'center', color: textSub, padding: '24px 0', fontSize: '0.85rem' }}>
          Keine Liegenschaften vorhanden. Bitte im Tab "Objekte" anlegen.
        </p>
      ) : (
        alleLiegenschaftenSortiert.map(({ kunde, liege }) => {
          const istErledigt = isObjektErledigtVorKurzem(liege.name);
          const nurWochenende = liege.nurWochenendeFeiertag === true;
          const kompaktAnzeigen = nurWochenende && !wochenendModusAktiv;
          const ausgeklappt = ausgeklappteWochenendObjekte.has(liege.id);

          if (kompaktAnzeigen) {
            return (
              <div key={liege.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  aria-expanded={ausgeklappt}
                  onClick={() => setAusgeklappteWochenendObjekte(vorherige => {
                    const naechste = new Set(vorherige);
                    if (naechste.has(liege.id)) naechste.delete(liege.id);
                    else naechste.add(liege.id);
                    return naechste;
                  })}
                  style={{ width: '100%', minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', boxSizing: 'border-box', backgroundColor: darkMode ? '#1b1e21' : '#f1f3f5', color: textSub, border: '1px solid ' + borderCard, borderRadius: ausgeklappt ? '10px 10px 0 0' : '10px', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '0.85rem' }}>📅</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 600 }}>{liege.name}</span>
                  <span style={{ flexShrink: 0, fontSize: '0.65rem', backgroundColor: darkMode ? '#292d31' : '#e5e7eb', padding: '3px 6px', borderRadius: '5px', fontWeight: 600 }}>Nur Sa/So/Feiertag</span>
                  <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '0.75rem' }}>{ausgeklappt ? '▲' : '▼'}</span>
                </button>
                {ausgeklappt && (
                  <div style={{ backgroundColor: darkMode ? '#1b1e21' : '#f1f3f5', color: textSub, padding: '12px', border: '1px solid ' + borderCard, borderTop: 'none', borderRadius: '0 0 10px 10px', opacity: 0.88 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '4px' }}>{kunde?.firma || 'Unbekannter Kunde'}</div>
                    <p style={{ fontSize: '0.75rem', lineHeight: 1.4, margin: 0, overflowWrap: 'anywhere' }}>{liege.address} • {liege.size} m²</p>
                    <p style={{ fontSize: '0.7rem', margin: '8px 0 0', fontStyle: 'italic' }}>Dieses Objekt wird an Wochenenden und Feiertagen in der Tour angezeigt.</p>
                    {liege.raeumPlan && (
                      <button onClick={() => oeffneRaeumPlanAnsicht(liege.raeumPlan)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 'bold', padding: 0, marginTop: '6px', cursor: 'pointer' }}>
                        🗺️ Räumplan anzeigen
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={liege.id} style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '16px', border: istErledigt ? '2px solid #8cc63f' : '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', boxSizing: 'border-box' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', minWidth: 0 }}>
                  <span style={{ flexShrink: 0, fontSize: '0.7rem', backgroundColor: darkMode ? '#14171a' : '#111827', color: '#ffffff', padding: '3px 7px', borderRadius: '5px', fontWeight: 'bold' }}>#{liege.reihenfolge || 1}</span>
                  <h3 style={{ minWidth: 0, overflowWrap: 'anywhere', fontWeight: 'bold', color: textApp, fontSize: '0.95rem', lineHeight: 1.3, margin: '1px 0 0' }}>{liege.name}</h3>
                </div>
                <div style={{ fontSize: '0.7rem', color: textSub, margin: '5px 0 3px', overflowWrap: 'anywhere' }}>{kunde?.firma || 'Unbekannter Kunde'}</div>
                <p style={{ fontSize: '0.75rem', lineHeight: 1.35, color: textSub, margin: 0, overflowWrap: 'anywhere' }}>{liege.address} • {liege.size} m²</p>
                {liege.raeumPlan && (
                  <button onClick={() => oeffneRaeumPlanAnsicht(liege.raeumPlan)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 'bold', padding: 0, marginTop: '4px', cursor: 'pointer' }}>
                    🗺️ Räumplan anzeigen
                  </button>
                )}
              </div>
              {kunde && (
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {istErledigt && <span style={{ whiteSpace: 'nowrap', fontSize: '0.65rem', backgroundColor: '#8cc63f', color: '#111827', padding: '4px 7px', borderRadius: '5px', fontWeight: 'bold' }}>✓ Erledigt</span>}
                  <button onClick={() => startEinsatzMitWaze(kunde, liege)} style={{ minWidth: '92px', backgroundColor: '#8cc63f', color: '#111827', padding: '10px 9px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    🚗 {istErledigt ? 'Nochmal' : 'Starten'}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
