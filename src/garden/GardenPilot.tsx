import { useEffect, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import type { Kunde, Liegenschaft } from '../types';
import { INVENTORY, addDays, dateKey, euro, inSeason, localDateTime, newObject, nextAllowedDay, numberValue, planningWindow, visitCost, type Appointment, type FollowUp, type GardenObject, type GardenPhoto, type GardenState, type GardenVisit } from './model';
import { dataUrl, download, loadGarden, loadPhotos, saveGarden, validateGarden } from './storage';
import './garden.css';
import DateTimeField from './DateTimeField';
import { calendarDateLabel } from './calendarDate';
import CareTaskEditor from './CareTaskEditor';
import ToolsEditor from './ToolsEditor';
import AppointmentTasks from './AppointmentTasks';
import GardenOverview from './GardenOverview';
import { chronological, objectTasks, taskTiming, tasksForAppointment } from './carePlanning';
import type { GardenTool } from './model';
import { sameDayAppointments } from './appointmentConflicts';
import { AppointmentReason, CancellationEditor, AppointmentHistory } from './AppointmentActions';
import { recordAppointmentChange, shiftAppointment } from './appointmentChanges';
interface Props { kunden: Kunde[]; setKunden: Dispatch<SetStateAction<Kunde[]>>; liegenschaften: Liegenschaft[]; darkMode: boolean; onDirty: (dirty: boolean) => void }
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const formatDate = (key: string) => key ? calendarDateLabel(key) : 'Noch offen';
const checksum = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
const message = (e: unknown) => e instanceof Error ? e.message : 'Vorgang fehlgeschlagen. Bitte erneut versuchen.';
const followLabels = { open: 'Offen / prüfen', approval: 'Zusage offen', approved: 'Freigegeben', done: 'Erledigt', discarded: 'Verworfen' };
const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="gp-field"><span>{label}</span>{children}</label>;
const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => <label className="gp-check"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />{label}</label>;
function Photo({ photo }: { photo: GardenPhoto }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const next = URL.createObjectURL(photo.file); setTimeout(() => setUrl(next), 0); return () => URL.revokeObjectURL(next); }, [photo.file]);
  return <figure className="gp-photo"><a href={url || undefined} target="_blank" rel="noreferrer" aria-label={`Original öffnen: ${photo.name}`}><img src={url || undefined} alt={photo.category === 'before' ? 'Vorher' : photo.category === 'after' ? 'Nachher' : 'Beobachtung'} loading="lazy" /></a><figcaption>{photo.category === 'before' ? 'Vorher' : photo.category === 'after' ? 'Nachher' : 'Beobachtung'} · {formatDate(photo.uploadedAt)}<br />Nur auf diesem Gerät</figcaption></figure>;
}
function ObjectEditor({ initial, kunden, liegenschaften, onSave, onCancel, addCustomer, onDirty, tools }: {
  tools: GardenTool[]; initial: GardenObject; kunden: Kunde[]; liegenschaften: Liegenschaft[]; onSave: (obj: GardenObject) => Promise<boolean>; onCancel: () => void; addCustomer: (name: string) => number; onDirty: (dirty: boolean) => void
}) {
  const [obj, setObj] = useState<GardenObject>(() => ({ ...initial, careTasks: objectTasks(initial) })), [step, setStep] = useState(0), [customerName, setCustomerName] = useState(''), [error, setError] = useState('');
  const update = <K extends keyof GardenObject>(key: K, value: GardenObject[K]) => { setObj(p => ({ ...p, [key]: value })); onDirty(true); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!obj.name.trim() || !obj.customerId) { setError('Bitte Objektname und Auftraggeber ergänzen.'); setStep(0); return; }
    if (!obj.visitIntervalMonths && obj.intervalMin > obj.intervalMax) { setError('Der früheste Pflegeabstand darf nicht größer als der späteste sein.'); setStep(2); return; }
    if (objectTasks(obj).some(t => !t.name.trim() || (t.mode === 'windows' && !t.windows.length))) { setError('Bitte Aufgabenname und mindestens ein Zeitfenster je jährlicher Aufgabe ergänzen.'); setStep(1); return; }
    if (await onSave({ ...obj, careTasks: objectTasks(obj), checklist: objectTasks(obj).map(t => t.name), name: obj.name.trim(), updatedAt: new Date().toISOString() })) onDirty(false);
  };
  const template = () => {
    setObj(p => ({ ...p, name: 'Bahnstraße', inventory: ['Bauernhortensien', 'Schneeballhortensien', 'Eibenhecke', 'Rhododendren', 'Kletterhortensien', 'Pflaster / Einfahrt'], allowedDays: [6], access: 'Samstags keine parkenden Autos.', authorized: true,
      seasonStart: 4, seasonEnd: 11, seasonNotes: 'Ab April nach Wetter und Pflanzenentwicklung beginnen. Laubarbeiten nach Bedarf; danach Winterpause. Saisonende November ist ein anpassbarer Planwert.',
      careTasks: undefined, machineDefault: true, photoShare: true, checklist: ['Pflaster und Einfahrt freischneiden', 'Laub und Schnittgut entfernen', 'Pflanzenzustand kontrollieren'], inventoryNotes: 'Eibenhecke lückig. Nachpflanzung prüfen und ausdrücklich freigeben lassen.' })); onDirty(true);
  };
  return <form onSubmit={submit} className="gp-stack">
    <div className="gp-heading"><h2>{initial.name ? 'Objekt bearbeiten' : 'Objekt aufnehmen'}</h2><button type="button" onClick={onCancel}>Schließen</button></div>
    <nav className="gp-tabs" aria-label="Schritte der Objektaufnahme">{['Objekt', 'Bestand', 'Planung', 'Abrechnung'].map((s, i) => <button type="button" key={s} aria-pressed={step === i} onClick={() => setStep(i)}>{s}</button>)}</nav>
    <p className="gp-hint">Du kannst jederzeit speichern und fehlende Angaben später ergänzen.</p>
    {error && <p role="alert" className="gp-error">{error}</p>}
    <section hidden={step !== 0} className="gp-card gp-stack">
      <Field label="Auftraggeber *"><select value={obj.customerId} onChange={e => update('customerId', Number(e.target.value))}><option value={0}>Bitte auswählen</option>{kunden.map(k => <option key={k.id} value={k.id}>{k.firma}</option>)}</select></Field>
      <details><summary>Neuen Auftraggeber anlegen</summary><Field label="Name / Firma"><input value={customerName} onChange={e => setCustomerName(e.target.value)} /></Field><button type="button" onClick={() => { try { if (!customerName.trim()) return; update('customerId', addCustomer(customerName.trim())); setCustomerName(''); } catch (e) { setError(message(e)); } }}>Auftraggeber übernehmen</button></details>
      {liegenschaften.length > 0 && <Field label="Vorhandenes Winterdienstobjekt verknüpfen (optional)"><select value={obj.winterObjectId ?? ''} onChange={e => { const source = liegenschaften.find(x => x.id === Number(e.target.value)); if (source) { setObj(p => ({ ...p, winterObjectId: source.id, customerId: source.kundeId, name: source.name, address: source.address })); onDirty(true); } else update('winterObjectId', undefined); }}><option value="">Eigenständiges Gartenobjekt</option>{liegenschaften.map(l => <option key={l.id} value={l.id}>{l.name} · {kunden.find(k => k.id === l.kundeId)?.firma}</option>)}</select></Field>}
      <Field label="Objektname *"><input value={obj.name} onChange={e => update('name', e.target.value)} autoComplete="off" /></Field>
      <Field label="Adresse"><input value={obj.address} onChange={e => update('address', e.target.value)} autoComplete="street-address" /></Field>
      <Field label="Ansprechpartner / Telefon / Hinweise"><textarea value={obj.contact} onChange={e => update('contact', e.target.value)} /></Field>
      <Field label="Zugang und Besonderheiten"><textarea value={obj.access} onChange={e => update('access', e.target.value)} placeholder="Schlüssel, Tore, parkende Autos …" /></Field>
      {!initial.name && <button type="button" onClick={template}>Bahnstraße-Vorlage verwenden</button>}
    </section>
    <section hidden={step !== 1} className="gp-card gp-stack">
      <h3>Pflanzen, Flächen und Technik</h3>{[...new Set([...INVENTORY, ...obj.inventory])].map(item => <Check key={item} label={item} checked={obj.inventory.includes(item)} onChange={checked => update('inventory', checked ? [...obj.inventory, item] : obj.inventory.filter(x => x !== item))} />)}
      <Field label="Weiteren Pflegebereich hinzufügen"><input placeholder="Bezeichnung eingeben, dann Enter" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const input = e.currentTarget; const text = input.value.trim(); if (text && !obj.inventory.includes(text)) update('inventory', [...obj.inventory, text]); input.value = ''; } }} /></Field>
      <Field label="Bestandsnotizen / Lage / Auffälligkeiten"><textarea value={obj.inventoryNotes} onChange={e => update('inventoryNotes', e.target.value)} placeholder="Zum Diktieren das Mikrofon deiner Handy-Tastatur verwenden." /></Field>
      <CareTaskEditor tasks={objectTasks(obj)} tools={tools} onChange={tasks => update('careTasks', tasks)} />
    </section>
    <section hidden={step !== 2} className="gp-card gp-stack">
      <Field label="Besuchsrhythmus"><select value={obj.visitIntervalMonths ? 'months' : 'weeks'} onChange={e => update('visitIntervalMonths', e.target.value === 'months' ? 1 : undefined)}><option value="weeks">Abstand in Wochen</option><option value="months">Abstand in Monaten</option></select></Field>
      {obj.visitIntervalMonths ? <Field label="Besuch alle … Monate"><input type="number" min="1" max="12" value={obj.visitIntervalMonths} onChange={e => update('visitIntervalMonths', Number(e.target.value))} /></Field> : <div className="gp-columns"><Field label="Abstand frühestens (Wochen)"><input type="number" min="1" max="52" value={obj.intervalMin} onChange={e => update('intervalMin', Number(e.target.value))} /></Field><Field label="Abstand spätestens (Wochen)"><input type="number" min="1" max="52" value={obj.intervalMax} onChange={e => update('intervalMax', Number(e.target.value))} /></Field></div>}
      <div className="gp-columns"><Field label="Saison beginnt"><select value={obj.seasonStart} onChange={e => update('seasonStart', Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Field><Field label="Saison endet"><select value={obj.seasonEnd} onChange={e => update('seasonEnd', Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Field></div>
      <p className="gp-hint">Start- und Endmonat sind Planwerte, keine fachliche Empfehlung. Für ganzjährige Betreuung Januar bis Dezember wählen.</p>
      <Field label="Saisonregeln / Wetter / Winterpause"><textarea value={obj.seasonNotes} onChange={e => update('seasonNotes', e.target.value)} /></Field>
      <Field label="Vorbereitung vor Saisonstart (Wochen)"><input type="number" min="0" max="12" value={obj.leadWeeks} onChange={e => update('leadWeeks', Number(e.target.value))} /></Field>
      <fieldset className="gp-days"><legend>Mögliche Einsatztage · leer = alle Tage</legend>{DAYS.map((day, i) => <Check key={day} label={day} checked={obj.allowedDays.includes(i)} onChange={checked => update('allowedDays', checked ? [...obj.allowedDays, i] : obj.allowedDays.filter(x => x !== i))} />)}</fieldset>
      <Check label="Laufende Pflege ist freigegeben" checked={obj.authorized} onChange={v => update('authorized', v)} />
      <Field label="Letzter Besuch vor Nutzung der App"><input type="date" max={dateKey()} value={obj.lastVisit} onChange={e => update('lastVisit', e.target.value)} /></Field>
    </section>
    <section hidden={step !== 3} className="gp-card gp-stack">
      <Field label="Rechnungsrhythmus"><select value={obj.billingCycle} onChange={e => update('billingCycle', e.target.value as GardenObject['billingCycle'])}><option value="visit">Nach jedem Besuch</option><option value="monthly">Monatlich</option></select></Field>
      <Field label="Berechnungsart"><select value={obj.billingMode} onChange={e => update('billingMode', e.target.value as GardenObject['billingMode'])}><option value="hours">Nach Aufwand</option><option value="fixed">Feste Pauschale</option><option value="mixed">Pauschale plus Zusatzarbeiten</option></select></Field>
      {obj.billingMode !== 'hours' && <><Field label={obj.billingCycle === 'monthly' ? 'Pauschale pro Monat (€)' : 'Pauschale pro Besuch (€)'}><input inputMode="decimal" value={obj.fixedRate} onChange={e => update('fixedRate', e.target.value)} /></Field><Field label="Enthaltene Leistungen und Abgrenzung der Zusatzarbeiten"><textarea value={obj.included} onChange={e => update('included', e.target.value)} /></Field></>}
      <Field label="Arbeitsstundensatz (€) · bei Pauschalen für Zusatzarbeiten"><input inputMode="decimal" value={obj.hourlyRate} onChange={e => update('hourlyRate', e.target.value)} /></Field>
      <Field label="Fahrtkosten je Besuch (€)"><input inputMode="decimal" value={obj.travelRate} onChange={e => update('travelRate', e.target.value)} /></Field>
      <Field label="Kleinmaschinen je abgerechneter Stunde (€)"><input inputMode="decimal" value={obj.machineRate} onChange={e => update('machineRate', e.target.value)} /></Field>
      <Check label="Maschinen beim Besuch vorauswählen" checked={obj.machineDefault} onChange={v => update('machineDefault', v)} />
      <Field label="Entsorgung pro Tonne (€)"><input inputMode="decimal" value={obj.disposalRate} onChange={e => update('disposalRate', e.target.value)} /></Field>
      <Check label="Nach jedem Besuch Fotos per WhatsApp teilen" checked={obj.photoShare} onChange={v => update('photoShare', v)} />
      <p className="gp-hint">Besuchsdauer auf Viertelstunden aufrunden. Bei Maschineneinsatz gilt die gesamte abgerechnete Besuchsdauer. Preise können vorerst offen bleiben.</p>
    </section>
    <div className="gp-actions gp-save-bar">{step > 0 && <button type="button" onClick={() => setStep(s => s - 1)}>Zurück</button>}{step < 3 && <button type="button" onClick={() => setStep(s => s + 1)}>Weiter</button>}<button className="gp-primary" type="submit">Objekt speichern</button></div>
  </form>;
}
function VisitEditor({ obj, state, appointment, onSave, onCancel, onDirty }: { state: GardenState; appointment: Appointment | null; obj: GardenObject; onSave: (visit: GardenVisit) => Promise<boolean>; onCancel: () => void; onDirty: (dirty: boolean) => void }) {
  const [start, setStart] = useState(localDateTime()), [end, setEnd] = useState(''), [doneIds, setDoneIds] = useState<string[]>([]), [notes, setNotes] = useState(''), [machines, setMachines] = useState(obj.machineDefault), [tonnes, setTonnes] = useState(''), [error, setError] = useState('');
  const [rates, setRates] = useState({ hourlyRate: obj.hourlyRate, machineRate: obj.machineRate, travelRate: obj.travelRate, disposalRate: obj.disposalRate });
  const tasks = tasksForAppointment(obj, state, { id: '__visit', objectId: obj.id, title: '', start, end, status: 'planned', note: '', updatedAt: '', ...appointment, ...(appointment ? {} : { start }) });
  const visit: GardenVisit = { id: '', objectId: obj.id, start, end, checklist: tasks.map(t => t.name), done: tasks.filter(t => doneIds.includes(t.id)).map(t => t.name), doneTaskIds: tasks.filter(t => doneIds.includes(t.id)).map(t => t.id), appointmentId: appointment?.id, notes, machines, disposalTonnes: tonnes, ...rates, billingMode: obj.billingMode, billingCycle: obj.billingCycle, photoShare: obj.photoShare, createdAt: '' };
  const cost = visitCost(visit);
  return <form className="gp-stack" onChange={() => onDirty(true)} onSubmit={async e => { e.preventDefault(); if (!start || !end || !Number.isFinite(new Date(start).getTime()) || !Number.isFinite(new Date(end).getTime()) || end <= start || end > localDateTime()) { setError('Bitte gültige Start- und Endzeit eingeben. Ende muss nach Beginn liegen und darf nicht in der Zukunft sein.'); return; } if (tonnes && (!/^\d+(?:[.,]\d)?$/.test(tonnes) || numberValue(tonnes) < 0)) { setError('Entsorgung bitte in 0,1-t-Schritten angeben.'); return; } if (await onSave({ ...visit, id: crypto.randomUUID(), createdAt: new Date().toISOString() })) onDirty(false); }}>
    <div className="gp-heading"><h2>Besuch dokumentieren</h2><button type="button" onClick={onCancel}>Schließen</button></div><p>{obj.name}</p>
    {error && <p className="gp-error" role="alert">{error}</p>}
    <section className="gp-card gp-stack"><DateTimeField label="Beginn vor Ort" value={start} onChange={value => { setStart(value); onDirty(true); }} /><DateTimeField label="Ende vor Ort" value={end} onChange={value => { setEnd(value); onDirty(true); }} /><button type="button" onClick={() => { setEnd(localDateTime()); onDirty(true); }}>Ende auf jetzt setzen</button>
    <h3>Erledigte Arbeiten</h3>{visit.checklist.length === 0 && <p className="gp-hint">Eine Standard-Checkliste kannst du im Objekt ergänzen.</p>}{tasks.map(task => <Check key={task.id} label={task.name} checked={doneIds.includes(task.id)} onChange={v => { setDoneIds(p => v ? [...p, task.id] : p.filter(x => x !== task.id)); onDirty(true); }} />)}
    <Field label="Zusätzliche Arbeiten und Beobachtungen"><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Du kannst über das Mikrofon deiner Handy-Tastatur diktieren." /></Field><Check label="Maschinen eingesetzt · gesamte Besuchsdauer berechnen" checked={machines} onChange={setMachines} /><Field label="Geschätzte Entsorgungsmenge (t)"><input inputMode="decimal" value={tonnes} onChange={e => setTonnes(e.target.value)} placeholder="z. B. 0,1" /></Field>
    <details><summary>Preise für diesen Besuch prüfen</summary>{(['hourlyRate', 'machineRate', 'travelRate', 'disposalRate'] as const).map((key, i) => <Field key={key} label={['Arbeit €/h', 'Maschinen €/h', 'Fahrt €', 'Entsorgung €/t'][i]}><input inputMode="decimal" value={rates[key]} onChange={e => setRates(p => ({ ...p, [key]: e.target.value }))} /></Field>)}</details>
    {end && end > start && <div className="gp-notice"><strong>{cost.hours.toLocaleString('de-DE')} Stunden abgerechnet</strong><br />{obj.billingMode === 'hours' ? `Vorläufige Rechnungsgrundlage: ${euro(cost.total)}` : 'Pauschalvertrag: Besuch dokumentieren; Zusatzarbeiten vor Abrechnung gesondert prüfen.'}<br />Offene Preise werden nicht als verbindlicher Nullpreis behandelt.</div>}
    <p className="gp-hint">Fotos kannst du nach dem Speichern gezielt diesem Besuch zuordnen. Nicht abgehakte Arbeiten bleiben bei künftigen Besuchen sichtbar.</p></section><div className="gp-save-bar"><button className="gp-primary" type="submit">Besuch speichern</button></div>
  </form>;
}
function calendarFile(appointment: Appointment, obj: GardenObject) {
  const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const utc = (date: string) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Becdra FM//Gartenpflege//DE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${appointment.id}@becdra-fm`, `DTSTAMP:${utc(appointment.updatedAt)}`, `DTSTART:${utc(appointment.start)}`, `DTEND:${utc(appointment.end)}`, `SUMMARY:${escape(appointment.title + ' – ' + obj.name)}`, `LOCATION:${escape(obj.address)}`, 'DESCRIPTION:Planung in der Becdra FM App. Dieser Export wird nicht automatisch aktualisiert.', 'END:VEVENT', 'END:VCALENDAR'];
  // RFC 5545 folding uses UTF-8 octets, without splitting multibyte characters.
  const encoder = new TextEncoder();
  const folded = lines.flatMap(line => { const chunks: string[] = []; let part = '', bytes = 0; for (const char of line) { const size = encoder.encode(char).length; if (bytes + size > 73) { chunks.push(part); part = ' '; bytes = 1; } part += char; bytes += size; } chunks.push(part); return chunks; });
  download(new Blob([folded.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }), `Becdra-Termin-${appointment.start.slice(0, 10)}.ics`);
}
export default function GardenPilot({ kunden, setKunden, liegenschaften, darkMode, onDirty }: Props) {
  const [state, setState] = useState<GardenState | null>(null), [photos, setPhotos] = useState<GardenPhoto[]>([]), [error, setError] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'attention' | 'objects' | 'calendar' | 'backup' | 'tools'>('attention'), [selectedId, setSelectedId] = useState(''), [editing, setEditing] = useState<GardenObject | null>(null), [recording, setRecording] = useState(false), [dirty, setDirty] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null), [cancelReturnDirty, setCancelReturnDirty] = useState(false);
  const [moving, setMoving] = useState(false), [changeReason, setChangeReason] = useState('');
  const [duplicateChoice, setDuplicateChoice] = useState(false);
  const [recordingAppointment, setRecordingAppointment] = useState<Appointment | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const [month, setMonth] = useState(dateKey().slice(0, 7)), [appointmentEdit, setAppointmentEdit] = useState<Appointment | null>(null);
  const [newTask, setNewTask] = useState(''), [taskDue, setTaskDue] = useState(''), [taskStatus, setTaskStatus] = useState<FollowUp['status']>('open');
  const [photoCategory, setPhotoCategory] = useState<GardenPhoto['category']>('observation'), [photoVisit, setPhotoVisit] = useState(''), [showArchived, setShowArchived] = useState(false);
  useEffect(() => { let active = true; void Promise.all([loadGarden(), loadPhotos()]).then(([data, files]) => { if (active) { setState(validateGarden(data)); setPhotos(files); } }).catch(e => { if (active) setError(message(e)); }); return () => { active = false; }; }, []);
  useEffect(() => { if (!dirty) return; const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
  function markDirty(value: boolean) { setDirty(value); onDirty(value); }
  const leave = (action: () => void) => { if (dirty && !window.confirm('Ungespeicherte Angaben verwerfen?')) return; markDirty(false); setDuplicateChoice(false); setCancelTarget(null); setMoving(false); setChangeReason(''); setEditing(null); setRecording(false); setRecordingAppointment(null); setAppointmentEdit(null); setSelectedId(''); setPhotoVisit(''); setNewTask(''); setTaskDue(''); setTaskStatus('open'); action(); };
  async function commit(next: GardenState, added: GardenPhoto[] = [], replacePhotos = false) {
    if (busy) return false;
    setBusy(true); setError(''); setStatus('Wird auf diesem Gerät gespeichert …');
    try { validateGarden(next); const saved = await saveGarden(next, added, replacePhotos); setState(saved); setPhotos(p => replacePhotos ? added : [...p, ...added]); setStatus('Gespeichert ✓ · auf diesem Gerät'); return true; }
    catch (e) { setError(message(e)); setStatus('Nicht gespeichert. Angaben bitte nicht schließen.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return false; } finally { setBusy(false); }
  }
  const addCustomer = (name: string) => {
    const customer: Kunde = { id: Date.now(), firma: name, email: '', whatsapp: '', bevorzugterKanal: 'whatsapp' };
    if (kunden.some(k => k.id === customer.id)) customer.id++;
    const next = [...kunden, customer]; localStorage.setItem('becdra_kunden', JSON.stringify(next)); setKunden(next); return customer.id;
  };
  const obj = state?.objects.find(x => x.id === selectedId);
  const today = dateKey(new Date(clock));
  const openObject = (id: string) => leave(() => { setSelectedId(id); setTab('objects'); });
  const openAppointment = (appointment: Appointment, move = false) => { setAppointmentEdit({ ...appointment }); setMoving(move); setChangeReason(''); setDuplicateChoice(false); markDirty(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const createAppointment = (object: GardenObject, forceNew = false) => {
    const existing = chronological(state?.appointments.filter(a => a.objectId === object.id && a.status === 'planned' && a.start.slice(0, 10) >= today) ?? [])[0];
    if (existing && !forceNew) { openAppointment(existing); return; }
    const window = planningWindow(object, state?.visits ?? []);
    const startDay = nextAllowedDay(object, window.start > today ? window.start : today);
    const start = startDay + 'T09:00', end = startDay + 'T11:00';
    openAppointment({ id: crypto.randomUUID(), objectId: object.id, title: 'Gartenpflege', start, end, status: 'planned', note: '', updatedAt: new Date().toISOString() });
  };
  const objectAppointments = state?.appointments.filter(a => a.objectId === selectedId).sort((a, b) => a.start.localeCompare(b.start)) ?? [];
  const visits = state?.visits.filter(v => v.objectId === selectedId).sort((a, b) => b.end.localeCompare(a.end)) ?? [];
  const sortedObjects = [...(state?.objects ?? [])].filter(o => showArchived || !o.archived).sort((a, b) => a.name.localeCompare(b.name));
  const taskUpdate = async (id: string, value: FollowUp['status']) => { if (state) await commit({ ...state, followUps: state.followUps.map(t => t.id === id ? { ...t, status: value } : t) }); };
  async function exportBackup() {
    if (!state) return;
    setBusy(true); setError(''); setStatus('Sicherung mit Originalfotos wird vorbereitet …');
    try {
      const data = { kind: 'becdra-garden-backup', exportedAt: new Date().toISOString(), garden: state, customers: kunden, photos: await Promise.all(photos.map(async ({ file, ...photo }) => ({ ...photo, data: await dataUrl(file) }))) };
      download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `Becdra-Gartenpflege-${today}.json`);
      const saved = await saveGarden({ ...state, lastExportAt: new Date().toISOString(), lastExportRevision: state.revision + 1 }); setState(saved);
      setStatus('Sicherungsdatei zum Download bereitgestellt. Bitte prüfen, ob sie gespeichert wurde, und in Google Drive hochladen.');
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function importBackup(file?: File) {
    if (!state || !file) return;
    setBusy(true); setError('');
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.kind !== 'becdra-garden-backup' || !Array.isArray(parsed.photos) || !Array.isArray(parsed.customers)) throw new Error('Keine gültige Gartenpflege-Sicherung.');
      const garden = validateGarden(parsed.garden);
      const photoIds = new Set<string>();
      const files: GardenPhoto[] = await Promise.all(parsed.photos.map(async (p: Record<string, unknown>) => {
        if (!p || typeof p.id !== 'string' || photoIds.has(p.id) || typeof p.name !== 'string' || typeof p.type !== 'string' || !p.type.startsWith('image/') || typeof p.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(p.sha256) || typeof p.uploadedAt !== 'string' || !Number.isFinite(new Date(p.uploadedAt).getTime()) || typeof p.fileModifiedAt !== 'number' || typeof p.objectId !== 'string' || !garden.objects.some(o => o.id === p.objectId)
          || (p.visitId !== undefined && !garden.visits.some(v => v.id === p.visitId && v.objectId === p.objectId)) || !['before', 'after', 'observation'].includes(String(p.category)) || typeof p.data !== 'string' || !p.data.startsWith(`data:${p.type};base64,`)) throw new Error('Ungültige Fotodaten in der Sicherung.');
        photoIds.add(p.id);
        const bytes = Uint8Array.from(atob(p.data.split(',')[1]), c => c.charCodeAt(0));
        const original = new Blob([bytes], { type: p.type });
        if (await checksum(original) !== p.sha256) throw new Error('Die Fotoprüfsumme stimmt nicht überein. Sicherung wurde nicht übernommen.');
        return { id: p.id, objectId: p.objectId, visitId: p.visitId as string | undefined, category: p.category as GardenPhoto['category'], file: original, name: p.name, type: p.type, fileModifiedAt: p.fileModifiedAt, uploadedAt: p.uploadedAt, sha256: p.sha256 };
      }));
      const customers: Kunde[] = parsed.customers;
      if (!customers.every(k => k && typeof k.id === 'number' && Number.isFinite(k.id) && typeof k.firma === 'string' && typeof k.email === 'string' && typeof k.whatsapp === 'string') || new Set(customers.map(k => k.id)).size !== customers.length || !garden.objects.every(o => customers.some(k => k.id === o.customerId))) throw new Error('Ungültige Kundenzuordnung in der Sicherung.');
      if (!window.confirm(`Gartenpflegedaten durch ${garden.objects.length} Objekte, ${garden.visits.length} Besuche und ${files.length} Fotos aus dieser Sicherung ersetzen? Winterdienstdaten bleiben erhalten. Vorher aktuelle Sicherung exportieren.`)) return;
      const merged = [...kunden]; const mapped = new Map<number, number>();
      for (const customer of customers) {
        const same = merged.find(k => k.id === customer.id);
        if (!same) { merged.push(customer); mapped.set(customer.id, customer.id); }
        else if (same.firma === customer.firma) mapped.set(customer.id, same.id);
        else { let id = Date.now(); while (merged.some(k => k.id === id)) id++; merged.push({ ...customer, id }); mapped.set(customer.id, id); }
      }
      // Persist customer references first: an interrupted restore may add unused customers,
      // but will never replace winter customers or leave restored objects without customers.
      localStorage.setItem('becdra_kunden', JSON.stringify(merged)); setKunden(merged);
      const saved = await saveGarden({ ...garden, revision: state.revision, objects: garden.objects.map(o => ({ ...o, customerId: mapped.get(o.customerId)!, winterObjectId: undefined })) }, files, true);
      setState(saved); setPhotos(files); setSelectedId(''); setStatus('Gartenpflege-Sicherung wiederhergestellt. Winterdienstdaten wurden nicht ersetzt.');
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function uploadPhotos(input: HTMLInputElement) {
    if (!state || !obj) return;
    const selection = Array.from(input.files ?? []); input.value = '';
    if (!selection.length) return;
    if (selection.some(file => !file.type.startsWith('image/') || file.type === 'image/svg+xml')) { setError('Bitte nur Bilddateien auswählen (keine SVG-Dateien).'); return; }
    if (selection.reduce((n, file) => n + file.size, 0) > 100 * 1024 * 1024) { setError('Bitte pro Vorgang höchstens 100 MB auswählen.'); return; }
    let added: GardenPhoto[];
    try { added = await Promise.all(selection.map(async file => ({ id: crypto.randomUUID(), objectId: obj.id, visitId: photoVisit || undefined, category: photoCategory, file, name: file.name, type: file.type, fileModifiedAt: file.lastModified, uploadedAt: new Date().toISOString(), sha256: await checksum(file) }))); } catch (e) { setError(message(e)); return; }
    await commit(state, added);
  }
  function cancelAppointment(candidate: Appointment) {
    if (!state || busy) return;
    const saved = state.appointments.find(a => a.id === candidate.id);
    if (!saved || saved.status === 'done') return;
    setCancelTarget(saved); setCancelReturnDirty(dirty); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function saveCancellation(reason: string) {
    if (!state || !cancelTarget) return;
    const saved = state.appointments.find(a => a.id === cancelTarget.id);
    if (!saved || saved.status === 'done') return;
    const next = recordAppointmentChange(saved, { ...saved, status: 'cancelled' }, 'cancelled', reason);
    if (await commit({ ...state, appointments: state.appointments.map(a => a.id === saved.id ? next : a) })) {
      setCancelTarget(null);
      if (appointmentEdit?.id === saved.id) { setMonth(next.start.slice(0, 7)); if (timingChanged) setStatus(`Gespeichert: Termin verschoben auf ${formatDate(next.start)} · ${next.start.slice(11)} Uhr. Grund hinterlegt.`); setAppointmentEdit(null); setDuplicateChoice(false); setMoving(false); setChangeReason(''); markDirty(false); }
      else markDirty(cancelReturnDirty);
      setStatus('Absage und Grund gespeichert. In der Historie erhalten.');
    }
  }
  const originalAppointment = state?.appointments.find(a => a.id === appointmentEdit?.id);
  const timingChanged = Boolean(originalAppointment && appointmentEdit && (originalAppointment.start !== appointmentEdit.start || originalAppointment.end !== appointmentEdit.end));
  const cancellingInEditor = Boolean(originalAppointment && appointmentEdit?.status === 'cancelled' && originalAppointment.status !== 'cancelled');
  const appointmentConflicts = state && appointmentEdit ? sameDayAppointments(state.appointments, appointmentEdit) : [];
  const saveAppointment = async (e: { preventDefault: () => void }, allowDuplicate = false) => {
    e.preventDefault(); if (!state || !appointmentEdit) return;
    const target = state.objects.find(o => o.id === appointmentEdit.objectId);
    if (!target || !appointmentEdit.start || !appointmentEdit.end || !Number.isFinite(new Date(appointmentEdit.start).getTime()) || !Number.isFinite(new Date(appointmentEdit.end).getTime()) || appointmentEdit.end <= appointmentEdit.start || !appointmentEdit.title.trim()) { setError('Bitte einen Titel und gültige Start-/Endzeit ergänzen.'); return; }
    if (moving && !timingChanged) { setError('Bitte einen neuen Zeitpunkt für den Besuch wählen.'); return; }
    if ((timingChanged || cancellingInEditor) && !changeReason.trim()) { setError('Bitte den Grund für die Änderung eintragen.'); return; }
    if (!allowDuplicate && appointmentConflicts.length) { setDuplicateChoice(true); requestAnimationFrame(() => { const choice = document.getElementById('gp-duplicate-choice'); choice?.focus({ preventScroll: true }); choice?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); return; }
    if (appointmentEdit.status === 'planned') {
      const start = new Date(appointmentEdit.start);
      if (target.allowedDays.length && !target.allowedDays.includes(start.getDay())) { setError('Dieser Wochentag ist für das Objekt nicht freigegeben. Bitte Objekteinstellung oder Termin korrigieren.'); return; }
      const reasons = [!target.authorized ? 'Die laufende Pflege ist noch nicht freigegeben.' : '', !inSeason(target, start.getMonth() + 1) ? `Der Termin liegt außerhalb der Objektsaison (${MONTHS[target.seasonStart - 1]} bis ${MONTHS[target.seasonEnd - 1]}).` : ''].filter(Boolean);
      if (reasons.length && !window.confirm(reasons.join('\n') + '\nTrotzdem einplanen?')) return;
      if (state.appointments.some(a => a.id !== appointmentEdit.id && a.status === 'planned' && a.start < appointmentEdit.end && a.end > appointmentEdit.start) && !window.confirm('Dieser Termin überschneidet sich mit einem anderen Einsatz. Trotzdem speichern?')) return;
    }
    const draft = { ...appointmentEdit, updatedAt: new Date().toISOString() };
    const next = originalAppointment && (timingChanged || cancellingInEditor) ? recordAppointmentChange(originalAppointment, draft, cancellingInEditor ? 'cancelled' : 'rescheduled', changeReason) : draft;
    if (await commit({ ...state, appointments: [...state.appointments.filter(a => a.id !== next.id), next] })) { setAppointmentEdit(null); setDuplicateChoice(false); markDirty(false); }
  };
  if (!state) return <section className="garden-pilot" data-dark={darkMode}><p role={error ? 'alert' : 'status'}>{error || 'Gartenpflegedaten werden geladen …'}</p>{error && <button onClick={() => window.location.reload()}>Erneut laden</button>}</section>;
  return <div className="garden-pilot" data-dark={darkMode}>
    <div className="gp-heading"><h2>Gartenpflege</h2><button className="gp-backup-status" onClick={() => leave(() => setTab('backup'))}>{state.lastExportRevision === state.revision ? 'Sicherung / Export' : 'Sicherung erforderlich'}</button></div>
    <nav className="gp-tabs" aria-label="Gartenpflegebereiche">{([['attention', 'Übersicht'], ['objects', 'Objekte'], ['calendar', 'Kalender'], ['tools', 'Geräte']] as const).map(([id, text]) => <button key={id} aria-pressed={tab === id} onClick={() => leave(() => setTab(id))}>{text}</button>)}</nav>
    <p className={dirty ? "gp-save-status gp-warning" : "gp-save-status"} role="status" aria-live="polite">{busy ? 'Wird gespeichert …' : dirty ? 'Ungespeicherte Änderungen' : status}</p>
    {error && <p role="alert" className="gp-error">{error}</p>}
    <fieldset disabled={busy} className="gp-workspace">
    {cancelTarget ? <CancellationEditor key={cancelTarget.id} appointment={cancelTarget} name={state.objects.find(o => o.id === cancelTarget.objectId)?.name || 'Objekt'} discardsDraft={appointmentEdit?.id === cancelTarget.id && cancelReturnDirty} onDirty={() => markDirty(true)} onBack={() => { setCancelTarget(null); markDirty(cancelReturnDirty); }} onSave={saveCancellation} /> : editing ? <ObjectEditor tools={state.tools ?? []} initial={editing} kunden={kunden} liegenschaften={liegenschaften} onDirty={markDirty} addCustomer={addCustomer} onCancel={() => leave(() => setTab('objects'))} onSave={async object => {
      try { validateGarden({ ...state, objects: [...state.objects.filter(o => o.id !== object.id), object] }); } catch (e) { setError(message(e)); return false; }
      if (await commit({ ...state, objects: [...state.objects.filter(o => o.id !== object.id), object] })) { setEditing(null); setSelectedId(object.id); setTab('objects'); return true; } return false;
    }} /> : recording && obj ? <VisitEditor state={state} appointment={recordingAppointment} obj={obj} onDirty={markDirty} onCancel={() => leave(() => { setSelectedId(obj.id); setTab('objects'); })} onSave={async visit => {
      const next = { ...state, visits: [...state.visits, visit], appointments: state.appointments.map(a => a.id === visit.appointmentId ? { ...a, status: 'done' as const, updatedAt: new Date().toISOString() } : a) };
      try { validateGarden(next); } catch (e) { setError(message(e)); return false; }
      if (await commit(next)) { setRecording(false); setRecordingAppointment(null); setPhotoVisit(visit.id); setSelectedId(obj.id); setTab('objects'); return true; } return false;
    }} /> : appointmentEdit ? <form onSubmit={e => void saveAppointment(e)} className="gp-card gp-stack" onChange={() => markDirty(true)}>
      <div className="gp-heading"><h3>{moving ? 'Termin verschieben' : state.appointments.some(a => a.id === appointmentEdit.id) ? 'Termin bearbeiten' : 'Einsatz planen'}</h3><button type="button" onClick={() => leave(() => setTab('calendar'))}>Schließen</button></div>
      {state.appointments.some(a => a.id === appointmentEdit.id && a.status === 'planned') && <div className="gp-actions">{!moving && <button type="button" onClick={() => setMoving(true)}>Termin verschieben</button>}<button type="button" className="gp-text-danger" onClick={() => cancelAppointment(appointmentEdit)}>Termin absagen</button></div>}
      <p>{state.objects.find(o => o.id === appointmentEdit.objectId)?.name}</p><p className="gp-hint">09–11 Uhr ist nur ein Vorschlag. Noch keine Übertragung zu Google Kalender.</p>
      <Field label="Bezeichnung"><input required value={appointmentEdit.title} onChange={e => setAppointmentEdit({ ...appointmentEdit, title: e.target.value })} /></Field>
      <DateTimeField label="Beginn" value={appointmentEdit.start} onChange={value => { setAppointmentEdit(shiftAppointment(appointmentEdit, value)); markDirty(true); }} />
      <DateTimeField label="Ende" value={appointmentEdit.end} onChange={value => { setAppointmentEdit({ ...appointmentEdit, end: value }); markDirty(true); }} />
      {moving && <p className="gp-hint">Beim Ändern des Beginns wird das Ende mit gleicher Dauer mitverschoben. Du kannst das Ende anschließend anpassen.</p>}
      {(moving || timingChanged || cancellingInEditor) && <section className="gp-notice gp-stack"><h3>Grund für die Änderung</h3>{originalAppointment && <p className="gp-hint">Bisher: {formatDate(originalAppointment.start)} · {originalAppointment.start.slice(11)}–{originalAppointment.end.slice(11)} Uhr. Der bestehende Termin wird aktualisiert.</p>}<AppointmentReason value={changeReason} onChange={value => { setChangeReason(value); markDirty(true); }} /></section>}
      <Field label="Status"><select value={appointmentEdit.status} onChange={e => setAppointmentEdit({ ...appointmentEdit, status: e.target.value as Appointment['status'] })}><option value="planned">Geplant</option><option value="done">Erledigt</option><option value="cancelled">Abgesagt</option></select></Field>
      <Field label="Terminnotiz"><textarea value={appointmentEdit.note} onChange={e => setAppointmentEdit({ ...appointmentEdit, note: e.target.value })} /></Field>
      {state.objects.find(o => o.id === appointmentEdit.objectId) && <AppointmentTasks obj={state.objects.find(o => o.id === appointmentEdit.objectId)!} state={state} appointment={appointmentEdit} onChange={a => { setAppointmentEdit(a); markDirty(true); }} />}
      {duplicateChoice && appointmentConflicts.length > 0 && <section id="gp-duplicate-choice" tabIndex={-1} className="gp-warning gp-stack" aria-labelledby="gp-duplicate-title">
        <h3 id="gp-duplicate-title">Für dieses Objekt besteht an diesem Tag bereits ein Termin.</h3>
        <p>Diesen ändern oder bewusst einen weiteren anlegen?</p>
        {appointmentConflicts.map(existing => <button type="button" key={existing.id} onClick={() => { openAppointment(existing); }}>Vorhandenen Termin ändern · {existing.start.slice(11)}–{existing.end.slice(11)} Uhr</button>)}
        <p className="gp-hint">Beim Öffnen eines vorhandenen Termins wird der aktuelle ungespeicherte Entwurf verworfen.</p>
        <button type="button" onClick={e => void saveAppointment(e, true)}>{state.appointments.some(a => a.id === appointmentEdit.id) ? 'Diesen Termin trotzdem speichern' : 'Bewusst weiteren Termin speichern'}</button>
        <button type="button" onClick={() => setDuplicateChoice(false)}>Zurück zum Entwurf</button>
      </section>}
      <div className="gp-save-bar"><button className="gp-primary">{moving ? 'Verschiebung speichern' : 'Termin speichern'}</button></div>
    </form> : <>
      {tab === 'attention' && <GardenOverview onMove={a => openAppointment(a, true)} onCancel={a => void cancelAppointment(a)} state={state} kunden={kunden} onOpen={openObject} onPlan={createAppointment} onEdit={a => openAppointment(a)} onStart={a => { setSelectedId(a.objectId); setRecordingAppointment(a); setRecording(true); markDirty(true); }} onCreate={() => { setEditing(newObject()); markDirty(false); }} onTools={() => leave(() => setTab('tools'))} />}
      {tab === 'tools' && <ToolsEditor initial={state.tools ?? []} onDirty={markDirty} onSave={async tools => commit({ ...state, tools })} />}
      {tab === 'objects' && !obj && <div className="gp-stack"><div className="gp-heading"><h3>Deine Gartenobjekte</h3><button className="gp-primary" onClick={() => setEditing(newObject())}>+ Objekt</button></div><Check label="Archivierte Objekte anzeigen" checked={showArchived} onChange={setShowArchived} />{sortedObjects.map(o => <button className="gp-object" key={o.id} onClick={() => openObject(o.id)}><strong>{o.name}{o.archived ? ' · archiviert' : ''}</strong><span>{kunden.find(k => k.id === o.customerId)?.firma || 'Auftraggeber fehlt'}</span><span>{o.address || 'Adresse noch offen'}</span></button>)}{sortedObjects.length === 0 && <p>Noch keine Gartenobjekte erfasst.</p>}</div>}
      {tab === 'objects' && obj && <div className="gp-stack">
        <div className="gp-heading"><h3>{obj.name}</h3><button onClick={() => { setEditing(structuredClone(obj)); markDirty(false); }}>Bearbeiten</button></div><p>{kunden.find(k => k.id === obj.customerId)?.firma || 'Auftraggeber fehlt'}<br />{obj.address}</p>
        <div className="gp-actions"><button className="gp-primary" onClick={() => { setRecordingAppointment(chronological(state.appointments.filter(a => a.objectId === obj.id && a.status === 'planned' && a.start.startsWith(today)))[0] ?? null); setRecording(true); markDirty(false); }}>Besuch erfassen</button><button onClick={() => createAppointment(obj)}>{state.appointments.some(a => a.objectId === obj.id && a.status === 'planned' && a.start.slice(0, 10) >= today) ? 'Nächsten Termin ändern' : 'Einsatz planen'}</button><button onClick={() => createAppointment(obj, true)}>+ Weiterer Termin</button></div>
        <section className="gp-card gp-stack"><h3>Objektpass</h3><p>{obj.inventory.join(' · ') || 'Bestand noch offen'}</p>{obj.inventoryNotes && <p className="gp-preserve">{obj.inventoryNotes}</p>}{obj.contact && <p className="gp-preserve">Kontakt: {obj.contact}</p>}{obj.access && <p className="gp-notice">Zugang: {obj.access}</p>}<p>{obj.visitIntervalMonths ? `Alle ${obj.visitIntervalMonths} Monate` : `${obj.intervalMin}–${obj.intervalMax} Wochen`} · {MONTHS[obj.seasonStart - 1]} bis {MONTHS[obj.seasonEnd - 1]} · {obj.allowedDays.length ? obj.allowedDays.map(d => DAYS[d]).join(', ') : 'alle Wochentage'}</p><p className="gp-preserve">{obj.seasonNotes}</p><p>{obj.authorized ? 'Laufende Pflege freigegeben' : 'Laufende Pflege: Zusage noch klären'}</p><p>{obj.billingCycle === 'monthly' ? 'Monatliche Abrechnung' : 'Abrechnung je Besuch'} · {{ hours: 'nach Aufwand', fixed: 'Pauschale', mixed: 'Pauschale und Zusatzarbeiten' }[obj.billingMode]}</p>{obj.billingMode !== 'hours' && <p>Pauschale: {obj.fixedRate ? euro(numberValue(obj.fixedRate)) : 'Preis offen'}<br />Enthalten: {obj.included || 'Leistungsumfang offen'}</p>}{obj.photoShare && <p>Nach jedem Besuch Fotos per WhatsApp teilen.</p>}{obj.winterObjectId && <p className="gp-hint">Verknüpftes Winterdienstobjekt: {liegenschaften.find(l => l.id === obj.winterObjectId)?.name || 'nicht mehr vorhanden'}. Die Stammdaten werden in dieser Version getrennt bearbeitet.</p>}</section>
        <section className="gp-card gp-stack"><h3>Pflegeaufgaben</h3>{objectTasks(obj).map(task => <div className="gp-row" key={task.id}><strong>{task.name}</strong><p className="gp-hint">{taskTiming(task)}</p></div>)}<button onClick={() => { setEditing(structuredClone(obj)); markDirty(false); }}>Pflegeplan bearbeiten</button></section>
        <section className="gp-card gp-stack"><h3>Offene Punkte und Wiedervorlagen</h3>{state.followUps.filter(t => t.objectId === obj.id).map(t => <div className="gp-row" key={t.id}><p className="gp-preserve">{t.text}<br /><small>{t.due ? `Wiedervorlage: ${formatDate(t.due)}` : 'Zeitpunkt noch offen'}</small></p><Field label="Status"><select value={t.status} onChange={e => void taskUpdate(t.id, e.target.value as FollowUp['status'])}>{Object.entries(followLabels).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></Field></div>)}
        <form className="gp-stack" onSubmit={async e => { e.preventDefault(); if (!newTask.trim()) return; if (await commit({ ...state, followUps: [...state.followUps, { id: crypto.randomUUID(), objectId: obj.id, text: newTask.trim(), due: taskDue, status: taskStatus, createdAt: new Date().toISOString() }] })) { setNewTask(''); setTaskDue(''); setTaskStatus('open'); markDirty(false); } }}>
          <Field label="Neue Beobachtung / mögliche Zusatzarbeit"><textarea value={newTask} onChange={e => { setNewTask(e.target.value); markDirty(true); }} placeholder="Zum Diktieren das Mikrofon der Handy-Tastatur nutzen." /></Field><Field label="Wiedervorlage am"><input type="date" value={taskDue} onChange={e => { setTaskDue(e.target.value); markDirty(true); }} /></Field><Field label="Geplantes Pflege-/Pflanzfenster ab (optional)"><input type="date" onChange={e => { if (e.target.value) { setTaskDue(addDays(e.target.value, -obj.leadWeeks * 7)); markDirty(true); } }} /></Field><p className="gp-hint">Bei gewähltem Fenster: Erinnerung {obj.leadWeeks} Wochen vorher. Das Fenster legst du nach fachlicher Prüfung fest.</p><Field label="Freigabe / Bearbeitungsstand"><select value={taskStatus} onChange={e => { setTaskStatus(e.target.value as FollowUp['status']); markDirty(true); }}>{Object.entries(followLabels).slice(0, 3).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></Field><div className="gp-save-bar"><button className="gp-primary" type="submit">Offenen Punkt speichern</button></div>
        </form></section>
        <section className="gp-card gp-stack"><h3>Originalfotos</h3><p className="gp-hint">Originaldateien bleiben erhalten; eine SHA-256-Prüfsumme wird mitgespeichert. Hochladezeit ist keine bestätigte Aufnahmezeit. Bisher nur auf diesem Gerät; keine automatische Cloudkopie.</p><Field label="Zuordnung"><select value={photoVisit} onChange={e => setPhotoVisit(e.target.value)}><option value="">Objekt / Besichtigung</option>{visits.map(v => <option key={v.id} value={v.id}>Besuch {formatDate(v.start)} · {v.start.slice(11)}</option>)}</select></Field><Field label="Bildart"><select value={photoCategory} onChange={e => setPhotoCategory(e.target.value as GardenPhoto['category'])}><option value="observation">Beobachtung / Bestand</option><option value="before">Vorher</option><option value="after">Nachher</option></select></Field><Field label="Fotos auswählen"><input type="file" accept="image/*" multiple onChange={e => void uploadPhotos(e.currentTarget)} /></Field><Field label="Foto aufnehmen"><input type="file" accept="image/*" capture="environment" onChange={e => void uploadPhotos(e.currentTarget)} /></Field><div className="gp-photos">{photos.filter(p => p.objectId === obj.id && (!photoVisit || p.visitId === photoVisit)).map(p => <Photo key={p.id} photo={p} />)}</div></section>
        <section className="gp-card gp-stack"><h3>Besuchshistorie</h3>{visits.length === 0 && <p>Noch kein Besuch dokumentiert.</p>}{visits.map(v => { const cost = visitCost(v); const priced = Boolean(v.hourlyRate.trim() && (!v.machines || v.machineRate.trim()) && v.travelRate.trim() && (!numberValue(v.disposalTonnes) || v.disposalRate.trim())); return <div className="gp-row" key={v.id}><strong>{formatDate(v.start)} · {v.start.slice(11)}–{v.end.slice(11)} Uhr</strong><p>{cost.hours.toLocaleString('de-DE')} abrechenbare Stunden · {v.billingCycle === 'monthly' ? 'monatlich sammeln' : 'je Besuch abrechnen'}</p><p>Erledigt: {v.done.join(' · ') || 'Keine Checklistenpunkte bestätigt'}</p>{v.checklist.some(x => !v.done.includes(x)) && <p>Beim Besuch nicht erledigt: {v.checklist.filter(x => !v.done.includes(x)).join(' · ')}</p>}{v.notes && <p className="gp-preserve">{v.notes}</p>}{v.billingMode === 'hours' ? <p>Rechnungsgrundlage: {priced ? euro(cost.total) : 'unvollständig – Preise prüfen'}<br /><small>Arbeit {euro(cost.labor)} · Maschinen {euro(cost.machines)} · Fahrt {euro(cost.travel)} · Entsorgung {euro(cost.disposal)}</small></p> : <p>Pauschale / Zusatzarbeiten: Abrechnung anhand der Vereinbarung prüfen.</p>}<p>{photos.filter(p => p.visitId === v.id).length} zugeordnete Fotos{v.photoShare ? ' · Fotos per WhatsApp teilen' : ''}</p></div>; })}</section>
        <section className="gp-card gp-stack"><h3>Geplante und bisherige Termine</h3>{objectAppointments.map(a => <div className="gp-row" key={a.id}><strong>{formatDate(a.start)} · {a.start.slice(11)}–{a.end.slice(11)} Uhr</strong><p>{a.title} · {{ planned: 'Geplant', done: 'Erledigt', cancelled: 'Abgesagt' }[a.status]}</p><div className="gp-actions"><button onClick={() => openAppointment(a)}>Termin bearbeiten</button>{a.status === 'planned' && <button onClick={() => openAppointment(a, true)}>Termin verschieben</button>}{a.status === 'planned' && <button className="gp-text-danger" onClick={() => void cancelAppointment(a)}>Termin absagen</button>}</div>{a.status === 'cancelled' && <button onClick={() => cancelAppointment(a)}>Absagegrund ergänzen</button>}<AppointmentHistory appointment={a} /></div>)}</section>
        <button onClick={async () => { if (window.confirm(obj.archived ? 'Objekt wieder aktivieren?' : 'Objekt archivieren? Historie und Fotos bleiben erhalten.')) { if (await commit({ ...state, objects: state.objects.map(o => o.id === obj.id ? { ...o, archived: !o.archived, updatedAt: new Date().toISOString() } : o) })) setSelectedId(''); } }}>{obj.archived ? 'Objekt wieder aktivieren' : 'Objekt archivieren'}</button>
      </div>}
      {tab === 'calendar' && <div className="gp-stack"><h3>Einsatzplanung</h3><details><summary>Kalenderexport und Google Kalender</summary><p className="gp-hint">Noch keine automatische Verbindung. Kalenderdateien (.ics) sind manuelle Kopien ohne automatische Aktualisierung.</p></details><Field label="Monat"><input type="month" value={month} onChange={e => setMonth(e.target.value)} /></Field>
        <div className="gp-calendar" aria-label="Monatsübersicht">{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => <strong key={d}>{d}</strong>)}{month && Array.from({ length: (new Date(month + '-01T12:00').getDay() + 6) % 7 }, (_, i) => <span key={'space' + i} />)}{month && Array.from({ length: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate() }, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, '0')}`; const entries = chronological(state.appointments.filter(a => a.start.startsWith(date) && a.status !== 'cancelled')); return <div className={date === today ? 'gp-calday gp-today' : 'gp-calday'} key={date}><span>{i + 1}</span>{entries.map(a => <button key={a.id} aria-label={`${a.start.slice(11)} ${state.objects.find(o => o.id === a.objectId)?.name}`} onClick={() => openAppointment(a)}>{a.start.slice(11)}</button>)}</div>; })}</div>
        <h3>Termine im Monat</h3>{state.appointments.filter(a => a.start.startsWith(month)).sort((a, b) => a.start.localeCompare(b.start)).map(a => { const target = state.objects.find(o => o.id === a.objectId); return <section key={a.id} className="gp-card gp-stack"><strong>{formatDate(a.start)} · {a.start.slice(11)}–{a.end.slice(11)}</strong><p>{target?.name} · {a.title}<br />{{ planned: 'Geplant', done: 'Erledigt', cancelled: 'Abgesagt' }[a.status]}</p><div className="gp-actions"><button onClick={() => openAppointment(a)}>Bearbeiten</button>{a.status === 'planned' && <button onClick={() => openAppointment(a, true)}>Termin verschieben</button>}{a.status === 'planned' && <button className="gp-text-danger" onClick={() => void cancelAppointment(a)}>Termin absagen</button>}{target && a.status === 'planned' && <button onClick={() => calendarFile(a, target)}>Kalenderdatei (.ics)</button>}</div>{a.status === 'cancelled' && <button onClick={() => cancelAppointment(a)}>Absagegrund ergänzen</button>}<AppointmentHistory appointment={a} /></section>; })}
        <p className="gp-hint">Neue Einsätze planst du über das jeweilige Objekt. Pflegefenster und Wiedervorlagen findest du unter „Übersicht“; sie sind noch keine festen Termine.</p>
      </div>}
      {tab === 'backup' && <div className="gp-stack"><section className="gp-card gp-stack"><h3>Gartenpflege sichern</h3>{state.lastExportAt && <p className="gp-hint">Letzter Export vorbereitet: {formatDate(state.lastExportAt)}. Bitte gespeicherte Datei selbst prüfen.</p>}<p>{state.objects.length} Objekte · {state.visits.length} Besuche · {photos.length} Originalfotos</p><p className="gp-notice">Google Drive und Google Kalender sind noch nicht verbunden. Diese Version speichert im Browser dieses Geräts. Eine neue Adresse, ein anderer Browser oder gelöschte Websitedaten bedeuten einen anderen beziehungsweise leeren Speicher.</p><button className="gp-primary" onClick={() => void exportBackup()}>Sicherung mit Originalfotos herunterladen</button><p className="gp-hint">Die heruntergeladene JSON-Datei kannst du in Google Drive hochladen. Sie enthält Gartenpflegedaten und Kundenzuordnungen, nicht die Winterdiensthistorie. Winterdienst weiterhin separat unter „Mehr → Backup“ sichern.</p><Field label="Gartenpflege-Sicherung wiederherstellen"><input type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void importBackup(file); }} /></Field><button onClick={async () => { try { const granted = await navigator.storage?.persist?.(); setStatus(granted ? 'Dauerhafter Browserspeicher wurde gewährt. Sicherungsdateien bleiben trotzdem erforderlich.' : 'Dauerhafter Browserspeicher wurde nicht gewährt. Regelmäßig exportieren.'); } catch (e) { setError(message(e)); } }}>Dauerhaften Gerätespeicher anfragen</button></section></div>}
    </>}
    </fieldset>
  </div>;
}
