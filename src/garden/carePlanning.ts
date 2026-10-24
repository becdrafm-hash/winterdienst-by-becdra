import { addDays, addMonths, dateKey, inSeason, type Appointment, type CareTask, type GardenObject, type GardenState, type GardenVisit } from './model.ts';

export function objectTasks(obj: GardenObject): CareTask[] {
  // Deterministic IDs retain the link to old checklist entries without rewriting history.
  return obj.careTasks ?? [...new Set(obj.checklist.filter(t => t.trim()))].map((name, i) => ({
    id: `legacy-${obj.id}-${i}`, name, mode: 'visit', seasonStart: obj.seasonStart, seasonEnd: obj.seasonEnd,
    interval: 4, unit: 'weeks', toleranceDays: 7, firstDue: '', windows: [], minutes: 0, toolIds: [],
  }));
}
export const newCareTask = (): CareTask => ({ id: crypto.randomUUID(), name: '', mode: 'visit', seasonStart: 1, seasonEnd: 12, interval: 4, unit: 'weeks', toleranceDays: 7, firstDue: '', windows: [], minutes: 0, toolIds: [] });
export const chronological = <T extends { start: string }>(items: T[]): T[] => [...items].sort((a, b) => a.start.localeCompare(b.start));
const completedOn = (task: CareTask, visits: GardenVisit[]) => visits.filter(v =>
  v.doneTaskIds ? v.doneTaskIds.includes(task.id) : v.done.includes(task.name)
).map(v => v.end.slice(0, 10)).sort();
export interface TaskWindow { start: string; end: string }

export function taskWindow(task: CareTask, visits: GardenVisit[], on: string): TaskWindow | null {
  if (task.mode === 'need') return null;
  if (task.mode === 'visit') return { start: on, end: on };
  const completed = completedOn(task, visits).filter(d => d <= on);
  if (task.mode === 'interval') {
    const last = completed.at(-1);
    if (!last && !task.firstDue) return { start: on, end: '9999-12-31' };
    const due = last ? (task.unit === 'months' ? addMonths(last, task.interval) : addDays(last, task.interval * 7)) : task.firstDue || on;
    return { start: addDays(due, -task.toleranceDays), end: addDays(due, task.toleranceDays) };
  }
  const year = Number(on.slice(0, 4));
  const allWindows = [year - 1, year, year + 1].flatMap(y => task.windows.map(w => {
    const endYear = w.endMonth < w.startMonth ? y + 1 : y;
    const start = `${y}-${String(w.startMonth).padStart(2, '0')}-01`;
    const end = dateKey(new Date(endYear, w.endMonth, 0, 12));
    return { start, end };
  })).sort((a, b) => a.start.localeCompare(b.start));
  const windows = allWindows.filter((w, i) => w.end >= `${year}-01-01` && (allWindows[i + 1]?.start ?? '9999-12-31') > on && !completed.some(d => d >= w.start && d < (allWindows[i + 1]?.start ?? '9999-12-31')));
  return windows[0] ?? null;
}

export function tasksForAppointment(obj: GardenObject, state: GardenState, appointment: Appointment, today = dateKey()): CareTask[] {
  const day = appointment.start.slice(0, 10), month = Number(day.slice(5, 7));
  const visits = state.visits.filter(v => v.objectId === obj.id);
  const eligible = objectTasks(obj);
  if (appointment.taskIds) return eligible.filter(t => appointment.taskIds!.includes(t.id));
  if (!inSeason(obj, month)) return [];
  return eligible.filter(task => {
    if (!inSeason({ ...obj, seasonStart: task.seasonStart, seasonEnd: task.seasonEnd }, month)) return false;
    if (task.mode === 'visit') return true;
    const window = taskWindow(task, visits, task.mode === 'windows' ? day : today);
    if (!window || day < window.start) return false;
    // One occurrence belongs to the earliest suitable existing visit, never every visit.
    const earlier = state.appointments.some(a => a.objectId === obj.id && a.id !== appointment.id && a.status === 'planned' && a.start < appointment.start && a.start.slice(0, 10) >= today && a.start.slice(0, 10) >= window.start &&
      (a.taskIds ? a.taskIds.includes(task.id) : inSeason(obj, Number(a.start.slice(5, 7))) && inSeason({ ...obj, seasonStart: task.seasonStart, seasonEnd: task.seasonEnd }, Number(a.start.slice(5, 7)))));
    return !earlier;
  });
}

export function toolsForAppointments(state: GardenState, appointments: Appointment[], today = dateKey()) {
  const required = new Set<string>();
  for (const appointment of appointments) {
    const obj = state.objects.find(o => o.id === appointment.objectId);
    if (obj) tasksForAppointment(obj, state, appointment, today).forEach(task => task.toolIds.forEach(id => required.add(id)));
  }
  return (state.tools ?? []).filter(t => required.has(t.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export function taskTiming(task: CareTask) {
  if (task.mode === 'visit') return 'Bei jedem Besuch in der Saison';
  if (task.mode === 'need') return 'Nach Bedarf · manuell zum Besuch hinzufügen';
  if (task.mode === 'windows') return `${task.windows.length} Zeitfenster pro Jahr`;
  return `Alle ${task.interval} ${task.unit === 'months' ? 'Monate' : 'Wochen'} · ± ${task.toleranceDays} Tage`;
}
