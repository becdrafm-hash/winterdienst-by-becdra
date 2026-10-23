import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { STREUMITTEL } from '../constants/streuMittel';
import type { EinsatzKostenAnalyse, EinsatzLog, MaterialEinkaufspreise, SaisonArchiv } from '../types';
import { datumAlsIso } from '../utils/saisonZeitraum';
import { formatiereEinsatzZeitfenster } from '../utils/einsatzZeiten';

type AppTab = 'tour' | 'liegenschaften' | 'lager' | 'mehr' | 'kunden' | 'statistik' | 'history_saison' | 'garten';
type StatistikWerte = { anzahl: number; km: number; sprit: string; materialKg: number };
type UnterTab = 'heute' | 'statistik' | 'verlauf';

function materialverbrauch(einsatz: EinsatzLog): { menge: number; einheit: string } | null {
  if (einsatz.materialUsed.includes('Sack') && einsatz.materialVerbrauchEinheit === undefined) {
    const sackMatch = einsatz.materialUsed.match(/^([\d.,]+)/);
    if (!sackMatch) return null;
    const sackAnzahl = Number(sackMatch[1].replace(',', '.'));
    return Number.isFinite(sackAnzahl) ? { menge: sackAnzahl * 25, einheit: 'kg' } : null;
  }

  const einheit = einsatz.materialVerbrauchEinheit
    ?? (einsatz.materialUsed.match(/\b(Liter|kg)\b/i)?.[0] ?? 'kg');
  if (typeof einsatz.materialVerbrauchKg === 'number' && Number.isFinite(einsatz.materialVerbrauchKg)) {
    return { menge: einsatz.materialVerbrauchKg, einheit };
  }

  const match = einsatz.materialUsed.match(/^([\d.,]+)/);
  if (!match) return null;
  const menge = Number(match[1].replace(',', '.'));
  return Number.isFinite(menge) ? { menge, einheit } : null;
}

interface HistorieStatistikTabProps {
  activeTab: 'statistik' | 'history_saison' | 'garten';
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
  saisonVon: string;
  setSaisonVon: Dispatch<SetStateAction<string>>;
  saisonBis: string;
  setSaisonBis: Dispatch<SetStateAction<string>>;
  verbrauchAuf100Km: number;
  spritPreisProLiter: number;
  materialPreise: MaterialEinkaufspreise;
}

