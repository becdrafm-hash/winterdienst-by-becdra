import { useState } from 'react';
import type { LagerBestaende, StreuMittelId } from '../constants/streuMittel';
import { STREUMITTEL } from '../constants/streuMittel';

interface LagerTabProps {
  lagerBestaende: LagerBestaende;
  darkMode: boolean;
  onAdjustLager: (material: StreuMittelId, modus: 'add' | 'sub', menge: number) => void;
}

export default function LagerTab({ lagerBestaende, darkMode, onAdjustLager }: LagerTabProps) {
  const [mengen, setMengen] = useState<Record<StreuMittelId, string>>({
    Salz: '1',
    Splitt: '1',
    Sand: '1',
    Lava: '1',
    Acetat: '1'
  });
  const bgCard = darkMode ? '#22262a' : '#ffffff';
  const textApp = darkMode ? '#f3f4f6' : '#1f2937';
  const textSub = darkMode ? '#9ca3af' : '#6b7280';
  const borderCard = darkMode ? '#374151' : '#e5e7eb';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1 style={{ color: textApp, fontSize: '1.1rem', margin: 0 }}>Streumittel-Lager</h1>
      {STREUMITTEL.map(material => {
        const bestand = lagerBestaende[material.id];
        const knapp = bestand < material.gefahrGrenze;
        return (
          <section key={material.id} style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: `1px solid ${knapp ? '#dc2626' : borderCard}`, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1rem', margin: 0 }}>{material.name}</h2>
              {knapp && <span style={{ flexShrink: 0, backgroundColor: darkMode ? '#3b1f23' : '#fef2f2', color: '#dc2626', border: '1px solid #dc2626', padding: '4px 7px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold' }}>Bestand niedrig</span>}
            </div>
            <div style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', border: `2px solid ${material.farbe}`, padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: material.farbe, textTransform: 'uppercase' }}>Vorrat · Warnschwelle {material.gefahrGrenze} {material.einheit}</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: textApp, margin: '2px 0' }}>
                {bestand.toLocaleString('de-DE', { maximumFractionDigits: 1 })} <span style={{ fontSize: '0.9rem' }}>{material.einheit}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="0.1"
                step="0.1"
                aria-label={`Menge ${material.name} in ${material.einheit}`}
                value={mengen[material.id]}
                onChange={event => setMengen(prev => ({ ...prev, [material.id]: event.target.value }))}
                style={{ width: '92px', padding: '10px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}
              />
              <span style={{ color: textSub, fontSize: '0.75rem', fontWeight: 'bold' }}>{material.einheit}</span>
              <button onClick={() => onAdjustLager(material.id, 'add', Number(mengen[material.id]))} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', padding: '10px 6px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}>
                + Hinzufügen
              </button>
              <button onClick={() => onAdjustLager(material.id, 'sub', Number(mengen[material.id]))} style={{ flex: 1, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px 6px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}>
                − Abziehen
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
