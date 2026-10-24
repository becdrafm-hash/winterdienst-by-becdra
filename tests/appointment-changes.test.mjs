import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordAppointmentChange, shiftAppointment } from '../src/garden/appointmentChanges.ts';
import { newObject, emptyState } from '../src/garden/model.ts';
import { validateGarden } from '../src/garden/storage.ts';

const original = () => ({ id: 'same-appointment', objectId: 'garden', title: 'Gartenpflege', start: '2026-10-26T09:00', end: '2026-10-26T11:00', status: 'planned', note: 'Bestehende Notiz', updatedAt: '2026-10-24T08:00:00Z', taskIds: ['mow'] });
test('rescheduling retains identity, assigned work and duration across calendar days', () => {
  const saved = original(), shifted = shiftAppointment(saved, '2026-10-27T13:00');
  const next = recordAppointmentChange(saved, shifted, 'rescheduled', 'Baustelle hat sich verzögert');
  assert.equal(next.id, saved.id); assert.equal(next.end, '2026-10-27T15:00');
  assert.deepEqual(next.taskIds, ['mow']); assert.equal(next.note, saved.note);
  assert.equal(next.history[0].previousStart, saved.start); assert.equal(next.history[0].newStart, next.start);
  assert.equal(saved.start, '2026-10-26T09:00'); assert.equal(saved.history, undefined);
});
test('cancellation stores a reason and appends to the complete reschedule history', () => {
  const saved = original(), moved = recordAppointmentChange(saved, shiftAppointment(saved, '2026-10-27T13:00'), 'rescheduled', 'Baustelle hat sich verzögert');
  const cancelled = recordAppointmentChange(moved, { ...moved, status: 'cancelled' }, 'cancelled', '  Kunde hat keine Zeit  ');
  assert.equal(cancelled.history.length, 2); assert.equal(cancelled.history[1].reason, 'Kunde hat keine Zeit');
  assert.equal(cancelled.history[1].previousStart, moved.start); assert.equal(moved.history.length, 1);
});
test('an empty reason or a changed identity cannot silently create a replacement visit', () => {
  const saved = original();
  assert.throws(() => recordAppointmentChange(saved, saved, 'cancelled', '  '), /Grund/);
  assert.throws(() => recordAppointmentChange(saved, { ...saved, id: 'new' }, 'rescheduled', 'Wetter'), /Zuordnung|zuordnung/);
});
test('history survives a backup round trip and malformed change records are rejected', () => {
  const saved = original(), next = recordAppointmentChange(saved, shiftAppointment(saved, '2026-10-27T13:00'), 'rescheduled', 'Wetter');
  const state = { ...emptyState(), objects: [{ ...newObject(), id: 'garden', customerId: 1, name: 'Garten' }], appointments: [next] };
  assert.deepEqual(validateGarden(JSON.parse(JSON.stringify(state))), state);
  const invalid = structuredClone(state); invalid.appointments[0].history[0].newEnd = '2026-10-26T08:00';
  assert.throws(() => validateGarden(invalid), /Änderungsverlauf/);
});