export default function HistorieStatistikTab({
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
  setSaisonName,
  saisonVon,
  setSaisonVon,
  saisonBis,
  setSaisonBis,
  verbrauchAuf100Km,
  spritPreisProLiter,
  materialPreise
}: HistorieStatistikTabProps) {
  const [unterTab, setUnterTab] = useState<UnterTab>('heute');
  const [alleVerlaufseintraegeAnzeigen, setAlleVerlaufseintraegeAnzeigen] = useState(false);
  const [ausgewaehltesArchivId, setAusgewaehltesArchivId] = useState<number | null>(null);
  const [heuteIso, setHeuteIso] = useState(() => datumAlsIso(new Date()));

  useEffect(() => {
    const jetzt = new Date();
    const mitternacht = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1);
    const timer = window.setTimeout(() => setHeuteIso(datumAlsIso(new Date())), mitternacht.getTime() - jetzt.getTime());
    return () => window.clearTimeout(timer);
  }, [heuteIso]);

  const heuteEinsaetze = history.filter(einsatz => einsatz.date.startsWith(heuteDatumString));
  const heutigeIds = new Set(heuteEinsaetze.map(einsatz => einsatz.id));
  const verlauf = history
    .filter(einsatz => !heutigeIds.has(einsatz.id))
    .sort((a, b) => b.timestamp - a.timestamp);
  const sichtbarerVerlauf = alleVerlaufseintraegeAnzeigen ? verlauf : verlauf.slice(0, 10);
  const alleEinsaetze = (() => {
    const einsaetzeNachId = new Map<number, EinsatzLog>();
    [...history, ...archivListe.flatMap(archiv => archiv.einsätze)]
      .forEach(einsatz => einsaetzeNachId.set(einsatz.id, einsatz));
    return [...einsaetzeNachId.values()];
  })();
  const kostenAnalyse = alleEinsaetze.reduce<EinsatzKostenAnalyse[]>((auswertung, einsatz) => {
    const kilometer = Number.parseFloat(einsatz.kmGefahren.replace(',', '.')) || 0;
    const verbrauch = materialverbrauch(einsatz);
    const verbrauchJe100Km = einsatz.verbrauchAuf100Km ?? verbrauchAuf100Km;
    const preisProLiter = einsatz.spritPreisProLiter ?? spritPreisProLiter;
    const materialInfo = einsatz.materialId
      ? STREUMITTEL.find(material => material.id === einsatz.materialId)
      : STREUMITTEL.slice().sort((a, b) => b.name.length - a.name.length)
        .find(material => einsatz.materialUsed.includes(material.name))
        ?? STREUMITTEL.find(material => new RegExp(`\\b${material.id}\\b`, 'i').test(einsatz.materialUsed));
    const aktuellerMaterialpreis = materialInfo ? materialPreise[materialInfo.id] : undefined;
    const preisProMaterialEinheit = einsatz.materialPreisProEinheit
      ?? (aktuellerMaterialpreis
        && ((materialInfo?.einheit === 'Liter' && aktuellerMaterialpreis.basis === 'liter')
          || (materialInfo?.einheit === 'kg' && aktuellerMaterialpreis.basis !== 'liter'))
        ? aktuellerMaterialpreis.basis === 'sack25kg'
          ? aktuellerMaterialpreis.betrag / 25
          : aktuellerMaterialpreis.basis === 'tonne'
            ? aktuellerMaterialpreis.betrag / 1000
            : aktuellerMaterialpreis.betrag
        : undefined);
    const materialMenge = einsatz.materialVerbrauchMenge ?? verbrauch?.menge ?? 0;
    let objekt = auswertung.find(wert => wert.kundeName === einsatz.kundeName && wert.objName === einsatz.objName);
    if (!objekt) {
      objekt = {
        kundeName: einsatz.kundeName,
        objName: einsatz.objName,
        anzahlEinsaetze: 0,
        kilometer: 0,
        spritKosten: 0,
        materialKg: 0,
        materialLiter: 0,
        saecke: 0,
        materialKosten: 0
      };
      auswertung.push(objekt);
    }
    objekt.anzahlEinsaetze += 1;
    objekt.kilometer += kilometer;
    objekt.spritKosten += kilometer * Math.max(0, verbrauchJe100Km) / 100 * Math.max(0, preisProLiter);
    if (preisProMaterialEinheit !== undefined) {
      objekt.materialKosten += materialMenge * Math.max(0, preisProMaterialEinheit);
    }
    if (verbrauch?.einheit.toLowerCase() === 'liter') {
      objekt.materialLiter += materialMenge;
    } else if (verbrauch || einsatz.materialVerbrauchMenge !== undefined) {
      objekt.materialKg += materialMenge;
      objekt.saecke += materialMenge / 25;
    }
    return auswertung;
  }, []).sort((a, b) =>
    a.kundeName.localeCompare(b.kundeName, 'de') || a.objName.localeCompare(b.objName, 'de')
  );
  const saisonHinweisAnzeigen = /^\d{4}-\d{2}-\d{2}$/.test(saisonBis)
    && heuteIso > saisonBis
    && history.length > 0;
  const ausgewaehltesArchiv = archivListe.find(archiv => archiv.id === ausgewaehltesArchivId) ?? null;
  const archivVerbrauchNachEinheit = ausgewaehltesArchiv?.einsätze.reduce<Record<string, number>>((summen, einsatz) => {
    const verbrauch = materialverbrauch(einsatz);
    if (verbrauch) summen[verbrauch.einheit] = (summen[verbrauch.einheit] ?? 0) + verbrauch.menge;
    return summen;
  }, {}) ?? {};

  const zeigeEinsatzkarte = (item: EinsatzLog) => (
    <article key={item.id} style={{ border: '1px solid ' + borderCard, padding: '10px', borderRadius: '10px', backgroundColor: darkMode ? '#14171a' : '#f9fafb', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <h4 style={{ fontWeight: 'bold', color: textApp, margin: 0, fontSize: '0.9rem' }}>{item.kundeName} – {item.objName}</h4>
          <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: textSub }}>{item.date}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button onClick={() => sendeHistorienBericht(item)} style={{ background: darkMode ? '#22262a' : '#eef6e6', border: '1px solid #8cc63f', color: '#598f1e', padding: '5px 7px', borderRadius: '6px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' }}>📤 Senden</button>
          <button onClick={() => druckeEinsatzBericht(item)} style={{ background: darkMode ? '#22262a' : '#f3f4f6', border: '1px solid ' + borderCard, color: textApp, padding: '5px 7px', borderRadius: '6px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ PDF</button>
          <button aria-label="Einsatz löschen" onClick={() => deleteHistoryItem(item.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>🗑️</button>
        </div>
      </div>
      <p style={{ fontSize: '0.75rem', color: textApp, margin: 0 }}>
        Einsatzzeit: <b>{formatiereEinsatzZeitfenster(item.startTimestamp, item.endTimestamp ?? item.timestamp)}</b>
      </p>
      {item.berichtStatus === 'keine_meldung_gewuenscht' ? (
        <span style={{ alignSelf: 'flex-start', backgroundColor: darkMode ? '#374151' : '#f3f4f6', borderRadius: '6px', color: textSub, fontSize: '0.65rem', fontWeight: 600, padding: '3px 6px' }}>
          🔕 Keine Kundenmeldung gewünscht
        </span>
      ) : item.berichtStatus === 'gesendet_whatsapp'
        || item.berichtStatus === 'gesendet_email'
        || item.berichtStatus === 'gesendet_teilen' ? (
          <span style={{ alignSelf: 'flex-start', backgroundColor: darkMode ? '#1d2b1b' : '#f4fce3', borderRadius: '6px', color: darkMode ? '#a3d977' : '#3f6212', fontSize: '0.65rem', fontWeight: 600, padding: '3px 6px' }}>
            ✓ Gemeldet ({item.berichtStatus === 'gesendet_whatsapp' ? 'WhatsApp' : item.berichtStatus === 'gesendet_email' ? 'E-Mail' : 'Teilen'}{item.berichtGesendetAm ? `, ${item.berichtGesendetAm}` : ''})
          </span>
        ) : (
          <span style={{ alignSelf: 'flex-start', backgroundColor: darkMode ? '#3b2f16' : '#fff7ed', borderRadius: '6px', color: darkMode ? '#fbbf24' : '#b45309', fontSize: '0.65rem', fontWeight: 600, padding: '3px 6px' }}>
            ⏳ Rückmeldung noch offen
          </span>
        )}
      <p style={{ fontSize: '0.75rem', color: textApp, margin: 0 }}>Wetter: <b>{item.wetter}</b> | Typ: <b>{item.type}</b></p>
      {item.hindernisInfo && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold', margin: 0 }}>⚠️ Hindernis: {item.hindernisInfo}</p>}
      <p style={{ fontSize: '0.75rem', color: '#8cc63f', fontWeight: 500, margin: 0 }}>
        Verbrauch: {item.materialUsed} | Fahrstrecke: <b>{item.kmGefahren}</b> (~{item.spritKosten} Sprit)
      </p>
    </article>
  );

  const exportiereArchivAlsCsv = (archiv: SaisonArchiv) => {
    const csvWert = (wert: string | number | undefined) => `"${String(wert ?? '').replaceAll('"', '""')}"`;
    const zeilen = [
      ['Kunde', 'Liegenschaft', 'Datum', 'Startzeit', 'Endzeit', 'Einsatzzeit', 'Wetter', 'Wetter vor Ort', 'Leistungsart', 'Material', 'Verbrauch', 'Einheit', 'Echte Arbeitszeit (Min., intern)', 'Kilometer', 'Spritkosten', 'Besonderheiten/Hindernisse', 'Hindernisfoto'],
      ...archiv.einsätze.map(einsatz => [
        einsatz.kundeName,
        einsatz.objName,
        einsatz.date,
        einsatz.startTimestamp === undefined ? 'Nicht erfasst' : new Date(einsatz.startTimestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        new Date(einsatz.endTimestamp ?? einsatz.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        formatiereEinsatzZeitfenster(einsatz.startTimestamp, einsatz.endTimestamp ?? einsatz.timestamp),
        einsatz.wetter,
        einsatz.wetterVorOrt,
        einsatz.type,
        einsatz.materialUsed,
        materialverbrauch(einsatz)?.menge,
        materialverbrauch(einsatz)?.einheit,
        einsatz.echteMinuten,
        einsatz.kmGefahren,
        einsatz.spritKosten,
        einsatz.hindernisInfo,
        einsatz.hindernisFoto
      ])
    ];
    const csv = `\uFEFF${zeilen.map(zeile => zeile.map(csvWert).join(';')).join('\r\n')}`;
    const datei = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(datei);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${archiv.name.replace(/[<>:"/\\|?*]+/g, '_')}_Einsaetze.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const unterTabs: { id: UnterTab; label: string }[] = [
    { id: 'heute', label: `📅 Heute (${heuteEinsaetze.length})` },
    { id: 'statistik', label: '📊 Statistik' },
    { id: 'verlauf', label: '🗄️ Verlauf & Archiv' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <nav aria-label="Tagesberichte, Statistik und Verlauf" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '4px', padding: '4px', borderRadius: '12px', backgroundColor: darkMode ? '#14171a' : '#e5e7eb', border: '1px solid ' + borderCard }}>
        {unterTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={unterTab === tab.id}
            onClick={() => setUnterTab(tab.id)}
            style={{
              minHeight: '44px',
              padding: '8px 5px',
              border: 'none',
              borderRadius: '9px',
              backgroundColor: unterTab === tab.id ? (darkMode ? '#29331f' : '#ffffff') : 'transparent',
              color: unterTab === tab.id ? (darkMode ? '#a3d977' : '#3f6212') : textSub,
              boxShadow: unterTab === tab.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              fontWeight: unterTab === tab.id ? 700 : 600,
              fontSize: '0.7rem',
              lineHeight: 1.2,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {unterTab === 'heute' && (
        <>
          <section style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '14px', border: '1px solid ' + borderCard, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1rem', margin: 0 }}>📅 Tagesberichte · {heuteDatumString}</h2>
            {heuteEinsaetze.length === 0 ? (
              <p style={{ textAlign: 'center', color: textSub, backgroundColor: darkMode ? '#14171a' : '#f9fafb', border: '1px solid ' + borderCard, borderRadius: '10px', padding: '16px 10px', fontSize: '0.85rem', margin: 0 }}>
                Heute noch keine Einsätze abgeschlossen.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {heuteEinsaetze.map(zeigeEinsatzkarte)}
              </div>
            )}
          </section>
          <button onClick={() => setActiveTab('mehr')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#598f1e', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>
            ← Zurück zu Mehr
          </button>
        </>
      )}

      {unterTab === 'statistik' && (
        <>
          <section style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '14px', border: '1px solid ' + borderCard }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: '0 0 10px', color: textApp }}>📊 Heute</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', color: textApp }}>
              <div>Einsätze: <b>{heuStat.anzahl}</b></div>
              <div>Strecke: <b>{heuStat.km} km</b></div>
              <div>Sprit: <b>{heuStat.sprit} €</b></div>
              <div>Streumittel: <b>{heuStat.materialKg.toLocaleString('de-DE')} kg</b></div>
            </div>
          </section>
          <section style={{ backgroundColor: darkMode ? '#14171a' : '#f4fce3', padding: '14px', borderRadius: '14px', border: '1px solid #8cc63f' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: '0 0 10px', color: textApp }}>📦 Laufende Saison · {saisonName}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', color: textApp }}>
              <div>Einsätze: <b>{gesamtStat.anzahl}</b></div>
              <div>Strecke: <b>{gesamtStat.km} km</b></div>
              <div>Sprit: <b>{gesamtStat.sprit} €</b></div>
              <div>Streumittel: <b>{gesamtStat.materialKg.toLocaleString('de-DE')} kg</b></div>
            </div>
          </section>
          <section style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '14px', border: '1px solid ' + borderCard, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: 0, color: textApp }}>💶 Kosten nach Kunde & Liegenschaft</h2>
            <p style={{ color: textSub, fontSize: '0.7rem', lineHeight: 1.4, margin: 0 }}>
              Spritkosten werden aus Strecke, Verbrauch und Spritpreis berechnet. Bei neuen Einträgen gelten die zum Einsatzzeitpunkt gespeicherten Werte; ältere Einträge verwenden die aktuellen Einstellungen. Streumittel wird zusätzlich als Sack-Äquivalent (25 kg) ausgewiesen.
            </p>
            {kostenAnalyse.length === 0 ? (
              <p style={{ color: textSub, fontSize: '0.78rem', margin: 0 }}>Noch keine Einsatzdaten für eine Kostenanalyse vorhanden.</p>
            ) : (
              [...new Set(kostenAnalyse.map(eintrag => eintrag.kundeName))].map(kundeName => {
                const kundenWerte = kostenAnalyse.filter(eintrag => eintrag.kundeName === kundeName);
                const einsaetze = kundenWerte.reduce((summe, eintrag) => summe + eintrag.anzahlEinsaetze, 0);
                const kilometer = kundenWerte.reduce((summe, eintrag) => summe + eintrag.kilometer, 0);
                const spritkosten = kundenWerte.reduce((summe, eintrag) => summe + eintrag.spritKosten, 0);
                const materialKg = kundenWerte.reduce((summe, eintrag) => summe + eintrag.materialKg, 0);
                const saecke = kundenWerte.reduce((summe, eintrag) => summe + eintrag.saecke, 0);
                const liter = kundenWerte.reduce((summe, eintrag) => summe + eintrag.materialLiter, 0);
                const materialKosten = kundenWerte.reduce((summe, eintrag) => summe + eintrag.materialKosten, 0);
                return (
                  <details key={kundeName} style={{ border: '1px solid ' + borderCard, borderRadius: '9px', padding: '9px', backgroundColor: darkMode ? '#14171a' : '#f9fafb' }}>
                    <summary style={{ cursor: 'pointer', color: textApp, fontSize: '0.78rem', fontWeight: 700 }}>
                      {kundeName} · {einsaetze} Einsätze · {kilometer.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km · Sprit {spritkosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} · Material {materialKosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} · {materialKg.toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg ({saecke.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Säcke){liter > 0 ? ` · ${liter.toLocaleString('de-DE', { maximumFractionDigits: 1 })} l` : ''}
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '9px' }}>
                      {kundenWerte.map(eintrag => (
                        <div key={eintrag.objName} style={{ borderTop: '1px solid ' + borderCard, paddingTop: '7px', color: textApp, fontSize: '0.72rem' }}>
                          <strong>{eintrag.objName}</strong>
                          <div style={{ color: textSub, marginTop: '3px', lineHeight: 1.5 }}>
                            {eintrag.anzahlEinsaetze} Einsätze · {eintrag.kilometer.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km · {eintrag.spritKosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </div>
                          <div style={{ color: textSub, lineHeight: 1.5 }}>
                            Streumittel: {eintrag.materialKg.toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg ({eintrag.saecke.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Säcke){eintrag.materialLiter > 0 ? ` · ${eintrag.materialLiter.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Liter` : ''}
                          </div>
                          <div style={{ color: textSub, lineHeight: 1.5 }}>
                            Kosten: {eintrag.spritKosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} Sprit · {eintrag.materialKosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} Material
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })
            )}
          </section>
          <button onClick={() => setActiveTab('mehr')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#598f1e', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>
            ← Zurück zu Mehr
          </button>
        </>
      )}

      {unterTab === 'verlauf' && (
        <>
          {saisonHinweisAnzeigen && (
            <aside role="status" style={{ backgroundColor: darkMode ? '#292319' : '#fffbeb', border: '1px solid #f59e0b', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <strong style={{ color: darkMode ? '#fbbf24' : '#92400e', fontSize: '0.82rem' }}>🗓️ Die Wintersaison ist vorbei.</strong>
              <span style={{ color: textApp, fontSize: '0.75rem', lineHeight: 1.4 }}>Möchtest du die Einsätze jetzt ins Archiv verschieben und die neue Saison vorbereiten?</span>
              <button type="button" onClick={saisonArchivieren} style={{ alignSelf: 'flex-start', backgroundColor: '#f59e0b', color: '#111827', border: 'none', borderRadius: '7px', padding: '8px 10px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                Winterdienst-Saison archivieren
              </button>
            </aside>
          )}
          <section style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '14px', border: '1px solid ' + borderCard, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div>
                <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1rem', margin: 0 }}>🗄️ Verlauf</h2>
                <p style={{ fontSize: '0.72rem', color: textSub, margin: '3px 0 0' }}>Ältere Einsätze dieser Saison</p>
              </div>
              <button onClick={exportToCSV} style={{ backgroundColor: '#111827', color: '#ffffff', border: 'none', padding: '9px 11px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', minHeight: '40px', flexShrink: 0 }}>
                📥 CSV Export
              </button>
            </div>
            {verlauf.length === 0 ? (
              <p style={{ textAlign: 'center', color: textSub, padding: '12px 0', fontSize: '0.85rem', margin: 0 }}>Noch keine älteren Einsätze vorhanden.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sichtbarerVerlauf.map(zeigeEinsatzkarte)}
                </div>
                {verlauf.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setAlleVerlaufseintraegeAnzeigen(wert => !wert)}
                    style={{ backgroundColor: darkMode ? '#22262a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {alleVerlaufseintraegeAnzeigen ? 'Weniger anzeigen' : `Alle anzeigen (${verlauf.length - 10} weitere)`}
                  </button>
                )}
              </>
            )}
          </section>

          <section style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '14px', border: '1px solid ' + borderCard, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1rem', margin: 0 }}>📦 Winterdienst-Saison abschließen & Archiv</h2>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: textSub }}>
              Saisonbezeichnung
              <input type="text" value={saisonName} onChange={event => setSaisonName(event.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '9px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: textSub }}>
                Saison von
                <input type="date" value={saisonVon} onChange={event => setSaisonVon(event.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '9px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.78rem' }} />
              </label>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: textSub }}>
                Saison bis
                <input type="date" value={saisonBis} onChange={event => setSaisonBis(event.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '9px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.78rem' }} />
              </label>
            </div>
            <button onClick={saisonArchivieren} style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
              📦 Winterdienst-Winterdienst-Saison archivieren
            </button>
          </section>

          <section style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '14px', border: '1px solid ' + borderCard, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1rem', margin: 0 }}>Archivierte Saisons</h2>
            {archivListe.length === 0 ? (
              <p style={{ textAlign: 'center', color: textSub, padding: '8px 0', fontSize: '0.82rem', margin: 0 }}>Noch keine Saisons archiviert.</p>
            ) : (
              archivListe.map(archiv => (
                <button key={archiv.id} type="button" onClick={() => setAusgewaehltesArchivId(archiv.id)} style={{ width: '100%', textAlign: 'left', backgroundColor: darkMode ? '#14171a' : '#f9fafb', border: '1px solid ' + borderCard, borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}>
                  <strong style={{ color: textApp, fontSize: '0.9rem' }}>{archiv.name}</strong>
                  <span style={{ color: textSub, fontSize: '0.7rem' }}>{archiv.vonDatum} – {archiv.bisDatum}</span>
                  <span style={{ color: textSub, fontSize: '0.75rem' }}>{archiv.einsätze.length} Einsätze · {archiv.gesamtKm} km · {(archiv.gesamtMaterialKg ?? archiv.gesamtSaecke * 25).toLocaleString('de-DE')} kg · {archiv.gesamtSprit.toFixed(2)} € Sprit</span>
                  <span style={{ color: '#598f1e', fontSize: '0.7rem', fontWeight: 'bold', marginTop: '2px' }}>Protokolle ansehen →</span>
                </button>
              ))
            )}
          </section>
          <button onClick={() => setActiveTab('mehr')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#598f1e', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>
            ← Zurück zu Mehr
          </button>
        </>
      )}

      {ausgewaehltesArchiv && (
        <div role="presentation" onClick={() => setAusgewaehltesArchivId(null)} style={{ position: 'fixed', inset: 0, zIndex: 5000, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'max(16px, env(safe-area-inset-top)) 16px calc(90px + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="archiv-detail-titel"
            onClick={event => event.stopPropagation()}
            style={{ backgroundColor: bgCard, color: textApp, border: '2px solid #8cc63f', borderRadius: '16px', width: '100%', maxWidth: '440px', maxHeight: '100%', padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <h2 id="archiv-detail-titel" style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>{ausgewaehltesArchiv.name}</h2>
                <p style={{ color: textSub, fontSize: '0.72rem', margin: '4px 0 0' }}>{ausgewaehltesArchiv.vonDatum} – {ausgewaehltesArchiv.bisDatum}</p>
              </div>
              <button type="button" aria-label="Archivdetails schließen" onClick={() => setAusgewaehltesArchivId(null)} style={{ flexShrink: 0, background: 'none', border: '1px solid ' + borderCard, borderRadius: '7px', color: textApp, padding: '5px 9px', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: textSub }}>
                {ausgewaehltesArchiv.einsätze.length} Einsätze · Material: {Object.entries(archivVerbrauchNachEinheit).map(([einheit, menge]) => `${menge.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${einheit}`).join(' + ') || '0'}
              </span>
              <button type="button" onClick={() => exportiereArchivAlsCsv(ausgewaehltesArchiv)} style={{ backgroundColor: '#8cc63f', color: '#111827', border: 'none', borderRadius: '8px', padding: '8px 10px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}>
                📥 Saison als CSV exportieren
              </button>
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
              {ausgewaehltesArchiv.einsätze.length === 0 ? (
                <p style={{ color: textSub, textAlign: 'center', fontSize: '0.8rem', padding: '16px' }}>Diese Saison enthält keine Einsatzprotokolle.</p>
              ) : ausgewaehltesArchiv.einsätze.slice().sort((a, b) => b.timestamp - a.timestamp).map(einsatz => (
                <article key={einsatz.id} style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', border: '1px solid ' + borderCard, borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <strong style={{ color: textApp, fontSize: '0.8rem' }}>{einsatz.objName}</strong>
                  <span style={{ color: textSub, fontSize: '0.68rem' }}>{einsatz.kundeName} · {einsatz.date}</span>
                  <span style={{ color: textApp, fontSize: '0.73rem' }}>Leistung: <b>{einsatz.type}</b></span>
                  <span style={{ color: textApp, fontSize: '0.73rem' }}>Materialverbrauch: <b>{einsatz.materialUsed}</b></span>
                  <span style={{ color: textApp, fontSize: '0.73rem' }}>Einsatzzeit: <b>{formatiereEinsatzZeitfenster(einsatz.startTimestamp, einsatz.endTimestamp ?? einsatz.timestamp)}</b></span>
                  <span style={{ color: textSub, fontSize: '0.7rem' }}>Wetter: {einsatz.wetterVorOrt || einsatz.wetter}</span>
                  {einsatz.hindernisInfo && <span style={{ color: '#dc2626', fontSize: '0.7rem' }}>⚠️ Besonderheiten: {einsatz.hindernisInfo}</span>}
                  {einsatz.hindernisFoto && <span style={{ color: textSub, fontSize: '0.68rem' }}>Hindernisfoto: {einsatz.hindernisFoto}</span>}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
