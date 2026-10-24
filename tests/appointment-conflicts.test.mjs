import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameDayAppointments } from '../src/garden/appointmentConflicts.ts';

const appointment = (id, objectId, start, status = 'planned') => ({ id, objectId, start, status });
test('a second visit on the same day is detected even without a time overlap', () => {
  const saved = [appointment('one', 'weeze', '2026-10-26T09:00')];
  assert.deepEqual(sameDayAppointments(saved, appointment('new', 'weeze', '2026-10-26T13:00')).map(a => a.id), ['one']);
  assert.equal(saved.length, 1, 'detection must not change existing appointments');
});
test('editing the same appointment does not create a false duplicate', () => {
  assert.deepEqual(sameDayAppointments([appointment('one', 'weeze', '2026-10-26T09:00')], appointment('one', 'weeze', '2026-10-26T13:00')), []);
});
test('other objects, other days and cancelled appointments do not block planning', () => {
  const saved = [appointment('other', 'bahnstrasse', '2026-10-26T09:00'), appointment('tomorrow', 'weeze', '2026-10-27T09:00'), appointment('cancelled', 'weeze', '2026-10-26T09:00', 'cancelled')];
  assert.deepEqual(sameDayAppointments(saved, appointment('new', 'weeze', '2026-10-26T13:00')), []);
  assert.deepEqual(sameDayAppointments([appointment('one', 'weeze', '2026-10-26T09:00')], appointment('new', 'weeze', '2026-10-26T13:00', 'cancelled')), []);
});
