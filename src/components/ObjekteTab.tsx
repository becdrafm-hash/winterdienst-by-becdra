import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import type { Kunde, Liegenschaft } from '../types';
import type { STREUMITTEL } from '../constants/streuMittel';

type StreuMittelOption = typeof STREUMITTEL[number];

interface ObjekteTabProps {
  liegenschaften: Liegenschaft[];
  kunden: Kunde[];
  selectedKundeId: number;
  setSelectedKundeId: Dispatch<SetStateAction<number>>;
  neuObjName: string;
  setNeuObjName: Dispatch<SetStateAction<string>>;
  neuObjAddress: string;
  setNeuObjAddress: Dispatch<SetStateAction<string>>;
  neuObjSize: string;
  setNeuObjSize: Dispatch<SetStateAction<string>>;
  neuObjMaterial: string;
  setNeuObjMaterial: Dispatch<SetStateAction<string>>;
  neuObjReihenfolge: string;
  setNeuObjReihenfolge: Dispatch<SetStateAction<string>>;
  neuObjNurWochenendeFeiertag: boolean;
  setNeuObjNurWochenendeFeiertag: Dispatch<SetStateAction<boolean>>;
  neuObjSaisonStart: string;
  setNeuObjSaisonStart: Dispatch<SetStateAction<string>>;
  neuObjSaisonEnde: string;
  setNeuObjSaisonEnde: Dispatch<SetStateAction<string>>;
  neuObjRaeumPlan: string;
  streuMittelListe: readonly StreuMittelOption[];
  darkMode: boolean;
  textApp: string;
  textSub: string;
  borderCard: string;
  bgCard: string;
  koordinatenWirdErmittelt: boolean;
  addLiegenschaft: (event: FormEvent<HTMLFormElement>) => void;
  handleNeuRaeumPlanUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  startEditLiege: (liege: Liegenschaft) => void;
  deleteLiegenschaft: (liegeId: number) => void;
}

