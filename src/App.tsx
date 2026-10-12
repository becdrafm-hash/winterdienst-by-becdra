import React, { useState, useEffect, useRef } from 'react';
import type { EinsatzLog, Kunde, Liegenschaft, SaisonArchiv } from './types';
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

const LAGER_KG_MIGRATION_KEY = 'becdra_lager_kg_migration_v1';

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

  const wert = Number.parseFloat(einsatz.materialUsed.replace(',', '.')) || 0;
  return einsatz.materialUsed.includes('Sack') ? wert * 25 : wert;
}

interface ArbeitszeitStatus {
  pauseBeginn: number | null;
  pausendauerMs: number;
}

export default function App() {
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

  const [lagerAnzahlInput, setLagerAnzahlInput] = useState<string>('1');
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

  const [lagerBestand, setLagerBestand] = useState<number>(() => {
    const saved = localStorage.getItem('becdra_lager');
    const bestand = saved ? Number(JSON.parse(saved)) : 0;
    if (localStorage.getItem(LAGER_KG_MIGRATION_KEY) === 'true') {
      return Number.isFinite(bestand) ? bestand : 0;
    }

    const bestandInKg = Number.isFinite(bestand) ? bestand * 25 : 0;
    localStorage.setItem('becdra_lager', JSON.stringify(bestandInKg));
    localStorage.setItem(LAGER_KG_MIGRATION_KEY, 'true');
    return bestandInKg;
  });

  const [spritPreisProLiter, setSpritPreisProLiter] = useState<string>(() => {
    return localStorage.getItem('becdra_spritpreis') || '1.80';
  });
  const [editingSpritPreis, setEditingSpritPreis] = useState<string>(spritPreisProLiter);
  const [streuMittelListe] = useState<string[]>(['Salz', 'Splitt', 'Sand', 'Lavagranulat', 'Acetat']);

  const [verbrauchAuf100Km, setVerbrauchAuf100Km] = useState<string>(() =>
    localStorage.getItem('becdra_verbrauch') || '10'
  );
  const [editingVerbrauch, setEditingVerbrauch] = useState<string>(verbrauchAuf100Km);

  const [neuFirma, setNeuFirma] = useState('');
  const [neuEmail, setNeuEmail] = useState('');
  const [neuWhatsapp, setNeuWhatsapp] = useState('');

  const [selectedKundeId, setSelectedKundeId] = useState<number>(() => kunden[0]?.id || 1);
  const [neuObjName, setNeuObjName] = useState('');
  const [neuObjAddress, setNeuObjAddress] = useState('');
  const [neuObjSize, setNeuObjSize] = useState('');
  const [neuObjMaterial, setNeuObjMaterial] = useState('Salz');
  const [neuObjReihenfolge, setNeuObjReihenfolge] = useState('1');
  const [neuObjNurWochenendeFeiertag, setNeuObjNurWochenendeFeiertag] = useState(false);
  const [neuObjRaeumPlan, setNeuObjRaeumPlan] = useState<string>('');

  const [editingKundeId, setEditingKundeId] = useState<number | null>(null);
  const [editFirma, setEditFirma] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');

  const [editingLiege, setEditingLiege] = useState<Liegenschaft | null>(null);
  const [editObjName, setEditObjName] = useState('');
  const [editObjAddress, setEditObjAddress] = useState('');
  const [editObjSize, setEditObjSize] = useState('');
  const [editObjMaterial, setEditObjMaterial] = useState('Salz');
  const [editObjReihenfolge, setEditObjReihenfolge] = useState('1');
  const [editObjNurWochenendeFeiertag, setEditObjNurWochenendeFeiertag] = useState(false);
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
  const [einsatzType, setEinsatzType] = useState('Räumen & Streuen');
  const [wetterLage, setWetterLage] = useState('Wird geladen...');
  const [wetterVorOrt, setWetterVorOrt] = useState('');
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

  const [heuteBetreuteProKunde, setHeuteBetreuteProKunde] = useState<{ [kundeId: number]: { name: string; address: string; type: string }[] }>({});
  
  const [history, setHistory] = useState<EinsatzLog[]>(() => {
    try {
      const saved = localStorage.getItem('becdra_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [saisonName, setSaisonName] = useState('Wintersaison 2026/2027');
  const [saisonVon] = useState('01.11.2026');
  const [saisonBis] = useState('31.03.2027');
  const [archivListe, setArchivListe] = useState<SaisonArchiv[]>(() => {
    try {
      const saved = localStorage.getItem('becdra_saison_archiv');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('becdra_kunden', JSON.stringify(kunden));
  }, [kunden]);

  useEffect(() => {
    localStorage.setItem('becdra_liegenschaften', JSON.stringify(liegenschaften));
  }, [liegenschaften]);

  useEffect(() => {
    localStorage.setItem('becdra_lager', JSON.stringify(lagerBestand));
  }, [lagerBestand]);

  useEffect(() => {
    localStorage.setItem('becdra_dwd_regionen', JSON.stringify(dwdRegionen));
  }, [dwdRegionen]);

  useEffect(() => {
    localStorage.setItem('becdra_streumittel', JSON.stringify(streuMittelListe));
  }, [streuMittelListe]);

  useEffect(() => {
    localStorage.setItem('becdra_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('becdra_saison_archiv', JSON.stringify(archivListe));
  }, [archivListe]);

  useEffect(() => {
    if (activeKunde) {
      localStorage.setItem('becdra_active_kunde', JSON.stringify(activeKunde));
    } else {
      localStorage.removeItem('becdra_active_kunde');
    }
  }, [activeKunde]);

  useEffect(() => {
    if (activeObjekt) {
      localStorage.setItem('becdra_active_objekt', JSON.stringify(activeObjekt));
    } else {
      localStorage.removeItem('becdra_active_objekt');
    }
  }, [activeObjekt]);

  useEffect(() => {
    if (startTime) {
      localStorage.setItem('becdra_starttime', startTime.toISOString());
    } else {
      localStorage.removeItem('becdra_starttime');
    }
  }, [startTime]);

  useEffect(() => {
    if (activeKunde && activeObjekt && startTime) {
      localStorage.setItem('becdra_arbeitszeit', JSON.stringify(arbeitszeitStatus));
    } else {
      localStorage.removeItem('becdra_arbeitszeit');
    }
  }, [activeKunde, activeObjekt, startTime, arbeitszeitStatus]);

  useEffect(() => {
    if (activeKunde && activeObjekt && startTime) {
      localStorage.setItem('becdra_gefahrene_km', gefahreneKm);
    } else {
      localStorage.removeItem('becdra_gefahrene_km');
    }
  }, [activeKunde, activeObjekt, startTime, gefahreneKm]);

  const exportDatenBackup = () => {
    const backupData = {
      kunden,
      liegenschaften,
      history,
      lagerBestand,
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
            if (parsed.lagerBestand !== undefined) {
              const backupBestand = Number(parsed.lagerBestand);
              const backupLagerKg = parsed.lagerEinheit === 'kg' ? backupBestand : backupBestand * 25;
              if (!Number.isFinite(backupLagerKg) || backupLagerKg < 0) {
                throw new Error('Der Lagerbestand im Backup ist ungültig.');
              }
              setLagerBestand(backupLagerKg);
              localStorage.setItem(LAGER_KG_MIGRATION_KEY, 'true');
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
    localStorage.setItem('becdra_startpunkt', editingStartPunkt);
    zeigeMeldung('Startpunkt erfolgreich aktualisiert!');
  };

  const speichereSpritPreis = (e: React.FormEvent) => {
    e.preventDefault();
    setSpritPreisProLiter(editingSpritPreis);
    localStorage.setItem('becdra_spritpreis', editingSpritPreis);
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
    localStorage.setItem('becdra_verbrauch', gespeicherterVerbrauch);
    zeigeMeldung('Fahrzeugverbrauch erfolgreich aktualisiert!');
  };

  const anpasseLagerGenau = (modus: 'add' | 'sub') => {
    const wert = Number(lagerAnzahlInput);
    if (!Number.isFinite(wert) || wert <= 0) {
      zeigeMeldung('Bitte eine gültige Menge in kg eingeben.');
      return;
    }

    if (modus === 'add') {
      setLagerBestand(prev => prev + wert);
      zeigeMeldung(`+${wert.toLocaleString('de-DE')} kg zum Lager hinzugefügt.`);
    } else {
      setLagerBestand(prev => Math.max(0, prev - wert));
      zeigeMeldung(`-${wert.toLocaleString('de-DE')} kg aus dem Lager entfernt.`);
    }
    setLagerAnzahlInput('1');
  };

  const addKunde = (e: React.FormEvent) => {
    e.preventDefault();
    if (!neuFirma || !neuEmail) return;
    const neuerKunde: Kunde = {
      id: Date.now(),
      firma: neuFirma,
      email: neuEmail,
      whatsapp: neuWhatsapp
    };
    setKunden([...kunden, neuerKunde]);
    setSelectedKundeId(neuerKunde.id);
    setNeuFirma('');
    setNeuEmail('');
    setNeuWhatsapp('');
    zeigeMeldung('Kunde erfolgreich angelegt!');
  };

  const startEditKunde = (kunde: Kunde) => {
    setEditingKundeId(kunde.id);
    setEditFirma(kunde.firma);
    setEditEmail(kunde.email);
    setEditWhatsapp(kunde.whatsapp);
  };

  const saveEditKunde = (id: number) => {
    setKunden(kunden.map(k => k.id === id ? { ...k, firma: editFirma, email: editEmail, whatsapp: editWhatsapp } : k));
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
    setEditObjMaterial(streuMittelListe.includes(liege.material) ? liege.material : streuMittelListe[0]);
    setEditObjReihenfolge(liege.reihenfolge ? liege.reihenfolge.toString() : '1');
    setEditObjNurWochenendeFeiertag(liege.nurWochenendeFeiertag === true);
    setEditObjRaeumPlan(liege.raeumPlan || '');
  };

  const saveEditLiege = async () => {
    if (!editingLiege) return;
    if (koordinatenAbrufAktivRef.current) return;

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
    hindernisFotoUrl?: string,
    hindernisFotoName?: string
  ) => {
    if (!hindernisFotoUrl) return false;

    const bildDaten = hindernisFotoUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
    const dateiname = `${hindernisFotoName?.replace(/\.[^.]+$/, '') || 'hindernisfoto'}.jpg`;
    if (bildDaten && typeof navigator.share === 'function' && navigator.canShare) {
      const bildBytes = Uint8Array.from(atob(bildDaten[2]), zeichen => zeichen.charCodeAt(0));
      const fotoDatei = new File([bildBytes], dateiname, { type: bildDaten[1] });

      if (navigator.canShare({ files: [fotoDatei] })) {
        void navigator.share({
          title: 'Winterdienst-Einsatzbericht',
          text: berichtText,
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

  const sendeHistorienBericht = (item: EinsatzLog) => {
    const gefundenerKunde = kunden.find(k => k.firma === item.kundeName);
    const zielWhatsapp = gefundenerKunde ? gefundenerKunde.whatsapp : '+4915100000000';
    const zielEmail = gefundenerKunde ? gefundenerKunde.email : 'kontakt@beispiel.de';
    const hatHindernisFoto = Boolean(item.hindernisFotoUrl);

    const hindernisZeile = item.hindernisInfo
      ? `Hindernisse: ${item.hindernisInfo}\n`
      : 'Hindernisse: Keine dokumentiert\n';

    const berichtText =
      `WINTERDIENST - EINSATZBERICHT\n` +
      `────────────────────────\n` +
      `Auftraggeber: ${item.kundeName}\n` +
      `Objekt: ${item.objName}\n` +
      `Datum und Uhrzeit: ${item.date}\n` +
      `Wetter: ${item.wetter}\n` +
      (item.wetterVorOrt ? `Wetterverhältnisse vor Ort: ${item.wetterVorOrt}\n` : '') +
      `Maßnahme: ${item.type}\n` +
      (item.materialVerbrauchKg !== undefined ? `Streumittelverbrauch: ${item.materialVerbrauchKg.toLocaleString('de-DE')} kg\n` : '') +
      hindernisZeile +
      `────────────────────────\n` +
      `Status: Ordnungsgemäß betreut\n\n` +
      `Mit freundlichen Grüßen\n` +
      `Becdra FM`;

    setDialogConfig({
      visible: true,
      titel: 'Bericht nachträglich senden',
      text: hatHindernisFoto
        ? `Möchtest du den Bericht für "${item.kundeName}" (${item.objName}) mit dem Hindernisfoto teilen? Es öffnet sich die Teilen-Auswahl deines Geräts.`
        : `Möchtest du den Bericht für "${item.kundeName}" (${item.objName}) per WhatsApp oder E-Mail senden?`,
      confirmText: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {!hatHindernisFoto && <svg width="16" height="16" viewBox="0 0 24 24" fill="#111827"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-2.972-1.487-4.925-2.668-6.892-6.075-.149-.255-.015-.394.113-.532.115-.121.272-.322.408-.484.135-.163.18-.277.27-.461.09-.185.045-.347-.022-.484-.067-.137-.57-1.377-.783-1.885-.207-.497-.418-.431-.67-.439-.232-.008-.497-.008-.763-.008-.266 0-.698.099-1.063.495-.365.396-1.395 1.364-1.395 3.327 0 1.963 1.432 3.857 1.631 4.125.199.268 2.819 4.302 6.836 6.027 3.553 1.536 4.276 1.231 5.043 1.155.767-.076 2.47-.98 2.818-1.926.348-.946.348-1.755.244-1.927z"/></svg>}
          <span>{hatHindernisFoto ? 'Bericht + Foto teilen' : 'WhatsApp senden'}</span>
        </span>
      ),
      secondaryText: hatHindernisFoto ? 'Bericht + Foto teilen' : '✉️ E-Mail senden',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        setDialogConfig(prev => ({ ...prev, visible: false }));
        if (teileBerichtMitHindernisfoto(berichtText, item.hindernisFotoUrl, item.hindernisFoto)) return;
        const cleanPhone = zielWhatsapp.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(berichtText)}`, '_blank');
      },
      onSecondary: () => {
        setDialogConfig(prev => ({ ...prev, visible: false }));
        if (teileBerichtMitHindernisfoto(berichtText, item.hindernisFotoUrl, item.hindernisFoto)) return;
        const mailSubject = encodeURIComponent(`Winterdienst-Einsatzbericht - ${item.kundeName} (${item.objName})`);
        const mailBody = encodeURIComponent(berichtText);
        window.location.href = `mailto:${zielEmail}?subject=${mailSubject}&body=${mailBody}`;
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
    win?.document.write(`
      <html>
        <head><title>Räumplan Ansicht</title></head>
        <body style="margin:0; background:#111; display:flex; justify-content:center; align-items:center; height:100vh;">
          <img src="${planUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
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
        const maxWidth = 800;
        const maxHeight = 600;

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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
              ${item.wetterVorOrt ? `<li><b>Wetterverhältnisse vor Ort:</b> ${item.wetterVorOrt}</li>` : ''}
              <li><b>Art des Einsatzes:</b> ${item.type}</li>
              <li><b>Einsatzdauer:</b> ${item.duration}</li>
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
    setArbeitszeitStatus({ pauseBeginn: null, pausendauerMs: 0 });
    setWetterVorOrt('');
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
        setWetterVorOrt('');
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
    const verbrauchKg = Number(materialVerbrauchKg);
    if (materialVerbrauchKg.trim() === '' || !Number.isFinite(verbrauchKg) || verbrauchKg < 0) {
      zeigeMeldung('Bitte einen gültigen Streumittelverbrauch in kg eingeben.');
      return;
    }
    if (!wetterVorOrt) {
      zeigeMeldung('Bitte die Wetterverhältnisse vor Ort auswählen.');
      return;
    }
    stopGpsTracking();

    const endTime = new Date();
    const aktuellePauseMs = arbeitszeitStatus.pauseBeginn === null
      ? 0
      : Math.max(0, endTime.getTime() - arbeitszeitStatus.pauseBeginn);
    const arbeitsdauerMs = Math.max(
      0,
      endTime.getTime() - startTime.getTime() - arbeitszeitStatus.pausendauerMs - aktuellePauseMs
    );
    const diffMinutes = Math.round(arbeitsdauerMs / 60000);
    const kmNum = Number(gefahreneKm) || 0;

    const berechneteSpritKosten = (kmNum * Number(verbrauchAuf100Km) / 100) * (Number(spritPreisProLiter) || 1.80);

    setLagerBestand(prev => prev - verbrauchKg);

    const newLog: EinsatzLog = {
      id: Date.now(),
      kundeName: activeKunde.firma,
      objName: activeObjekt.name,
      date: new Date().toLocaleDateString('de-DE') + ' ' + new Date().toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}),
      timestamp: Date.now(),
      wetter: wetterLage,
      wetterVorOrt,
      type: einsatzType,
      duration: `${Math.max(1, diffMinutes)} Min.`,
      materialUsed: `${verbrauchKg.toLocaleString('de-DE')} kg (${activeObjekt.material})`,
      materialVerbrauchKg: verbrauchKg,
      kmGefahren: `${kmNum} km`,
      spritKosten: `${berechneteSpritKosten.toFixed(2)} €`,
      fotoName: aufgenommenesFoto || undefined,
      fotoUrl: aufgenommenesFotoUrl || undefined,
      hindernisInfo: hindernisNotiz ? hindernisNotiz : undefined,
      hindernisFoto: hindernisFoto || undefined,
      hindernisFotoUrl: hindernisFotoUrl || undefined
    };

    setHistory(prev => [newLog, ...prev]);

    const kundeId = activeKunde.id;
    const aktuelleListeFuerKunden = heuteBetreuteProKunde[kundeId] || [];
    const updatedBetreut = [...aktuelleListeFuerKunden, { name: activeObjekt.name, address: activeObjekt.address, type: einsatzType }];
    
    setHeuteBetreuteProKunde(prev => ({
      ...prev,
      [kundeId]: updatedBetreut
    }));

    const kundenLiegen = liegenschaften.filter(l => l.kundeId === kundeId);
    const alleObjekteDesKundenNamen = kundenLiegen.map(l => l.name);
    const erledigteObjekteNamen = updatedBetreut.map(b => b.name);
    const alleErledigt = alleObjekteDesKundenNamen.every(name => erledigteObjekteNamen.includes(name));

    const geforderterKunde = activeKunde;
    clearActiveEinsatz();
    setAufgenommenesFoto(null);
    setAufgenommenesFotoUrl(null);
    setWetterVorOrt('');
    setMaterialVerbrauchKg('');
    setHindernisNotiz('');
    setHindernisFoto(null);
    setHindernisFotoUrl(null);
    setShowActiveRaeumPlanPopup(false);

    if (alleErledigt && alleObjekteDesKundenNamen.length > 0) {
      const liegenschaftsListeText = updatedBetreut
        .map(b => `Objekt: ${b.name}\nAdresse: ${b.address}\nMaßnahme: ${b.type}`)
        .join('\n\n');

      const hindernisHinweis = hindernisNotiz
        ? `Hindernisse: ${hindernisNotiz}`
        : 'Hindernisse: Keine dokumentiert';

      const berichtText =
        `WINTERDIENST - EINSATZBERICHT\n` +
        `────────────────────────\n` +
        `Auftraggeber: ${geforderterKunde.firma}\n` +
        `Datum: ${new Date().toLocaleDateString('de-DE')}\n` +
        `Wetter: ${wetterLage}\n\n` +
        `Wetterverhältnisse vor Ort: ${wetterVorOrt}\n` +
        `Streumittelverbrauch: ${verbrauchKg.toLocaleString('de-DE')} kg (${activeObjekt.material})\n\n` +
        `Betreute Objekte:\n${liegenschaftsListeText}\n\n` +
        `${hindernisHinweis}\n` +
        `────────────────────────\n` +
        `Status: Ordnungsgemäß betreut\n\n` +
        `Mit freundlichen Grüßen\n` +
        `Becdra FM`;

      setDialogConfig({
        visible: true,
        titel: 'Kunde vollständig betreut',
        text: hindernisFotoUrl
          ? `Alle Liegenschaften von "${geforderterKunde.firma}" wurden heute betreut. Der Bericht wird zusammen mit dem Hindernisfoto über die Teilen-Auswahl deines Geräts bereitgestellt.`
          : `Alle Liegenschaften von "${geforderterKunde.firma}" wurden heute betreut! Wie möchtest du den Bericht senden?`,
        confirmText: (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {!hindernisFotoUrl && <svg width="16" height="16" viewBox="0 0 24 24" fill="#111827"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-2.972-1.487-4.925-2.668-6.892-6.075-.149-.255-.015-.394.113-.532.115-.121.272-.322.408-.484.135-.163.18-.277.27-.461.09-.185.045-.347-.022-.484-.067-.137-.57-1.377-.783-1.885-.207-.497-.418-.431-.67-.439-.232-.008-.497-.008-.763-.008-.266 0-.698.099-1.063.495-.365.396-1.395 1.364-1.395 3.327 0 1.963 1.432 3.857 1.631 4.125.199.268 2.819 4.302 6.836 6.027 3.553 1.536 4.276 1.231 5.043 1.155.767-.076 2.47-.98 2.818-1.926.348-.946.348-1.755.244-1.927z"/></svg>}
            <span>{hindernisFotoUrl ? 'Bericht + Foto teilen' : 'WhatsApp senden'}</span>
          </span>
        ),
        secondaryText: hindernisFotoUrl ? 'Bericht + Foto teilen' : '✉️ E-Mail senden',
        cancelText: '⏰ Später',
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, visible: false }));
          if (teileBerichtMitHindernisfoto(berichtText, hindernisFotoUrl || undefined, hindernisFoto || undefined)) return;
          const cleanPhone = geforderterKunde.whatsapp.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(berichtText)}`, '_blank');
        },
        onSecondary: () => {
          setDialogConfig(prev => ({ ...prev, visible: false }));
          if (teileBerichtMitHindernisfoto(berichtText, hindernisFotoUrl || undefined, hindernisFoto || undefined)) return;
          const mailSubject = encodeURIComponent(`Winterdienst-Einsatzbericht - ${geforderterKunde.firma} (${new Date().toLocaleDateString('de-DE')})`);
          const mailBody = encodeURIComponent(berichtText);
          window.location.href = `mailto:${geforderterKunde.email}?subject=${mailSubject}&body=${mailBody}`;
        },
        onCancel: () => {
          setDialogConfig(prev => ({ ...prev, visible: false }));
          zeigeMeldung('Einsatz gespeichert. Später in Historie senden.');
        }
      });
    } else {
      zeigeMeldung('Einsatz erfolgreich gespeichert!');
    }
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

    const bisherigeReihenfolge = [...liegenschaften]
      .sort((a, b) => (a.reihenfolge || 1) - (b.reihenfolge || 1))
      .map(liege => liege.id);
    const optimierteReihenfolge = route.map(({ liege }) => liege.id);
    const geaenderteStopps = optimierteReihenfolge.reduce(
      (anzahl, liegeId, index) => anzahl + (bisherigeReihenfolge[index] === liegeId ? 0 : 1),
      0
    );
    if (geaenderteStopps === 0) {
      return 'Die Tour ist bereits optimal sortiert!';
    }

    const neueReihenfolge = new Map(route.map(({ liege }, index) => [liege.id, index + 1]));
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
    let csvContent = "data:text/csv;charset=utf-8,Kunde;Liegenschaft;Datum;Wetter;Wetter vor Ort;Art;Material;Verbrauch kg;Km;Sprit;Besonderheiten/Hindernisse\n";
    history.forEach(item => {
      const csvWert = (wert: string | number | undefined) => `"${String(wert ?? '').replaceAll('"', '""')}"`;
      csvContent += [
        item.kundeName,
        item.objName,
        item.date,
        item.wetter,
        item.wetterVorOrt,
        item.type,
        item.materialUsed,
        item.materialVerbrauchKg,
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
                  <option key={streuMittel} value={streuMittel}>{streuMittel}</option>
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

      <Header lagerBestand={lagerBestand} darkMode={darkMode} setDarkMode={setDarkMode} />

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
            wetterVorOrt={wetterVorOrt}
            setWetterVorOrt={setWetterVorOrt}
            startTime={startTime}
            pauseBeginn={arbeitszeitStatus.pauseBeginn}
            pausendauerMs={arbeitszeitStatus.pausendauerMs}
            onTogglePause={toggleEinsatzPause}
            einsatzType={einsatzType}
            setEinsatzType={setEinsatzType}
            materialVerbrauchKg={materialVerbrauchKg}
            setMaterialVerbrauchKg={setMaterialVerbrauchKg}
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
                neuFirma={neuFirma}
                setNeuFirma={setNeuFirma}
                neuEmail={neuEmail}
                setNeuEmail={setNeuEmail}
                neuWhatsapp={neuWhatsapp}
                setNeuWhatsapp={setNeuWhatsapp}
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
                lagerBestand={lagerBestand}
                lagerAnzahlInput={lagerAnzahlInput}
                setLagerAnzahlInput={setLagerAnzahlInput}
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
                  
                  <button onClick={() => setMehrEinstellungenGeoeffnet(true)} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    🛠️ Einstellungen & Wetter
                  </button>
                  <button onClick={() => setActiveTab('kunden')} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    👥 Kunden verwalten
                  </button>
                  <button onClick={() => setActiveTab('statistik')} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    📊 Einsatz-Statistik (Tag & Saison)
                  </button>
                  <button onClick={() => setActiveTab('history_saison')} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>
                    📜 Einsatz-Historie & Archiv
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