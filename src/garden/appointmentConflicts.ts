import type { Appointment } from './model.ts';

/** Different times can still be an accidentally duplicated visit. */
export function sameDayAppointments(appointments: Appointment[], draft: Appointment): Appointment[] {
  if (draft.status !== 'planned' || !draft.start) return [];
  return appointments.filter(a => a.id !== draft.id && a.objectId === draft.objectId && a.status === 'planned' && a.start.slice(0, 10) === draft.start.slice(0, 10))
    .sort((a, b) => a.start.localeCompare(b.start));
}
