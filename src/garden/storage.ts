import { emptyState, type GardenPhoto, type GardenState } from './model.ts';
const DB_NAME = 'becdra-gartenpflege-v1';
let connection: Promise<IDBDatabase> | undefined;
function database() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('data'); request.result.createObjectStore('photos', { keyPath: 'id' }); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); connection = undefined; }; resolve(db); };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error('Bitte andere geöffnete App-Tabs schließen und erneut laden.')); };
  });
  return connection;
}
export async function loadGarden(): Promise<GardenState> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('data').objectStore('data').get('state');
    request.onsuccess = () => resolve(request.result ?? emptyState());
    request.onerror = () => reject(request.error);
  });
}
export async function saveGarden(state: GardenState, photos: GardenPhoto[] = [], replacePhotos = false): Promise<GardenState> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['data', 'photos'], 'readwrite');
    const store = tx.objectStore('data'); const request = store.get('state');
    const next = { ...state, revision: state.revision + 1 };
    let conflict = false;
    request.onsuccess = () => {
      if ((request.result?.revision ?? 0) !== state.revision) { conflict = true; tx.abort(); return; }
      store.put(next, 'state');
      const photoStore = tx.objectStore('photos');
      if (replacePhotos) photoStore.clear();
      photos.forEach(photo => photoStore.put(photo));
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () => reject(new Error(conflict ? 'Daten wurden in einem anderen Tab geändert. Bitte neu laden, bevor du weiterarbeitest.' : 'Speichern fehlgeschlagen. Speicherplatz prüfen und eine Sicherung erstellen.'));
    tx.onerror = () => { /* onabort supplies the user-facing error */ };
  });
}
export async function loadPhotos(): Promise<GardenPhoto[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('photos').objectStore('photos').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
}
// Treat backups as untrusted input. Validate all nested values before any write.
export function validateGarden(value: unknown): GardenState {
  if (!value || typeof value !== 'object') throw new Error('Ungültige Sicherung.');
  const state = value as Record<string, unknown>;
  if (state.version !== 1 || !Number.isInteger(state.revision) || Number(state.revision) < 0) throw new Error('Unbekannte Sicherungsversion.');
  for (const key of ['objects', 'followUps', 'appointments', 'visits']) if (!Array.isArray(state[key])) throw new Error('Sicherung ist unvollständig.');
  const ids = new Set<string>();
  const isString = (x: unknown): x is string => typeof x === 'string';
  const strings = (x: unknown) => Array.isArray(x) && x.every(isString);
  const fields = (o: Record<string, unknown>, keys: string[]) => keys.every(k => isString(o[k]));
  const date = (x: unknown) => isString(x) && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(new Date(x + 'T12:00').getTime());
  const time = (x: unknown) => isString(x) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x) && Number.isFinite(new Date(x).getTime());
  const money = (x: unknown) => isString(x) && (x === '' || (/^\d+(?:[.,]\d{1,2})?$/.test(x) && Number(x.replace(',', '.')) >= 0));
  const integer = (x: unknown, min: number, max: number) => Number.isInteger(x) && Number(x) >= min && Number(x) <= max;
  const month = (x: unknown) => integer(x, 1, 12);
  const toolIds = new Set<string>();
  if (state.tools !== undefined) {
    if (!Array.isArray(state.tools)) throw new Error('Ungültige Geräteliste.');
    for (const tool of state.tools) {
      if (!tool || !isString(tool.id) || !tool.id || toolIds.has(tool.id) || !isString(tool.name) || !tool.name.trim()) throw new Error('Ungültiges Gerät.');
      toolIds.add(tool.id);
    }
  }
  if (state.lastExportAt !== undefined && (!isString(state.lastExportAt) || !Number.isFinite(new Date(state.lastExportAt).getTime()))) throw new Error('Ungültiger Exportzeitpunkt.');
  if (state.lastExportRevision !== undefined && !integer(state.lastExportRevision, 0, Number.MAX_SAFE_INTEGER)) throw new Error('Ungültiger Exportstand.');
  for (const item of state.objects as unknown[]) {
    if (!item || typeof item !== 'object') throw new Error('Ungültiges Objekt.');
    const o = item as Record<string, unknown>;
    if (!fields(o, ['id', 'name', 'address', 'contact', 'access', 'inventoryNotes', 'seasonNotes', 'included', 'lastVisit', 'updatedAt']) || !o.id || ids.has(String(o.id)) || !Number.isFinite(o.customerId) || !strings(o.inventory) || !strings(o.checklist)
      || ![o.intervalMin, o.intervalMax].every(x => Number.isInteger(x) && Number(x) >= 1 && Number(x) <= 52) || Number(o.intervalMin) > Number(o.intervalMax)
      || ![o.seasonStart, o.seasonEnd].every(x => Number.isInteger(x) && Number(x) >= 1 && Number(x) <= 12)
      || !Number.isInteger(o.leadWeeks) || Number(o.leadWeeks) < 0 || Number(o.leadWeeks) > 12
      || !Array.isArray(o.allowedDays) || !o.allowedDays.every(x => Number.isInteger(x) && x >= 0 && x <= 6)
      || !['visit', 'monthly'].includes(String(o.billingCycle)) || !['hours', 'fixed', 'mixed'].includes(String(o.billingMode))
      || !['authorized', 'machineDefault', 'photoShare', 'archived'].every(k => typeof o[k] === 'boolean')
      || !['hourlyRate', 'machineRate', 'travelRate', 'disposalRate', 'fixedRate'].every(k => money(o[k]))
      || (o.lastVisit !== '' && !date(o.lastVisit))) throw new Error('Objektdaten in der Sicherung sind ungültig.');
    ids.add(String(o.id));
    if (o.visitIntervalMonths !== undefined && !integer(o.visitIntervalMonths, 1, 12)) throw new Error('Ungültiger Besuchsrhythmus.');
    if (o.careTasks !== undefined) {
      if (!Array.isArray(o.careTasks)) throw new Error('Ungültiger Pflegeplan.');
      const taskIds = new Set<string>();
      for (const task of o.careTasks) {
        if (!task || !fields(task, ['id', 'name', 'firstDue']) || !task.id || !task.name.trim() || taskIds.has(task.id)
          || !['visit', 'interval', 'windows', 'need'].includes(task.mode) || !month(task.seasonStart) || !month(task.seasonEnd)
          || !integer(task.interval, 1, 52) || !['weeks', 'months'].includes(task.unit) || !integer(task.toleranceDays, 0, 60)
          || !integer(task.minutes, 0, 1440) || (task.firstDue !== '' && !date(task.firstDue)) || !strings(task.toolIds) || task.toolIds.some((id: string) => !toolIds.has(id))
          || !Array.isArray(task.windows) || (task.mode === 'windows' && !task.windows.length)
          || !task.windows.every((w: { startMonth: number; endMonth: number }) => w && month(w.startMonth) && month(w.endMonth))) throw new Error('Pflegeaufgabe ist unvollständig oder ungültig.');
        taskIds.add(task.id);
      }
    }
  }
  for (const key of ['followUps', 'appointments', 'visits']) {
    const recordIds = new Set<string>();
    for (const item of state[key] as unknown[]) {
      if (!item || typeof item !== 'object') throw new Error('Ungültiger Eintrag.');
      const r = item as Record<string, unknown>;
      if (!fields(r, ['id', 'objectId']) || !r.id || recordIds.has(String(r.id)) || !ids.has(String(r.objectId))) throw new Error('Ungültige Objektzuordnung.');
      recordIds.add(String(r.id));
      if (r.taskIds !== undefined && !strings(r.taskIds)) throw new Error('Ungültige Terminaufgaben.');
      if (key === 'appointments' && r.history !== undefined) {
        if (!Array.isArray(r.history) || !r.history.every(h => h && ['cancelled', 'rescheduled'].includes(h.action) && isString(h.reason) && h.reason.trim() && isString(h.changedAt) && Number.isFinite(new Date(h.changedAt).getTime()) && time(h.previousStart) && time(h.previousEnd) && h.previousEnd > h.previousStart && (h.action !== 'rescheduled' || (time(h.newStart) && time(h.newEnd) && h.newEnd > h.newStart)))) throw new Error('Ungültiger Änderungsverlauf des Termins.');
      }
      if (r.doneTaskIds !== undefined && !strings(r.doneTaskIds)) throw new Error('Ungültige erledigte Aufgaben.');
      if (r.appointmentId !== undefined && (!isString(r.appointmentId) || !(state.appointments as Record<string, unknown>[]).some(a => a.id === r.appointmentId && a.objectId === r.objectId))) throw new Error('Ungültige Besuchszuordnung.');
      if (key === 'followUps' && (!fields(r, ['text', 'due', 'createdAt']) || (r.due !== '' && !date(r.due)) || !['open', 'approval', 'approved', 'done', 'discarded'].includes(String(r.status)))) throw new Error('Ungültige Wiedervorlage.');
      if (key === 'appointments' && (!fields(r, ['title', 'note', 'updatedAt']) || !time(r.start) || !time(r.end) || String(r.end) <= String(r.start) || !['planned', 'done', 'cancelled'].includes(String(r.status)))) throw new Error('Ungültiger Termin.');
      if (key === 'visits' && (!fields(r, ['notes', 'createdAt']) || !time(r.start) || !time(r.end) || String(r.end) <= String(r.start) || !strings(r.done) || !strings(r.checklist) || typeof r.machines !== 'boolean' || typeof r.photoShare !== 'boolean'
        || !['hourlyRate', 'machineRate', 'travelRate', 'disposalRate'].every(k => money(r[k])) || !['hours', 'fixed', 'mixed'].includes(String(r.billingMode)) || !['visit', 'monthly'].includes(String(r.billingCycle)) || !isString(r.disposalTonnes) || !/^\d*(?:[.,]\d)?$/.test(r.disposalTonnes))) throw new Error('Ungültiger Besuch.');
    }
  }
  return value as GardenState;
}
