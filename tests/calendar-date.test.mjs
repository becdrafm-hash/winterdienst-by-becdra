import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarWeek, calendarDateLabel } from '../src/garden/calendarDate.ts';

test('ISO weeks remain correct across year changes and leap days', () => {
  for (const [date, week] of [['2026-10-23', 43], ['2021-01-01', 53], ['2021-01-04', 1], ['2025-12-29', 1], ['2026-12-31', 53], ['2027-01-01', 53], ['2024-02-29', 9]]) {
    assert.equal(calendarWeek(date), week, date);
  }
});

test('the selected calendar day keeps its weekday regardless of the device timezone', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ['Europe/Berlin', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = timezone;
      assert.equal(calendarDateLabel('2026-10-23T09:00'), 'Freitag, 23.10.2026 · KW 43');
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
