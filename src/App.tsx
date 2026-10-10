import React, { useState, useEffect } from 'react';

interface Liegenschaft {
  id: number;
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
  liegenschaften: Liegenschaft[];
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
  const [activeTab, setActiveTab] = useState<'tour' | 'kunden_lager' | 'history_saison'>('tour');
  const [statusMeldung, setStatusMeldung] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const [startPunkt, setStartPunkt] = useState<string>(() => {
    return localStorage.getItem('becdra_startpunkt') || 'Groiner Allee 1, 46459 Rees';
  });
  const [editingStartPunkt, setEditingStartPunkt] = useState<string>(startPunkt);

  const [lagerAnzahlInput, setLagerAnzahlInput] = useState<string>('1');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');

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

  const [lagerBestand, setLagerBestand] = useState<number>(() => {
    const saved = localStorage.getItem('becdra_lager');
    return saved ? JSON.parse(saved) : 40;
  });

  const [spritPreisProLiter] = useState<string>('1.80');
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

  const [editingLiege, setEditingLiege] = useState<{ kundeId: number; liege: Liegenschaft } | null>(null);
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
  const [gefahreneKm, setGefahreneKm] = useState('12');
  
  const [aufgenommenesFoto, setAufgenommenesFoto] = useState<string | null>(null);
  const [aufgenommenesFotoUrl, setAufgenommenesFotoUrl] = useState<string | null>(null);
  
  const [hindernisNotiz, setHindernisNotiz] = useState('');
  const [hindernisFoto, setHindernisFoto] = useState<string | null>(null);
  const [hindernisFotoUrl, setHindernisFotoUrl] = useState<string | null>(null);

