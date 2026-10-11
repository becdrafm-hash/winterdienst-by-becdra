import React, { useState, useEffect, useRef } from 'react';

interface Liegenschaft {
  id: number;
  kundeId: number;
  name: string;
  address: string;
  size: string;
  material: string;
  reihenfolge: number;
  raeumPlan?: string;
}

interface Kunde {
  id: number;
  firma: string;
  email: string;
  whatsapp: string;
}

interface EinsatzLog {
  id: number;
  kundeName: string;
  objName: string;
  date: string;
  timestamp: number;
  wetter: string;
  type: string;
  duration: string;
  materialUsed: string;
  kmGefahren: string;
  spritKosten: string;
  fotoName?: string;
  fotoUrl?: string;
  hindernisInfo?: string;
  hindernisFoto?: string;
  hindernisFotoUrl?: string;
}

interface SaisonArchiv {
  id: number;
  name: string;
  vonDatum: string;
  bisDatum: string;
  einsätze: EinsatzLog[];
  gesamtSaecke: number;
  gesamtKm: number;
  gesamtSprit: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'tour' | 'liegenschaften' | 'lager' | 'mehr' | 'kunden' | 'statistik' | 'history_saison'>('tour');
  const [statusMeldung, setStatusMeldung] = useState<string | null>(null);
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
  const [editingStartPunkt, setEditingStartPunkt] = useState<string>(startPunkt);

