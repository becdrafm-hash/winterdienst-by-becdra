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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h1 style={{ color: textApp, fontSize: '1.05rem', margin: 0 }}>Streumittel-Lager</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '9px' }}>
        {STREUMITTEL.map(material => {
          const bestand = lagerBestaende[material.id];
          const knapp = bestand < material.gefahrGrenze;
          const aktuellePreisInfo = materialPreise[material.id];
          const basisIstLiter = material.einheit === 'Liter';
          const basis = preisBasis[material.id];

          return (
            <section key={material.id} style={{ minWidth: 0, backgroundColor: bgCard, padding: '10px', borderRadius: '12px', border: `1px solid ${knapp ? '#dc2626' : borderCard}`, display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '0.82rem', lineHeight: 1.2, margin: 0 }}>{material.id}</h2>
                {knapp && <span style={{ flexShrink: 0, backgroundColor: darkMode ? '#3b1f23' : '#fef2f2', color: '#dc2626', padding: '2px 4px', borderRadius: '5px', fontSize: '0.55rem', fontWeight: 'bold' }}>Niedrig</span>}
              </div>
              <div style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', borderLeft: `3px solid ${material.farbe}`, padding: '6px 8px', borderRadius: '6px' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: textApp }}>
                  {bestand.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                </span>
                <span style={{ color: textSub, fontSize: '0.7rem', marginLeft: '4px' }}>{material.einheit}</span>
                {aktuellePreisInfo && (
                  <span style={{ display: 'block', color: textSub, fontSize: '0.58rem', marginTop: '1px' }}>
                    Einkauf: {aktuellePreisInfo.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / {aktuellePreisInfo.basis === 'sack25kg' ? '25 kg' : aktuellePreisInfo.basis === 'tonne' ? 'Tonne' : 'Liter'}
                  </span>
                )}
              </div>
              <label style={{ color: textSub, fontSize: '0.62rem', fontWeight: 600 }}>
                Zugang ({material.einheit})
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  aria-label={`Menge ${material.name} in ${material.einheit}`}
                  value={mengen[material.id]}
                  onChange={event => setMengen(prev => ({ ...prev, [material.id]: event.target.value }))}
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '3px', padding: '6px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.75rem' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '4px' }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`Einkaufspreis ${material.name}`}
                  placeholder="Preis optional"
                  value={preise[material.id]}
                  onChange={event => setPreise(prev => ({ ...prev, [material.id]: event.target.value }))}
                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '6px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.7rem' }}
                />
                <select
                  aria-label={`Preisbasis ${material.name}`}
                  value={basis}
                  onChange={event => {
                    const neuerWert = event.target.value;
                    if (neuerWert === 'liter' || neuerWert === 'sack25kg' || neuerWert === 'tonne') {
                      speicherePreisBasis(material.id, neuerWert);
                    }
                  }}
                  style={{ maxWidth: '76px', padding: '4px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.62rem' }}
                >
                  {basisIstLiter
                    ? <option value="liter">/ Liter</option>
                    : <>
                        <option value="sack25kg">/ 25 kg</option>
                        <option value="tonne">/ Tonne</option>
                      </>}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  const preisWert = preise[material.id].trim() === '' ? undefined : Number(preise[material.id]);
                  const preis = preisWert === undefined ? undefined : { betrag: preisWert, basis };
                  onAdjustLager(material.id, 'add', Number(mengen[material.id]), preis);
                }}
                style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '7px 5px', borderRadius: '7px', fontWeight: 'bold', fontSize: '0.68rem', border: 'none', cursor: 'pointer' }}
              >
                + Einbuchen
              </button>
              <button
                type="button"
                onClick={() => onAdjustLager(material.id, 'sub', Number(mengen[material.id]))}
                style={{ backgroundColor: darkMode ? '#3b1f23' : '#fee2e2', color: '#b91c1c', padding: '6px 5px', borderRadius: '7px', fontWeight: 'bold', fontSize: '0.65rem', border: 'none', cursor: 'pointer' }}
              >
                − Bestand korrigieren
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
