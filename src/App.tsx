import React, { useState, useEffect, useRef } from 'react';
import { type BevorzugterKanal, type EinsatzLog, type Kunde, type Leistungsart, type Liegenschaft, type MaterialEinkaufspreis, type MaterialEinkaufspreise, type SaisonArchiv } from './types';
import DialogModal from './components/DialogModal';
import Header from './components/Header';
import LagerTab from './components/LagerTab';
import EinstellungenTab from './components/EinstellungenTab';
import KundenTab from './components/KundenTab';
import ObjekteTab from './components/ObjekteTab';
import TourTab from './components/TourTab';
import HistorieStatistikTab from './components/HistorieStatistikTab';
import AktiverEinsatz from './components/AktiverEinsatz';
import Navigation from './components/Navigation';
import { DWD_REGIONEN, DWD_STANDARD_REGIONEN, type DwdRegionId } from './services/dwdWetter';
import { ermittleLiegenschaftKoordinaten } from './services/liegenschaftGeocoding';
import { normalisiereStreuMittelId, STREUMITTEL, type LagerBestaende, type StreuMittelId } from './constants/streuMittel';
import { istWochenendeOderFeiertag } from './feiertage';
import { datumAlsIso, liegtImBetreuungszeitraum } from './utils/saisonZeitraum';
import { berechneEinsatzZeitenRückwärts } from './utils/einsatzZeiten';

const LAGER_KG_MIGRATION_KEY = 'becdra_lager_kg_migration_v1';
const LAGER_BESTAENDE_KEY = 'becdra_lager_bestaende';

function ermittleStandardSaisonZeitraum(heute = new Date()): { von: string; bis: string } {
  const startJahr = heute.getMonth() >= 9 ? heute.getFullYear() : heute.getFullYear() - 1;
  return { von: `${startJahr}-11-01`, bis: `${startJahr + 1}-03-31` };
}

interface KundenBerichtDaten {
  kundeName: string;
  datum: string;
  wetter: string;
  liegenschaften: {
    name: string;
    address: string;
    timestamp: number;
    type: Leistungsart;
    duration: string;
    zeitFensterAnzeige: string;
    hindernisInfo?: string;
  }[];
}

function erstelleKundenBerichtText(daten: KundenBerichtDaten, format: 'whatsapp' | 'plain'): string {
  const ueberschrift = (text: string) => format === 'whatsapp' ? `*${text}*` : text;
  const massnahmen: Record<Leistungsart, string> = {
    'räumen + streuen': 'Räumen + Streuen',
    streuen: 'Streuen',
    'Streugut entfernen': 'Streugut entfernen'
  };
  const objektBloecke = daten.liegenschaften.map(einsatz => [
    `▸ Objekt: ${einsatz.name}`,
    `   Anschrift: ${einsatz.address}`,
    `   Zeitfenster: ${einsatz.zeitFensterAnzeige}`,
    `   Maßnahme: ${massnahmen[einsatz.type]}`,
    `   Besonderheiten: ${einsatz.hindernisInfo || 'Keine besonderen Vorkommnisse'}`
  ].join('\n'));

  return [
    ueberschrift('❄️ WINTERDIENST – EINSATZNACHWEIS'),
    'Becdra FM • Garten- & Hausmeisterservice',
    '',
    `Auftraggeber: ${daten.kundeName}`,
    `Datum: ${daten.datum}`,
    `Wetterlage: ${daten.wetter}`,
    '',
    ueberschrift('📍 Betreute Liegenschaft(en):'),
    objektBloecke.join('\n\n'),
    '',
    ueberschrift('✅ Status: Ordnungsgemäß im Rahmen der Verkehrssicherungspflicht betreut.'),
    '',
    'Mit freundlichen Grüßen',
    'Michael Beckers',
    'Becdra FM'
  ].join('\n');
}

function speichereLocalStorage(schluessel: string, wert: string): boolean {
  try {
    localStorage.setItem(schluessel, wert);
    return true;
  } catch (error) {
    console.error(`LocalStorage-Eintrag "${schluessel}" konnte nicht gespeichert werden:`, error);
    return false;
  }
}

function entferneFotoDaten(einsatz: EinsatzLog): EinsatzLog {
  return { ...einsatz, fotoUrl: undefined, hindernisFotoUrl: undefined };
}

function ladeLagerBestaende(): LagerBestaende {
  const standard: LagerBestaende = { Salz: 0, Splitt: 0, Sand: 0, Lava: 0, Acetat: 0 };
  const gespeicherteBestaende = localStorage.getItem(LAGER_BESTAENDE_KEY);
  if (gespeicherteBestaende) {
    try {
      const parsed: unknown = JSON.parse(gespeicherteBestaende);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const material of STREUMITTEL) {
          const bestand = (parsed as Record<string, unknown>)[material.id];
          if (typeof bestand === 'number' && Number.isFinite(bestand)) standard[material.id] = bestand;
        }
        return standard;
      }
    } catch (error) {
      console.error('Gespeicherte Lagerbestände konnten nicht gelesen werden:', error);
    }
  }

  const alterBestand = localStorage.getItem('becdra_lager');
  let wert = 0;
  if (alterBestand) {
    try {
      const parsed: unknown = JSON.parse(alterBestand);
      wert = typeof parsed === 'number' ? parsed : Number(parsed);
    } catch (error) {
      console.error('Der alte Salzbestand konnte nicht gelesen werden:', error);
    }
  }
  if (Number.isFinite(wert)) {
    standard.Salz = localStorage.getItem(LAGER_KG_MIGRATION_KEY) === 'true' ? wert : wert * 25;
  }
  return standard;
}

function ladeMaterialPreise(): MaterialEinkaufspreise {
  const gespeichertePreise = localStorage.getItem('becdra_material_preise');
  if (!gespeichertePreise) return {};
  try {
    const parsed: unknown = JSON.parse(gespeichertePreise);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const preise: MaterialEinkaufspreise = {};
    for (const material of STREUMITTEL) {
      const preis = (parsed as Record<string, unknown>)[material.id];
      if (typeof preis !== 'object' || preis === null) continue;
      const wert = preis as Record<string, unknown>;
      if (typeof wert.betrag !== 'number' || !Number.isFinite(wert.betrag) || wert.betrag < 0) continue;
      if (wert.basis !== 'sack25kg' && wert.basis !== 'tonne' && wert.basis !== 'liter') continue;
      preise[material.id] = { betrag: wert.betrag, basis: wert.basis };
    }
    return preise;
  } catch (error) {
    console.error('Gespeicherte Materialpreise konnten nicht gelesen werden:', error);
    return {};
  }
}

function berechnePreisProEinheit(preis: MaterialEinkaufspreis | undefined): number | undefined {
  if (!preis) return undefined;
  if (preis.basis === 'sack25kg') return preis.betrag / 25;
  if (preis.basis === 'tonne') return preis.betrag / 1000;
  return preis.betrag;
}

function leseGueltigeKoordinaten(liegenschaft: Pick<Liegenschaft, 'lat' | 'lon'>): { lat: number; lon: number } | null {
  if (typeof liegenschaft.lat !== 'number'
    || !Number.isFinite(liegenschaft.lat)
    || liegenschaft.lat < -90
    || liegenschaft.lat > 90
    || typeof liegenschaft.lon !== 'number'
    || !Number.isFinite(liegenschaft.lon)
    || liegenschaft.lon < -180
    || liegenschaft.lon > 180) {
    return null;
  }

  return { lat: liegenschaft.lat, lon: liegenschaft.lon };
}

function leseMaterialverbrauchKg(einsatz: Pick<EinsatzLog, 'materialUsed' | 'materialVerbrauchKg'>): number {
  if (typeof einsatz.materialVerbrauchKg === 'number' && Number.isFinite(einsatz.materialVerbrauchKg)) {
    return einsatz.materialVerbrauchKg;
  }

  if (!einsatz.materialUsed.includes('Sack')) return 0;
  return (Number.parseFloat(einsatz.materialUsed.replace(',', '.')) || 0) * 25;
}

interface ArbeitszeitStatus {
  pauseBeginn: number | null;
  pausendauerMs: number;
}