  const [lagerAnzahlInput, setLagerAnzahlInput] = useState<string>('1');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [showActiveRaeumPlanPopup, setShowActiveRaeumPlanPopup] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const accumulatedKmRef = useRef<number>(0);

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
    return saved ? JSON.parse(saved) : 0;
  });

  const [spritPreisProLiter, setSpritPreisProLiter] = useState<string>(() => {
    return localStorage.getItem('becdra_spritpreis') || '1.80';
  });
  const [editingSpritPreis, setEditingSpritPreis] = useState<string>(spritPreisProLiter);

  const [verbrauchAuf100Km] = useState<string>('10');

  const [neuFirma, setNeuFirma] = useState('');
  const [neuEmail, setNeuEmail] = useState('');
  const [neuWhatsapp, setNeuWhatsapp] = useState('');

  const [selectedKundeId, setSelectedKundeId] = useState<number>(() => kunden[0]?.id || 1);
  const [neuObjName, setNeuObjName] = useState('');
  const [neuObjAddress, setNeuObjAddress] = useState('');
  const [neuObjSize, setNeuObjSize] = useState('');
  const [neuObjMaterial, setNeuObjMaterial] = useState('Reines Salz');
  const [neuObjReihenfolge, setNeuObjReihenfolge] = useState('1');
  const [neuObjRaeumPlan, setNeuObjRaeumPlan] = useState<string>('');

  const [editingKundeId, setEditingKundeId] = useState<number | null>(null);
  const [editFirma, setEditFirma] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');

  const [editingLiege, setEditingLiege] = useState<Liegenschaft | null>(null);
  const [editObjName, setEditObjName] = useState('');
  const [editObjAddress, setEditObjAddress] = useState('');
  const [editObjSize, setEditObjSize] = useState('');
  const [editObjMaterial, setEditObjMaterial] = useState('Reines Salz');
  const [editObjReihenfolge, setEditObjReihenfolge] = useState('1');
  const [editObjRaeumPlan, setEditObjRaeumPlan] = useState<string>('');

  const [activeKunde, setActiveKunde] = useState<Kunde | null>(null);
  const [activeObjekt, setActiveObjekt] = useState<Liegenschaft | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [einsatzType, setEinsatzType] = useState('Räumen & Streuen');
  const [wetterLage, setWetterLage] = useState('Wird geladen...');
  const [materialSaecke, setMaterialSaecke] = useState('1');
  const [gefahreneKm, setGefahreneKm] = useState('0');
  
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
    } catch (e) {
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
    } catch (e) {
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
    localStorage.setItem('becdra_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('becdra_saison_archiv', JSON.stringify(archivListe));
  }, [archivListe]);

  const exportDatenBackup = () => {
    const backupData = {
      kunden,
      liegenschaften,
      history,
      lagerBestand,
      startPunkt,
      spritPreisProLiter,
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
            if (parsed.lagerBestand !== undefined) setLagerBestand(parsed.lagerBestand);
            if (parsed.startPunkt) setStartPunkt(parsed.startPunkt);
            if (parsed.spritPreisProLiter) setSpritPreisProLiter(parsed.spritPreisProLiter);
            if (parsed.archivListe) setArchivListe(parsed.archivListe);
            
            zeigeMeldung('Daten erfolgreich aus Backup wiederhergestellt!');
          }
        } catch (err) {
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

  const anpasseLagerGenau = (modus: 'add' | 'sub') => {
    const wert = parseInt(lagerAnzahlInput, 10);
    if (isNaN(wert) || wert <= 0) {
      zeigeMeldung('Bitte eine gültige Anzahl eingeben.');
      return;
    }

    if (modus === 'add') {
      setLagerBestand(prev => prev + wert);
      zeigeMeldung(`+${wert} Sack zum Lager hinzugefügt.`);
    } else {
      setLagerBestand(prev => Math.max(0, prev - wert));
      zeigeMeldung(`-${wert} Sack aus dem Lager entfernt.`);
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

  const addLiegenschaft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!neuObjName || !neuObjAddress || !neuObjSize) return;
    
    const neueLiege: Liegenschaft = {
      id: Date.now(),
      kundeId: Number(selectedKundeId),
      name: neuObjName,
      address: neuObjAddress,
      size: neuObjSize,
      material: neuObjMaterial,
      reihenfolge: Number(neuObjReihenfolge) || 1,
      raeumPlan: neuObjRaeumPlan || undefined
    };

    setLiegenschaften([...liegenschaften, neueLiege]);
    setNeuObjName('');
    setNeuObjAddress('');
    setNeuObjSize('');
    setNeuObjReihenfolge('1');
    setNeuObjRaeumPlan('');
    zeigeMeldung('Liegenschaft erfolgreich hinzugefügt!');
  };

  const startEditLiege = (liege: Liegenschaft) => {
    setEditingLiege(liege);
    setEditObjName(liege.name);
    setEditObjAddress(liege.address);
    setEditObjSize(liege.size);
    setEditObjMaterial(liege.material);
    setEditObjReihenfolge(liege.reihenfolge ? liege.reihenfolge.toString() : '1');
    setEditObjRaeumPlan(liege.raeumPlan || '');
  };

  const saveEditLiege = () => {
    if (!editingLiege) return;
    setLiegenschaften(liegenschaften.map(l => l.id === editingLiege.id ? { 
      ...l, 
      name: editObjName, 
      address: editObjAddress, 
      size: editObjSize, 
      material: editObjMaterial,
      reihenfolge: Number(editObjReihenfolge) || 1,
      raeumPlan: editObjRaeumPlan || undefined
    } : l));
    setEditingLiege(null);
    zeigeMeldung('Liegenschaft aktualisiert!');
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

  const sendeHistorienBericht = (item: EinsatzLog) => {
    const gefundenerKunde = kunden.find(k => k.firma === item.kundeName);
    const zielWhatsapp = gefundenerKunde ? gefundenerKunde.whatsapp : '+4915100000000';
    const zielEmail = gefundenerKunde ? gefundenerKunde.email : 'kontakt@beispiel.de';

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
      `Maßnahme: ${item.type}\n` +
      hindernisZeile +
      `────────────────────────\n` +
      `Status: Ordnungsgemäß betreut\n\n` +
      `Mit freundlichen Grüßen\n` +
      `Becdra FM`;

    setDialogConfig({
      visible: true,
      titel: 'Bericht nachträglich senden',
      text: `Möchtest du den Bericht für "${item.kundeName}" (${item.objName}) per WhatsApp oder E-Mail senden?`,
      confirmText: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#111827"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-2.972-1.487-4.925-2.668-6.892-6.075-.149-.255-.015-.394.113-.532.115-.121.272-.322.408-.484.135-.163.18-.277.27-.461.09-.185.045-.347-.022-.484-.067-.137-.57-1.377-.783-1.885-.207-.497-.418-.431-.67-.439-.232-.008-.497-.008-.763-.008-.266 0-.698.099-1.063.495-.365.396-1.395 1.364-1.395 3.327 0 1.963 1.432 3.857 1.631 4.125.199.268 2.819 4.302 6.836 6.027 3.553 1.536 4.276 1.231 5.043 1.155.767-.076 2.47-.98 2.818-1.926.348-.946.348-1.755.244-1.927z"/></svg>
          <span>WhatsApp senden</span>
        </span>
      ),
      secondaryText: '✉️ E-Mail senden',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        setDialogConfig(prev => ({ ...prev, visible: false }));
        const cleanPhone = zielWhatsapp.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(berichtText)}`, '_blank');
      },
      onSecondary: () => {
        setDialogConfig(prev => ({ ...prev, visible: false }));
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
    } catch (error) {
      setWetterLage('Leichtes Überfrieren (Offline)');
    }
  };

  const berechneDistanzKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startEinsatzMitWaze = (kunde: Kunde, obj: Liegenschaft) => {
    window.open(`https://waze.com/ul?q=${encodeURIComponent(obj.address)}&navigate=yes`, '_blank');
    setActiveKunde(kunde);
    setActiveObjekt(obj);
    setStartTime(new Date());
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

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLon = position.coords.longitude;
          const currentCoords = { lat: currentLat, lon: currentLon };

          if (lastCoordsRef.current) {
            const dist = berechneDistanzKm(
              lastCoordsRef.current.lat, lastCoordsRef.current.lon,
              currentLat, currentLon
            );
            if (dist > 0.005) {
              accumulatedKmRef.current += dist;
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
    }
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
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
        setActiveKunde(null);
        setActiveObjekt(null);
        setAufgenommenesFoto(null);
        setAufgenommenesFotoUrl(null);
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
    stopGpsTracking();

    const endTime = new Date();
    const diffMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    const saeckeNum = Number(materialSaecke) || 0;
    const kmNum = Number(gefahreneKm) || 0;

    const berechneteSpritKosten = (kmNum * (Number(verbrauchAuf100Km) || 10) / 100) * (Number(spritPreisProLiter) || 1.80);

    setLagerBestand(prev => Math.max(0, prev - saeckeNum));

    const newLog: EinsatzLog = {
      id: Date.now(),
      kundeName: activeKunde.firma,
      objName: activeObjekt.name,
      date: new Date().toLocaleDateString('de-DE') + ' ' + new Date().toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}),
      timestamp: Date.now(),
      wetter: wetterLage,
      type: einsatzType,
      duration: `${diffMinutes > 0 ? diffMinutes : 1} Min.`,
      materialUsed: `${saeckeNum} Sack (${activeObjekt.material})`,
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
    setActiveKunde(null);
    setActiveObjekt(null);
    setAufgenommenesFoto(null);
    setAufgenommenesFotoUrl(null);
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
        `Betreute Objekte:\n${liegenschaftsListeText}\n\n` +
        `${hindernisHinweis}\n` +
        `────────────────────────\n` +
        `Status: Ordnungsgemäß betreut\n\n` +
        `Mit freundlichen Grüßen\n` +
        `Becdra FM`;

      setDialogConfig({
        visible: true,
        titel: 'Kunde vollständig betreut',
        text: `Alle Liegenschaften von "${geforderterKunde.firma}" wurden heute betreut! Wie möchtest du den Bericht senden?`,
        confirmText: (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#111827"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-2.972-1.487-4.925-2.668-6.892-6.075-.149-.255-.015-.394.113-.532.115-.121.272-.322.408-.484.135-.163.18-.277.27-.461.09-.185.045-.347-.022-.484-.067-.137-.57-1.377-.783-1.885-.207-.497-.418-.431-.67-.439-.232-.008-.497-.008-.763-.008-.266 0-.698.099-1.063.495-.365.396-1.395 1.364-1.395 3.327 0 1.963 1.432 3.857 1.631 4.125.199.268 2.819 4.302 6.836 6.027 3.553 1.536 4.276 1.231 5.043 1.155.767-.076 2.47-.98 2.818-1.926.348-.946.348-1.755.244-1.927z"/></svg>
            <span>WhatsApp senden</span>
          </span>
        ),
        secondaryText: '✉️ E-Mail senden',
        cancelText: '⏰ Später',
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, visible: false }));
          const cleanPhone = geforderterKunde.whatsapp.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(berichtText)}`, '_blank');
        },
        onSecondary: () => {
          setDialogConfig(prev => ({ ...prev, visible: false }));
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

  const handleTourImport = () => {
    if (!importText.trim()) {
      zeigeMeldung('Bitte füge eine Routenliste ein.');
      return;
    }

    const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let anzahlAktualisiert = 0;
    const aktualisierteLiegen = liegenschaften.map(liege => {
      const matchingLineIndex = lines.findIndex(line => 
        line.toLowerCase().includes(liege.name.toLowerCase()) || 
        line.toLowerCase().includes(liege.address.toLowerCase())
      );

      if (matchingLineIndex !== -1) {
        anzahlAktualisiert++;
        return { ...liege, reihenfolge: matchingLineIndex + 1 };
      }
      return liege;
    });

    setLiegenschaften(aktualisierteLiegen);
    setShowImportModal(false);
    setImportText('');
    zeigeMeldung(`Route erfolgreich aktualisiert! (${anzahlAktualisiert} Objekte sortiert)`);
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
        let totalSaecke = 0;
        let totalKm = 0;
        let totalSprit = 0;

        history.forEach(item => {
          const saeckeNum = parseFloat(item.materialUsed) || 0;
          const kmNum = parseFloat(item.kmGefahren) || 0;
          const spritNum = parseFloat(item.spritKosten.replace(' €', '').replace(',', '.')) || 0;

          totalSaecke += saeckeNum;
          totalKm += kmNum;
          totalSprit += spritNum;
        });

        const neuesArchiv: SaisonArchiv = {
          id: Date.now(),
          name: saisonName,
          vonDatum: saisonVon,
          bisDatum: saisonBis,
          einsätze: [...history],
          gesamtSaecke: Math.floor(totalSaecke),
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
    let csvContent = "data:text/csv;charset=utf-8,Kunde;Liegenschaft;Datum;Wetter;Art;Material;Km;Sprit\n";
    history.forEach(item => {
      csvContent += `"${item.kundeName}";"${item.objName}";"${item.date}";"${item.wetter}";"${item.type}";"${item.materialUsed}";"${item.kmGefahren}";"${item.spritKosten}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Becdra_FM_Winterdienst_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kopiereAlleAdresen = () => {
    if (alleLiegenschaftenSortiert.length === 0) {
      zeigeMeldung('Keine Liegenschaften vorhanden.');
      return;
    }
    const liegenschaftsZeilen = alleLiegenschaftenSortiert.map((item, index) => 
      `${index + 1}. ${item.kunde?.firma || 'Kunde'} - ${item.liege.name}: ${item.liege.address}`
    );
    const reinZuOptimierendeRoute = liegenschaftsZeilen.join('\n');
    navigator.clipboard.writeText(reinZuOptimierendeRoute).catch(() => {});
    zeigeMeldung('Nur die Liegenschaften wurden in die Zwischenablage kopiert!');
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
    let anzahl = einsätzeListe.length;
    let km = 0;
    let sprit = 0;
    let saecke = 0;

    einsätzeListe.forEach(item => {
      km += parseFloat(item.kmGefahren) || 0;
      sprit += parseFloat(item.spritKosten.replace(' €', '').replace(',', '.')) || 0;
      const matchSaecke = item.materialUsed.match(/^([\d.]+)/);
      if (matchSaecke) saecke += parseFloat(matchSaecke[1]) || 0;
    });

    return { anzahl, km: Math.round(km), sprit: sprit.toFixed(2), saecke: Math.floor(saecke) };
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
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#111827', color: '#ffffff', padding: '12px 20px', borderRadius: '12px', zIndex: 1000, boxShadow: '0 8px 25px rgba(0,0,0,0.2)', fontWeight: 'bold', fontSize: '0.85rem', border: '2px solid #8cc63f' }}>
          ✨ {statusMeldung}
        </div>
      )}

      {/* Räumplan Pop-up im aktiven Einsatz */}
      {showActiveRaeumPlanPopup && activeObjekt && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 4000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>🗺️ Räumplan: {activeObjekt.name}</h3>
              <button onClick={() => setShowActiveRaeumPlanPopup(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', color: textApp, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ width: '100%', height: '300px', backgroundColor: '#111', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              {activeObjekt.raeumPlan ? (
                <img src={activeObjekt.raeumPlan} alt="Räumplan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Kein Räumplan für dieses Objekt hinterlegt.</p>
              )}
            </div>
            <button onClick={() => setShowActiveRaeumPlanPopup(false)} style={{ backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
              Schließen
            </button>
          </div>
        </div>
      )}

      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', color: textApp, padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>🔄 Route optimieren & importieren</h3>
            <p style={{ fontSize: '0.8rem', color: textSub, margin: 0, lineHeight: '1.4' }}>
              Füge hier deine optimierte Reihenfolge ein. Die App sortiert deine Tour automatisch.
            </p>
            <textarea 
              rows={6}
              value={importText} 
              onChange={e => setImportText(e.target.value)}
              placeholder="1. Commerzbank AG - Filiale Innenstadt&#10;2. Seniorenresidenz Sonnenschein..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowImportModal(false)} style={{ flex: 1, backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
                Abbrechen
              </button>
              <button onClick={handleTourImport} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(140, 198, 63, 0.3)' }}>
                Tour übernehmen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liegenschaft bearbeiten (inkl. Räumplan) */}
      {editingLiege && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', color: textApp, padding: '24px', borderRadius: '16px', maxWidth: '380px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>📍 Liegenschaft bearbeiten</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, marginBottom: '2px' }}>Objektname</label>
              <input type="text" value={editObjName} onChange={e => setEditObjName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, marginBottom: '2px' }}>Adresse</label>
              <input type="text" value={editObjAddress} onChange={e => setEditObjAddress(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
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
                <option value="Reines Salz">Reines Salz</option>
                <option value="Salz-Sand-Gemisch">Salz-Sand-Gemisch</option>
              </select>
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
              <button onClick={() => setEditingLiege(null)} style={{ flex: 1, backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
                Abbrechen
              </button>
              <button onClick={saveEditLiege} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogConfig.visible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', color: textApp, padding: '24px', borderRadius: '16px', maxWidth: '380px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{dialogConfig.titel}</h3>
            <p style={{ fontSize: '0.85rem', color: textSub, margin: 0, lineHeight: '1.4' }}>{dialogConfig.text}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {dialogConfig.onConfirm && (
                <button onClick={dialogConfig.onConfirm} style={{ backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(140, 198, 63, 0.3)' }}>
                  {dialogConfig.confirmText || 'OK'}
                </button>
              )}
              {dialogConfig.onSecondary && (
                <button onClick={dialogConfig.onSecondary} style={{ backgroundColor: darkMode ? '#14171a' : '#eef6e6', color: '#598f1e', border: '1px solid #8cc63f', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
                  {dialogConfig.secondaryText}
                </button>
              )}
              {dialogConfig.onCancel && (
                <button onClick={dialogConfig.onCancel} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
                  {dialogConfig.cancelText || 'Abbrechen'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header style={{ backgroundColor: bgCard, color: textApp, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50, borderBottom: '3px solid #8cc63f', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'background-color 0.3s ease' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: darkMode ? '#14171a' : '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid ' + borderCard }}>
              <span style={{ fontWeight: '900', fontSize: '1.1rem', color: darkMode ? '#ffffff' : '#111827', letterSpacing: '-1px' }}>BF</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', fontStyle: 'italic', marginLeft: '4px', color: darkMode ? '#ffffff' : '#111827' }}>Becdra FM</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', backgroundColor: lagerBestand < 3 ? (darkMode ? '#3b1f23' : '#fef2f2') : (darkMode ? '#14171a' : '#eef6e6'), color: lagerBestand < 3 ? '#dc2626' : '#8cc63f', border: '1px solid ' + (lagerBestand < 3 ? '#dc2626' : '#8cc63f'), padding: '5px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
              Lager: {Math.floor(lagerBestand)}
            </span>
            <button onClick={() => setDarkMode(!darkMode)} style={{ backgroundColor: darkMode ? '#8cc63f' : '#111827', color: darkMode ? '#111827' : '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
              {darkMode ? '☀️ Hell' : '🌙 Dunkel'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '440px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {activeObjekt && activeKunde ? (
          <div style={{ backgroundColor: bgCard, padding: '20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '2px solid #8cc63f', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <button onClick={cancelEinsatz} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
                ← Zurück zur Übersicht
              </button>
            </div>

            <div style={{ borderBottom: '1px solid ' + borderCard, paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#8cc63f', textTransform: 'uppercase' }}>Aktiver Einsatz ({activeKunde.firma})</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '2px 0', color: textApp }}>{activeObjekt.name}</h2>
              <p style={{ fontSize: '0.8rem', color: textSub, margin: 0 }}>📍 {activeObjekt.address} • {activeObjekt.size} m² (Pos: #{activeObjekt.reihenfolge})</p>
            </div>

            {activeObjekt.raeumPlan && (
              <button onClick={() => setShowActiveRaeumPlanPopup(true)} style={{ backgroundColor: '#111827', color: '#ffffff', padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}>
                🗺️ Räumplan als Pop-up öffnen
              </button>
            )}

            <div style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', padding: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid ' + borderCard }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: textSub }}>🕒 Startpunkt:</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#8cc63f' }}>{startPunkt}</span>
            </div>

            <div style={{ backgroundColor: darkMode ? '#14171a' : '#eef6e6', padding: '10px', borderRadius: '10px', border: '1px solid #8cc63f' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#598f1e', textTransform: 'uppercase', display: 'block' }}>📡 Automatisches Live-Wetter</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: textApp }}>{wetterLage}</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Art des Einsatzes</label>
              <select value={einsatzType} onChange={(e) => setEinsatzType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }}>
                <option value="Räumen & Streuen">Räumen & Streuen</option>
                <option value="Nur Streuen">Nur Streuen</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Materialverbrauch</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input type="number" min="0.5" step="0.5" value={materialSaecke} onChange={(e) => setMaterialSaecke(e.target.value)} style={{ width: '60px', padding: '10px', borderRadius: '10px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, textAlign: 'center', fontWeight: 'bold' }} />
                  <span style={{ fontSize: '0.75rem', color: textSub }}>Säcke</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Gefahrene km (Auto-GPS)</label>
                <input type="number" value={gefahreneKm} onChange={(e) => setGefahreneKm(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, textAlign: 'center', fontWeight: 'bold' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Fotodokumentation</label>
              <label style={{ display: 'block', width: '100%', border: '2px dashed #8cc63f', backgroundColor: darkMode ? '#14171a' : '#f4fce3', color: '#8cc63f', padding: '10px', borderRadius: '10px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem', boxSizing: 'border-box' }}>
                📷 {aufgenommenesFoto ? `✓ Foto komprimiert (${aufgenommenesFoto})` : 'Kamera öffnen & Fläche fotografieren'}
                <input type="file" accept="image/*" capture="environment" onChange={handleFotoCapture} style={{ display: 'none' }} />
              </label>
            </div>

            {/* HINDERNISDOKUMENTATION IM AKTIVEN EINSATZ */}
            <div style={{ backgroundColor: darkMode ? '#14171a' : '#fff1f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#dc2626' }}>⚠️ Hindernis / Vorfall dokumentieren (optional)</label>
              <input 
                type="text" 
                value={hindernisNotiz} 
                onChange={e => setHindernisNotiz(e.target.value)} 
                placeholder="z.B. PKW blockierte Einfahrt, Mülltonne..." 
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: bgCard, color: textApp, fontSize: '0.8rem', boxSizing: 'border-box' }} 
              />
              <label style={{ display: 'block', width: '100%', border: '2px dashed #dc2626', backgroundColor: darkMode ? '#14171a' : '#ffffff', color: '#dc2626', padding: '8px', borderRadius: '8px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem', boxSizing: 'border-box' }}>
                📷 {hindernisFoto ? `✓ Hindernis-Foto (${hindernisFoto})` : 'Hindernis fotografieren'}
                <input type="file" accept="image/*" capture="environment" onChange={handleHindernisFotoCapture} style={{ display: 'none' }} />
              </label>
            </div>

            <button onClick={finishEinsatz} style={{ width: '100%', backgroundColor: '#8cc63f', color: '#111827', padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(140, 198, 63, 0.3)' }}>
              ✓ Einsatz abschließen & Speichern
            </button>
          </div>
        ) : (
          <>
            {/* TOUR TAB */}
            {activeTab === 'tour' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: darkMode ? bgCard : 'linear-gradient(135deg, #ffffff, #f9fafb)', color: textApp, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    {/* Helle Überschrift im Hellen Modus korrigiert */}
                    <h2 style={{ fontWeight: 'bold', fontSize: '1.05rem', margin: 0, color: darkMode ? '#f3f4f6' : '#111827' }}>Guten Tag, Micha! 👋</h2>
                    <p style={{ fontSize: '0.75rem', color: '#8cc63f', margin: '4px 0 0 0', fontWeight: 'bold' }}>Aktueller Startpunkt: {startPunkt}</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={kopiereAlleAdresen} style={{ flex: 1, backgroundColor: darkMode ? '#14171a' : '#eef6e6', color: '#598f1e', border: '1px solid #8cc63f', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
                      📋 Adressen kopieren
                    </button>
                    <button onClick={() => setShowImportModal(true)} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
                      🔄 Route importieren
                    </button>
                  </div>
                </div>

                {alleLiegenschaftenSortiert.length === 0 ? (
                  <p style={{ textAlign: 'center', color: textSub, padding: '24px 0', fontSize: '0.85rem' }}>Keine Liegenschaften vorhanden. Bitte im Tab "Objekte" anlegen.</p>
                ) : (
                  alleLiegenschaftenSortiert.map(({ kunde, liege }) => {
                    const istErledigt = isObjektErledigtVorKurzem(liege.name);
                    return (
                      <div key={liege.id} style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '16px', border: istErledigt ? '2px solid #8cc63f' : '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', boxSizing: 'border-box' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', minWidth: 0 }}>
                            <span style={{ flexShrink: 0, fontSize: '0.7rem', backgroundColor: darkMode ? '#14171a' : '#111827', color: '#ffffff', padding: '3px 7px', borderRadius: '5px', fontWeight: 'bold' }}>#{liege.reihenfolge || 1}</span>
                            <h3 style={{ minWidth: 0, overflowWrap: 'anywhere', fontWeight: 'bold', color: textApp, fontSize: '0.95rem', lineHeight: 1.3, margin: '1px 0 0' }}>{liege.name}</h3>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: textSub, margin: '5px 0 3px', overflowWrap: 'anywhere' }}>{kunde?.firma || 'Unbekannter Kunde'}</div>
                          <p style={{ fontSize: '0.75rem', lineHeight: 1.35, color: textSub, margin: 0, overflowWrap: 'anywhere' }}>{liege.address} • {liege.size} m²</p>
                          {liege.raeumPlan && (
                            <button onClick={() => oeffneRaeumPlanAnsicht(liege.raeumPlan)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 'bold', padding: 0, marginTop: '4px', cursor: 'pointer' }}>
                              🗺️ Räumplan anzeigen
                            </button>
                          )}
                        </div>
                        {kunde && (
                          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            {istErledigt && <span style={{ whiteSpace: 'nowrap', fontSize: '0.65rem', backgroundColor: '#8cc63f', color: '#111827', padding: '4px 7px', borderRadius: '5px', fontWeight: 'bold' }}>✓ Erledigt</span>}
                            <button onClick={() => startEinsatzMitWaze(kunde, liege)} style={{ minWidth: '92px', backgroundColor: '#8cc63f', color: '#111827', padding: '10px 9px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              🚗 {istErledigt ? 'Nochmal' : 'Starten'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* KUNDEN TAB */}
            {activeTab === 'kunden' && (
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
                            </div>
                            {/* GROSSE BUTTONS UNTER DEM TEXT (Übersichtlich und einfach zu bedienen) */}
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
                    <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Kunden speichern</button>
                  </form>
                </div>
              </div>
            )}

            {/* LIEGENSCHAFTEN TAB */}
            {activeTab === 'liegenschaften' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>📍 Alle Liegenschaften verwalten</h2>
                  {liegenschaften.length === 0 ? (
                    <p style={{ textAlign: 'center', color: textSub, padding: '12px 0', fontSize: '0.85rem' }}>Noch keine Liegenschaften angelegt.</p>
                  ) : (
                    liegenschaften.map(liege => {
                      const zugehKunde = kunden.find(k => k.id === liege.kundeId);
                      return (
                        <div key={liege.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: darkMode ? '#14171a' : '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid ' + borderCard }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#8cc63f' }}>{zugehKunde?.firma || 'Kein Kunde'}</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textApp }}>{liege.name} (#{liege.reihenfolge})</div>
                            <div style={{ fontSize: '0.75rem', color: textSub }}>{liege.address} • {liege.size} m²</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <button onClick={() => startEditLiege(liege)} style={{ flex: 1, backgroundColor: darkMode ? '#20252a' : '#ffffff', border: '1px solid ' + borderCard, padding: '12px', borderRadius: '8px', cursor: 'pointer', color: textApp, fontSize: '0.9rem', fontWeight: 'bold' }}>✏️ Bearbeiten</button>
                            <button onClick={() => deleteLiegenschaft(liege.id)} style={{ flex: 1, backgroundColor: darkMode ? '#3b1f23' : '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Löschen</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>➕ Neue Liegenschaft hinzufügen</h2>
                  <form onSubmit={addLiegenschaft} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Kunde auswählen</label>
                      <select value={selectedKundeId} onChange={e => setSelectedKundeId(Number(e.target.value))} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, fontSize: '0.85rem', backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp }}>
                        {kunden.map(k => (
                          <option key={k.id} value={k.id}>{k.firma}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Objektbezeichnung</label>
                      <input type="text" value={neuObjName} onChange={e => setNeuObjName(e.target.value)} required placeholder="z.B. Filiale Nord" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Adresse (für Waze)</label>
                      <input type="text" value={neuObjAddress} onChange={e => setNeuObjAddress(e.target.value)} required placeholder="Musterstr. 5, Rees" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Fläche (m²)</label>
                        <input type="number" value={neuObjSize} onChange={e => setNeuObjSize(e.target.value)} required placeholder="200" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Tour-Nr.</label>
                        <input type="number" value={neuObjReihenfolge} onChange={e => setNeuObjReihenfolge(e.target.value)} required placeholder="1" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Streumittel</label>
                        <select value={neuObjMaterial} onChange={e => setNeuObjMaterial(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, fontSize: '0.85rem', backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp }}>
                          <option value="Reines Salz">Reines Salz</option>
                          <option value="Salz-Sand-Gemisch">Salz-Sand-Gemisch</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Räumplan (Kamera oder Datei)</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <label style={{ flex: 1, border: '2px dashed #8cc63f', backgroundColor: darkMode ? '#14171a' : '#f4fce3', color: '#8cc63f', padding: '10px', borderRadius: '8px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>
                          📸 Foto
                          <input type="file" accept="image/*" capture="environment" onChange={handleNeuRaeumPlanUpload} style={{ display: 'none' }} />
                        </label>
                        <label style={{ flex: 1, border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, padding: '10px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>
                          📁 Datei
                          <input type="file" accept="image/*,application/pdf" onChange={handleNeuRaeumPlanUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                      {neuObjRaeumPlan && <span style={{ fontSize: '0.75rem', color: '#8cc63f', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>✓ Räumplan hinterlegt!</span>}
                    </div>
                    <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Liegenschaft speichern</button>
                  </form>
                </div>

              </div>
            )}

            {/* LAGER TAB */}
            {activeTab === 'lager' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>🏠 Startpunkt / Basis festlegen</h2>
                  <form onSubmit={speichereStartpunkt} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Adresse für Start / Lager</label>
                      <input type="text" value={editingStartPunkt} onChange={e => setEditingStartPunkt(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Startpunkt speichern</button>
                  </form>
                </div>

                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>⛽ Spritpreis anpassen</h2>
                  <form onSubmit={speichereSpritPreis} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textSub, textTransform: 'uppercase', marginBottom: '4px' }}>Preis pro Liter (€)</label>
                      <input type="number" step="0.01" value={editingSpritPreis} onChange={e => setEditingSpritPreis(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Spritpreis speichern</button>
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
                    <button onClick={() => anpasseLagerGenau('add')} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>
                      + Hinzufügen
                    </button>
                    <button onClick={() => anpasseLagerGenau('sub')} style={{ flex: 1, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>
                      - Abziehen
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* MEHR TAB */}
            {activeTab === 'mehr' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: '0 0 4px 0', color: textApp }}>⚙️ Weitere Bereiche</h2>
                  
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
            )}

            {/* STATISTIK TAB */}
            {activeTab === 'statistik' && (
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
            )}

            {/* HISTORIE TAB */}
            {activeTab === 'history_saison' && (
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
              </div>
            )}
          </>
        )}

      </main>

      {/* UNTERE NAVIGATION (3 Haupt-Tabs + Mehr) */}
      {!activeObjekt && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: bgCard, borderTop: '2px solid #8cc63f', boxShadow: '0 -4px 15px rgba(0,0,0,0.08)', zIndex: 100, transition: 'background-color 0.3s ease' }}>
          <div style={{ maxWidth: '440px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '6px', gap: '2px' }}>
            <button onClick={() => setActiveTab('tour')} style={{ padding: '8px 2px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'tour' ? '#8cc63f' : (darkMode ? '#14171a' : '#f3f4f6'), color: activeTab === 'tour' ? '#111827' : textSub }}>
              🚗 Tour
            </button>
            <button onClick={() => setActiveTab('liegenschaften')} style={{ padding: '8px 2px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'liegenschaften' ? '#8cc63f' : (darkMode ? '#14171a' : '#f3f4f6'), color: activeTab === 'liegenschaften' ? '#111827' : textSub }}>
              📍 Objekte
            </button>
            <button onClick={() => setActiveTab('lager')} style={{ padding: '8px 2px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'lager' ? '#8cc63f' : (darkMode ? '#14171a' : '#f3f4f6'), color: activeTab === 'lager' ? '#111827' : textSub }}>
              📦 Lager
            </button>
            <button onClick={() => setActiveTab('mehr')} style={{ padding: '8px 2px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: ['mehr', 'kunden', 'statistik', 'history_saison'].includes(activeTab) ? '#8cc63f' : (darkMode ? '#14171a' : '#f3f4f6'), color: ['mehr', 'kunden', 'statistik', 'history_saison'].includes(activeTab) ? '#111827' : textSub }}>
              ⚙️ Mehr
            </button>
          </div>
        </nav>
      )}

    </div>
  );
}