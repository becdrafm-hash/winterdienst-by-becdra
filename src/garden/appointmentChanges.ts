import { localDateTime, type Appointment, type AppointmentChange } from './model.ts';

export function recordAppointmentChange(saved: Appointment, next: Appointment, action: AppointmentChange['action'], reason: string, changedAt = new Date().toISOString()): Appointment {
  if (saved.id !== next.id || saved.objectId !== next.objectId) throw new Error('Die Terminzuordnung darf beim Ändern nicht wechseln.');
  if (!reason.trim()) throw new Error('Bitte einen Grund angeben.');
  const change: AppointmentChange = { action, reason: reason.trim(), changedAt, previousStart: saved.start, previousEnd: saved.end,
    ...(action === 'rescheduled' ? { newStart: next.start, newEnd: next.end } : {}) };
  return { ...next, updatedAt: changedAt, history: [...(saved.history ?? []), change] };
}

export function shiftAppointment(appointment: Appointment, start: string): Appointment {
  const duration = new Date(appointment.end).getTime() - new Date(appointment.start).getTime();
  const time = new Date(start).getTime();
  return { ...appointment, start, end: duration > 0 && Number.isFinite(time) ? localDateTime(new Date(time + duration)) : appointment.end };
}
