import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Kunde, Liegenschaft } from '../types';
import { istWochenendeOderFeiertag } from '../feiertage';
import DwdWetterBanner from './DwdWetterBanner';
import type { DwdRegionId } from '../services/dwdWetter';

interface TourLiegenschaft {
  kunde: Kunde | undefined;
  liege: Liegenschaft;
}

interface TourTabProps {
  startPunkt: string;
  dwdRegionen: DwdRegionId[];
  alleLiegenschaftenSortiert: TourLiegenschaft[];
  darkMode: boolean;
  textApp: string;
  textSub: string;
  borderCard: string;
  bgCard: string;
  kopiereAlleAdresen: () => void;
  setShowImportModal: Dispatch<SetStateAction<boolean>>;
  isObjektErledigtVorKurzem: (objName: string) => boolean;
  oeffneRaeumPlanAnsicht: (planUrl?: string) => void;
  startEinsatzMitWaze: (kunde: Kunde, obj: Liegenschaft) => void;
}

export default function TourTab({
  startPunkt,
  dwdRegionen,
  alleLiegenschaftenSortiert,
  darkMode,
  textApp,
  textSub,
  borderCard,
  bgCard,
  kopiereAlleAdresen,
  setShowImportModal,
  isObjektErledigtVorKurzem,
  oeffneRaeumPlanAnsicht,
  startEinsatzMitWaze
}: TourTabProps) {
  const [jetzt, setJetzt] = useState(() => new Date());

  useEffect(() => {
    const naechsteMinute = 60_000 - (Date.now() % 60_000);
    const timer = window.setTimeout(() => setJetzt(new Date()), naechsteMinute);
    return () => window.clearTimeout(timer);
  }, [jetzt]);

  const angezeigteLiegenschaften = alleLiegenschaftenSortiert.filter(
    ({ liege }) => !liege.nurWochenendeFeiertag || istWochenendeOderFeiertag(jetzt)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <DwdWetterBanner regionen={dwdRegionen} />
      <div style={{ background: darkMode ? bgCard : 'linear-gradient(135deg, #ffffff, #f9fafb)', color: textApp, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <h2 style={{ fontWeight: 'bold', fontSize: '1.05rem', margin: 0, color: darkMode ? '#f3f4f6' : '#111827' }}>Guten Tag, Micha! 👋</h2>
          <p style={{ fontSize: '0.75rem', color: '#8cc63f', margin: '4px 0 0 0', fontWeight: 'bold' }}>Aktueller Startpunkt: {startPunkt}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button onClick={kopiereAlleAdresen} style={{ flex: 1, backgroundColor: darkMode ? '#14171a' : '#eef6e6', color: '#598f1e', border: '1px solid #8cc63f', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
            📋 Adressen kopieren
          </button>
          <button onClick={() => setShowImportModal(true)} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
            🔄 Route importieren
          </button>
        </div>
      </div>

      {angezeigteLiegenschaften.length === 0 ? (
        <p style={{ textAlign: 'center', color: textSub, padding: '24px 0', fontSize: '0.85rem' }}>
          {alleLiegenschaftenSortiert.length === 0
            ? 'Keine Liegenschaften vorhanden. Bitte im Tab "Objekte" anlegen.'
            : 'Aktuell gibt es keine Liegenschaften für die Tour.'}
        </p>
      ) : (
        angezeigteLiegenschaften.map(({ kunde, liege }) => {
          const istErledigt = isObjektErledigtVorKurzem(liege.name);
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