export default function App() {
  const standardSaison = ermittleStandardSaisonZeitraum();
  const [activeTab, setActiveTab] = useState<'tour' | 'liegenschaften' | 'lager' | 'mehr' | 'kunden' | 'statistik' | 'history_saison'>('tour');
  const [mehrEinstellungenGeoeffnet, setMehrEinstellungenGeoeffnet] = useState(false);
  const [statusMeldung, setStatusMeldung] = useState<string | null>(null);
  const [koordinatenWirdErmittelt, setKoordinatenWirdErmittelt] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const farbschema = window.matchMedia('(prefers-color-scheme: dark)');
    const synchronisiereFarbschema = (event: MediaQueryListEvent) => {
      setDarkMode(event.matches);
    };

    farbschema.addEventListener('change', synchronisiereFarbschema);
    return () => farbschema.removeEventListener('change', synchronisiereFarbschema);
  }, []);

  const [startPunkt, setStartPunkt] = useState<string>(() => {
    return localStorage.getItem('becdra_startpunkt') || 'Groiner Allee 1, 46459 Rees';
  });
  const [dwdRegionen, setDwdRegionen] = useState<DwdRegionId[]>(() => {
    const gespeicherteRegionen = localStorage.getItem('becdra_dwd_regionen');
    if (!gespeicherteRegionen) return DWD_STANDARD_REGIONEN;

    try {
      const parsed: unknown = JSON.parse(gespeicherteRegionen);
      if (!Array.isArray(parsed)) return DWD_STANDARD_REGIONEN;
      return DWD_REGIONEN
        .map(region => region.id)
        .filter((region): region is DwdRegionId => parsed.includes(region));
    } catch {
      return DWD_STANDARD_REGIONEN;
    }
  });
  const [editingStartPunkt, setEditingStartPunkt] = useState<string>(startPunkt);

  const [showActiveRaeumPlanPopup, setShowActiveRaeumPlanPopup] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const koordinatenAbrufAktivRef = useRef(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    titel: string;
    text: string;
    onConfirm?: () => void;
    onSecondary?: () => void;
    onCancel?: () => void;
    confirmText?: React.ReactNode;
    secondaryText?: React.ReactNode;
    cancelText?: React.ReactNode;
  }>({ visible: false, titel: '', text: '', onConfirm: () => {} });
  
  const zeigeMeldung = (text: string) => {
    setStatusMeldung(text);
    setTimeout(() => {
      setStatusMeldung(null);
    }, 3500);
  };
  
  const [kunden, setKunden] = useState<Kunde[]>(() => {
    const saved = localStorage.getItem('becdra_kunden');
    return saved ? JSON.parse(saved) : [];
  });

  const [liegenschaften, setLiegenschaften] = useState<Liegenschaft[]>(() => {
    const saved = localStorage.getItem('becdra_liegenschaften');
    return saved ? JSON.parse(saved) : [];
  });

  const [lagerBestaende, setLagerBestaende] = useState<LagerBestaende>(ladeLagerBestaende);
  const [materialPreise, setMaterialPreise] = useState<MaterialEinkaufspreise>(ladeMaterialPreise);

  const [spritPreisProLiter, setSpritPreisProLiter] = useState<string>(() => {
    return localStorage.getItem('becdra_spritpreis') || '1.80';
  });
  const [editingSpritPreis, setEditingSpritPreis] = useState<string>(spritPreisProLiter);
  const streuMittelListe = STREUMITTEL;

  const [verbrauchAuf100Km, setVerbrauchAuf100Km] = useState<string>(() =>
    localStorage.getItem('becdra_verbrauch') || '10'
  );
  const [editingVerbrauch, setEditingVerbrauch] = useState<string>(verbrauchAuf100Km);

  const [neuFirma, setNeuFirma] = useState('');
  const [neuEmail, setNeuEmail] = useState('');
  const [neuWhatsapp, setNeuWhatsapp] = useState('');
  const [neuBevorzugterKanal, setNeuBevorzugterKanal] = useState<BevorzugterKanal>('whatsapp');

  const [selectedKundeId, setSelectedKundeId] = useState<number>(() => kunden[0]?.id || 1);
  const [neuObjName, setNeuObjName] = useState('');
  const [neuObjAddress, setNeuObjAddress] = useState('');
  const [neuObjSize, setNeuObjSize] = useState('');
  const [neuObjMaterial, setNeuObjMaterial] = useState('Salz');
  const [neuObjReihenfolge, setNeuObjReihenfolge] = useState('1');
  const [neuObjNurWochenendeFeiertag, setNeuObjNurWochenendeFeiertag] = useState(false);
  const [neuObjSaisonStart, setNeuObjSaisonStart] = useState(() =>
    localStorage.getItem('becdra_saison_von') || standardSaison.von
  );
  const [neuObjSaisonEnde, setNeuObjSaisonEnde] = useState(() =>
    localStorage.getItem('becdra_saison_bis') || standardSaison.bis
  );
  const [neuObjRaeumPlan, setNeuObjRaeumPlan] = useState<string>('');

  const [editingKundeId, setEditingKundeId] = useState<number | null>(null);
  const [editFirma, setEditFirma] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editBevorzugterKanal, setEditBevorzugterKanal] = useState<BevorzugterKanal>('whatsapp');

  const [editingLiege, setEditingLiege] = useState<Liegenschaft | null>(null);
  const [editObjName, setEditObjName] = useState('');
  const [editObjAddress, setEditObjAddress] = useState('');
  const [editObjSize, setEditObjSize] = useState('');
  const [editObjMaterial, setEditObjMaterial] = useState('Salz');
  const [editObjReihenfolge, setEditObjReihenfolge] = useState('1');
  const [editObjNurWochenendeFeiertag, setEditObjNurWochenendeFeiertag] = useState(false);
  const [editObjSaisonStart, setEditObjSaisonStart] = useState(standardSaison.von);
  const [editObjSaisonEnde, setEditObjSaisonEnde] = useState(standardSaison.bis);
  const [editObjRaeumPlan, setEditObjRaeumPlan] = useState<string>('');

  const [activeKunde, setActiveKunde] = useState<Kunde | null>(() => {
    const saved = localStorage.getItem('becdra_active_kunde');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeObjekt, setActiveObjekt] = useState<Liegenschaft | null>(() => {
    const saved = localStorage.getItem('becdra_active_objekt');
    return saved ? JSON.parse(saved) : null;
  });
  const [startTime, setStartTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('becdra_starttime');
    if (!saved) return null;
    const date = new Date(saved);
    return Number.isNaN(date.getTime()) ? null : date;
  });
  const [arbeitszeitStatus, setArbeitszeitStatus] = useState<ArbeitszeitStatus>(() => {
    try {
      const gespeichert = localStorage.getItem('becdra_arbeitszeit');
      if (!gespeichert) return { pauseBeginn: null, pausendauerMs: 0 };
      const parsed: unknown = JSON.parse(gespeichert);
      if (typeof parsed !== 'object' || parsed === null) {
        return { pauseBeginn: null, pausendauerMs: 0 };
      }
      const daten = parsed as Record<string, unknown>;
      return {
        pauseBeginn: typeof daten.pauseBeginn === 'number' ? daten.pauseBeginn : null,
        pausendauerMs: typeof daten.pausendauerMs === 'number' && daten.pausendauerMs >= 0
          ? daten.pausendauerMs
          : 0
      };
    } catch {
      return { pauseBeginn: null, pausendauerMs: 0 };
    }
  });
  const [einsatzType, setEinsatzType] = useState<Leistungsart>('streuen');
  const [wetterLage, setWetterLage] = useState('Wird geladen...');
  const [materialVerbrauchKg, setMaterialVerbrauchKg] = useState('');
  const [gefahreneKm, setGefahreneKm] = useState(() =>
    localStorage.getItem('becdra_gefahrene_km') || '0'
  );
  const accumulatedKmRef = useRef<number>(Number(gefahreneKm) || 0);
  
  const [aufgenommenesFoto, setAufgenommenesFoto] = useState<string | null>(null);
  const [aufgenommenesFotoUrl, setAufgenommenesFotoUrl] = useState<string | null>(null);
  
  // Hindernis States im aktiven Einsatz
  const [hindernisNotiz, setHindernisNotiz] = useState('');
  const [hindernisFoto, setHindernisFoto] = useState<string | null>(null);
  const [hindernisFotoUrl, setHindernisFotoUrl] = useState<string | null>(null);

  const [history, setHistory] = useState<EinsatzLog[]>(() => {
    try {
      const saved = localStorage.getItem('becdra_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [saisonName, setSaisonName] = useState('Wintersaison 2026/2027');
  const [saisonVon, setSaisonVon] = useState(() => localStorage.getItem('becdra_saison_von') || standardSaison.von);
  const [saisonBis, setSaisonBis] = useState(() => localStorage.getItem('becdra_saison_bis') || standardSaison.bis);
  const [archivListe, setArchivListe] = useState<SaisonArchiv[]>(() => {
    try {
      const saved = localStorage.getItem('becdra_saison_archiv');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    speichereLocalStorage('becdra_kunden', JSON.stringify(kunden));
  }, [kunden]);

  useEffect(() => {
    speichereLocalStorage('becdra_liegenschaften', JSON.stringify(liegenschaften));
  }, [liegenschaften]);

  useEffect(() => {
    speichereLocalStorage(LAGER_BESTAENDE_KEY, JSON.stringify(lagerBestaende));
    speichereLocalStorage('becdra_lager', JSON.stringify(lagerBestaende.Salz));
    speichereLocalStorage(LAGER_KG_MIGRATION_KEY, 'true');
  }, [lagerBestaende]);

  useEffect(() => {
    speichereLocalStorage('becdra_material_preise', JSON.stringify(materialPreise));
  }, [materialPreise]);

  useEffect(() => {
    speichereLocalStorage('becdra_dwd_regionen', JSON.stringify(dwdRegionen));
  }, [dwdRegionen]);

  useEffect(() => {
    speichereLocalStorage('becdra_streumittel', JSON.stringify(streuMittelListe));
  }, [streuMittelListe]);

  useEffect(() => {
    speichereLocalStorage('becdra_saison_von', saisonVon);
  }, [saisonVon]);

  useEffect(() => {
    speichereLocalStorage('becdra_saison_bis', saisonBis);
  }, [saisonBis]);

  useEffect(() => {
    const gespeicherteHistorie = [...history];
    try {
        localStorage.setItem('becdra_history', JSON.stringify(gespeicherteHistorie));
      return;
    } catch (error) {
      console.error('Einsatzhistorie konnte wegen vollem Speicher nicht gespeichert werden:', error);
    }

    for (let index = gespeicherteHistorie.length - 1; index >= 0; index -= 1) {
      const einsatz = gespeicherteHistorie[index];
      if (!einsatz.fotoUrl && !einsatz.hindernisFotoUrl) continue;
      gespeicherteHistorie[index] = entferneFotoDaten(einsatz);
      try {
        localStorage.setItem('becdra_history', JSON.stringify(gespeicherteHistorie));
        console.warn('Ältere Fotodaten wurden entfernt, damit die Einsatzhistorie gespeichert werden kann.');
        return;
      } catch (error) {
        console.error('Einsatzhistorie ist trotz Entfernen älterer Fotodaten weiterhin zu groß:', error);
      }
    }

    const archivFuerFallback = [...archivListe];
    let archivBereinigt = false;
    for (let archivIndex = archivFuerFallback.length - 1; archivIndex >= 0; archivIndex -= 1) {
      const archiv = archivFuerFallback[archivIndex];
      for (let einsatzIndex = archiv.einsätze.length - 1; einsatzIndex >= 0; einsatzIndex -= 1) {
        const einsatz = archiv.einsätze[einsatzIndex];
        if (!einsatz.fotoUrl && !einsatz.hindernisFotoUrl) continue;
        const einsätze = [...archiv.einsätze];
        einsätze[einsatzIndex] = entferneFotoDaten(einsatz);
        archivFuerFallback[archivIndex] = { ...archiv, einsätze };
        try {
          localStorage.setItem('becdra_saison_archiv', JSON.stringify(archivFuerFallback));
          archivBereinigt = true;
        } catch (error) {
          console.error('Ältere Archivfotos konnten nicht entfernt werden:', error);
          continue;
        }

        try {
          localStorage.setItem('becdra_history', JSON.stringify(gespeicherteHistorie));
          console.warn('Ältere Archiv- und Fotodaten wurden entfernt, damit die Einsatzhistorie gespeichert werden kann.');
          return;
        } catch (error) {
          console.error('Einsatzhistorie konnte auch nach Bereinigen des Saisonarchivs nicht gespeichert werden:', error);
        }
      }
    }
    if (archivBereinigt) {
      console.warn('Ältere Archivfotos wurden zur Freigabe von LocalStorage entfernt.');
    }

    console.error('Speicher voll: Der Einsatz bleibt in der App erhalten, konnte aber nicht dauerhaft gespeichert werden.');
  }, [archivListe, history]);

  useEffect(() => {
    const gespeichertesArchiv = [...archivListe];
    try {
      localStorage.setItem('becdra_saison_archiv', JSON.stringify(gespeichertesArchiv));
      return;
    } catch (error) {
      console.error('Saisonarchiv konnte wegen vollem Speicher nicht gespeichert werden:', error);
    }

    for (let archivIndex = gespeichertesArchiv.length - 1; archivIndex >= 0; archivIndex -= 1) {
      const archiv = gespeichertesArchiv[archivIndex];
      for (let einsatzIndex = archiv.einsätze.length - 1; einsatzIndex >= 0; einsatzIndex -= 1) {
        const einsatz = archiv.einsätze[einsatzIndex];
        if (!einsatz.fotoUrl && !einsatz.hindernisFotoUrl) continue;
        const einsätze = [...archiv.einsätze];
        einsätze[einsatzIndex] = entferneFotoDaten(einsatz);
        gespeichertesArchiv[archivIndex] = { ...archiv, einsätze };
        try {
          localStorage.setItem('becdra_saison_archiv', JSON.stringify(gespeichertesArchiv));
          console.warn('Ältere Archivfotos wurden entfernt, damit das Saisonarchiv gespeichert werden kann.');
          return;
        } catch (error) {
          console.error('Saisonarchiv ist trotz Entfernen älterer Fotodaten weiterhin zu groß:', error);
        }
      }
    }

    console.error('Speicher voll: Das Saisonarchiv konnte nicht dauerhaft gespeichert werden.');
  }, [archivListe]);

  useEffect(() => {
    if (activeKunde) {
      speichereLocalStorage('becdra_active_kunde', JSON.stringify(activeKunde));
    } else {
      localStorage.removeItem('becdra_active_kunde');
    }
  }, [activeKunde]);

  useEffect(() => {
    if (activeObjekt) {
      speichereLocalStorage('becdra_active_objekt', JSON.stringify(activeObjekt));
    } else {
      localStorage.removeItem('becdra_active_objekt');
    }
  }, [activeObjekt]);

  useEffect(() => {
    if (startTime) {
      speichereLocalStorage('becdra_starttime', startTime.toISOString());
    } else {
      localStorage.removeItem('becdra_starttime');
    }
  }, [startTime]);

  useEffect(() => {
    if (activeKunde && activeObjekt && startTime) {
      speichereLocalStorage('becdra_arbeitszeit', JSON.stringify(arbeitszeitStatus));
    } else {
      localStorage.removeItem('becdra_arbeitszeit');
    }
  }, [activeKunde, activeObjekt, startTime, arbeitszeitStatus]);

  useEffect(() => {
    if (activeKunde && activeObjekt && startTime) {
      speichereLocalStorage('becdra_gefahrene_km', gefahreneKm);
    } else {
      localStorage.removeItem('becdra_gefahrene_km');
    }
  }, [activeKunde, activeObjekt, startTime, gefahreneKm]);

  const exportDatenBackup = () => {
    const backupData = {
      kunden,
      liegenschaften,
      history,
      lagerBestaende,
      materialPreise,
      lagerBestand: lagerBestaende.Salz,
      lagerEinheit: 'kg',
      startPunkt,
      spritPreisProLiter,
      verbrauchAuf100Km,
      archivListe
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `becdra_fm_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    zeigeMeldung('Backup erfolgreich auf deinem Gerät gespeichert!');
  };

  const importDatenBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target && event.target.result) {
            const parsed = JSON.parse(event.target.result as string);
            if (parsed.kunden) setKunden(parsed.kunden);
            if (parsed.liegenschaften) setLiegenschaften(parsed.liegenschaften);
            if (parsed.history) setHistory(parsed.history);
            if (parsed.lagerBestaende !== undefined) {
              const backupBestaende: LagerBestaende = { Salz: 0, Splitt: 0, Sand: 0, Lava: 0, Acetat: 0 };
              if (typeof parsed.lagerBestaende !== 'object' || parsed.lagerBestaende === null) {
                throw new Error('Die Lagerbestände im Backup sind ungültig.');
              }
              for (const material of STREUMITTEL) {
                const bestand = Number(parsed.lagerBestaende[material.id] ?? 0);
                if (!Number.isFinite(bestand) || bestand < 0) {
                  throw new Error(`Der Lagerbestand für ${material.name} im Backup ist ungültig.`);
                }
                backupBestaende[material.id] = bestand;
              }
              setLagerBestaende(backupBestaende);
              speichereLocalStorage(LAGER_KG_MIGRATION_KEY, 'true');
            } else if (parsed.lagerBestand !== undefined) {
              const backupBestand = Number(parsed.lagerBestand);
              const backupLagerKg = parsed.lagerEinheit === 'kg' ? backupBestand : backupBestand * 25;
              if (!Number.isFinite(backupLagerKg) || backupLagerKg < 0) {
                throw new Error('Der Lagerbestand im Backup ist ungültig.');
              }
              setLagerBestaende(prev => ({ ...prev, Salz: backupLagerKg }));
              speichereLocalStorage(LAGER_KG_MIGRATION_KEY, 'true');
            }
            if (parsed.materialPreise !== undefined) {
              const backupPreise: MaterialEinkaufspreise = {};
              if (typeof parsed.materialPreise !== 'object' || parsed.materialPreise === null) {
                throw new Error('Die Materialpreise im Backup sind ungültig.');
              }
              for (const material of STREUMITTEL) {
                const preis = parsed.materialPreise[material.id];
                if (preis === undefined) continue;
                if (typeof preis !== 'object' || preis === null
                  || !Number.isFinite(Number(preis.betrag))
                  || Number(preis.betrag) < 0
                  || !['sack25kg', 'tonne', 'liter'].includes(preis.basis)) {
                  throw new Error(`Der Einkaufspreis für ${material.name} im Backup ist ungültig.`);
                }
                backupPreise[material.id] = {
                  betrag: Number(preis.betrag),
                  basis: preis.basis
                };
              }
              setMaterialPreise(backupPreise);
            }
            if (parsed.startPunkt) setStartPunkt(parsed.startPunkt);
            if (parsed.spritPreisProLiter) setSpritPreisProLiter(parsed.spritPreisProLiter);
            if (parsed.verbrauchAuf100Km) {
              setVerbrauchAuf100Km(parsed.verbrauchAuf100Km);
              setEditingVerbrauch(parsed.verbrauchAuf100Km);
            }
            if (parsed.archivListe) setArchivListe(parsed.archivListe);
            
            zeigeMeldung('Daten erfolgreich aus Backup wiederhergestellt!');
          }
        } catch {
          zeigeMeldung('Fehler beim Lesen der Backup-Datei.');
        }
      };
      e.target.value = '';
    }
  };

  const speichereStartpunkt = (e: React.FormEvent) => {
    e.preventDefault();
    setStartPunkt(editingStartPunkt);
    speichereLocalStorage('becdra_startpunkt', editingStartPunkt);
    zeigeMeldung('Startpunkt erfolgreich aktualisiert!');
  };

  const speichereSpritPreis = (e: React.FormEvent) => {
    e.preventDefault();
    setSpritPreisProLiter(editingSpritPreis);
    speichereLocalStorage('becdra_spritpreis', editingSpritPreis);
    zeigeMeldung('Spritpreis erfolgreich aktualisiert!');
  };

  const speichereVerbrauch = (e: React.FormEvent) => {
    e.preventDefault();
    const verbrauch = Number(editingVerbrauch);
    if (!Number.isFinite(verbrauch) || verbrauch <= 0) {
      zeigeMeldung('Bitte einen Verbrauch größer als 0 eingeben.');
      return;
    }

    const gespeicherterVerbrauch = String(verbrauch);
    setVerbrauchAuf100Km(gespeicherterVerbrauch);
    speichereLocalStorage('becdra_verbrauch', gespeicherterVerbrauch);
    zeigeMeldung('Fahrzeugverbrauch erfolgreich aktualisiert!');
  };

  const anpasseLagerGenau = (
    material: StreuMittelId,
    modus: 'add' | 'sub',
    wert: number,
    einkaufspreis?: MaterialEinkaufspreis
  ) => {
    const materialInfo = STREUMITTEL.find(eintrag => eintrag.id === material);
    if (!materialInfo || !Number.isFinite(wert) || wert <= 0) {
      zeigeMeldung('Bitte eine gültige Lagermenge eingeben.');
      return;
    }
    if (modus === 'add' && einkaufspreis
      && (!Number.isFinite(einkaufspreis.betrag)
        || einkaufspreis.betrag < 0
        || (materialInfo.einheit === 'Liter' && einkaufspreis.basis !== 'liter')
        || (materialInfo.einheit === 'kg' && einkaufspreis.basis === 'liter'))) {
      zeigeMeldung('Bitte einen gültigen Einkaufspreis eingeben.');
      return;
    }

    if (modus === 'add') {
      setLagerBestaende(prev => ({ ...prev, [material]: prev[material] + wert }));
      if (einkaufspreis) {
        setMaterialPreise(prev => ({ ...prev, [material]: einkaufspreis }));
      }
      zeigeMeldung(`+${wert.toLocaleString('de-DE')} ${materialInfo.einheit} ${materialInfo.name} hinzugefügt.`);
    } else {
      setLagerBestaende(prev => ({ ...prev, [material]: prev[material] - wert }));
      zeigeMeldung(`-${wert.toLocaleString('de-DE')} ${materialInfo.einheit} ${materialInfo.name} abgezogen.`);
    }
  };

  const addKunde = (e: React.FormEvent) => {
    e.preventDefault();
    if (!neuFirma || !neuEmail) return;
    const neuerKunde: Kunde = {
      id: Date.now(),
      firma: neuFirma,
      email: neuEmail,
      whatsapp: neuWhatsapp,
      bevorzugterKanal: neuBevorzugterKanal
    };
    setKunden([...kunden, neuerKunde]);
    setSelectedKundeId(neuerKunde.id);
    setNeuFirma('');
    setNeuEmail('');
    setNeuWhatsapp('');
    setNeuBevorzugterKanal('whatsapp');
    zeigeMeldung('Kunde erfolgreich angelegt!');
  };

  const startEditKunde = (kunde: Kunde) => {
    setEditingKundeId(kunde.id);
    setEditFirma(kunde.firma);
    setEditEmail(kunde.email);
    setEditWhatsapp(kunde.whatsapp);
    setEditBevorzugterKanal(kunde.bevorzugterKanal ?? 'whatsapp');
  };

  const saveEditKunde = (id: number) => {
    setKunden(kunden.map(k => k.id === id ? {
      ...k,
      firma: editFirma,
      email: editEmail,
      whatsapp: editWhatsapp,
      bevorzugterKanal: editBevorzugterKanal
    } : k));
    setEditingKundeId(null);
    zeigeMeldung('Kunde aktualisiert!');
  };

  const deleteKunde = (kundeId: number) => {
    setDialogConfig({
      visible: true,
      titel: 'Kunden löschen',
      text: 'Möchtest du diesen Kunden und alle zugehörigen Liegenschaften wirklich löschen?',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        setKunden(prev => prev.filter(k => k.id !== kundeId));
        setLiegenschaften(prev => prev.filter(l => l.kundeId !== kundeId));
        setDialogConfig(prev => ({ ...prev, visible: false }));
        zeigeMeldung('Kunde und zugehörige Liegenschaften gelöscht.');
      },
      onCancel: () => setDialogConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const deleteLiegenschaft = (liegeId: number) => {
    setDialogConfig({
      visible: true,
      titel: 'Liegenschaft löschen',
      text: 'Möchtest du diese Liegenschaft wirklich unwiderruflich löschen?',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        setLiegenschaften(prev => prev.filter(l => l.id !== liegeId));
        setDialogConfig(prev => ({ ...prev, visible: false }));
        zeigeMeldung('Liegenschaft gelöscht.');
      },
      onCancel: () => setDialogConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const handleNeuRaeumPlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setNeuObjRaeumPlan(reader.result as string);
        zeigeMeldung('Räumplan erfolgreich erfasst!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditRaeumPlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditObjRaeumPlan(reader.result as string);
        zeigeMeldung('Räumplan aktualisiert!');
      };
      reader.readAsDataURL(file);
    }
  };

  const addLiegenschaft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (koordinatenAbrufAktivRef.current) return;
    if (!neuObjName || !neuObjAddress || !neuObjSize) return;
    if (!neuObjSaisonStart || !neuObjSaisonEnde || neuObjSaisonStart > neuObjSaisonEnde) {
      zeigeMeldung('Das Saisonende muss am oder nach dem Saisonstart liegen.');
      return;
    }

    koordinatenAbrufAktivRef.current = true;
    setKoordinatenWirdErmittelt(true);
    try {
      const koordinaten = await ermittleLiegenschaftKoordinaten(neuObjAddress);

      const neueLiege: Liegenschaft = {
        id: Date.now(),
        kundeId: Number(selectedKundeId),
        name: neuObjName,
        address: neuObjAddress,
        size: neuObjSize,
        material: neuObjMaterial,
        reihenfolge: Number(neuObjReihenfolge) || 1,
        nurWochenendeFeiertag: neuObjNurWochenendeFeiertag,
        saisonStart: neuObjSaisonStart,
        saisonEnde: neuObjSaisonEnde,
        lat: koordinaten.lat,
        lon: koordinaten.lon,
        raeumPlan: neuObjRaeumPlan || undefined
      };

      setLiegenschaften([...liegenschaften, neueLiege]);
      setNeuObjName('');
      setNeuObjAddress('');
      setNeuObjSize('');
      setNeuObjReihenfolge('1');
      setNeuObjNurWochenendeFeiertag(false);
      setNeuObjSaisonStart(saisonVon);
      setNeuObjSaisonEnde(saisonBis);
      setNeuObjRaeumPlan('');
      zeigeMeldung(koordinaten.quelle === 'regionaler-fallback'
        ? `Liegenschaft hinzugefügt; Geocoding fehlgeschlagen (${koordinaten.grund}). Näherungskoordinaten für ${koordinaten.region} verwendet.`
        : 'Liegenschaft erfolgreich hinzugefügt!');
    } finally {
      koordinatenAbrufAktivRef.current = false;
      setKoordinatenWirdErmittelt(false);
    }
  };

  const startEditLiege = (liege: Liegenschaft) => {
    setEditingLiege(liege);
    setEditObjName(liege.name);
    setEditObjAddress(liege.address);
    setEditObjSize(liege.size);
    setEditObjMaterial(normalisiereStreuMittelId(liege.material));
    setEditObjReihenfolge(liege.reihenfolge ? liege.reihenfolge.toString() : '1');
    setEditObjNurWochenendeFeiertag(liege.nurWochenendeFeiertag === true);
    setEditObjSaisonStart(liege.saisonStart || saisonVon);
    setEditObjSaisonEnde(liege.saisonEnde || saisonBis);
    setEditObjRaeumPlan(liege.raeumPlan || '');
  };

  const saveEditLiege = async () => {
    if (!editingLiege) return;
    if (koordinatenAbrufAktivRef.current) return;
    if (!editObjSaisonStart || !editObjSaisonEnde || editObjSaisonStart > editObjSaisonEnde) {
      zeigeMeldung('Das Saisonende muss am oder nach dem Saisonstart liegen.');
      return;
    }

    koordinatenAbrufAktivRef.current = true;
    setKoordinatenWirdErmittelt(true);
    try {
      const adresseUnveraendert = editObjAddress.trim() === editingLiege.address.trim();
      const vorhandeneKoordinaten = leseGueltigeKoordinaten(editingLiege);
      const koordinaten = adresseUnveraendert
        && vorhandeneKoordinaten
        ? { ...vorhandeneKoordinaten, quelle: 'vorhanden' as const }
        : await ermittleLiegenschaftKoordinaten(editObjAddress);

      setLiegenschaften(liegenschaften.map(l => l.id === editingLiege.id ? {
        ...l,
        name: editObjName,
        address: editObjAddress,
        size: editObjSize,
        material: editObjMaterial,
        reihenfolge: Number(editObjReihenfolge) || 1,
        nurWochenendeFeiertag: editObjNurWochenendeFeiertag,
        saisonStart: editObjSaisonStart,
        saisonEnde: editObjSaisonEnde,
        lat: koordinaten.lat,
        lon: koordinaten.lon,
        raeumPlan: editObjRaeumPlan || undefined
      } : l));
      setEditingLiege(null);
      zeigeMeldung(koordinaten.quelle === 'regionaler-fallback'
        ? `Liegenschaft aktualisiert; Geocoding fehlgeschlagen (${koordinaten.grund}). Näherungskoordinaten für ${koordinaten.region} verwendet.`
        : 'Liegenschaft aktualisiert!');
    } finally {
      koordinatenAbrufAktivRef.current = false;
      setKoordinatenWirdErmittelt(false);
    }
  };

  const deleteHistoryItem = (id: number) => {
    setDialogConfig({
      visible: true,
      titel: 'Einsatz löschen',
      text: 'Möchtest du diesen Einsatz wirklich aus der Historie löschen?',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        setHistory(prev => prev.filter(item => item.id !== id));
        setDialogConfig(prev => ({ ...prev, visible: false }));
        zeigeMeldung('Einsatz gelöscht.');
      },
      onCancel: () => setDialogConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const teileBerichtMitHindernisfoto = (
    berichtText: string,
    betreffText: string,
    objName: string,
    hindernisFotoUrl?: string,
  ) => {
    if (!hindernisFotoUrl) return false;

    const bildDaten = hindernisFotoUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
    const dateiname = `Winterdienst_Foto_${objName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}.jpg`;
    if (bildDaten && typeof navigator.share === 'function' && navigator.canShare) {
      const bildBytes = Uint8Array.from(atob(bildDaten[2]), zeichen => zeichen.charCodeAt(0));
      const fotoDatei = new File([bildBytes], dateiname, { type: bildDaten[1] });

      if (navigator.canShare({ files: [fotoDatei] })) {
        void navigator.clipboard?.writeText(betreffText).catch((error: unknown) => {
          console.error('Berichtsbetreff konnte nicht in die Zwischenablage kopiert werden:', error);
        });
        void navigator.share({
          title: betreffText,
          text: `${betreffText}\n\n${berichtText}`,
          files: [fotoDatei]
        }).catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('Bericht mit Hindernisfoto konnte nicht geteilt werden:', error);
          zeigeMeldung('Bericht und Hindernisfoto konnten nicht geteilt werden.');
        });
        return true;
      }
    }

    const downloadLink = document.createElement('a');
    downloadLink.href = hindernisFotoUrl;
    downloadLink.download = dateiname;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    zeigeMeldung('Hindernisfoto heruntergeladen. Bitte füge es im geöffneten Bericht manuell an.');
    return false;
  };

  const aktualisiereBerichtStatus = (
    passt: (einsatz: EinsatzLog) => boolean,
    status: NonNullable<EinsatzLog['berichtStatus']>
  ) => {
    const berichtGesendetAm = status === 'offen' || status === 'keine_meldung_gewuenscht'
      ? undefined
      : new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    setHistory(prev => prev.map(einsatz => passt(einsatz)
      ? { ...einsatz, berichtStatus: status, berichtGesendetAm }
      : einsatz));
  };

  const sendeHistorienBericht = (item: EinsatzLog) => {
    const gefundenerKunde = kunden.find(k => k.firma === item.kundeName);
    const zielWhatsapp = gefundenerKunde ? gefundenerKunde.whatsapp : '+4915100000000';
    const zielEmail = gefundenerKunde ? gefundenerKunde.email : 'kontakt@beispiel.de';
    const hatHindernisFoto = Boolean(item.hindernisFotoUrl);
    const liegenschaft = liegenschaften.find(objekt =>
      objekt.name === item.objName && (!gefundenerKunde || objekt.kundeId === gefundenerKunde.id)
    ) ?? liegenschaften.find(objekt => objekt.name === item.objName);
    const berichtDaten: KundenBerichtDaten = {
      kundeName: item.kundeName,
      datum: item.date.split(' ')[0],
      wetter: item.wetter,
      liegenschaften: [{
        name: item.objName,
        address: item.objAddress?.trim() || liegenschaft?.address || 'Anschrift nicht hinterlegt',
        timestamp: item.timestamp,
        type: item.type,
        duration: item.duration,
        zeitFensterAnzeige: item.zeitFensterAnzeige ?? item.duration,
        hindernisInfo: item.hindernisInfo
      }]
    };
    const berichtText = erstelleKundenBerichtText(berichtDaten, 'plain');
    const berichtTextWhatsapp = erstelleKundenBerichtText(berichtDaten, 'whatsapp');
    const betreffText = `Einsatznachweis Winterdienst – ${item.kundeName} (${berichtDaten.datum})`;
    const mailSubject = encodeURIComponent(betreffText);
    const mailBody = encodeURIComponent(berichtText);

    setDialogConfig({
      visible: true,
      titel: 'Bericht nachträglich senden',
      text: hatHindernisFoto
        ? `Möchtest du den Bericht für "${item.kundeName}" (${item.objName}) mit dem Hindernisfoto teilen? Es öffnet sich die Teilen-Auswahl deines Geräts.`
        : `Möchtest du den Bericht für "${item.kundeName}" (${item.objName}) per WhatsApp oder E-Mail senden?`,
      confirmText: hatHindernisFoto ? '📸 Bericht + Foto teilen (WhatsApp / App)' : 'WhatsApp senden',
      secondaryText: hatHindernisFoto ? '✉️ Als E-Mail mit Betreff öffnen (ohne Foto)' : '✉️ E-Mail senden',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        setDialogConfig(prev => ({ ...prev, visible: false }));
        if (teileBerichtMitHindernisfoto(berichtText, betreffText, item.objName, item.hindernisFotoUrl)) {
          aktualisiereBerichtStatus(einsatz => einsatz.id === item.id, 'gesendet_teilen');
          return;
        }
        const cleanPhone = zielWhatsapp.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(berichtTextWhatsapp)}`, '_blank');
        aktualisiereBerichtStatus(einsatz => einsatz.id === item.id, 'gesendet_whatsapp');
      },
      onSecondary: () => {
        setDialogConfig(prev => ({ ...prev, visible: false }));
        window.location.href = `mailto:${zielEmail}?subject=${mailSubject}&body=${mailBody}`;
        aktualisiereBerichtStatus(einsatz => einsatz.id === item.id, 'gesendet_email');
      },
      onCancel: () => setDialogConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const oeffneRaeumPlanAnsicht = (planUrl?: string) => {
    if (!planUrl) {
      zeigeMeldung('Kein Räumplan hinterlegt.');
      return;
    }
    const win = window.open();
    const istPdf = planUrl.toLowerCase().startsWith('data:application/pdf')
      || /\.pdf(?:$|[?#])/i.test(planUrl);
    win?.document.write(`
      <html>
        <head><title>Räumplan Ansicht</title></head>
        <body style="margin:0; background:#111; display:flex; justify-content:center; align-items:center; height:100vh;">
          ${istPdf
            ? `<iframe src="${planUrl}" style="width:100%; height:100vh; border:none;"></iframe>`
            : `<img src="${planUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`}
        </body>
      </html>
    `);
  };

  const komprimiereBild = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 600;
        const maxHeight = 450;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        callback(dataUrl);
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const druckeEinsatzBericht = (item: EinsatzLog) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      zeigeMeldung('Fehler beim Erstellen des PDF-Berichts.');
      return;
    }

    doc.write(`
      <html>
        <head>
          <title>Einsatzbericht - ${item.kundeName} (${item.objName})</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #111827; }
            h1 { color: #598f1e; border-bottom: 2px solid #8cc63f; padding-bottom: 10px; font-size: 1.5rem; }
            .meta { background: #f4fce3; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #8cc63f; }
            .box { margin-top: 20px; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; }
            ul { line-height: 1.6; }
            .foto-container { margin-top: 15px; }
            .foto-container img { max-width: 100%; max-height: 250px; border-radius: 6px; border: 1px solid #d1d5db; margin-top: 5px; display: block; }
            .footer { margin-top: 50px; font-size: 0.85rem; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>❄️ Becdra FM Winterdienst - Einsatzbericht</h1>
          <div class="meta">
            <p><b>Startpunkt (Betrieb/Basis):</b> ${startPunkt}</p>
            <p><b>Kunde / Auftraggeber:</b> ${item.kundeName}</p>
            <p><b>Liegenschaft / Objekt:</b> ${item.objName}</p>
            <p><b>Datum & Uhrzeit:</b> ${item.date}</p>
          </div>
          <div class="box">
            <h3>Einsatz-Details (Intern):</h3>
            <ul>
              <li><b>Wetterlage:</b> ${item.wetter}</li>
              <li><b>Art des Einsatzes:</b> ${item.type}</li>
              <li><b>Echte Arbeitszeit (intern):</b> ${typeof item.echteMinuten === 'number' ? `${item.echteMinuten} Min.` : 'Nicht erfasst'}</li>
              <li><b>Kunden-Zeitfenster:</b> ${item.zeitFensterAnzeige ?? item.duration}</li>
              <li><b>Materialverbrauch:</b> ${item.materialUsed}</li>
              <li><b>Fahrstrecke:</b> ${item.kmGefahren} (~${item.spritKosten} Sprit)</li>
              ${item.fotoName ? `<li><b>Fotodokumentation:</b> ${item.fotoName}</li>` : ''}
              ${item.hindernisInfo ? `<li><b style="color:red;">Hindernis / Vorfall:</b> ${item.hindernisInfo}</li>` : ''}
            </ul>

            ${item.fotoUrl ? `
              <div class="foto-container">
                <b>Aufgenommenes Foto (Fläche):</b>
                <img src="${item.fotoUrl}" alt="Einsatzfoto" />
              </div>
            ` : ''}

            ${item.hindernisFotoUrl ? `
              <div class="foto-container">
                <b>Hindernis-Foto:</b>
                <img src="${item.hindernisFotoUrl}" alt="Hindernisfoto" style="border-color: #ef4444;" />
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Becdra FM Kleinunternehmen • Garten- und Hausmeisterservice Michael Beckers • ${startPunkt}</p>
            <p>Rechtssicher dokumentiert per Becdra FM Winterdienst-App.</p>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              setTimeout(() => window.frameElement?.remove(), 2000);
            }, 500);
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const fetchLiveWetter = async () => {
    try {
      setWetterLage('Wetter wird ermittelt...');
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.75&longitude=6.40&current=temperature_2m,precipitation');
      const data = await response.json();
      if (data && data.current) {
        const temp = data.current.temperature_2m;
        const precip = data.current.precipitation;
        let beschreibung = `Temp: ${temp}°C`;
        if (precip > 0) beschreibung += `, Niederschlag: ${precip}mm`;
        if (temp <= 2) beschreibung += ' (Frostgefahr / Überfrieren)';
        else beschreibung += ' (Stabile Lage)';
        setWetterLage(beschreibung);
      } else {
        setWetterLage('Leichtes Überfrieren (Standard)');
      }
    } catch {
      setWetterLage('Leichtes Überfrieren (Offline)');
    }
  };

  const startEinsatzMitWaze = (kunde: Kunde, obj: Liegenschaft) => {
    window.open(`https://waze.com/ul?q=${encodeURIComponent(obj.address)}&navigate=yes`, '_blank');
    setActiveKunde(kunde);
    setActiveObjekt(obj);
    setStartTime(new Date());
    setEinsatzType('streuen');
    setArbeitszeitStatus({ pauseBeginn: null, pausendauerMs: 0 });
    setMaterialVerbrauchKg('');
    setAufgenommenesFoto(null);
    setAufgenommenesFotoUrl(null);
    setHindernisNotiz('');
    setHindernisFoto(null);
    setHindernisFotoUrl(null);
    setShowActiveRaeumPlanPopup(false);
    fetchLiveWetter();

    accumulatedKmRef.current = 0;
    lastCoordsRef.current = null;
    setGefahreneKm('0');
  };

  useEffect(() => {
    if (!activeKunde || !activeObjekt || !startTime || !navigator.geolocation) return;

    lastCoordsRef.current = null;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const currentLat = position.coords.latitude;
        const currentLon = position.coords.longitude;
        const currentCoords = { lat: currentLat, lon: currentLon };

        if (lastCoordsRef.current) {
          const lat1 = (lastCoordsRef.current.lat * Math.PI) / 180;
          const lat2 = (currentLat * Math.PI) / 180;
          const deltaLat = lat2 - lat1;
          const deltaLon = ((currentLon - lastCoordsRef.current.lon) * Math.PI) / 180;
          const a =
            Math.sin(deltaLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
          const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          if (distance > 0.005) {
            accumulatedKmRef.current += distance;
            setGefahreneKm(Math.max(1, Math.round(accumulatedKmRef.current)).toString());
          }
        }
        lastCoordsRef.current = currentCoords;
      },
      (error) => {
        console.error("GPS-Tracking Fehler:", error);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeKunde, activeObjekt, startTime]);

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const clearActiveEinsatz = () => {
    localStorage.removeItem('becdra_active_kunde');
    localStorage.removeItem('becdra_active_objekt');
    localStorage.removeItem('becdra_starttime');
    localStorage.removeItem('becdra_gefahrene_km');
    localStorage.removeItem('becdra_arbeitszeit');
    setActiveKunde(null);
    setActiveObjekt(null);
    setStartTime(null);
    setArbeitszeitStatus({ pauseBeginn: null, pausendauerMs: 0 });
    setGefahreneKm('0');
  };

  const toggleEinsatzPause = () => {
    setArbeitszeitStatus(status => {
      if (status.pauseBeginn !== null) {
        return {
          pauseBeginn: null,
          pausendauerMs: status.pausendauerMs + Math.max(0, Date.now() - status.pauseBeginn)
        };
      }
      return { ...status, pauseBeginn: Date.now() };
    });
  };

  const cancelEinsatz = () => {
    setDialogConfig({
      visible: true,
      titel: 'Einsatz abbrechen',
      text: 'Möchtest du diesen Einsatz wirklich abbrechen? Die bisherigen Eingaben werden nicht gespeichert.',
      confirmText: 'Ja, abbrechen',
      cancelText: 'Weiterarbeiten',
      onConfirm: () => {
        stopGpsTracking();
        clearActiveEinsatz();
        setAufgenommenesFoto(null);
        setAufgenommenesFotoUrl(null);
        setMaterialVerbrauchKg('');
        setHindernisNotiz('');
        setHindernisFoto(null);
        setHindernisFotoUrl(null);
        setShowActiveRaeumPlanPopup(false);
        setDialogConfig(prev => ({ ...prev, visible: false }));
        zeigeMeldung('Einsatz abgebrochen.');
      },
      onCancel: () => setDialogConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const handleFotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAufgenommenesFoto(file.name);
      komprimiereBild(file, (compressedUrl) => {
        setAufgenommenesFotoUrl(compressedUrl);
      });
    }
  };

  const handleHindernisFotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setHindernisFoto(file.name);
      komprimiereBild(file, (compressedUrl) => {
        setHindernisFotoUrl(compressedUrl);
      });
    }
  };

  const finishEinsatz = () => {
    if (!activeKunde || !activeObjekt || !startTime) return;
    const eingabeVerbrauch = materialVerbrauchKg.trim();
    const verbrauchMenge = eingabeVerbrauch === '' ? 0 : Number(eingabeVerbrauch);
    if (!Number.isFinite(verbrauchMenge) || verbrauchMenge < 0) {
      zeigeMeldung('Bitte einen gültigen Streumittelverbrauch eingeben.');
      return;
    }
    const endTime = new Date();
    const aktuellePauseMs = arbeitszeitStatus.pauseBeginn === null
      ? 0
      : Math.max(0, endTime.getTime() - arbeitszeitStatus.pauseBeginn);
    const einsatzZeiten = berechneEinsatzZeitenRückwärts(
      startTime,
      endTime,
      arbeitszeitStatus.pausendauerMs + aktuellePauseMs
    );
    const kmNum = Number(gefahreneKm) || 0;
    const materialId = normalisiereStreuMittelId(activeObjekt.material);
    const materialInfo = STREUMITTEL.find(material => material.id === materialId);
    if (!materialInfo) {
      zeigeMeldung('Das Streumittel des Objekts ist ungültig.');
      return;
    }

    stopGpsTracking();
    const berechneteSpritKosten = (kmNum * Number(verbrauchAuf100Km) / 100) * (Number(spritPreisProLiter) || 1.80);
    const gespeichertesHindernisFotoUrl = hindernisFotoUrl;
    const gespeichertesHindernisFoto = hindernisFoto;

    setLagerBestaende(prev => ({ ...prev, [materialId]: prev[materialId] - verbrauchMenge }));

    const newLog: EinsatzLog = {
      id: Date.now(),
      kundeName: activeKunde.firma,
      objName: activeObjekt.name,
      objAddress: activeObjekt.address,
      date: endTime.toLocaleDateString('de-DE') + ' ' + endTime.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}),
      timestamp: endTime.getTime(),
      wetter: wetterLage,
      type: einsatzType,
      duration: `${einsatzZeiten.kundenMinuten} Min.`,
      echteMinuten: einsatzZeiten.echteMinuten,
      zeitFensterAnzeige: einsatzZeiten.zeitFensterAnzeige,
      materialUsed: `${verbrauchMenge.toLocaleString('de-DE')} ${materialInfo.einheit} (${materialInfo.name})`,
      materialId,
      materialVerbrauchMenge: verbrauchMenge,
      materialVerbrauchKg: materialInfo.einheit === 'kg' ? verbrauchMenge : undefined,
      materialVerbrauchEinheit: materialInfo.einheit,
      materialPreisProEinheit: berechnePreisProEinheit(materialPreise[materialId]),
      kmGefahren: `${kmNum} km`,
      spritKosten: `${berechneteSpritKosten.toFixed(2)} €`,
      verbrauchAuf100Km: Number(verbrauchAuf100Km) || 0,
      spritPreisProLiter: Number(spritPreisProLiter) || 1.80,
      fotoName: aufgenommenesFoto || undefined,
      fotoUrl: aufgenommenesFotoUrl || undefined,
      hindernisInfo: hindernisNotiz ? hindernisNotiz : undefined,
      hindernisFoto: gespeichertesHindernisFoto || undefined,
      hindernisFotoUrl: gespeichertesHindernisFotoUrl || undefined
    };

    setHistory(prev => [newLog, ...prev]);

    const kundeId = activeKunde.id;
    const jetzt = new Date();
    const heuteDatum = jetzt.toLocaleDateString('de-DE');
    const heuteIso = datumAlsIso(jetzt);
    const kundenLiegenAktiv = liegenschaften.filter(liege =>
      liege.kundeId === kundeId
      && liegtImBetreuungszeitraum(liege, heuteIso)
      && (!liege.nurWochenendeFeiertag || istWochenendeOderFeiertag(jetzt))
    );
    const aktiveObjektnamen = new Set(kundenLiegenAktiv.map(liege => liege.name));
    const heutigeEinsaetzeDesKunden = [...history, newLog]
      .filter(einsatz =>
        einsatz.kundeName === activeKunde.firma
        && einsatz.date.startsWith(heuteDatum)
        && aktiveObjektnamen.has(einsatz.objName)
      )
      .map(einsatz => {
        const liegenschaft = liegenschaften.find(
          liege => liege.kundeId === kundeId && liege.name === einsatz.objName
        );
        return {
          name: einsatz.objName,
          address: einsatz.objAddress?.trim() || liegenschaft?.address || 'Anschrift nicht hinterlegt',
          timestamp: einsatz.timestamp,
          type: einsatz.type,
          duration: einsatz.duration,
          zeitFensterAnzeige: einsatz.zeitFensterAnzeige ?? einsatz.duration,
          hindernisInfo: einsatz.hindernisInfo
        };
      });

    const alleObjekteDesKundenNamen = kundenLiegenAktiv.map(l => l.name);
    const erledigteObjekteNamen = heutigeEinsaetzeDesKunden.map(einsatz => einsatz.name);
    const alleErledigt = alleObjekteDesKundenNamen.every(name => erledigteObjekteNamen.includes(name));

    const geforderterKunde = activeKunde;
    clearActiveEinsatz();
    setAufgenommenesFoto(null);
    setAufgenommenesFotoUrl(null);
    setMaterialVerbrauchKg('');
    setHindernisNotiz('');
    setHindernisFoto(null);
    setHindernisFotoUrl(null);
    setShowActiveRaeumPlanPopup(false);

    if (alleErledigt && alleObjekteDesKundenNamen.length > 0) {
      const berichtDaten: KundenBerichtDaten = {
        kundeName: geforderterKunde.firma,
        datum: heuteDatum,
        wetter: wetterLage,
        liegenschaften: heutigeEinsaetzeDesKunden
      };
      const berichtTextPlain = erstelleKundenBerichtText(berichtDaten, 'plain');
      const berichtTextWhatsapp = erstelleKundenBerichtText(berichtDaten, 'whatsapp');
      const betreffText = `Einsatznachweis Winterdienst – ${geforderterKunde.firma} (${heuteDatum})`;

      const bevorzugterKanal = geforderterKunde.bevorzugterKanal ?? 'whatsapp';
      if (bevorzugterKanal === 'keine') {
        aktualisiereBerichtStatus(
          einsatz => einsatz.kundeName === geforderterKunde.firma && einsatz.date.startsWith(heuteDatum),
          'keine_meldung_gewuenscht'
        );
        zeigeMeldung('Einsatz gespeichert (Keine Kundenmeldung eingestellt).');
      } else {
        const kanalName = bevorzugterKanal === 'whatsapp' ? 'WhatsApp' : 'E-Mail';
        const sendeRueckmeldung = (kanal: 'whatsapp' | 'email', fotoTeilen = false) => {
          setDialogConfig(prev => ({ ...prev, visible: false }));
          if (fotoTeilen && teileBerichtMitHindernisfoto(
            berichtTextPlain,
            betreffText,
            activeObjekt.name,
            gespeichertesHindernisFotoUrl || undefined
          )) {
            aktualisiereBerichtStatus(
              einsatz => einsatz.kundeName === geforderterKunde.firma && einsatz.date.startsWith(heuteDatum),
              'gesendet_teilen'
            );
            zeigeMeldung(`✅ Rückmeldung für ${geforderterKunde.firma} wurde gestartet!`);
            return;
          }

          if (kanal === 'whatsapp') {
            const cleanPhone = geforderterKunde.whatsapp.replace(/[^0-9]/g, '');
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(berichtTextWhatsapp)}`, '_blank');
          } else {
            const mailSubject = encodeURIComponent(betreffText);
            const mailBody = encodeURIComponent(berichtTextPlain);
            window.location.href = `mailto:${geforderterKunde.email}?subject=${mailSubject}&body=${mailBody}`;
          }
          aktualisiereBerichtStatus(
            einsatz => einsatz.kundeName === geforderterKunde.firma && einsatz.date.startsWith(heuteDatum),
            kanal === 'whatsapp' ? 'gesendet_whatsapp' : 'gesendet_email'
          );
          zeigeMeldung(`✅ Rückmeldung für ${geforderterKunde.firma} wurde gestartet!`);
        };

        setDialogConfig({
          visible: true,
          titel: 'Kunde vollständig betreut',
          text: `Alle Liegenschaften von "${geforderterKunde.firma}" sind erledigt. Soll die Rückmeldung jetzt per ${kanalName} gesendet werden?`,
          confirmText: gespeichertesHindernisFotoUrl
            ? '✅ Ja, Bericht + Foto senden'
            : `✅ Ja, per ${kanalName} senden`,
          cancelText: '⏰ Später senden',
          onConfirm: () => sendeRueckmeldung(bevorzugterKanal, Boolean(gespeichertesHindernisFotoUrl)),
          onCancel: () => {
            setDialogConfig(prev => ({ ...prev, visible: false }));
            aktualisiereBerichtStatus(
              einsatz => einsatz.kundeName === geforderterKunde.firma && einsatz.date.startsWith(heuteDatum),
              'offen'
            );
            zeigeMeldung('⏳ Gespeichert – Bericht in Historie als OFFEN markiert.');
          }
        });
      }
    } else {
      zeigeMeldung('Einsatz erfolgreich gespeichert!');
    }
  };

  const oeffneNotfallSammelInfo = () => {
    const jetzt = new Date();
    const heuteIso = datumAlsIso(jetzt);
    const kundenIdsHeute = new Set(
      liegenschaften
        .filter(liege =>
          liegtImBetreuungszeitraum(liege, heuteIso)
          && (!liege.nurWochenendeFeiertag || istWochenendeOderFeiertag(jetzt))
        )
        .map(liege => liege.kundeId)
    );
    const anzahlKundenHeute = kunden.filter(kunde => kundenIdsHeute.has(kunde.id)).length;
    if (anzahlKundenHeute === 0) {
      zeigeMeldung('Für heute sind keine aktiven Kunden-Liegenschaften hinterlegt.');
      return;
    }

    const vorlagen = [
      'Witterungsbedingt im Noteinsatz – Verzögerung auf der Tour',
      'Schwerer Wetterumsturz – Zweiter Durchgang startet'
    ];
    const bereiteVorlageVor = (vorlage: string) => {
      const text = `🚨 Wichtige Information zum Winterdienst\n\n${vorlage}\n\nWir informieren Sie, sobald es Neuigkeiten gibt.\n\nBecdra FM`;
      const clipboardPromise = navigator.clipboard
        ? navigator.clipboard.writeText(text)
        : Promise.reject(new Error('Die Zwischenablage ist in diesem Browser nicht verfügbar.'));

      if (typeof navigator.share === 'function') {
        void navigator.share({ title: 'Winterdienst – Sammel-Info', text }).catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('Notfall-Sammelinfo konnte nicht über die Teilen-Auswahl geöffnet werden:', error);
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      }

      void clipboardPromise.then(() => {
        zeigeMeldung(`Notfalltext kopiert. WhatsApp-Teilen für ${anzahlKundenHeute} heutige Kunden ist vorbereitet – Empfänger bitte auswählen.`);
      }).catch((error: unknown) => {
        console.error('Notfalltext konnte nicht in die Zwischenablage kopiert werden:', error);
        zeigeMeldung('WhatsApp-Teilen ist vorbereitet, aber der Text konnte nicht kopiert werden.');
      });
      setDialogConfig(prev => ({ ...prev, visible: false }));
    };

    setDialogConfig({
      visible: true,
      titel: '🚨 Sammel-Info an heutige Kunden',
      text: `${anzahlKundenHeute} Kunden haben heute aktive Liegenschaften. Wähle eine Vorlage; der Text wird kopiert und die WhatsApp-Teilen-Auswahl geöffnet. Empfänger musst du dort bestätigen.`,
      confirmText: vorlagen[0],
      secondaryText: vorlagen[1],
      cancelText: 'Abbrechen',
      onConfirm: () => bereiteVorlageVor(vorlagen[0]),
      onSecondary: () => bereiteVorlageVor(vorlagen[1]),
      onCancel: () => setDialogConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const uebernehmeOptimierteRoute = (route: { kunde: Kunde | undefined; liege: Liegenschaft }[]): string => {
    const gpsStopps = route.filter(({ liege }) =>
      typeof liege.lat === 'number'
      && Number.isFinite(liege.lat)
      && typeof liege.lon === 'number'
      && Number.isFinite(liege.lon)
    ).length;
    if (gpsStopps < 2) {
      return 'Für die GPS-Optimierung werden mindestens zwei Stopps mit Koordinaten benötigt.';
    }

    const aktiveIds = new Set(route.map(({ liege }) => liege.id));
    const bisherigeAktiveLiegenschaften = [...liegenschaften]
      .filter(liege => aktiveIds.has(liege.id))
      .sort((a, b) => (a.reihenfolge || 1) - (b.reihenfolge || 1));
    const bisherigeReihenfolge = bisherigeAktiveLiegenschaften.map(liege => liege.id);
    const optimierteReihenfolge = route.map(({ liege }) => liege.id);
    const geaenderteStopps = optimierteReihenfolge.reduce(
      (anzahl, liegeId, index) => anzahl + (bisherigeReihenfolge[index] === liegeId ? 0 : 1),
      0
    );
    if (geaenderteStopps === 0) {
      return 'Die Tour ist bereits optimal sortiert!';
    }

    const reihenfolgePlaetze = bisherigeAktiveLiegenschaften.map(liege => liege.reihenfolge || 1);
    const neueReihenfolge = new Map(
      optimierteReihenfolge.map((liegeId, index) => [liegeId, reihenfolgePlaetze[index]])
    );
    setLiegenschaften(vorherige =>
      vorherige.map(liege => {
        const reihenfolge = neueReihenfolge.get(liege.id);
        return reihenfolge === undefined ? liege : { ...liege, reihenfolge };
      })
    );
    return `GPS-Routenoptimierung erfolgreich durchgeführt (${geaenderteStopps} Stopps neu sortiert)`;
  };

  const saisonArchivieren = () => {
    if (history.length === 0) {
      zeigeMeldung('Keine Einsätze in der Historie vorhanden.');
      return;
    }
    if (!saisonVon || !saisonBis || saisonVon > saisonBis) {
      zeigeMeldung('Bitte einen gültigen allgemeinen Saison-Zeitraum festlegen.');
      return;
    }

    setDialogConfig({
      visible: true,
      titel: 'Saison abschließen',
      text: `Möchtest du die aktuelle Saison "${saisonName}" jetzt abschließen und ins Archiv verschieben?`,
      confirmText: 'Ja, archivieren',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        let totalMaterialKg = 0;
        let totalKm = 0;
        let totalSprit = 0;

        history.forEach(item => {
          totalMaterialKg += leseMaterialverbrauchKg(item);
          const kmNum = parseFloat(item.kmGefahren) || 0;
          const spritNum = parseFloat(item.spritKosten.replace(' €', '').replace(',', '.')) || 0;

          totalKm += kmNum;
          totalSprit += spritNum;
        });

        const neuesArchiv: SaisonArchiv = {
          id: Date.now(),
          name: saisonName,
          vonDatum: saisonVon,
          bisDatum: saisonBis,
          einsätze: [...history],
          gesamtSaecke: Math.floor(totalMaterialKg / 25),
          gesamtMaterialKg: totalMaterialKg,
          gesamtKm: totalKm,
          gesamtSprit: totalSprit
        };

        setArchivListe(prev => [neuesArchiv, ...prev]);
        setHistory([]);
        setDialogConfig(prev => ({ ...prev, visible: false }));
        zeigeMeldung(`Saison "${saisonName}" erfolgreich archiviert!`);
      },
      onCancel: () => setDialogConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const exportToCSV = () => {
    if (history.length === 0) {
      zeigeMeldung('Keine Daten für den Export vorhanden.');
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,Kunde;Liegenschaft;Datum;Wetter;Wetter vor Ort;Art;Echte Arbeitszeit (Min.);Kunden-Zeitfenster;Zeitfensteranzeige;Material & Verbrauch;Einheit;Km;Sprit;Besonderheiten/Hindernisse\n";
    history.forEach(item => {
      const csvWert = (wert: string | number | undefined) => `"${String(wert ?? '').replaceAll('"', '""')}"`;
      csvContent += [
        item.kundeName,
        item.objName,
        item.date,
        item.wetter,
        item.wetterVorOrt,
        item.type,
        item.echteMinuten,
        item.duration,
        item.zeitFensterAnzeige,
        item.materialUsed,
        item.materialVerbrauchEinheit,
        item.kmGefahren,
        item.spritKosten,
        item.hindernisInfo
      ].map(csvWert).join(';') + '\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Becdra_FM_Winterdienst_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isObjektErledigtVorKurzem = (objName: string) => {
    const zwStundenMs = 12 * 60 * 60 * 1000;
    return history.some(item => item.objName === objName && (Date.now() - item.timestamp) < zwStundenMs);
  };

  const alleLiegenschaftenSortiert = liegenschaften.map(liege => {
    const kunde = kunden.find(k => k.id === liege.kundeId);
    return { kunde, liege };
  }).sort((a, b) => (a.liege.reihenfolge || 1) - (b.liege.reihenfolge || 1));

  const heuteDatumString = new Date().toLocaleDateString('de-DE');

  const berechneStatistikWerte = (einsätzeListe: EinsatzLog[]) => {
    const anzahl = einsätzeListe.length;
    let km = 0;
    let sprit = 0;
    let materialKg = 0;

    einsätzeListe.forEach(item => {
      km += parseFloat(item.kmGefahren) || 0;
      sprit += parseFloat(item.spritKosten.replace(' €', '').replace(',', '.')) || 0;
      materialKg += leseMaterialverbrauchKg(item);
    });

    return { anzahl, km: Math.round(km), sprit: sprit.toFixed(2), materialKg: Math.round(materialKg * 10) / 10 };
  };

  const heuStat = berechneStatistikWerte(history.filter(h => h.date.startsWith(heuteDatumString)));
  const gesamtStat = berechneStatistikWerte(history);

  const bgApp = darkMode ? '#14171a' : '#f4f6f8';
  const textApp = darkMode ? '#f3f4f6' : '#1f2937';
  const bgCard = darkMode ? '#22262a' : '#ffffff';
  const borderCard = darkMode ? '#374151' : '#e5e7eb';
  const textSub = darkMode ? '#9ca3af' : '#6b7280';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bgApp, color: textApp, fontFamily: 'sans-serif', paddingBottom: '90px', transition: 'background-color 0.3s ease' }}>
      
      {statusMeldung && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', top: 'max(16px, env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', width: 'max-content', maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box', textAlign: 'center', backgroundColor: '#111827', color: '#ffffff', padding: '14px 20px', borderRadius: '12px', zIndex: 10000, boxShadow: '0 10px 30px rgba(0,0,0,0.35)', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: 1.4, border: '2px solid #8cc63f' }}>
          ✨ {statusMeldung}
        </div>
      )}

      {/* Liegenschaft bearbeiten (inkl. Räumplan) */}
      {editingLiege && (
        <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100dvh', boxSizing: 'border-box', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'max(16px, env(safe-area-inset-top)) 16px calc(90px + env(safe-area-inset-bottom))', overflowY: 'auto' }}>
          <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', color: textApp, padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '92%', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100dvh - 122px)', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>📍 Liegenschaft bearbeiten</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, marginBottom: '2px' }}>Objektname</label>
              <input type="text" value={editObjName} onChange={e => setEditObjName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, marginBottom: '2px' }}>Adresse</label>
              <input type="text" value={editObjAddress} onChange={e => setEditObjAddress(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
              <p role="status" style={{ fontSize: '0.7rem', color: leseGueltigeKoordinaten(editingLiege) && editObjAddress.trim() === editingLiege.address.trim() ? '#5b9b20' : textSub, margin: '4px 0 0' }}>
                {koordinatenWirdErmittelt
                  ? '📍 GPS-Koordinaten werden ermittelt...'
                  : leseGueltigeKoordinaten(editingLiege) && editObjAddress.trim() === editingLiege.address.trim()
                    ? '✓ GPS aktiv'
                    : editObjAddress.trim() !== editingLiege.address.trim()
                      ? '📍 GPS wird nach Adressänderung beim Speichern aktualisiert'
                      : '📍 GPS-Koordinaten werden beim Speichern ermittelt'}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, marginBottom: '2px' }}>Fläche (m²)</label>
                <input type="text" value={editObjSize} onChange={e => setEditObjSize(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, marginBottom: '2px' }}>Tour-Nr.</label>
                <input type="number" value={editObjReihenfolge} onChange={e => setEditObjReihenfolge(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, marginBottom: '2px' }}>Streumittel</label>
              <select value={editObjMaterial} onChange={e => setEditObjMaterial(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }}>
                {streuMittelListe.map(streuMittel => (
                  <option key={streuMittel.id} value={streuMittel.id}>{streuMittel.name}</option>
                ))}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: textApp, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={editObjNurWochenendeFeiertag}
                onChange={e => setEditObjNurWochenendeFeiertag(e.target.checked)}
              />
              Nur am Wochenende und an Feiertagen anzeigen
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#f9fafb' }}>
              <strong style={{ color: textApp, fontSize: '0.78rem' }}>📅 Betreuungszeitraum</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button type="button" onClick={() => {
                  const startJahr = Number(editObjSaisonStart.slice(0, 4)) || new Date().getFullYear();
                  setEditObjSaisonStart(`${startJahr}-11-01`);
                  setEditObjSaisonEnde(`${startJahr + 1}-03-31`);
                }} style={{ border: '1px solid ' + borderCard, borderRadius: '7px', padding: '8px 5px', backgroundColor: darkMode ? '#22262a' : '#ffffff', color: textApp, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                  Volle Saison (01.11. – 31.03.)
                </button>
                <button type="button" onClick={() => {
                  const startJahr = Number(editObjSaisonStart.slice(0, 4)) || new Date().getFullYear();
                  setEditObjSaisonStart(`${startJahr + 1}-01-01`);
                  setEditObjSaisonEnde(`${startJahr + 1}-03-31`);
                }} style={{ border: '1px solid ' + borderCard, borderRadius: '7px', padding: '8px 5px', backgroundColor: darkMode ? '#22262a' : '#ffffff', color: textApp, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                  Ab Januar (01.01. – 31.03.)
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <label style={{ color: textSub, fontSize: '0.7rem', fontWeight: 600 }}>
                  Aktiv von
                  <input type="date" value={editObjSaisonStart} onChange={event => setEditObjSaisonStart(event.target.value)} required style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '8px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.78rem' }} />
                </label>
                <label style={{ color: textSub, fontSize: '0.7rem', fontWeight: 600 }}>
                  Aktiv bis
                  <input type="date" value={editObjSaisonEnde} onChange={event => setEditObjSaisonEnde(event.target.value)} required style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '8px', borderRadius: '7px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.78rem' }} />
                </label>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, marginBottom: '2px' }}>Räumplan (Nachträglich hinzufügen / ändern)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <label style={{ flex: 1, border: '2px dashed #8cc63f', backgroundColor: darkMode ? '#14171a' : '#f4fce3', color: '#8cc63f', padding: '8px', borderRadius: '6px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem' }}>
                  📸 Foto
                  <input type="file" accept="image/*" capture="environment" onChange={handleEditRaeumPlanUpload} style={{ display: 'none' }} />
                </label>
                <label style={{ flex: 1, border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, padding: '8px', borderRadius: '6px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem' }}>
                  📁 Datei
                  <input type="file" accept="image/*,application/pdf" onChange={handleEditRaeumPlanUpload} style={{ display: 'none' }} />
                </label>
              </div>
              {editObjRaeumPlan && <span style={{ fontSize: '0.7rem', color: '#8cc63f', display: 'block', marginTop: '2px', fontWeight: 'bold' }}>✓ Räumplan hinterlegt!</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button onClick={() => setEditingLiege(null)} disabled={koordinatenWirdErmittelt} style={{ flex: 1, backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: koordinatenWirdErmittelt ? 'wait' : 'pointer' }}>
                Abbrechen
              </button>
              <button onClick={saveEditLiege} disabled={koordinatenWirdErmittelt} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: koordinatenWirdErmittelt ? 'wait' : 'pointer', opacity: koordinatenWirdErmittelt ? 0.7 : 1 }}>
                {koordinatenWirdErmittelt ? 'Koordinaten werden ermittelt...' : 'Speichern'}
              </button>
            </div>
            {koordinatenWirdErmittelt && (
              <p role="status" style={{ color: textSub, fontSize: '0.75rem', margin: 0 }}>📍 Koordinaten werden ermittelt...</p>
            )}
          </div>
        </div>
      )}

      <DialogModal
        visible={dialogConfig.visible}
        titel={dialogConfig.titel}
        text={dialogConfig.text}
        darkMode={darkMode}
        bgCard={bgCard}
        textApp={textApp}
        textSub={textSub}
        borderCard={borderCard}
        onConfirm={dialogConfig.onConfirm}
        onSecondary={dialogConfig.onSecondary}
        onCancel={dialogConfig.onCancel}
        confirmText={dialogConfig.confirmText}
        secondaryText={dialogConfig.secondaryText}
        cancelText={dialogConfig.cancelText}
      />

      <Header lagerBestand={lagerBestaende.Salz} darkMode={darkMode} setDarkMode={setDarkMode} />

      <main style={{ maxWidth: '440px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {activeObjekt && activeKunde ? (
          <AktiverEinsatz
            activeKunde={activeKunde}
            activeObjekt={activeObjekt}
            startPunkt={startPunkt}
            darkMode={darkMode}
            textApp={textApp}
            textSub={textSub}
            borderCard={borderCard}
            bgCard={bgCard}
            wetterLage={wetterLage}
            startTime={startTime}
            pauseBeginn={arbeitszeitStatus.pauseBeginn}
            pausendauerMs={arbeitszeitStatus.pausendauerMs}
            onTogglePause={toggleEinsatzPause}
            einsatzType={einsatzType}
            setEinsatzType={setEinsatzType}
            materialVerbrauchKg={materialVerbrauchKg}
            setMaterialVerbrauchKg={setMaterialVerbrauchKg}
            materialEinheit={STREUMITTEL.find(material => material.id === normalisiereStreuMittelId(activeObjekt.material))?.einheit ?? 'kg'}
            gefahreneKm={gefahreneKm}
            setGefahreneKm={setGefahreneKm}
            aufgenommenesFoto={aufgenommenesFoto}
            hindernisNotiz={hindernisNotiz}
            setHindernisNotiz={setHindernisNotiz}
            hindernisFoto={hindernisFoto}
            showActiveRaeumPlanPopup={showActiveRaeumPlanPopup}
            setShowActiveRaeumPlanPopup={setShowActiveRaeumPlanPopup}
            handleFotoCapture={handleFotoCapture}
            handleHindernisFotoCapture={handleHindernisFotoCapture}
            cancelEinsatz={cancelEinsatz}
            finishEinsatz={finishEinsatz}
          />
        ) : (
          <>
            {activeTab === 'tour' && (
              <TourTab
                startPunkt={startPunkt}
                dwdRegionen={dwdRegionen}
                alleLiegenschaftenSortiert={alleLiegenschaftenSortiert}
                onOptimizeRoute={uebernehmeOptimierteRoute}
                zeigeMeldung={zeigeMeldung}
                darkMode={darkMode}
                textApp={textApp}
                textSub={textSub}
                borderCard={borderCard}
                bgCard={bgCard}
                isObjektErledigtVorKurzem={isObjektErledigtVorKurzem}
                oeffneRaeumPlanAnsicht={oeffneRaeumPlanAnsicht}
                startEinsatzMitWaze={startEinsatzMitWaze}
                onNotfallSammelInfo={oeffneNotfallSammelInfo}
              />
            )}

            {activeTab === 'kunden' && (
              <KundenTab
                kunden={kunden}
                editingKundeId={editingKundeId}
                editFirma={editFirma}
                setEditFirma={setEditFirma}
                editEmail={editEmail}
                setEditEmail={setEditEmail}
                editWhatsapp={editWhatsapp}
                setEditWhatsapp={setEditWhatsapp}
                editBevorzugterKanal={editBevorzugterKanal}
                setEditBevorzugterKanal={setEditBevorzugterKanal}
                neuFirma={neuFirma}
                setNeuFirma={setNeuFirma}
                neuEmail={neuEmail}
                setNeuEmail={setNeuEmail}
                neuWhatsapp={neuWhatsapp}
                setNeuWhatsapp={setNeuWhatsapp}
                neuBevorzugterKanal={neuBevorzugterKanal}
                setNeuBevorzugterKanal={setNeuBevorzugterKanal}
                setEditingKundeId={setEditingKundeId}
                darkMode={darkMode}
                textApp={textApp}
                textSub={textSub}
                borderCard={borderCard}
                bgCard={bgCard}
                addKunde={addKunde}
                startEditKunde={startEditKunde}
                saveEditKunde={saveEditKunde}
                deleteKunde={deleteKunde}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'liegenschaften' && (
              <ObjekteTab
                liegenschaften={liegenschaften}
                kunden={kunden}
                selectedKundeId={selectedKundeId}
                setSelectedKundeId={setSelectedKundeId}
                neuObjName={neuObjName}
                setNeuObjName={setNeuObjName}
                neuObjAddress={neuObjAddress}
                setNeuObjAddress={setNeuObjAddress}
                neuObjSize={neuObjSize}
                setNeuObjSize={setNeuObjSize}
                neuObjMaterial={neuObjMaterial}
                setNeuObjMaterial={setNeuObjMaterial}
                neuObjReihenfolge={neuObjReihenfolge}
                setNeuObjReihenfolge={setNeuObjReihenfolge}
                neuObjNurWochenendeFeiertag={neuObjNurWochenendeFeiertag}
                setNeuObjNurWochenendeFeiertag={setNeuObjNurWochenendeFeiertag}
                neuObjSaisonStart={neuObjSaisonStart}
                setNeuObjSaisonStart={setNeuObjSaisonStart}
                neuObjSaisonEnde={neuObjSaisonEnde}
                setNeuObjSaisonEnde={setNeuObjSaisonEnde}
                neuObjRaeumPlan={neuObjRaeumPlan}
                streuMittelListe={streuMittelListe}
                darkMode={darkMode}
                textApp={textApp}
                textSub={textSub}
                borderCard={borderCard}
                bgCard={bgCard}
                koordinatenWirdErmittelt={koordinatenWirdErmittelt}
                addLiegenschaft={addLiegenschaft}
                handleNeuRaeumPlanUpload={handleNeuRaeumPlanUpload}
                startEditLiege={startEditLiege}
                deleteLiegenschaft={deleteLiegenschaft}
              />
            )}

            {activeTab === 'lager' && (
              <LagerTab
                lagerBestaende={lagerBestaende}
                materialPreise={materialPreise}
                darkMode={darkMode}
                onAdjustLager={anpasseLagerGenau}
              />
            )}

            {/* MEHR TAB */}
            {activeTab === 'mehr' && (
              mehrEinstellungenGeoeffnet ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setMehrEinstellungenGeoeffnet(false)}
                    style={{ alignSelf: 'flex-start', backgroundColor: darkMode ? '#22262a' : '#ffffff', border: '1px solid ' + borderCard, borderRadius: '8px', color: textApp, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', padding: '10px 12px' }}
                  >
                    ← Zurück zu Weitere Bereiche
                  </button>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, color: textApp }}>🛠️ Einstellungen & Wetter</h2>
                  <EinstellungenTab
                    editingStartPunkt={editingStartPunkt}
                    setEditingStartPunkt={setEditingStartPunkt}
                    editingSpritPreis={editingSpritPreis}
                    setEditingSpritPreis={setEditingSpritPreis}
                    editingVerbrauch={editingVerbrauch}
                    setEditingVerbrauch={setEditingVerbrauch}
                    dwdRegionen={dwdRegionen}
                    setDwdRegionen={setDwdRegionen}
                    darkMode={darkMode}
                    textApp={textApp}
                    textSub={textSub}
                    borderCard={borderCard}
                    bgCard={bgCard}
                    onSaveStartpunkt={speichereStartpunkt}
                    onSaveSpritPreis={speichereSpritPreis}
                    onSaveVerbrauch={speichereVerbrauch}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: '0 0 4px 0', color: textApp }}>⚙️ Weitere Bereiche</h2>
                  
                  <button onClick={() => setActiveTab('kunden')} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    👥 Kundenverwaltung
                  </button>
                  <button onClick={() => setActiveTab('liegenschaften')} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    📍 Liegenschaften-Verwaltung (Objekte)
                  </button>
                  <button onClick={() => setActiveTab('history_saison')} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    📋 Tagesberichte, Statistik & Archiv
                  </button>
                  <button onClick={() => setMehrEinstellungenGeoeffnet(true)} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    ⚙️ Einstellungen & Backup
                  </button>
                </div>

                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '2px solid #8cc63f', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>💾 Datensicherung (Backup)</h2>
                  <p style={{ fontSize: '0.75rem', color: textSub, margin: 0, lineHeight: '1.4' }}>
                    Sichere deine Kunden und Liegenschaften als Datei, damit beim Aktualisieren niemals Daten verloren gehen.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={exportDatenBackup} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
                      📥 Backup exportieren
                    </button>
                    
                    <label style={{ flex: 1, backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', cursor: 'pointer' }}>
                      📤 Backup einspielen
                      <input type="file" accept="application/json,.json,text/plain" onChange={importDatenBackup} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
                </div>
              )
            )}

            {(activeTab === 'statistik' || activeTab === 'history_saison') && (
              <HistorieStatistikTab
                activeTab={activeTab}
                history={history}
                saisonName={saisonName}
                heuteDatumString={heuteDatumString}
                heuStat={heuStat}
                gesamtStat={gesamtStat}
                archivListe={archivListe}
                darkMode={darkMode}
                textApp={textApp}
                textSub={textSub}
                borderCard={borderCard}
                bgCard={bgCard}
                setActiveTab={setActiveTab}
                exportToCSV={exportToCSV}
                sendeHistorienBericht={sendeHistorienBericht}
                druckeEinsatzBericht={druckeEinsatzBericht}
                deleteHistoryItem={deleteHistoryItem}
                saisonArchivieren={saisonArchivieren}
                setSaisonName={setSaisonName}
                saisonVon={saisonVon}
                setSaisonVon={setSaisonVon}
                saisonBis={saisonBis}
                setSaisonBis={setSaisonBis}
                verbrauchAuf100Km={Number(verbrauchAuf100Km) || 0}
                spritPreisProLiter={Number(spritPreisProLiter) || 1.80}
                materialPreise={materialPreise}
              />
            )}
          </>
        )}

      </main>

      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeObjekt={activeObjekt}
        darkMode={darkMode}
        textSub={textSub}
        bgCard={bgCard}
        borderCard={borderCard}
      />

    </div>
  );
}