import { useState } from 'react';
import { localDateTime, type Appointment } from './model';
import { calendarDateLabel } from './calendarDate';

const REASONS = ['Kunde hat keine Zeit', 'Baustelle hat sich verzögert', 'Wetter', 'Krankheit', 'Doppelt angelegt'];
export function AppointmentReason({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="gp-stack">
    <label className="gp-field">Häufiger Grund<select value={REASONS.includes(value) ? value : ''} onChange={e => onChange(e.target.value)}><option value="">Vorlage wählen oder eigenen Grund eintragen</option>{REASONS.map(reason => <option key={reason}>{reason}</option>)}</select></label>
    <label className="gp-field">Grund / Notiz<textarea required value={value} onChange={e => onChange(e.target.value)} placeholder="Zum Beispiel: Kunde ist verhindert; neuer Termin telefonisch vereinbart." /></label>
  </div>;
}

export function CancellationEditor({ appointment, name, discardsDraft, onSave, onBack, onDirty }: {
  appointment: Appointment; name: string; discardsDraft: boolean; onSave: (reason: string) => Promise<void>; onBack: () => void; onDirty: () => void;
}) {
  const [reason, setReason] = useState('');
  return <form className="gp-card gp-stack" onSubmit={e => { e.preventDefault(); if (reason.trim()) void onSave(reason); }}>
    <h3>{appointment.status === 'cancelled' ? 'Absagegrund ergänzen' : 'Termin absagen'}</h3><strong>{name}</strong><p>{calendarDateLabel(appointment.start)}<br />{appointment.start.slice(11)}–{appointment.end.slice(11)} Uhr</p>
    <AppointmentReason value={reason} onChange={value => { setReason(value); onDirty(); }} />
    <p className="gp-hint">Termin und Grund bleiben in der Historie erhalten. Es wird kein Ersatztermin angelegt.</p>
    {discardsDraft && <p className="gp-warning">Ungespeicherte Änderungen an diesem Termin werden beim Speichern der Absage verworfen.</p>}
    <div className="gp-save-bar gp-stack"><button className="gp-primary" type="submit" disabled={!reason.trim()}>{appointment.status === 'cancelled' ? 'Grund speichern' : 'Absage speichern'}</button><button type="button" onClick={onBack}>Zurück ohne Speichern</button></div>
  </form>;
}

export function AppointmentHistory({ appointment }: { appointment: Appointment }) {
  if (!appointment.history?.length) return null;
  return <div className="gp-stack"><p className="gp-hint">Grund der letzten Änderung: {appointment.history.at(-1)?.reason}</p><details><summary>Änderungsverlauf ({appointment.history.length})</summary><div className="gp-stack">{[...appointment.history].reverse().map((entry, index) => <div className="gp-row" key={index}>
    <strong>{entry.action === 'cancelled' ? 'Abgesagt' : 'Verschoben'} · {calendarDateLabel(localDateTime(new Date(entry.changedAt)))}</strong><p>{entry.reason}</p>
    <p className="gp-hint">{entry.action === 'rescheduled' ? 'Vorher: ' : 'Termin: '}{calendarDateLabel(entry.previousStart)} · {entry.previousStart.slice(11)}–{entry.previousEnd.slice(11)} Uhr{entry.newStart && <><br />Neu: {calendarDateLabel(entry.newStart)} · {entry.newStart.slice(11)}–{entry.newEnd?.slice(11)} Uhr</>}</p>
  </div>)}</div></details></div>;
}
