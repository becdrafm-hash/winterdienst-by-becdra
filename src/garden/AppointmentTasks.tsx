import { newCareTask, objectTasks, tasksForAppointment } from './carePlanning';
import type { Appointment, CareTask, GardenObject, GardenState } from './model';

export default function AppointmentTasks({ obj, state, appointment, onChange, draftTask, onDraftTask, onCreateTask }: { draftTask: CareTask | null; onDraftTask: (task: CareTask | null) => void; onCreateTask: (task: CareTask) => void; obj: GardenObject; state: GardenState; appointment: Appointment; onChange: (appointment: Appointment) => void }) {
  const tasks = objectTasks(obj), selected = tasksForAppointment(obj, state, appointment);
  const available = tasks.filter(t => !selected.some(s => s.id === t.id));
  const duplicateName = Boolean(draftTask?.name.trim() && tasks.some(t => t.name.trim().toLocaleLowerCase('de') === draftTask.name.trim().toLocaleLowerCase('de')));
  const validMinutes = !draftTask || (Number.isInteger(draftTask.minutes) && draftTask.minutes >= 0 && draftTask.minutes <= 1440);
  const minutes = selected.reduce((sum, t) => sum + t.minutes, 0);
  const duration = Math.round((new Date(appointment.end).getTime() - new Date(appointment.start).getTime()) / 60000);
  const tools = (state.tools ?? []).filter(t => selected.some(task => task.toolIds.includes(t.id)));
  const choose = (id: string, include: boolean) => onChange({ ...appointment, taskIds: include ? [...selected.map(t => t.id), id] : selected.filter(t => t.id !== id).map(t => t.id) });
  return <section className="gp-stack gp-appointment-work" aria-label="Arbeiten für diesen Besuch">
    <div className="gp-heading"><h3>Arbeiten für diesen Besuch</h3><span className="gp-badge">{selected.length} ausgewählt</span></div>
    <ul className="gp-work-list">{selected.map(task => <li key={task.id}><span>{task.name}</span>{task.minutes > 0 && <span className="gp-work-time">{task.minutes} Min.</span>}<button type="button" aria-label={`Arbeit entfernen: ${task.name}`} onClick={() => choose(task.id, false)}>×</button></li>)}</ul>
    {!selected.length && <p>Noch keine Arbeiten ausgewählt.</p>}
    {available.length > 0 && <details className="gp-disclosure"><summary>Vorhandene Arbeit hinzufügen ({available.length})</summary><div className="gp-stack">{available.map(task => <button className="gp-add-work" key={task.id} type="button" onClick={() => choose(task.id, true)}>+ {task.name}</button>)}</div></details>}
    {!draftTask ? <button type="button" onClick={() => onDraftTask({ ...newCareTask(), mode: 'need', seasonStart: obj.seasonStart, seasonEnd: obj.seasonEnd })}>+ Neue Aufgabe erstellen</button> : <section className="gp-notice gp-stack" aria-label="Neue Aufgabe erstellen">
      <h3>Neue Aufgabe</h3>
      <label className="gp-field">Name der neuen Aufgabe<input autoFocus value={draftTask.name} placeholder="Zum Beispiel Rosen düngen" onChange={e => onDraftTask({ ...draftTask, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (draftTask.name.trim()) onCreateTask(draftTask); } }} /></label>
      <label className="gp-field">Wann verwenden?<select value={draftTask.mode} onChange={e => onDraftTask({ ...draftTask, mode: e.target.value as CareTask['mode'] })}><option value="need">Bei diesem Besuch · später nach Bedarf</option><option value="visit">Bei jedem Besuch in der Saison</option></select></label>
      <details className="gp-disclosure"><summary>Zeitbedarf und Geräte (optional)</summary><div className="gp-stack">
        <label className="gp-field">Zeitbedarf (Minuten)<input type="number" min="0" max="1440" step="5" value={draftTask.minutes || ''} onChange={e => onDraftTask({ ...draftTask, minutes: Number(e.target.value) })} /></label>
        <div className="gp-tool-chips">{(state.tools ?? []).map(tool => <button type="button" key={tool.id} aria-pressed={draftTask.toolIds.includes(tool.id)} onClick={() => onDraftTask({ ...draftTask, toolIds: draftTask.toolIds.includes(tool.id) ? draftTask.toolIds.filter(id => id !== tool.id) : [...draftTask.toolIds, tool.id] })}>{tool.name}</button>)}</div>
      </div></details>
      {duplicateName && <p className="gp-error" role="alert">Diese Aufgabe gibt es bereits. Wähle sie unter den vorhandenen Arbeiten aus.</p>}
      {!validMinutes && <p className="gp-error" role="alert">Zeitbedarf bitte zwischen 0 und 1440 Minuten eingeben.</p>}
      <div className="gp-actions"><button type="button" className="gp-primary" disabled={!draftTask.name.trim() || duplicateName || !validMinutes} onClick={() => onCreateTask(draftTask)}>Aufgabe hinzufügen</button><button type="button" onClick={() => onDraftTask(null)}>Abbrechen</button></div>
      <p className="gp-hint">Mit „Termin speichern“ wird die Aufgabe auch im Objekt gespeichert. Weitere Rhythmen kannst du später im Pflegeplan einstellen.</p>
    </section>}
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
