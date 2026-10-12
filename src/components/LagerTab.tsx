import type { Dispatch, SetStateAction } from 'react';

interface LagerTabProps {
  lagerBestand: number;
  lagerAnzahlInput: string;
  setLagerAnzahlInput: Dispatch<SetStateAction<string>>;
  darkMode: boolean;
  onAdjustLager: (modus: 'add' | 'sub') => void;
}

export default function LagerTab({
  lagerBestand,
  lagerAnzahlInput,
  setLagerAnzahlInput,
  darkMode,
  onAdjustLager
}: LagerTabProps) {
  const bgCard = darkMode ? '#22262a' : '#ffffff';
  const textApp = darkMode ? '#f3f4f6' : '#1f2937';
  const borderCard = darkMode ? '#374151' : '#e5e7eb';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1rem', margin: 0 }}>Streusalz Lager</h2>
        <div style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', border: '2px solid #8cc63f', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8cc63f', textTransform: 'uppercase' }}>Streusalz Vorrat</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: textApp, margin: '2px 0' }}>{Math.floor(lagerBestand)} <span style={{ fontSize: '0.9rem' }}>Säcke</span></div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            min="1"
            value={lagerAnzahlInput}
            onChange={e => setLagerAnzahlInput(e.target.value)}
            style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}
          />
          <button onClick={() => onAdjustLager('add')} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>
            + Hinzufügen
          </button>
          <button onClick={() => onAdjustLager('sub')} style={{ flex: 1, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>
            - Abziehen
          </button>
        </div>
      </div>
    </div>
  );
}
