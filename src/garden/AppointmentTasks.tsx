import { objectTasks, tasksForAppointment } from './carePlanning';
import type { Appointment, GardenObject, GardenState } from './model';

export default function AppointmentTasks({ obj, state, appointment, onChange }: { obj: GardenObject; state: GardenState; appointment: Appointment; onChange: (appointment: Appointment) => void }) {
  const tasks = objectTasks(obj), selected = tasksForAppointment(obj, state, appointment);
  const available = tasks.filter(t => !selected.some(s => s.id === t.id));
  const minutes = selected.reduce((sum, t) => sum + t.minutes, 0);
  const duration = Math.round((new Date(appointment.end).getTime() - new Date(appointment.start).getTime()) / 60000);
  const tools = (state.tools ?? []).filter(t => selected.some(task => task.toolIds.includes(t.id)));
  const choose = (id: string, include: boolean) => onChange({ ...appointment, taskIds: include ? [...selected.map(t => t.id), id] : selected.filter(t => t.id !== id).map(t => t.id) });
  return <section className="gp-stack gp-appointment-work" aria-label="Arbeiten für diesen Besuch">
    <div className="gp-heading"><h3>Arbeiten für diesen Besuch</h3><span className="gp-badge">{selected.length} ausgewählt</span></div>
    <ul className="gp-work-list">{selected.map(task => <li key={task.id}><span>{task.name}</span>{task.minutes > 0 && <span className="gp-work-time">{task.minutes} Min.</span>}<button type="button" aria-label={`Arbeit entfernen: ${task.name}`} onClick={() => choose(task.id, false)}>×</button></li>)}</ul>
    {!selected.length && <p>Noch keine Arbeiten ausgewählt.</p>}
    {available.length > 0 && <details className="gp-disclosure"><summary>+ Arbeit hinzufügen ({available.length})</summary><div className="gp-stack">{available.map(task => <button className="gp-add-work" key={task.id} type="button" onClick={() => choose(task.id, true)}>+ {task.name}</button>)}</div></details>}
    {!tasks.length && <p>Die Pflegeaufgaben zuerst im Objekt anlegen.</p>}
    {selected.length > 0 && <p><strong>{minutes ? `Ca. ${minutes} Minuten Arbeit` : 'Zeitbedarf noch offen'}</strong>{minutes > 0 && selected.some(t => !t.minutes) ? ' · teilweise offen' : ''}</p>}
    {Number.isFinite(duration) && minutes > duration && <p className="gp-warning" role="status">Die Arbeiten brauchen ca. {minutes - duration} Minuten mehr. Bitte den Besuch verlängern oder verschieben.</p>}
    {tools.length > 0 && <p><strong>Mitnehmen:</strong> {tools.map(t => t.name).join(' · ')}</p>}
    <details className="gp-disclosure"><summary>Automatische Auswahl und Hinweise</summary><div className="gp-stack">
      <p>Die Vorschläge richten sich nach den Rhythmen im Pflegeplan. Hier änderst du nur die Arbeiten dieses Besuchs.</p>
      {appointment.taskIds && <button type="button" onClick={() => onChange({ ...appointment, taskIds: undefined })}>Wieder automatisch auswählen</button>}
      {selected.some(t => !t.toolIds.length) && <p>Bei einzelnen Aufgaben sind noch keine Geräte hinterlegt.</p>}
    </div></details>
  </section>;
}
