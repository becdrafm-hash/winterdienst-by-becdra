import { useState } from 'react';
import type { LagerBestaende, StreuMittelId } from '../constants/streuMittel';
import { STREUMITTEL } from '../constants/streuMittel';
import type { MaterialEinkaufspreis, MaterialEinkaufspreise, MaterialPreisBasis } from '../types';

interface LagerTabProps {
  lagerBestaende: LagerBestaende;
  materialPreise: MaterialEinkaufspreise;
  darkMode: boolean;
  onAdjustLager: (material: StreuMittelId, modus: 'add' | 'sub', menge: number, preis?: MaterialEinkaufspreis) => void;
}

const STANDARD_BASIS: Record<StreuMittelId, MaterialPreisBasis> = {
  Salz: 'sack25kg',
  Splitt: 'sack25kg',
  Sand: 'sack25kg',
  Lava: 'sack25kg',
  Acetat: 'liter'
};

export default function LagerTab({ lagerBestaende, materialPreise, darkMode, onAdjustLager }: LagerTabProps) {
  const [mengen, setMengen] = useState<Record<StreuMittelId, string>>({
    Salz: '1',
    Splitt: '1',
    Sand: '1',
    Lava: '1',
    Acetat: '1'
  });
  const [preise, setPreise] = useState<Record<StreuMittelId, string>>({
    Salz: '',
    Splitt: '',
    Sand: '',
    Lava: '',
    Acetat: ''
  });
  const [preisBasis, setPreisBasis] = useState<Record<StreuMittelId, MaterialPreisBasis>>(() =>
    STREUMITTEL.reduce((basen, material) => {
      basen[material.id] = materialPreise[material.id]?.basis ?? STANDARD_BASIS[material.id];
      return basen;
    }, { ...STANDARD_BASIS })
  );
  const bgCard = darkMode ? '#22262a' : '#ffffff';
  const textApp = darkMode ? '#f3f4f6' : '#1f2937';
  const textSub = darkMode ? '#9ca3af' : '#6b7280';
  const borderCard = darkMode ? '#374151' : '#e5e7eb';

  const speicherePreisBasis = (materialId: StreuMittelId, basis: MaterialPreisBasis) => {
    setPreisBasis(prev => ({ ...prev, [materialId]: basis }));
  };

  const materialEingabe = (material: typeof STREUMITTEL[number], prominent: boolean) => {
    const bestand = lagerBestaende[material.id];
    const knapp = bestand < material.gefahrGrenze;
    const aktuellePreisInfo = materialPreise[material.id];
    const basis = preisBasis[material.id];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: prominent ? '12px' : '8px', padding: prominent ? '14px' : '10px', borderRadius: prominent ? '12px' : '0 0 10px 10px', backgroundColor: bgCard, border: prominent ? `2px solid ${knapp ? '#dc2626' : material.farbe}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: darkMode ? '#14171a' : '#f9fafb', borderLeft: `4px solid ${material.farbe}`, padding: prominent ? '12px' : '8px', borderRadius: '8px' }}>
          <div>
            <span style={{ display: 'block', fontSize: prominent ? '0.7rem' : '0.62rem', color: textSub }}>Aktueller Bestand</span>
            <strong style={{ fontSize: prominent ? '2rem' : '1.15rem', lineHeight: 1.1, color: textApp }}>
              {bestand.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
            </strong>
            <span style={{ color: textSub, fontSize: prominent ? '0.85rem' : '0.7rem', marginLeft: '5px' }}>{material.einheit}</span>
            {aktuellePreisInfo && (
              <span style={{ display: 'block', color: textSub, fontSize: '0.65rem', marginTop: '3px' }}>
                Einkauf: {aktuellePreisInfo.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / {aktuellePreisInfo.basis === 'sack25kg' ? '25 kg' : aktuellePreisInfo.basis === 'tonne' ? 'Tonne' : 'Liter'}
              </span>
            )}
          </div>
          {knapp && <span style={{ flexShrink: 0, backgroundColor: darkMode ? '#3b1f23' : '#fef2f2', color: '#dc2626', padding: '4px 7px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold' }}>Niedriger Bestand</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: prominent ? 'minmax(0, 1fr) auto' : '1fr', gap: '8px', alignItems: 'end' }}>
          <label style={{ color: textSub, fontSize: '0.68rem', fontWeight: 600 }}>
            Menge buchen / verbrauchen ({material.einheit})
            <input
              type="number"
              min="0.1"
              step="0.1"
              aria-label={`Menge ${material.name} in ${material.einheit}`}
              value={mengen[material.id]}
              onChange={event => setMengen(prev => ({ ...prev, [material.id]: event.target.value }))}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: prominent ? '10px' : '7px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: prominent ? '0.9rem' : '0.75rem' }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const preisWert = preise[material.id].trim() === '' ? undefined : Number(preise[material.id]);
              const preis = preisWert === undefined ? undefined : { betrag: preisWert, basis };
              onAdjustLager(material.id, 'add', Number(mengen[material.id]), preis);
            }}
            style={{ backgroundColor: '#8cc63f', color: '#111827', padding: prominent ? '10px 14px' : '8px', borderRadius: '7px', fontWeight: 'bold', fontSize: prominent ? '0.85rem' : '0.7rem', border: 'none', cursor: 'pointer' }}
          >
            + Einbuchen
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '6px' }}>
          <label style={{ color: textSub, fontSize: '0.65rem', fontWeight: 600 }}>
            Einkaufspreis (optional)
            <input
              type="number"
              min="0"
              step="0.01"
              aria-label={`Einkaufspreis ${material.name}`}
              placeholder={aktuellePreisInfo ? `Aktuell ${aktuellePreisInfo.betrag.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €` : 'Preis eingeben'}
              value={preise[material.id]}
              onChange={event => setPreise(prev => ({ ...prev, [material.id]: event.target.value }))}
              style={{ display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box', marginTop: '4px', padding: '7px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.72rem' }}
            />
          </label>
          <label style={{ color: textSub, fontSize: '0.62rem', fontWeight: 600 }}>
            Preisbasis
            <select
              aria-label={`Preisbasis ${material.name}`}
              value={basis}
              onChange={event => {
                const neuerWert = event.target.value;
                if (neuerWert === 'liter' || neuerWert === 'sack25kg' || neuerWert === 'tonne') {
                  speicherePreisBasis(material.id, neuerWert);
                }
              }}
              style={{ display: 'block', marginTop: '4px', maxWidth: '100px', padding: '7px 4px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.65rem' }}
            >
              {material.einheit === 'Liter'
                ? <option value="liter">/ Liter</option>
                : <>
                    <option value="sack25kg">/ 25 kg</option>
                    <option value="tonne">/ Tonne</option>
                  </>}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => onAdjustLager(material.id, 'sub', Number(mengen[material.id]))}
          style={{ justifySelf: 'start', backgroundColor: darkMode ? '#3b1f23' : '#fee2e2', color: '#b91c1c', padding: '7px 9px', borderRadius: '7px', fontWeight: 'bold', fontSize: '0.68rem', border: 'none', cursor: 'pointer' }}
        >
          − Verbrauchen / korrigieren
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h1 style={{ color: textApp, fontSize: '1.05rem', margin: 0 }}>Streumittel-Lager</h1>
      <section aria-labelledby="lager-salz-title" style={{ backgroundColor: bgCard, borderRadius: '14px', border: '2px solid #3b82f6', overflow: 'hidden', boxShadow: '0 4px 12px rgba(59,130,246,0.12)' }}>
        <div style={{ padding: '14px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="lager-salz-title" style={{ color: textApp, fontSize: '1rem', margin: 0 }}>🧂 Streusalz</h2>
          <span style={{ color: textSub, fontSize: '0.68rem' }}>Hauptmaterial</span>
        </div>
        {materialEingabe(STREUMITTEL[0], true)}
      </section>
      <section aria-label="Weitere Streumittel" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {STREUMITTEL.filter(material => material.id !== 'Salz').map(material => {
          const bestand = lagerBestaende[material.id];
          const knapp = bestand < material.gefahrGrenze;
          return (
            <details key={material.id} style={{ backgroundColor: bgCard, borderRadius: '10px', border: `1px solid ${knapp ? '#dc2626' : borderCard}`, overflow: 'hidden' }}>
              <summary style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '11px 12px', color: textApp, listStylePosition: 'inside' }}>
                <strong style={{ fontSize: '0.78rem' }}>{material.name}</strong>
                <span style={{ color: textSub, fontSize: '0.72rem', marginLeft: 'auto' }}>{bestand.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {material.einheit}</span>
                {knapp && <span style={{ color: '#dc2626', fontSize: '0.62rem', fontWeight: 'bold' }}>Niedrig</span>}
              </summary>
              {materialEingabe(material, false)}
            </details>
          );
        })}
      </section>
    </div>
  );
}
