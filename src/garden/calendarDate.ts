/** ISO 8601: Monday starts the week; week 1 contains January 4. */
export function calendarWeek(key: string): number {
  const date = new Date(key.slice(0, 10) + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(date);
  yearStart.setUTCMonth(0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function calendarDateLabel(key: string): string {
  if (!key) return 'Datum auswählen';
  const date = new Date(key.slice(0, 10) + 'T12:00:00');
  return `${date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} · KW ${calendarWeek(key)}`;
}
