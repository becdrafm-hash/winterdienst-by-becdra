import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newObject, emptyState, addMonths, planningWindow } from '../src/garden/model.ts';
import { newCareTask, objectTasks, taskWindow, tasksForAppointment, toolsForAppointments, chronological } from '../src/garden/carePlanning.ts';
import { validateGarden } from '../src/garden/storage.ts';

const object = () => ({ ...newObject(), id: 'garden', customerId: 1, name: 'Garten', authorized: true, seasonStart: 1, seasonEnd: 12 });
const task = (id, extra = {}) => ({ ...newCareTask(), id, name: id, ...extra });
const appointment = (id, date, extra = {}) => ({ id, objectId: 'garden', start: date + 'T09:00', end: date + 'T11:00', status: 'planned', title: 'Pflege', note: '', updatedAt: new Date().toISOString(), ...extra });
const visit = (id, date, tasks = []) => ({ id, objectId: 'garden', start: date + 'T09:00', end: date + 'T10:00', checklist: tasks, done: tasks, doneTaskIds: tasks, notes: '', machines: false, photoShare: false, disposalTonnes: '', hourlyRate: '', machineRate: '', travelRate: '', disposalRate: '', billingMode: 'hours', billingCycle: 'visit', createdAt: new Date().toISOString() });

test('monthly visits bundle mowing, a twice-yearly hedge cut and interval paving work', () => {
  const obj = object();
  obj.careTasks = [task('mow'), task('hedge', { mode: 'windows', windows: [{ startMonth: 6, endMonth: 7 }, { startMonth: 9, endMonth: 10 }] }), task('paving', { mode: 'interval', interval: 2, unit: 'months', firstDue: '2026-06-05', toleranceDays: 14 })];
  const june = appointment('june', '2026-06-06'), july = appointment('july', '2026-07-04'), september = appointment('september', '2026-09-05');
  const state = { ...emptyState(), objects: [obj], appointments: [july, september, june] };
  assert.deepEqual(tasksForAppointment(obj, state, june, '2026-06-01').map(t => t.id), ['mow', 'hedge', 'paving']);
  assert.deepEqual(tasksForAppointment(obj, state, july, '2026-06-01').map(t => t.id), ['mow']);
  assert.deepEqual(tasksForAppointment(obj, state, september, '2026-06-01').map(t => t.id), ['mow', 'hedge']);
  assert.equal(state.appointments.length, 3, 'planning never creates extra visits');
});

test('only documented task completion advances its interval; unfinished work remains due', () => {
  const obj = { ...object(), careTasks: [task('mow'), task('paving', { mode: 'interval', interval: 2, unit: 'months', firstDue: '2026-06-01' })] };
  const state = { ...emptyState(), objects: [obj], visits: [visit('one', '2026-06-06', ['mow'])] };
  assert.equal(taskWindow(obj.careTasks[1], state.visits, '2026-06-07').end, '2026-06-08');
  state.visits.push(visit('two', '2026-06-07', ['paving']));
  assert.equal(taskWindow(obj.careTasks[1], state.visits, '2026-06-08').start, '2026-07-31');
});

test('annual windows count a late completion once and do not repeat an old missed window', () => {
  const hedge = task('hedge', { mode: 'windows', windows: [{ startMonth: 6, endMonth: 7 }, { startMonth: 9, endMonth: 10 }] });
  assert.equal(taskWindow(hedge, [], '2026-09-03').start, '2026-09-01');
  assert.equal(taskWindow(hedge, [visit('late', '2026-08-01', ['hedge'])], '2026-08-02').start, '2026-09-01');
  assert.equal(taskWindow(hedge, [visit('autumn', '2026-11-01', ['hedge'])], '2026-11-02').start, '2027-06-01');
});

test('seasons, cross-year windows and tasks on demand are respected', () => {
  const obj = { ...object(), careTasks: [task('mow', { seasonStart: 4, seasonEnd: 10 }), task('need', { mode: 'need' }), task('winter', { mode: 'windows', windows: [{ startMonth: 11, endMonth: 2 }] })] };
  const a = appointment('winter', '2027-01-10');
  const state = { ...emptyState(), objects: [obj], appointments: [a] };
  assert.deepEqual(tasksForAppointment(obj, state, a, '2027-01-01').map(t => t.id), ['winter']);
  assert.deepEqual(tasksForAppointment(obj, state, { ...a, taskIds: ['need'] }, '2027-01-01').map(t => t.id), ['need']);
  assert.deepEqual(tasksForAppointment(obj, state, { ...a, taskIds: [] }, '2027-01-01'), []);
});

