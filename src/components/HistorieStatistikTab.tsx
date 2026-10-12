import type { Dispatch, SetStateAction } from 'react';
import type { EinsatzLog, SaisonArchiv } from '../types';

type AppTab = 'tour' | 'liegenschaften' | 'lager' | 'mehr' | 'kunden' | 'statistik' | 'history_saison';
type StatistikWerte = { anzahl: number; km: number; sprit: string; saecke: number };

interface HistorieStatistikTabProps {
  activeTab: 'statistik' | 'history_saison';
  history: EinsatzLog[];
  saisonName: string;
  heuteDatumString: string;
  heuStat: StatistikWerte;
  gesamtStat: StatistikWerte;
  archivListe: SaisonArchiv[];
  darkMode: boolean;
  textApp: string;
  textSub: string;
  borderCard: string;
  bgCard: string;
  setActiveTab: Dispatch<SetStateAction<AppTab>>;
  exportToCSV: () => void;
  sendeHistorienBericht: (item: EinsatzLog) => void;
  druckeEinsatzBericht: (item: EinsatzLog) => void;
  deleteHistoryItem: (id: number) => void;
  saisonArchivieren: () => void;
  setSaisonName: Dispatch<SetStateAction<string>>;
}

export default function HistorieStatistikTab({
  activeTab,
  history,
  saisonName,
  heuteDatumString,
  heuStat,
  gesamtStat,
  archivListe,
  darkMode,
  textApp,
  textSub,
  borderCard,
  bgCard,
  setActiveTab,
  exportToCSV,
  sendeHistorienBericht,
  druckeEinsatzBericht,
  deleteHistoryItem,
  saisonArchivieren,
  setSaisonName
}: HistorieStatistikTabProps) {
  if (activeTab === 'statistik') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button onClick={() => setActiveTab('mehr')} style={{ background: 'none', border: 'none', color: '#8cc63f', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>
          ← Zurück zu Mehr
        </button>
        <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, color: textApp }}>📊 Einsatz-Statistik</h2>

          <div style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', padding: '12px', borderRadius: '10px', border: '1px solid ' + borderCard }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#8cc63f', margin: '0 0 6px 0', textTransform: 'uppercase' }}>📅 Heute ({heuteDatumString})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.8rem' }}>
              <div>Einsätze: <b>{heuStat.anzahl}</b></div>
              <div>Km: <b>{heuStat.km} km</b></div>
              <div>Sprit: <b>{heuStat.sprit} €</b></div>
              <div>Material: <b>{heuStat.saecke} Säcke</b></div>
            </div>
          </div>

          <div style={{ backgroundColor: darkMode ? '#14171a' : '#f4fce3', padding: '12px', borderRadius: '10px', border: '1px solid #8cc63f' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#598f1e', margin: '0 0 6px 0', textTransform: 'uppercase' }}>📦 Gesamte Saison ({saisonName})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.8rem' }}>
              <div>Einsätze: <b>{gesamtStat.anzahl}</b></div>
              <div>Km: <b>{gesamtStat.km} km</b></div>
              <div>Sprit: <b>{gesamtStat.sprit} €</b></div>
              <div>Material: <b>{gesamtStat.saecke} Säcke</b></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <button onClick={() => setActiveTab('mehr')} style={{ background: 'none', border: 'none', color: '#8cc63f', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>
        ← Zurück zu Mehr
      </button>
      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1.05rem', margin: 0 }}>Einsatz-Historie</h2>
            <p style={{ fontSize: '0.75rem', color: textSub, margin: '2px 0 0 0' }}>Laufende Saison</p>
          </div>
          <button onClick={exportToCSV} style={{ backgroundColor: '#111827', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
            📥 CSV Export
          </button>
        </div>

        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: textSub, padding: '24px 0', fontSize: '0.85rem' }}>Noch keine Einsätze dokumentiert.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map(item => (
              <div key={item.id} style={{ border: '1px solid ' + borderCard, padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#14171a' : '#f9fafb', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 'bold', color: textApp, margin: 0, fontSize: '0.9rem' }}>{item.kundeName} - {item.objName}</h4>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => sendeHistorienBericht(item)} style={{ background: darkMode ? '#22262a' : '#eef6e6', border: '1px solid #8cc63f', color: '#598f1e', padding: '3px 6px', borderRadius: '6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>📤 Senden</button>
                    <button onClick={() => druckeEinsatzBericht(item)} style={{ background: darkMode ? '#22262a' : '#f3f4f6', border: '1px solid ' + borderCard, color: textApp, padding: '3px 6px', borderRadius: '6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ PDF</button>
                    <button onClick={() => deleteHistoryItem(item.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>🗑️</button>
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: textSub }}>{item.date}</span>
                <p style={{ fontSize: '0.75rem', color: textApp, margin: 0 }}>Wetter: <b>{item.wetter}</b> | Typ: <b>{item.type}</b></p>
                {item.hindernisInfo && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold', margin: 0 }}>⚠️ Hindernis: {item.hindernisInfo}</p>}
                <p style={{ fontSize: '0.75rem', color: '#8cc63f', fontWeight: 500, margin: 0 }}>
                  Verbrauch: {item.materialUsed} | Fahrstrecke: <b>{item.kmGefahren}</b> (~{item.spritKosten} Sprit)
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1.05rem', margin: 0 }}>Saison & Archiv</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: textSub }}>Bezeichnung</label>
            <input type="text" value={saisonName} onChange={e => setSaisonName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <button onClick={saisonArchivieren} style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '4px', fontSize: '0.85rem' }}>
            📦 Aktuelle Saison archivieren
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1.05rem', margin: 0 }}>Archivierte Saisons</h2>
        {archivListe.length === 0 ? (
          <p style={{ textAlign: 'center', color: textSub, padding: '12px 0', fontSize: '0.85rem' }}>Noch keine Saisons archiviert.</p>
        ) : (
          archivListe.map(archiv => (
            <div key={archiv.id} style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', border: '1px solid ' + borderCard, borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong style={{ color: textApp, fontSize: '0.9rem' }}>{archiv.name}</strong>
              <span style={{ color: textSub, fontSize: '0.7rem' }}>{archiv.vonDatum} – {archiv.bisDatum}</span>
              <span style={{ color: textSub, fontSize: '0.75rem' }}>{archiv.einsätze.length} Einsätze · {archiv.gesamtKm} km · {archiv.gesamtSaecke} Säcke · {archiv.gesamtSprit.toFixed(2)} € Sprit</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