export default function ObjekteTab({
  liegenschaften,
  kunden,
  selectedKundeId,
  setSelectedKundeId,
  neuObjName,
  setNeuObjName,
  neuObjAddress,
  setNeuObjAddress,
  neuObjSize,
  setNeuObjSize,
  neuObjMaterial,
  setNeuObjMaterial,
  neuObjReihenfolge,
  setNeuObjReihenfolge,
  neuObjNurWochenendeFeiertag,
  setNeuObjNurWochenendeFeiertag,
  neuObjSaisonStart,
  setNeuObjSaisonStart,
  neuObjSaisonEnde,
  setNeuObjSaisonEnde,
  neuObjRaeumPlan,
  streuMittelListe,
  darkMode,
  textApp,
  textSub,
  borderCard,
  bgCard,
  koordinatenWirdErmittelt,
  addLiegenschaft,
  handleNeuRaeumPlanUpload,
  startEditLiege,
  deleteLiegenschaft
}: ObjekteTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ order: 2, backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>📍 Alle Liegenschaften verwalten</h2>
        {liegenschaften.length === 0 ? (
          <p style={{ textAlign: 'center', color: textSub, padding: '12px 0', fontSize: '0.85rem' }}>Noch keine Liegenschaften angelegt.</p>
        ) : (
          liegenschaften.map(liege => {
            const zugehKunde = kunden.find(k => k.id === liege.kundeId);
            const gpsAktiv = typeof liege.lat === 'number'
              && Number.isFinite(liege.lat)
              && liege.lat >= -90
              && liege.lat <= 90
              && typeof liege.lon === 'number'
              && Number.isFinite(liege.lon)
              && liege.lon >= -180
              && liege.lon <= 180;
            return (
              <details key={liege.id} style={{ backgroundColor: darkMode ? '#1b2229' : '#f1f5f9', borderRadius: '8px', border: `1px solid ${darkMode ? '#36414d' : '#d8e1ea'}` }}>
                <summary style={{ cursor: 'pointer', listStylePosition: 'inside', padding: '9px 10px', color: textApp, fontSize: '0.78rem' }}>
                  <strong>{liege.name}</strong>
                  <span style={{ color: textSub }}> · {zugehKunde?.firma || 'Kein Kunde'} · #{liege.reihenfolge}</span>
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 10px 10px' }}>
                  <div style={{ fontSize: '0.72rem', color: textSub }}>{liege.address} · {liege.size} m²</div>
                  {gpsAktiv && <div style={{ fontSize: '0.68rem', color: '#5b9b20' }}>✓ GPS aktiv</div>}
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button onClick={() => startEditLiege(liege)} style={{ flex: 1, backgroundColor: darkMode ? '#20252a' : '#ffffff', border: '1px solid ' + borderCard, padding: '8px', borderRadius: '8px', cursor: 'pointer', color: textApp, fontSize: '0.75rem', fontWeight: 'bold' }}>✏️ Bearbeiten</button>
                    <button onClick={() => deleteLiegenschaft(liege.id)} style={{ flex: 1, backgroundColor: darkMode ? '#3b1f23' : '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Löschen</button>
                  </div>
                </div>
              </details>
            );
          })
        )}
      </div>

      <div style={{ order: 1, backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>➕ Neue Liegenschaft anlegen</h2>
        <form onSubmit={addLiegenschaft} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Kunde auswählen</label>
            <select value={selectedKundeId} onChange={e => setSelectedKundeId(Number(e.target.value))} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, fontSize: '0.85rem', backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp }}>
              {kunden.map(k => <option key={k.id} value={k.id}>{k.firma}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Objektbezeichnung</label>
            <input type="text" value={neuObjName} onChange={e => setNeuObjName(e.target.value)} required placeholder="z.B. Filiale Nord" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Adresse (für Waze)</label>
            <input type="text" value={neuObjAddress} onChange={e => setNeuObjAddress(e.target.value)} required placeholder="Musterstr. 5, Rees" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Fläche (m²)</label>
              <input type="number" value={neuObjSize} onChange={e => setNeuObjSize(e.target.value)} required placeholder="200" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Tour-Nr.</label>
              <input type="number" value={neuObjReihenfolge} onChange={e => setNeuObjReihenfolge(e.target.value)} required placeholder="1" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Streumittel</label>
              <select value={neuObjMaterial} onChange={e => setNeuObjMaterial(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, fontSize: '0.85rem', backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp }}>
                {streuMittelListe.map(streuMittel => <option key={streuMittel.id} value={streuMittel.id}>{streuMittel.name}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: textApp, fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={neuObjNurWochenendeFeiertag}
              onChange={e => setNeuObjNurWochenendeFeiertag(e.target.checked)}
            />
            Nur am Wochenende und an Feiertagen anzeigen
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#f9fafb' }}>
            <strong style={{ color: textApp, fontSize: '0.78rem' }}>📅 Betreuungszeitraum</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button type="button" onClick={() => {
                const startJahr = Number(neuObjSaisonStart.slice(0, 4)) || new Date().getFullYear();
                setNeuObjSaisonStart(`${startJahr}-11-01`);
                setNeuObjSaisonEnde(`${startJahr + 1}-03-31`);
              }} style={{ border: '1px solid ' + borderCard, borderRadius: '7px', padding: '8px 5px', backgroundColor: darkMode ? '#22262a' : '#ffffff', color: textApp, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                Volle Saison (01.11. – 31.03.)
              </button>
              <button type="button" onClick={() => {
                const startJahr = Number(neuObjSaisonStart.slice(0, 4)) || new Date().getFullYear();
                setNeuObjSaisonStart(`${startJahr + 1}-01-01`);
                setNeuObjSaisonEnde(`${startJahr + 1}-03-31`);
              }} style={{ border: '1px solid ' + borderCard, borderRadius: '7px', padding: '8px 5px', backgroundColor: darkMode ? '#22262a' : '#ffffff', color: textApp, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                Ab Januar (01.01. – 31.03.)
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <label style={{ color: textSub, fontSize: '0.7rem', fontWeight: 600 }}>
                Aktiv von
                <input type="date" value={neuObjSaisonStart} onChange={event => setNeuObjSaisonStart(event.target.value)} required style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '8px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.78rem' }} />
              </label>
              <label style={{ color: textSub, fontSize: '0.7rem', fontWeight: 600 }}>
                Aktiv bis
                <input type="date" value={neuObjSaisonEnde} onChange={event => setNeuObjSaisonEnde(event.target.value)} required style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '8px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.78rem' }} />
              </label>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Räumplan (Kamera oder Datei)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <label style={{ flex: 1, border: '2px dashed #8cc63f', backgroundColor: darkMode ? '#14171a' : '#f4fce3', color: '#8cc63f', padding: '10px', borderRadius: '8px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>
                📸 Foto
                <input type="file" accept="image/*" capture="environment" onChange={handleNeuRaeumPlanUpload} style={{ display: 'none' }} />
              </label>
              <label style={{ flex: 1, border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, padding: '10px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>
                📁 Datei
                <input type="file" accept="image/*,application/pdf" onChange={handleNeuRaeumPlanUpload} style={{ display: 'none' }} />
              </label>
            </div>
            {neuObjRaeumPlan && <span style={{ fontSize: '0.75rem', color: '#8cc63f', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>✓ Räumplan hinterlegt!</span>}
          </div>
          {koordinatenWirdErmittelt && (
            <p role="status" style={{ color: textSub, fontSize: '0.75rem', margin: 0 }}>📍 Koordinaten werden ermittelt...</p>
          )}
          <button type="submit" disabled={koordinatenWirdErmittelt} style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: koordinatenWirdErmittelt ? 'wait' : 'pointer', opacity: koordinatenWirdErmittelt ? 0.7 : 1 }}>
            {koordinatenWirdErmittelt ? 'Koordinaten werden ermittelt...' : 'Liegenschaft speichern'}
          </button>
        </form>
      </div>
    </div>
  );
}