test('daily equipment is combined across visits without duplicates or packing states', () => {
  const obj = { ...object(), careTasks: [task('mow', { toolIds: ['mower', 'fuel'] }), task('leaves', { toolIds: ['blower', 'fuel'] })] };
  const appointments = [appointment('morning', '2026-10-24'), appointment('afternoon', '2026-10-24', { start: '2026-10-24T13:00' })];
  const state = { ...emptyState(), objects: [obj], appointments, tools: [{ id: 'mower', name: 'Rasenmäher' }, { id: 'fuel', name: 'Kraftstoff' }, { id: 'blower', name: 'Laubbläser' }] };
  assert.deepEqual(toolsForAppointments(state, appointments, '2026-10-24').map(t => t.id), ['fuel', 'blower', 'mower']);
  assert.deepEqual(chronological([...appointments].reverse()).map(a => a.id), ['morning', 'afternoon']);
});

test('old checklists keep stable task IDs and old backups still validate without changes', () => {
  const obj = { ...object(), checklist: ['Mähen', 'Laub'] }, state = { ...emptyState(), objects: [obj] };
  const before = JSON.stringify(state);
  assert.deepEqual(objectTasks(obj).map(t => t.id), objectTasks(structuredClone(obj)).map(t => t.id));
  assert.equal(validateGarden(state), state);
  assert.equal(JSON.stringify(state), before);
});

test('backup validation preserves new data and rejects invalid tool/task references', () => {
  const obj = { ...object(), careTasks: [task('mow', { toolIds: ['mower'] })] };
  const state = { ...emptyState(), objects: [obj], tools: [{ id: 'mower', name: 'Rasenmäher' }] };
  assert.deepEqual(validateGarden(JSON.parse(JSON.stringify(state))), state);
  assert.throws(() => validateGarden({ ...state, tools: [] }), /Pflegeaufgabe/);
  const invalid = structuredClone(state); invalid.objects[0].careTasks[0].interval = 0;
  assert.throws(() => validateGarden(invalid), /Pflegeaufgabe/);
});

test('calendar-month rhythm clamps month ends instead of drifting into the following month', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  const obj = { ...object(), lastVisit: '2026-09-24', visitIntervalMonths: 1 };
  assert.equal(planningWindow(obj, [], '2026-10-01').start, '2026-10-24');
});

test('new visit tasks extend a legacy object without changing stable IDs or old records', async () => {
  const { appendCareTasks } = await import('../src/garden/carePlanning.ts');
  const obj = { ...object(), checklist: ['Mähen', 'Laub'] };
  const before = JSON.stringify(obj), ids = objectTasks(obj).map(t => t.id);
  const added = task('new', { mode: 'need' });
  const next = appendCareTasks(obj, [added]);
  assert.deepEqual(next.careTasks.slice(0, 2).map(t => t.id), ids);
  assert.equal(next.careTasks.at(-1).mode, 'need');
  assert.equal(JSON.stringify(obj), before);
  const state = { ...emptyState(), objects: [next] }, a = appointment('one', '2026-10-24', { taskIds: ['new'] });
  assert.deepEqual(tasksForAppointment(next, state, a, '2026-10-24').map(t => t.id), ['new']);
  assert.equal(tasksForAppointment(next, state, appointment('later', '2026-11-24'), '2026-10-24').some(t => t.id === 'new'), false);
  assert.deepEqual(validateGarden(JSON.parse(JSON.stringify({ ...state, appointments: [a] }))).objects[0].careTasks.at(-1), added);
});

test('duplicate names and invalid new tasks are rejected without changing the original object', async () => {
  const { appendCareTasks } = await import('../src/garden/carePlanning.ts');
  const obj = { ...object(), careTasks: [task('one', { name: 'Rasen mähen' })] }, before = JSON.stringify(obj);
  assert.throws(() => appendCareTasks(obj, [task('two', { name: ' RASEN MÄHEN ' })]), /bereits vorhanden/);
  assert.throws(() => appendCareTasks(obj, [task('two'), task('three', { name: 'two' })]), /bereits vorhanden/);
  assert.throws(() => appendCareTasks(obj, [task('two', { minutes: -1 })]), /Zeitbedarf/);
  assert.equal(JSON.stringify(obj), before);
});
