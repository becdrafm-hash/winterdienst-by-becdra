import { objectTasks, taskTiming, tasksForAppointment } from './carePlanning';
import type { Appointment, GardenObject, GardenState } from './model';

export default function AppointmentTasks({ obj, state, appointment, onChange }: { obj: GardenObject; state: GardenState; appointment: Appointment; onChange: (appointment: Appointment) => void }) {
  const tasks = objectTasks(obj), selected = tasksForAppointment(obj, state, appointment);
  const minutes = selected.reduce((sum, t) => sum + t.minutes, 0);
  const duration = Math.round((new Date(appointment.end).getTime() - new Date(appointment.start).getTime()) / 60000);
  const tools = (state.tools ?? []).filter(t => selected.some(task => task.toolIds.includes(t.id)));
  return <section className="gp-stack gp-notice">
    <h3>Arbeiten für diesen Besuch</h3>
    <p className="gp-hint">{appointment.taskIds ? 'Für diesen Termin ausgewählt.' : 'Automatisch nach Rhythmus und Zeitfenstern vorgeschlagen.'} Weitere Aufgaben lassen sich diesem Besuch hinzufügen.</p>
    {tasks.map(task => <button className="gp-task-choice" key={task.id} type="button" aria-pressed={selected.some(t => t.id === task.id)} onClick={() => {
      const ids = selected.map(t => t.id);
      onChange({ ...appointment, taskIds: ids.includes(task.id) ? ids.filter(id => id !== task.id) : [...ids, task.id] });
    }}><strong>{selected.some(t => t.id === task.id) ? 'Dabei: ' : 'Hinzufügen: '}{task.name}</strong><span>{taskTiming(task)}{task.minutes ? ` · ca. ${task.minutes} Min.` : ''}</span></button>)}
    {!tasks.length && <p>Im Objekt unter „Bearbeiten → Bestand“ die Pflegeaufgaben ergänzen.</p>}
    {appointment.taskIds && <button type="button" onClick={() => onChange({ ...appointment, taskIds: undefined })}>Wieder automatisch vorschlagen</button>}
    {selected.length > 0 && <p><strong>Geplant: {minutes || '—'} Minuten Arbeit</strong>{selected.some(t => !t.minutes) ? ' · Zeitbedarf noch unvollständig' : ''}</p>}
    {Number.isFinite(duration) && minutes > duration && <p className="gp-warning" role="status">Die Arbeiten brauchen voraussichtlich {minutes - duration} Minuten mehr als der Termin. Bitte den gesamten Besuch verlängern oder verschieben und die anderen Termine berücksichtigen.</p>}
    {tools.length > 0 && <p><strong>Dafür brauchst du:</strong> {tools.map(t => t.name).join(' · ')}</p>}
    {selected.some(t => !t.toolIds.length) && <p className="gp-hint">Bei einzelnen Aufgaben sind noch keine Geräte hinterlegt.</p>}
  </section>;
}
