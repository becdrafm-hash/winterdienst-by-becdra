import type { Dispatch, FormEvent, SetStateAction } from 'react';

interface LagerTabProps {
  editingStartPunkt: string;
  setEditingStartPunkt: Dispatch<SetStateAction<string>>;
  editingSpritPreis: string;
  setEditingSpritPreis: Dispatch<SetStateAction<string>>;
  editingVerbrauch: string;
  setEditingVerbrauch: Dispatch<SetStateAction<string>>;
  lagerBestand: number;
  lagerAnzahlInput: string;
  setLagerAnzahlInput: Dispatch<SetStateAction<string>>;
  darkMode: boolean;
  onSaveStartpunkt: (event: FormEvent<HTMLFormElement>) => void;
  onSaveSpritPreis: (event: FormEvent<HTMLFormElement>) => void;
  onSaveVerbrauch: (event: FormEvent<HTMLFormElement>) => void;
  onAdjustLager: (modus: 'add' | 'sub') => void;
}

export default function LagerTab({
  editingStartPunkt,
  setEditingStartPunkt,
  editingSpritPreis,
  setEditingSpritPreis,
  editingVerbrauch,
  setEditingVerbrauch,
  lagerBestand,
  lagerAnzahlInput,
  setLagerAnzahlInput,
  darkMode,
  onSaveStartpunkt,
  onSaveSpritPreis,
  onSaveVerbrauch,
  onAdjustLager
}: LagerTabProps) {
  const bgCard = darkMode ? '#22262a' : '#ffffff';
  const textApp = darkMode ? '#f3f4f6' : '#1f2937';
  const borderCard = darkMode ? '#374151' : '#e5e7eb';
  const textSub = darkMode ? '#9ca3af' : '#6b7280';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>🏠 Startpunkt / Basis festlegen</h2>
        <form onSubmit={onSaveStartpunkt} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Adresse für Start / Lager</label>
            <input type="text" value={editingStartPunkt} onChange={e => setEditingStartPunkt(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Startpunkt speichern</button>
        </form>
      </div>

      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>⛽ Spritpreis anpassen</h2>
        <form onSubmit={onSaveSpritPreis} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Preis pro Liter (€)</label>
            <input type="number" step="0.01" value={editingSpritPreis} onChange={e => setEditingSpritPreis(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Spritpreis speichern</button>
        </form>
      </div>

      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>🚗 Fahrzeugverbrauch anpassen</h2>
        <form onSubmit={onSaveVerbrauch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Verbrauch (Liter auf 100 km)</label>
            <input type="number" min="0.1" step="0.1" value={editingVerbrauch} onChange={e => setEditingVerbrauch(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Verbrauch speichern</button>
        </form>
      </div>

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