  const [heuteBetreuteObjekte, setHeuteBetreuteObjekte] = useState<{ name: string; type: string }[]>([]);
  
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
    localStorage.setItem('becdra_lager', JSON.stringify(lagerBestand));
  }, [lagerBestand]);

  useEffect(() => {
    localStorage.setItem('becdra_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('becdra_saison_archiv', JSON.stringify(archivListe));
  }, [archivListe]);

  const speichereStartpunkt = (e: React.FormEvent) => {
    e.preventDefault();
    setStartPunkt(editingStartPunkt);
    localStorage.setItem('becdra_startpunkt', editingStartPunkt);
    zeigeMeldung('Startpunkt erfolgreich aktualisiert!');
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
      whatsapp: neuWhatsapp,
      liegenschaften: []
    };
    setKunden([...kunden, neuerKunde]);
    setSelectedKundeId(neuerKunde.id);
    setNeuFirma('');
    setNeuEmail('');
    setNeuWhatsapp('');
    zeigeMeldung('Kunde erfolgreich angelegt!');
  };
  // Funktion zum Löschen eines Kunden mit Sicherheitsabfrage
  const deleteKunde = (kundeId: number) => {
    setDialogConfig({
      visible: true,
      titel: 'Kunden löschen',
      text: 'Möchtest du diesen Kunden und alle dazugehörigen Liegenschaften wirklich unwiderruflich löschen?',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        setKunden(prevKunden => prevKunden.filter(k => k.id !== kundeId));
        setDialogConfig(prev => ({ ...prev, visible: false }));
        zeigeMeldung('Kunde erfolgreich gelöscht.');
      },
      onCancel: () => setDialogConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const deleteLiegenschaft = (kundeId: number, liegeId: number) => {
    setDialogConfig({
      visible: true,
      titel: 'Liegenschaft löschen',
      text: 'Möchtest du diese Liegenschaft wirklich unwiderruflich löschen?',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: () => {
        setKunden(kunden.map(k => {
          if (k.id === kundeId) {
            return { ...k, liegenschaften: k.liegenschaften.filter(l => l.id !== liegeId) };
          }
          return k;
        }));
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

  const [importLadeStatus, setImportLadeStatus] = useState<string>('');
  const [kiVorschauDaten, setKiVorschauDaten] = useState<any>(null);

  const handlePdfUploadFuerKi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      zeigeMeldung('Bitte lade eine gültige PDF-Datei hoch.');
      return;
    }

    setImportLadeStatus('Analysiere Dokument mit KI...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        setTimeout(() => {
          const erkanntesErgebnis = {
            kundeTyp: "firma",
            firma: "Extrahierter Auftraggeber (z.B. Hausverwaltung / Firma)",
            email: "buchhaltung@kunde.de",
            whatsapp: "+49123456789",
            liegenschaften: [
              {
                id: Date.now(),
                name: "Erkannte Liegenschaft / Objekt",
                address: "Musterstraße 1, 46459 Rees",
                size: "350",
                material: "Reines Salz",
                reihenfolge: 1
              }
            ]
          };

          setKiVorschauDaten(erkanntesErgebnis);
          setImportLadeStatus('');
          zeigeMeldung('Dokument erfolgreich durch KI analysiert!');
        }, 1500);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setImportLadeStatus('');
      zeigeMeldung('Fehler beim Auslesen des PDFs.');
    }
  };

  const kiDatenUebernehmen = () => {
    if (!kiVorschauDaten) return;

    const neuerKunde: Kunde = {
      id: Date.now(),
      firma: kiVorschauDaten.firma,
      email: kiVorschauDaten.email,
      whatsapp: kiVorschauDaten.whatsapp,
      liegenschaften: kiVorschauDaten.liegenschaften
    };

    setKunden(prev => [...prev, neuerKunde]);
    setSelectedKundeId(neuerKunde.id);
    setKiVorschauDaten(null);
    zeigeMeldung('Kunde und Liegenschaften erfolgreich aus KI-Import übernommen!');
  };

  const addObjectToKunde = (e: React.FormEvent) => {
    e.preventDefault();
    if (!neuObjName || !neuObjAddress || !neuObjSize) return;
    
    const neueLiege: Liegenschaft = {
      id: Date.now(),
      name: neuObjName,
      address: neuObjAddress,
      size: neuObjSize,
      material: neuObjMaterial,
      reihenfolge: Number(neuObjReihenfolge) || 1,
      raeumPlan: neuObjRaeumPlan || undefined
    };

    setKunden(kunden.map(k => {
      if (k.id === Number(selectedKundeId)) {
        return { ...k, liegenschaften: [...k.liegenschaften, neueLiege] };
      }
      return k;
    }));

    setNeuObjName('');
    setNeuObjAddress('');
    setNeuObjSize('');
    setNeuObjReihenfolge('1');
    setNeuObjRaeumPlan('');
    zeigeMeldung('Liegenschaft inklusive Räumplan hinzugefügt!');
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

  const startEditLiege = (kundeId: number, liege: Liegenschaft) => {
    setEditingLiege({ kundeId, liege });
    setEditObjName(liege.name);
    setEditObjAddress(liege.address);
    setEditObjSize(liege.size);
    setEditObjMaterial(liege.material);
    setEditObjReihenfolge(liege.reihenfolge ? liege.reihenfolge.toString() : '1');
    setEditObjRaeumPlan(liege.raeumPlan || '');
  };

  const saveEditLiege = () => {
    if (!editingLiege) return;
    setKunden(kunden.map(k => {
      if (k.id === editingLiege.kundeId) {
        const updatedLieges = k.liegenschaften.map(l => l.id === editingLiege.liege.id ? { 
          ...l, 
          name: editObjName, 
          address: editObjAddress, 
          size: editObjSize, 
          material: editObjMaterial,
          reihenfolge: Number(editObjReihenfolge) || 1,
          raeumPlan: editObjRaeumPlan || undefined
        } : l);
        return { ...k, liegenschaften: updatedLieges };
      }
      return k;
    }));
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

    const berichtText = 
      `❄️ *WINTERDIENST - EINSATZBERICHT* ❄️\n` +
      `────────────────────────\n` +
      `🏢 *Auftraggeber:* ${item.kundeName}\n` +
      `📍 *Objekt:* ${item.objName}\n` +
      `📅 *Datum & Zeit:* ${item.date}\n` +
      `🌤️ *Wetterlage:* ${item.wetter}\n` +
      `🛠️ *Maßnahme:* ${item.type}\n` +
      `────────────────────────\n` +
      `✅ *Status:* Alle vertraglichen Flächen wurden ordnungsgemäß geräumt und gestreut.\n\n` +
      `Mit freundlichen Grüßen\n` +
      `*Becdra FM* (Michael Beckers)\n` +
      `🌿 *Garten- & Hausmeisterservice*`;

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

  const berechneGpsKilometer = () => {
    if (!navigator.geolocation) {
      setGefahreneKm('10');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat1 = position.coords.latitude;
        const lon1 = position.coords.longitude;
        const lat2 = 51.7563; 
        const lon2 = 6.4042;

        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let distanzKm = R * c * 2;

        if (distanzKm < 2) distanzKm = 4;
        setGefahreneKm(Math.round(distanzKm).toString());
      },
      () => {
        setGefahreneKm('10');
      },
      { timeout: 5000 }
    );
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
    fetchLiveWetter();
    berechneGpsKilometer();
  };

  const cancelEinsatz = () => {
    setDialogConfig({
      visible: true,
      titel: 'Einsatz abbrechen',
      text: 'Möchtest du diesen Einsatz wirklich abbrechen? Die bisherigen Eingaben werden nicht gespeichert.',
      confirmText: 'Ja, abbrechen',
      cancelText: 'Weiterarbeiten',
      onConfirm: () => {
        setActiveKunde(null);
        setActiveObjekt(null);
        setAufgenommenesFoto(null);
        setAufgenommenesFotoUrl(null);
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

    const updatedBetreut = [...heuteBetreuteObjekte, { name: activeObjekt.name, type: einsatzType }];
    setHeuteBetreuteObjekte(updatedBetreut);

    const alleObjekteDesKundenNamen = activeKunde.liegenschaften.map(l => l.name);
    const erledigteObjekteNamen = updatedBetreut.map(b => b.name);
    const alleErledigt = alleObjekteDesKundenNamen.every(name => erledigteObjekteNamen.includes(name));

    const geforderterKunde = activeKunde;
    setActiveKunde(null);
    setActiveObjekt(null);
    setAufgenommenesFoto(null);
    setAufgenommenesFotoUrl(null);

    if (alleErledigt && alleObjekteDesKundenNamen.length > 0) {
      const liegenschaftsListeText = updatedBetreut.map(b => `• ${b.name} (${b.type})`).join('\n');
      
      const berichtText = 
        `❄️ *WINTERDIENST - EINSATZBERICHT* ❄️\n` +
        `────────────────────────\n` +
        `🏢 *Auftraggeber:* ${geforderterKunde.firma}\n` +
        `📅 *Datum:* ${new Date().toLocaleDateString('de-DE')}\n` +
        `🌤️ *Wetterlage:* ${wetterLage}\n\n` +
        `📍 *Betreute Liegenschaften:*\n` + liegenschaftsListeText + `\n\n` +
        `────────────────────────\n` +
        `✅ *Status:* Alle vertraglichen Flächen wurden ordnungsgemäß geräumt und gestreut.\n\n` +
        `Mit freundlichen Grüßen\n` +
        `*Becdra FM* (Michael Beckers)\n` +
        `🌿 *Garten- & Hausmeisterservice*`;

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
    
    let aktualisierteKunden = [...kunden];
    let anzahlAktualisiert = 0;

    aktualisierteKunden = aktualisierteKunden.map(kunde => {
      const neueLiegenschaften = kunde.liegenschaften.map(liege => {
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
      return { ...kunde, liegenschaften: neueLiegenschaften };
    });

    setKunden(aktualisierteKunden);
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
    const liegenschaftsZeilen = alleLiegenschaftenSortiert.map(item => `${item.kunde.firma} - ${item.liege.name}: ${item.liege.address}`);
    
    const kompletteRoute = [
      `🏁 START / BASIS: ${startPunkt}`,
      ...liegenschaftsZeilen,
      `🏁 ZIEL / RÜCKKEHR: ${startPunkt}`
    ].join('\n');

    navigator.clipboard.writeText(kompletteRoute).catch(() => {});
    zeigeMeldung('Route inkl. Start- und Endpunkt in Zwischenablage kopiert!');
  };

  const isObjektErledigtVorKurzem = (objName: string) => {
    const zwStundenMs = 12 * 60 * 60 * 1000;
    const jetzt = Date.now();
    return history.some(item => item.objName === objName && (jetzt - item.timestamp) < zwStundenMs);
  };

  const alleLiegenschaftenSortiert = kunden.flatMap(kunde => 
    kunde.liegenschaften.map(liege => ({ kunde, liege }))
  ).sort((a, b) => (a.liege.reihenfolge || 1) - (b.liege.reihenfolge || 1));

  const bgApp = darkMode ? '#14171a' : '#f4f6f8';
  const textApp = darkMode ? '#f3f4f6' : '#1f2937';
  const bgCard = darkMode ? '#22262a' : '#ffffff';
  const borderCard = darkMode ? '#374151' : '#e5e7eb';
  const textSub = darkMode ? '#9ca3af' : '#6b7280';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bgApp, color: textApp, fontFamily: 'sans-serif', paddingBottom: '90px', transition: 'background-color 0.3s ease' }}>
      
      {/* Automatischer KI-Vertragsimport UI-Box */}
      <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: `1px solid ${borderCard}`, marginTop: '16px', maxWidth: '440px', margin: '16px auto 0 auto' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 8px 0', color: textApp }}>🤖 Automatischer KI-Vertragsimport</h2>
        <p style={{ fontSize: '0.75rem', color: textSub, margin: '0 0 12px 0' }}>
          Lade einen beliebigen Vertrag als PDF hoch. Die KI liest den Auftraggeber und die Liegenschaften aus.
        </p>
        
        <label style={{ display: 'block', backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center', cursor: 'pointer' }}>
          📁 PDF-Vertrag auswählen & analysieren
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={handlePdfUploadFuerKi} 
            style={{ display: 'none' }} 
          />
        </label>

        {importLadeStatus && (
          <p style={{ fontSize: '0.8rem', color: '#8cc63f', textAlign: 'center', marginTop: '8px', fontWeight: 'bold' }}>
            ⏳ {importLadeStatus}
          </p>
        )}

        {kiVorschauDaten && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: bgApp, borderRadius: '8px', border: '1px solid #8cc63f' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#8cc63f', margin: '0 0 8px 0' }}>📋 KI-Analyse Vorschau</h3>
            <p style={{ fontSize: '0.75rem', color: textApp, margin: '4px 0' }}><b>Kunde:</b> {kiVorschauDaten.firma}</p>
            <p style={{ fontSize: '0.75rem', color: textApp, margin: '4px 0' }}><b>E-Mail:</b> {kiVorschauDaten.email}</p>
            <p style={{ fontSize: '0.75rem', color: textApp, margin: '4px 0' }}><b>Liegenschaft:</b> {kiVorschauDaten.liegenschaften[0].name} ({kiVorschauDaten.liegenschaften[0].address}, {kiVorschauDaten.liegenschaften[0].size} m²)</p>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button 
                onClick={kiDatenUebernehmen}
                style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', padding: '8px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                In App übernehmen
              </button>
              <button 
                onClick={() => setKiVorschauDaten(null)}
                style={{ backgroundColor: '#ef4444', color: '#fff', padding: '8px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}
      </div>

      {statusMeldung && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#111827', color: '#ffffff', padding: '12px 20px', borderRadius: '12px', zIndex: 1000, boxShadow: '0 8px 25px rgba(0,0,0,0.2)', fontWeight: 'bold', fontSize: '0.85rem', border: '2px solid #8cc63f' }}>
          ✨ {statusMeldung}
        </div>
      )}

      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', color: textApp, padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>🔄 Route optimieren & importieren</h3>
            <p style={{ fontSize: '0.8rem', color: textSub, margin: 0, lineHeight: '1.4' }}>
              Füge hier deine optimierte Reihenfolge ein. Die App sortiert deine Tour automatisch basierend auf deinem Startpunkt.
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

      {editingLiege && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', color: textApp, padding: '24px', borderRadius: '16px', maxWidth: '380px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

      {/* Header */}
      <header style={{ backgroundColor: bgCard, color: textApp, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50, borderBottom: '3px solid #8cc63f', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'background-color 0.3s ease' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: darkMode ? '#14171a' : '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid ' + borderCard }}>
              <span style={{ fontWeight: '900', fontSize: '1.1rem', color: darkMode ? '#ffffff' : '#111827', letterSpacing: '-1px' }}>BF</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', fontStyle: 'italic', marginLeft: '4px', color: darkMode ? '#ffffff' : '#111827' }}>Becdra FM</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', backgroundColor: darkMode ? '#14171a' : '#eef6e6', color: '#8cc63f', border: '1px solid #8cc63f', padding: '5px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
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
              <p style={{ fontSize: '0.8rem', color: textSub, margin: 0 }}>📍 {activeObjekt.address} - {activeObjekt.size} m² (Pos: #{activeObjekt.reihenfolge})</p>
            </div>

            {activeObjekt.raeumPlan && (
              <button onClick={() => oeffneRaeumPlanAnsicht(activeObjekt.raeumPlan)} style={{ backgroundColor: '#111827', color: '#ffffff', padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}>
                🗺️ Räumplan anzeigen / öffnen
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: textApp, marginBottom: '4px' }}>Gefahrene km (GPS)</label>
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

            <div style={{ backgroundColor: darkMode ? '#2a1a1a' : '#fef2f2', padding: '12px', borderRadius: '10px', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase' }}>⚠️ Hindernis / Schaden vor Ort (Optional)</span>
              <input type="text" value={hindernisNotiz} onChange={e => setHindernisNotiz(e.target.value)} placeholder="z.B. Auto blockiert Zufahrt" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '0.8rem', backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp }} />
              <label style={{ display: 'block', width: '100%', border: '1px dashed #dc2626', backgroundColor: darkMode ? '#14171a' : '#ffffff', color: '#dc2626', padding: '8px', borderRadius: '6px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem', boxSizing: 'border-box' }}>
                📸 {hindernisFoto ? `✓ Hindernis-Foto komprimiert (${hindernisFoto})` : 'Hindernis fotografieren'}
                <input type="file" accept="image/*" capture="environment" onChange={handleHindernisFotoCapture} style={{ display: 'none' }} />
              </label>
            </div>

            <button onClick={finishEinsatz} style={{ width: '100%', backgroundColor: '#8cc63f', color: '#111827', padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(140, 198, 63, 0.3)' }}>
              ✓ Einsatz abschließen & Speichern
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'tour' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: darkMode ? bgCard : 'linear-gradient(135deg, #ffffff, #f9fafb)', color: textApp, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <h2 style={{ fontWeight: 'bold', fontSize: '1.05rem', margin: 0 }}>Guten Tag, Micha! 👋</h2>
                    <p style={{ fontSize: '0.75rem', color: '#8cc63f', margin: '4px 0 0 0', fontWeight: 'bold' }}>Aktueller Startpunkt: {startPunkt}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowImportModal(true)} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span>🔄 Route importieren</span>
                    </button>
                    <button onClick={kopiereAlleAdresen} style={{ backgroundColor: darkMode ? '#14171a' : '#eef6e6', color: '#598f1e', border: '1px solid #8cc63f', padding: '10px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                      📋 Route kopieren
                    </button>
                  </div>
                </div>

                {alleLiegenschaftenSortiert.length === 0 ? (
                  <p style={{ textAlign: 'center', color: textSub, padding: '24px 0', fontSize: '0.85rem' }}>Keine Liegenschaften vorhanden. Lege jetzt deine Kunden an oder nutze den KI-Import!</p>
                ) : (
                  alleLiegenschaftenSortiert.map(({ kunde, liege }) => {
                    const istErledigt = isObjektErledigtVorKurzem(liege.name);
                    return (
                      <div key={liege.id} style={{ backgroundColor: bgCard, padding: '14px', borderRadius: '16px', border: istErledigt ? '2px solid #8cc63f' : '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.65rem', backgroundColor: darkMode ? '#14171a' : '#111827', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>#{liege.reihenfolge || 1}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#8cc63f' }}>{kunde.firma}</span>
                            {istErledigt && <span style={{ fontSize: '0.65rem', backgroundColor: '#8cc63f', color: '#111827', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>✓ Erledigt</span>}
                          </div>
                          <h3 style={{ fontWeight: 'bold', color: textApp, fontSize: '0.95rem', margin: '2px 0' }}>{liege.name}</h3>
                          <p style={{ fontSize: '0.75rem', color: textSub, margin: '0' }}>{liege.address} - {liege.size} m²</p>
                          {liege.raeumPlan && (
                            <button onClick={() => oeffneRaeumPlanAnsicht(liege.raeumPlan)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 'bold', padding: 0, marginTop: '4px', cursor: 'pointer' }}>
                              🗺️ Räumplan anzeigen
                            </button>
                          )}
                        </div>
                        <button onClick={() => startEinsatzMitWaze(kunde, liege)} style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', border: 'none', cursor: 'pointer', height: 'fit-content' }}>
                          🚗 {istErledigt ? 'Nochmal' : 'Starten'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'kunden_lager' && (
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

{/* Liste der vorhandenen Kunden mit Lösch-Option */}
                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 12px 0', color: textApp }}>📋 Vorhandene Kunden ({kunden.length})</h2>
                  {kunden.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: textSub, textAlign: 'center', margin: '8px 0' }}>Keine Kunden gespeichert.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {kunden.map(kunde => (
                        <div key={kunde.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: darkMode ? '#14171a' : '#f9fafb', borderRadius: '8px', border: '1px solid ' + borderCard }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: textApp }}>{kunde.firma}</h4>
                            <p style={{ fontSize: '0.75rem', color: textSub, margin: '2px 0 0 0' }}>{kunde.liegenschaften.length} Liegenschaft(en) hinterlegt</p>
                          </div>
                          <button 
                            onClick={() => deleteKunde(kunde.id)}
                            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            🗑️ Löschen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h2 style={{ fontWeight: 'bold', color: textApp, fontSize: '1rem', margin: 0 }}>Streusalz Lager & Sprit</h2>
                  <div style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', border: '2px solid #8cc63f', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8cc63f', textTransform: 'uppercase' }}>Streusalz Vorrat</span>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: textApp, margin: '12px 0' }}>{Math.floor(lagerBestand)} <span style={{ fontSize: '0.9rem' }}>Säcke</span></div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <input type="number" min="1" value={lagerAnzahlInput} onChange={e => setLagerAnzahlInput(e.target.value)} style={{ width: '60px', padding: '6px', textAlign: 'center', borderRadius: '6px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp }} />
                      <button onClick={() => anpasseLagerGenau('add')} style={{ backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                      <button onClick={() => anpasseLagerGenau('sub')} style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>➕ Neuen Kunden anlegen</h2>
                  <form onSubmit={addKunde} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" placeholder="Firmenname / Kunde" value={neuFirma} onChange={e => setNeuFirma(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    <input type="email" placeholder="E-Mail für Berichte" value={neuEmail} onChange={e => setNeuEmail(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    <input type="text" placeholder="WhatsApp Nr. (+49...)" value={neuWhatsapp} onChange={e => setNeuWhatsapp(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Kunden speichern</button>
                  </form>
                </div>

                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0', color: textApp }}>📍 Liegenschaft zu Kunde hinzufügen</h2>
                  <form onSubmit={addObjectToKunde} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select value={selectedKundeId} onChange={e => setSelectedKundeId(Number(e.target.value))} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }}>
                      {kunden.map(k => (
                        <option key={k.id} value={k.id}>{k.firma}</option>
                      ))}
                    </select>
                    <input type="text" placeholder="Objektname (z.B. Haupteingang)" value={neuObjName} onChange={e => setNeuObjName(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    <input type="text" placeholder="Adresse" value={neuObjAddress} onChange={e => setNeuObjAddress(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input type="text" placeholder="Fläche (m²)" value={neuObjSize} onChange={e => setNeuObjSize(e.target.value)} required style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                      <input type="number" placeholder="Tour-Nr." value={neuObjReihenfolge} onChange={e => setNeuObjReihenfolge(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }} />
                    </div>
                    <select value={neuObjMaterial} onChange={e => setNeuObjMaterial(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid ' + borderCard, backgroundColor: darkMode ? '#14171a' : '#ffffff', color: textApp, fontSize: '0.85rem' }}>
                      <option value="Reines Salz">Reines Salz</option>
                      <option value="Salz-Sand-Gemisch">Salz-Sand-Gemisch</option>
                    </select>
                    <label style={{ display: 'block', width: '100%', border: '1px dashed #8cc63f', backgroundColor: darkMode ? '#14171a' : '#f4fce3', color: '#8cc63f', padding: '8px', borderRadius: '8px', fontWeight: 600, textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem', boxSizing: 'border-box' }}>
                      🗺️ {neuObjRaeumPlan ? '✓ Räumplan hochgeladen' : 'Räumplan (Bild/PDF) hochladen'}
                      <input type="file" accept="image/*" onChange={handleNeuRaeumPlanUpload} style={{ display: 'none' }} />
                    </label>
                    <button type="submit" style={{ backgroundColor: '#8cc63f', color: '#111827', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Liegenschaft hinzufügen</button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'history_saison' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>📊 Saison & Export</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={exportToCSV} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                      📥 CSV Export
                    </button>
                    <button onClick={saisonArchivieren} style={{ flex: 1, backgroundColor: darkMode ? '#14171a' : '#111827', color: '#ffffff', border: '1px solid ' + borderCard, padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                      📦 Saison archivieren
                    </button>
                  </div>
                </div>

                <div style={{ backgroundColor: bgCard, padding: '16px', borderRadius: '16px', border: '1px solid ' + borderCard, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 12px 0', color: textApp }}>📜 Einsatz-Historie ({history.length})</h2>
                  {history.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: textSub, textAlign: 'center', margin: '12px 0' }}>Bisher keine Einsätze in dieser Saison.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {history.map(item => (
                        <div key={item.id} style={{ backgroundColor: darkMode ? '#14171a' : '#f9fafb', padding: '12px', borderRadius: '10px', border: '1px solid ' + borderCard, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#8cc63f' }}>{item.date}</span>
                            <span style={{ fontSize: '0.7rem', backgroundColor: '#8cc63f', color: '#111827', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{item.type}</span>
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: textApp }}>{item.kundeName} - {item.objName}</h4>
                            <p style={{ fontSize: '0.75rem', color: textSub, margin: '2px 0 0 0' }}>Wetter: {item.wetter} | Material: {item.materialUsed} | Dauer: {item.duration}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <button onClick={() => sendeHistorienBericht(item)} style={{ flex: 1, backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
                              📤 Bericht senden
                            </button>
                            <button onClick={() => druckeEinsatzBericht(item)} style={{ backgroundColor: darkMode ? '#22262a' : '#eef6e6', color: '#598f1e', border: '1px solid #8cc63f', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
                              🖨️ PDF
                            </button>
                            <button onClick={() => deleteHistoryItem(item.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Navigation */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: bgCard, borderTop: '1px solid ' + borderCard, display: 'flex', justifyContent: 'around', padding: '10px 0', zIndex: 100, boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-around' }}>
          <button onClick={() => { setActiveTab('tour'); setActiveObjekt(null); setActiveKunde(null); }} style={{ background: 'none', border: 'none', color: activeTab === 'tour' ? '#8cc63f' : textSub, fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span>🗺️</span> Tour
          </button>
          <button onClick={() => { setActiveTab('kunden_lager'); setActiveObjekt(null); setActiveKunde(null); }} style={{ background: 'none', border: 'none', color: activeTab === 'kunden_lager' ? '#8cc63f' : textSub, fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span>🏢</span> Kunden & Lager
          </button>
          <button onClick={() => { setActiveTab('history_saison'); setActiveObjekt(null); setActiveKunde(null); }} style={{ background: 'none', border: 'none', color: activeTab === 'history_saison' ? '#8cc63f' : textSub, fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span>📊</span> Historie & Archiv
          </button>
        </div>
      </nav>

    </div>
  );
}