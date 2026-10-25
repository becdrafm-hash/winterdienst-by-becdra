import { useState } from 'react';
import { chronological, objectTasks, tasksForAppointment, taskWindow, toolsForAppointments } from './carePlanning';
import { addDays, dateKey, inSeason, planningWindow, type Appointment, type GardenObject, type GardenState } from './model';
import { calendarDateLabel } from './calendarDate';
import type { Kunde } from '../types';

export default function GardenOverview({ state, kunden, onOpen, onPlan, onEdit, onPrepare, onCancel, onMove, onAuthorize, onStart, onCreate, onTools }: {
  state: GardenState; kunden: Kunde[]; onOpen: (id: string) => void; onPlan: (obj: GardenObject) => void;
  onPrepare: (appointment: Appointment) => void; onEdit: (appointment: Appointment) => void; onAuthorize: (obj: GardenObject) => void; onCancel: (appointment: Appointment) => void; onMove: (appointment: Appointment) => void; onStart: (appointment: Appointment) => void; onCreate: () => void; onTools: () => void;
}) {
  const [openVisitId, setOpenVisitId] = useState<string | null>(null);
  const today = dateKey(), objects = state.objects.filter(o => !o.archived);
  const planned = chronological(state.appointments.filter(a => a.status === 'planned' && objects.some(o => o.id === a.objectId)));
  const todays = planned.filter(a => a.start.startsWith(today));
  const upcoming = planned.filter(a => a.start.slice(0, 10) > today).slice(0, 3);
  const overdue = planned.filter(a => a.start.slice(0, 10) < today);
  const tools = toolsForAppointments(state, todays);
  const withoutTools = [...new Set(todays.flatMap(a => { const obj = objects.find(o => o.id === a.objectId)!; return tasksForAppointment(obj, state, a).filter(t => !t.toolIds.length).map(t => t.name); }))];
  const pending = state.followUps.filter(t => !['done', 'discarded'].includes(t.status) && objects.some(o => o.id === t.objectId));
  const needsPlan = objects.filter(o => {
    if (planned.some(a => a.objectId === o.id && a.start.slice(0, 10) >= today)) return false;
    const w = planningWindow(o, state.visits, today);
    return (!w.paused && w.start <= addDays(today, 14)) || (w.paused && w.reminder <= today) || objectTasks(o).some(t => {
      const task = taskWindow(t, state.visits.filter(v => v.objectId === o.id), today);
      return t.mode !== 'visit' && inSeason(o, Number(today.slice(5, 7))) && inSeason({ ...o, seasonStart: t.seasonStart, seasonEnd: t.seasonEnd }, Number(today.slice(5, 7))) && task && task.start <= addDays(today, 14);
    });
  });
  const timingIssues = objects.flatMap(o => objectTasks(o).flatMap(t => {
    if (t.mode === 'visit' || t.mode === 'need') return [];
    const w = taskWindow(t, state.visits.filter(v => v.objectId === o.id), today);
    const next = planned.find(a => a.objectId === o.id && a.start.slice(0, 10) >= today);
    return w && next && w.start <= addDays(today, 14) && next.start.slice(0, 10) > w.end ? [{ obj: o, task: t, appointment: next, end: w.end }] : [];
  }));
  const card = (a: Appointment) => {
    const obj = objects.find(o => o.id === a.objectId)!;
    const tasks = tasksForAppointment(obj, state, a), minutes = tasks.reduce((n, t) => n + t.minutes, 0);
    return <article className="gp-card gp-stack gp-visit-card" key={a.id}>
      <div className="gp-visit-title"><strong className="gp-time">{a.start.slice(11)}<small>–{a.end.slice(11)} Uhr</small></strong><div><h3>{obj.name}</h3><p className="gp-hint">{kunden.find(k => k.id === obj.customerId)?.firma}</p></div></div>
      {a.start.slice(0, 10) !== today && <p className="gp-hint">{calendarDateLabel(a.start)}</p>}
      {tasks.length ? <ul className="gp-task-list">{tasks.map(t => <li key={t.id}>{t.name}</li>)}</ul> : <p className="gp-hint">Arbeiten für diesen Termin noch auswählen.</p>}
      {minutes > 0 && <p className="gp-hint">Ca. {minutes} Min. Arbeit{tasks.some(t => !t.minutes) ? ' · Zeitbedarf teilweise offen' : ''}</p>}
      {minutes > (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000 && <p className="gp-warning">Die vorgesehenen Arbeiten brauchen länger als der Termin. Bitte den Besuch verlängern oder verschieben.</p>}
      {!obj.authorized && <div className="gp-warning gp-stack"><strong>Pflegefreigabe offen</strong><button onClick={() => onAuthorize(obj)}>Pflege freigeben</button></div>}
      <button className="gp-primary" aria-expanded={openVisitId === a.id} aria-controls={`gp-visit-actions-${a.id}`} onClick={() => setOpenVisitId(openVisitId === a.id ? null : a.id)}>{openVisitId === a.id ? 'Besuch schließen' : 'Besuch öffnen'}</button>
      <div id={`gp-visit-actions-${a.id}`} className="gp-stack" hidden={openVisitId !== a.id}>
        <button className="gp-primary" onClick={() => a.start.startsWith(today) ? onStart(a) : onPrepare(a)}>{a.start.startsWith(today) ? 'Besuch starten' : 'Besuch vorbereiten'}</button>
        <div className="gp-actions gp-secondary-actions"><button onClick={() => onMove(a)}>Termin verschieben</button><button onClick={() => onEdit(a)}>Details / ändern</button><button onClick={() => onOpen(obj.id)}>Objektdetails</button><button className="gp-text-danger" onClick={() => onCancel(a)}>Termin absagen</button>{obj.address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(obj.address)}`} target="_blank" rel="noreferrer">Navigation</a>}</div>
      </div>
    </article>;
  };
  return <div className="gp-stack gp-overview">
    <section className="gp-welcome"><p className="gp-eyebrow">DEIN GARTENTAG</p><h2>{new Date().getHours() < 11 ? 'Guten Morgen' : 'Hallo'}, Micha</h2><p>{calendarDateLabel(today)}</p><strong>{todays.length ? `Heute ${todays.length === 1 ? 'ist ein Besuch' : `sind ${todays.length} Besuche`} geplant.` : 'Heute sind keine Besuche geplant.'}</strong></section>
    {!objects.length && <section className="gp-card gp-stack"><h3>Dein erstes Gartenobjekt</h3><p>Lege einen Kunden und sein Objekt an. Danach bestimmst du Aufgaben, Rhythmus und Termine.</p><button className="gp-primary" onClick={onCreate}>Objekt anlegen</button></section>}
    <section className="gp-stack" aria-label="Heute"><h3>Heute</h3>{todays.map(card)}{!todays.length && <p className="gp-hint">Deine nächsten Termine findest du weiter unten. Offene Pflegearbeiten bleiben sichtbar.</p>}</section>
    <section className="gp-card gp-stack" aria-label="Geräte für heute"><div className="gp-heading"><h3>Das brauchst du heute</h3><button onClick={onTools}>Geräte verwalten</button></div>{tools.length ? <div className="gp-equipment-list">{tools.map(t => <span key={t.id}>{t.name}</span>)}</div> : <p className="gp-hint">{todays.length ? 'Noch keine Geräte für die heutigen Arbeiten hinterlegt. Im Objekt den Aufgaben zuordnen.' : 'Sobald Besuche und Geräte zugeordnet sind, erscheint hier deine Tagesübersicht.'}</p>}<p className="gp-hint">Aus den geplanten Arbeiten zusammengestellt · ohne Abhaken.</p>{withoutTools.length > 0 && <p className="gp-hint">Aufgaben ohne Gerätezuordnung: {withoutTools.join(', ')}</p>}</section>
    {(overdue.length > 0 || pending.length > 0 || timingIssues.length > 0 || objects.some(o => !o.authorized)) && <section className="gp-card gp-stack" aria-label="Noch klären"><h3>Noch klären</h3>
      {overdue.map(a => <div className="gp-row" key={a.id}><p>Vergangener Termin noch offen: {objects.find(o => o.id === a.objectId)?.name} · {calendarDateLabel(a.start)}</p><div className="gp-actions"><button onClick={() => onMove(a)}>Termin verschieben</button><button onClick={() => onEdit(a)}>Termin prüfen</button><button className="gp-text-danger" onClick={() => onCancel(a)}>Termin absagen</button></div></div>)}
      {timingIssues.map(({ obj, task, appointment, end }) => <div className="gp-row" key={task.id}><p><strong>{obj.name}: {task.name}</strong><br />Zeitfenster endet {calendarDateLabel(end)}. Der nächste Besuch liegt später. Bestehenden Besuch vorziehen oder bewusst abweichend planen.</p><button onClick={() => onEdit(appointment)}>Besuch anpassen</button></div>)}
      {objects.filter(o => !o.authorized).map(o => <div className="gp-row" key={o.id}><p>{o.name}: Freigabe der laufenden Pflege fehlt.</p><button className="gp-primary" onClick={() => onAuthorize(o)}>Pflege freigeben</button></div>)}
      {pending.map(t => <div className="gp-row" key={t.id}><p><strong>{objects.find(o => o.id === t.objectId)?.name}</strong> · {t.text}<br /><small>{t.status === 'approval' ? 'Kundenzusage offen' : t.status === 'approved' ? 'Freigegeben' : 'Noch prüfen'}{t.due ? ` · ${calendarDateLabel(t.due)}` : ''}</small></p><button onClick={() => onOpen(t.objectId)}>Punkt öffnen</button></div>)}
    </section>}
    {needsPlan.length > 0 && <section className="gp-stack" aria-label="Als Nächstes planen"><h3>Als Nächstes planen</h3>{needsPlan.map(o => { const w = planningWindow(o, state.visits, today); return <article className="gp-card gp-stack" key={o.id}><h3>{o.name}</h3><p className="gp-hint">{w.label} · {calendarDateLabel(w.start)}</p><button onClick={() => onPlan(o)}>Besuch mit Arbeiten planen</button></article>; })}</section>}
    {upcoming.length > 0 && <section className="gp-stack" aria-label="Nächste Besuche"><h3>Nächste Besuche</h3>{upcoming.map(card)}</section>}
  </div>;
}
