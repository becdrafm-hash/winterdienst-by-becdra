import { useState } from 'react';
import { newCareTask, taskTiming } from './carePlanning';
import type { CareTask, GardenTool } from './model';

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
function Month({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="gp-field">{label}<select aria-label={label} value={value} onChange={e => onChange(Number(e.target.value))}>{MONTHS.map((m, i) => <option value={i + 1} key={m}>{m}</option>)}</select></label>;
}
export default function CareTaskEditor({ tasks, tools, onChange }: { tasks: CareTask[]; tools: GardenTool[]; onChange: (tasks: CareTask[]) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const update = (id: string, patch: Partial<CareTask>) => onChange(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
  return <section className="gp-stack">
    <h3>Pflegeaufgaben und Rhythmus</h3>
    <p className="gp-hint">Jede Arbeit hat ihren eigenen Rhythmus. Fällige Arbeiten werden für bestehende Besuche gebündelt. Zusätzliche Anfahrten entstehen nicht automatisch.</p>
    {tasks.map((task, index) => <details className="gp-task-editor" key={task.id} open={expanded === task.id}>
      <summary onClick={e => { e.preventDefault(); setExpanded(expanded === task.id ? null : task.id); }}><strong>{task.name || `Aufgabe ${index + 1}`}</strong><br /><span className="gp-hint">{taskTiming(task)}</span></summary>
      <div className="gp-stack">
        <label className="gp-field">Aufgabenname<input value={task.name} onChange={e => update(task.id, { name: e.target.value })} /></label>
        <label className="gp-field">Wann erledigen?<select value={task.mode} onChange={e => update(task.id, { mode: e.target.value as CareTask['mode'], windows: e.target.value === 'windows' && !task.windows.length ? [{ startMonth: 1, endMonth: 12 }] : task.windows })}>
          <option value="visit">Bei jedem Besuch</option><option value="interval">In eigenem Abstand</option><option value="windows">In jährlichen Zeitfenstern</option><option value="need">Nach Bedarf</option>
        </select></label>
        <div className="gp-columns"><Month label="Aufgabe ab" value={task.seasonStart} onChange={seasonStart => update(task.id, { seasonStart })} /><Month label="Aufgabe bis" value={task.seasonEnd} onChange={seasonEnd => update(task.id, { seasonEnd })} /></div>
        {task.mode === 'interval' && <>
          <div className="gp-columns"><label className="gp-field">Alle<input type="number" min="1" max="52" value={task.interval} onChange={e => update(task.id, { interval: Number(e.target.value) })} /></label><label className="gp-field">Einheit<select value={task.unit} onChange={e => update(task.id, { unit: e.target.value as CareTask['unit'] })}><option value="weeks">Wochen</option><option value="months">Monate</option></select></label></div>
          <label className="gp-field">Erstmals fällig am (optional)<input type="date" value={task.firstDue} onChange={e => update(task.id, { firstDue: e.target.value })} /></label>
          <label className="gp-field">Spielraum vor / nach Fälligkeit (Tage)<input type="number" min="0" max="60" value={task.toleranceDays} onChange={e => update(task.id, { toleranceDays: Number(e.target.value) })} /></label>
          <p className="gp-hint">Ab der zuletzt dokumentierten Erledigung rechnen. Ohne Vorgabe oder Erledigung wird die Arbeit beim nächsten passenden Besuch vorgeschlagen.</p>
        </>}
        {task.mode === 'windows' && <>
          <p className="gp-hint">Für zweimal jährlich zwei Zeitfenster anlegen. Die Monate legst du nach Pflanzenart, Wetter und zulässiger Arbeit selbst fest.</p>
          {task.windows.map((w, i) => <div className="gp-task-window" key={i}><div className="gp-columns"><Month label={`Zeitfenster ${i + 1} von`} value={w.startMonth} onChange={startMonth => update(task.id, { windows: task.windows.map((x, j) => j === i ? { ...x, startMonth } : x) })} /><Month label={`Zeitfenster ${i + 1} bis`} value={w.endMonth} onChange={endMonth => update(task.id, { windows: task.windows.map((x, j) => j === i ? { ...x, endMonth } : x) })} /></div><button type="button" onClick={() => update(task.id, { windows: task.windows.filter((_, j) => j !== i) })}>Zeitfenster entfernen</button></div>)}
          <button type="button" onClick={() => update(task.id, { windows: [...task.windows, { startMonth: 1, endMonth: 12 }] })}>+ Zeitfenster</button>
        </>}
        <label className="gp-field">Geplanter Zeitbedarf (Minuten)<input type="number" min="0" max="1440" step="5" value={task.minutes || ''} placeholder="Noch offen" onChange={e => update(task.id, { minutes: Number(e.target.value) })} /></label>
        <div className="gp-stack"><strong>Benötigte Geräte und Werkzeuge</strong><div className="gp-tool-chips">{tools.map(tool => <button type="button" key={tool.id} aria-pressed={task.toolIds.includes(tool.id)} onClick={() => update(task.id, { toolIds: task.toolIds.includes(tool.id) ? task.toolIds.filter(id => id !== tool.id) : [...task.toolIds, tool.id] })}>{tool.name}</button>)}</div>{!tools.length && <p className="gp-hint">Deine Geräte zuerst im Bereich „Geräte“ anlegen. Danach hier der Aufgabe zuordnen.</p>}</div>
        <button type="button" className="gp-text-danger" onClick={() => { if (window.confirm(`Pflegeaufgabe „${task.name}“ entfernen? Bisherige Besuchsaufzeichnungen bleiben erhalten.`)) onChange(tasks.filter(t => t.id !== task.id)); }}>Aufgabe entfernen</button>
      </div>
    </details>)}
    <button type="button" onClick={() => { const task = { ...newCareTask(), name: 'Neue Pflegeaufgabe' }; onChange([...tasks, task]); setExpanded(task.id); }}>+ Pflegeaufgabe</button>
    <p className="gp-hint">Änderungen mit „Objekt speichern“ übernehmen.</p>
  </section>;
}
