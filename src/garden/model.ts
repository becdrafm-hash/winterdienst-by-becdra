export type BillingMode = 'hours' | 'fixed' | 'mixed';
export interface GardenTool { id: string; name: string }
export interface CareTask {
  id: string;
  name: string;
  mode: 'visit' | 'interval' | 'windows' | 'need';
  seasonStart: number;
  seasonEnd: number;
  interval: number;
  unit: 'weeks' | 'months';
  toleranceDays: number;
  firstDue: string;
  windows: { startMonth: number; endMonth: number }[];
  minutes: number;
  toolIds: string[];
}
export interface GardenObject {
  id: string;
  customerId: number;
  winterObjectId?: number;
  name: string;
  address: string;
  contact: string;
  access: string;
  inventory: string[];
  inventoryNotes: string;
  intervalMin: number;
  intervalMax: number;
  seasonStart: number;
  seasonEnd: number;
  allowedDays: number[];
  authorized: boolean;
  lastVisit: string;
  leadWeeks: number;
  seasonNotes: string;
  billingCycle: 'visit' | 'monthly';
  billingMode: BillingMode;
  hourlyRate: string;
  fixedRate: string;
  included: string;
  travelRate: string;
  machineRate: string;
  machineDefault: boolean;
  disposalRate: string;
  photoShare: boolean;
  checklist: string[];
  careTasks?: CareTask[];
  visitIntervalMonths?: number;
  archived: boolean;
  updatedAt: string;
}
export interface FollowUp {
  id: string;
  objectId: string;
  text: string;
  due: string;
  status: 'open' | 'approval' | 'approved' | 'done' | 'discarded';
  createdAt: string;
}
export interface Appointment {
  id: string;
  objectId: string;
  title: string;
  start: string;
  end: string;
  status: 'planned' | 'done' | 'cancelled';
  note: string;
  updatedAt: string;
  /** Absent: calculate from due work; present: explicit assignment. */
  taskIds?: string[];
  history?: AppointmentChange[];
}
export interface AppointmentChange {
  action: 'cancelled' | 'rescheduled';
  reason: string;
  changedAt: string;
  previousStart: string;
  previousEnd: string;
  newStart?: string;
  newEnd?: string;
}
export interface GardenVisit {
  id: string;
  objectId: string;
  start: string;
  end: string;
  checklist: string[];
  done: string[];
  notes: string;
  machines: boolean;
  disposalTonnes: string;
  hourlyRate: string;
  machineRate: string;
  travelRate: string;
  disposalRate: string;
  billingMode: BillingMode;
  billingCycle: 'visit' | 'monthly';
  photoShare: boolean;
  createdAt: string;
  doneTaskIds?: string[];
  appointmentId?: string;
}
export interface GardenPhoto {
  id: string;
  objectId: string;
  visitId?: string;
  category: 'before' | 'after' | 'observation';
  file: Blob;
  name: string;
  type: string;
  fileModifiedAt: number;
  uploadedAt: string;
  sha256: string;
}
export interface GardenState {
  version: 1;
  revision: number;
  objects: GardenObject[];
  followUps: FollowUp[];
  appointments: Appointment[];
  visits: GardenVisit[];
  tools?: GardenTool[];
  lastExportAt?: string;
  lastExportRevision?: number;
}
export const emptyState = (): GardenState => ({ version: 1, revision: 0, objects: [], followUps: [], appointments: [], visits: [] });
export const INVENTORY = ['Bauernhortensien', 'Schneeballhortensien', 'Eibenhecke', 'Rhododendren', 'Kletterhortensien', 'Rosen', 'Rasen', 'Beete', 'Pflaster / Einfahrt', 'Bewässerung', 'Mähroboter', 'Beleuchtung', 'Dachrinnen'];
export const newObject = (): GardenObject => ({
  id: crypto.randomUUID(), customerId: 0, name: '', address: '', contact: '', access: '', inventory: [], inventoryNotes: '',
  intervalMin: 3, intervalMax: 4, seasonStart: 4, seasonEnd: 11, allowedDays: [], authorized: false, lastVisit: '', leadWeeks: 3,
  seasonNotes: '', billingCycle: 'visit', billingMode: 'hours', hourlyRate: '', fixedRate: '', included: '', travelRate: '', machineRate: '',
  machineDefault: false, disposalRate: '', photoShare: false, checklist: [], archived: false, updatedAt: new Date().toISOString()
});
export const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const localDateTime = (date = new Date()) => `${dateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
export const addDays = (key: string, days: number) => { const d = new Date(key + 'T12:00:00'); d.setDate(d.getDate() + days); return dateKey(d); };
export function addMonths(key: string, months: number) {
  const d = new Date(key + 'T12:00:00'), day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return dateKey(d);
}
export const inSeason = (obj: GardenObject, month: number) => obj.seasonStart <= obj.seasonEnd ? month >= obj.seasonStart && month <= obj.seasonEnd : month >= obj.seasonStart || month <= obj.seasonEnd;
export function planningWindow(obj: GardenObject, visits: GardenVisit[], today = dateKey()) {
  const latest = visits.filter(v => v.objectId === obj.id).map(v => v.end.slice(0, 10)).sort().at(-1);
  const last = [latest, obj.lastVisit].filter((v): v is string => Boolean(v)).sort().at(-1);
  const d = new Date(today + 'T12:00:00');
  if (!inSeason(obj, d.getMonth() + 1)) {
    let year = d.getFullYear();
    if (d.getMonth() + 1 > obj.seasonStart) year++;
    const start = `${year}-${String(obj.seasonStart).padStart(2, '0')}-01`;
    const reminder = addDays(start, -obj.leadWeeks * 7);
    return { start, end: start, reminder, label: today >= reminder ? 'Saisonstart vorbereiten' : 'Saisonpause', paused: true };
  }
  if (!last) return { start: today, end: today, reminder: today, label: 'Ersten Pflegebedarf prüfen', paused: false };
  const start = obj.visitIntervalMonths ? addMonths(last, obj.visitIntervalMonths) : addDays(last, obj.intervalMin * 7);
  const end = obj.visitIntervalMonths ? addDays(start, 7) : addDays(last, obj.intervalMax * 7);
  return { start, end, reminder: start, label: today > end ? 'Pflegefenster überschritten' : today >= start ? 'Pflegebedarf prüfen' : 'Nächstes Pflegefenster', paused: false };
}
export function nextAllowedDay(obj: GardenObject, start: string) {
  let d = start;
  for (let i = 0; i < 370; i++, d = addDays(d, 1)) {
    const day = new Date(d + 'T12:00:00');
    if (inSeason(obj, day.getMonth() + 1) && (!obj.allowedDays.length || obj.allowedDays.includes(day.getDay()))) return d;
  }
  return start;
}
export const numberValue = (value: string) => Number(value.trim().replace(',', '.')) || 0;
export function visitCost(visit: GardenVisit) {
  const duration = Math.max(0, new Date(visit.end).getTime() - new Date(visit.start).getTime());
  const hours = Math.ceil(duration / 900000) / 4;
  const labor = hours * numberValue(visit.hourlyRate);
  const machines = visit.machines ? hours * numberValue(visit.machineRate) : 0;
  const travel = numberValue(visit.travelRate), disposal = numberValue(visit.disposalTonnes) * numberValue(visit.disposalRate);
  return { hours, labor, machines, travel, disposal, total: labor + machines + travel + disposal };
}
export const euro = (value: number) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
