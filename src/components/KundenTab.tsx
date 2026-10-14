import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { BevorzugterKanal, Kunde } from '../types';

type AppTab = 'tour' | 'liegenschaften' | 'lager' | 'mehr' | 'kunden' | 'statistik' | 'history_saison';

interface KundenTabProps {
  kunden: Kunde[];
  editingKundeId: number | null;
  editFirma: string;
  setEditFirma: Dispatch<SetStateAction<string>>;
  editEmail: string;
  setEditEmail: Dispatch<SetStateAction<string>>;
  editWhatsapp: string;
  setEditWhatsapp: Dispatch<SetStateAction<string>>;
  editBevorzugterKanal: BevorzugterKanal;
  setEditBevorzugterKanal: Dispatch<SetStateAction<BevorzugterKanal>>;
  neuFirma: string;
  setNeuFirma: Dispatch<SetStateAction<string>>;
  neuEmail: string;
  setNeuEmail: Dispatch<SetStateAction<string>>;
  neuWhatsapp: string;
  setNeuWhatsapp: Dispatch<SetStateAction<string>>;
  neuBevorzugterKanal: BevorzugterKanal;
  setNeuBevorzugterKanal: Dispatch<SetStateAction<BevorzugterKanal>>;
  setEditingKundeId: Dispatch<SetStateAction<number | null>>;
  darkMode: boolean;
  textApp: string;
  textSub: string;
  borderCard: string;
  bgCard: string;
  addKunde: (event: FormEvent<HTMLFormElement>) => void;
  startEditKunde: (kunde: Kunde) => void;
  saveEditKunde: (id: number) => void;
  deleteKunde: (kundeId: number) => void;
  setActiveTab: Dispatch<SetStateAction<AppTab>>;
}

export default function KundenTab({
  kunden,
  editingKundeId,
  editFirma,
  setEditFirma,
  editEmail,
  setEditEmail,
  editWhatsapp,
  setEditWhatsapp,
  editBevorzugterKanal,
  setEditBevorzugterKanal,
  neuFirma,
  setNeuFirma,
  neuEmail,
  setNeuEmail,
  neuWhatsapp,
  setNeuWhatsapp,
  neuBevorzugterKanal,
  setNeuBevorzugterKanal,
  setEditingKundeId,
  darkMode,
  textApp,
  textSub,
  borderCard,
  bgCard,
  addKunde,
  startEditKunde,
  saveEditKunde,
  deleteKunde,
  setActiveTab
}: KundenTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <button onClick={() => setActiveTab('mehr')} style={{ background: 'none', border: 'none', color: '#8cc63f', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>
        ← Zurück zu Mehr
      </button>

      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>👥 Kunden verwalten</h2>
        {kunden.length === 0 ? (
          <p style={{ textAlign: 'center', color: textSub, padding: '12px 0', fontSize: '0.85rem' }}>Noch keine Kunden angelegt.</p>
        ) : (
          kunden.map(kunde => (
            <div key={kunde.id} style={{ border: '1px solid ' + borderCard, borderRadius: '10px', padding: '12px', backgroundColor: darkMode ? '#14171a' : '#f9fafb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {editingKundeId === kunde.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" value={editFirma} onChange={e => setEditFirma(e.target.value)} placeholder="Firmenname" style={{ padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, fontSize: '0.85rem', backgroundColor: bgCard, color: textApp }} />
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="E-Mail" style={{ padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, fontSize: '0.85rem', backgroundColor: bgCard, color: textApp }} />
                  <input type="text" value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} placeholder="WhatsApp" style={{ padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, fontSize: '0.85rem', backgroundColor: bgCard, color: textApp }} />
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: textSub }}>
                    Bevorzugte Rückmeldung
                    <select value={editBevorzugterKanal} onChange={e => setEditBevorzugterKanal(e.target.value as BevorzugterKanal)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, fontSize: '0.85rem', backgroundColor: bgCard, color: textApp }}>
                      <option value="whatsapp">💬 WhatsApp</option>
                      <option value="email">✉️ E-Mail</option>
                      <option value="keine">🔕 Keine Meldung</option>
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={() => saveEditKunde(kunde.id)} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>Speichern</button>
                    <button onClick={() => setEditingKundeId(null)} style={{ flex: 1, backgroundColor: darkMode ? '#374151' : '#e5e7eb', color: textApp, border: 'none', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: 0, color: textApp }}>{kunde.firma}</h3>
                    <p style={{ fontSize: '0.75rem', color: textSub, margin: '2px 0 0 0' }}>✉ {kunde.email || 'Keine E-Mail'} | 📞 {kunde.whatsapp || 'Keine Nummer'}</p>
                    <p style={{ fontSize: '0.7rem', color: textSub, margin: '3px 0 0 0' }}>
                      Bevorzugte Rückmeldung: {kunde.bevorzugterKanal === 'email' ? '✉️ E-Mail' : kunde.bevorzugterKanal === 'keine' ? '🔕 Keine Meldung' : '💬 WhatsApp'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startEditKunde(kunde)} style={{ flex: 1, backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
                      ✏️ Bearbeiten
                    </button>
                    <button onClick={() => deleteKunde(kunde.id)} style={{ flex: 1, backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
                      🗑️ Löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>➕ Neuen Kunden anlegen</h2>
        <form onSubmit={addKunde} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Firmenname / Auftraggeber</label>
            <input type="text" value={neuFirma} onChange={e => setNeuFirma(e.target.value)} required placeholder="z.B. Neuer Kunde GmbH" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>E-Mail für Berichte</label>
            <input type="email" value={neuEmail} onChange={e => setNeuEmail(e.target.value)} required placeholder="kontakt@neuerkunde.de" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>WhatsApp-Nummer</label>
            <input type="text" value={neuWhatsapp} onChange={e => setNeuWhatsapp(e.target.value)} placeholder="+49151..." style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Bevorzugte Rückmeldung</label>
            <select value={neuBevorzugterKanal} onChange={e => setNeuBevorzugterKanal(e.target.value as BevorzugterKanal)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }}>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="email">✉️ E-Mail</option>
              <option value="keine">🔕 Keine Meldung</option>
            </select>
          </div>
          <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Kunden speichern</button>
        </form>
      </div>
    </div>
  );
}
