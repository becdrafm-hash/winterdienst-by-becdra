import { useId, useRef, useState } from 'react';
import { calendarDateLabel, calendarWeek } from './calendarDate';
import { addDays, dateKey } from './model';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** An inline calendar keeps weekdays and ISO weeks visible on phones, too. */
export default function DateTimeField({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || dateKey()).slice(0, 7));
  const selected = value.slice(0, 10);
  const time = value.slice(11, 16);
  const first = new Date(month + '-01T12:00:00');
  const firstMonday = addDays(month + '-01', -((first.getDay() + 6) % 7));
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const rowCount = Math.ceil((((first.getDay() + 6) % 7) + daysInMonth) / 7);
  const select = (date: string) => {
    onChange(`${date}T${time || '09:00'}`);
    setOpen(false);
    trigger.current?.focus();
  };
  const moveMonth = (offset: number) => {
    const date = new Date(first);
    date.setMonth(date.getMonth() + offset);
    setMonth(dateKey(date).slice(0, 7));
  };
  return <div className="gp-stack gp-datetime" role="group" aria-labelledby={id + '-label'}>
    <strong id={id + '-label'}>{label}</strong>
    <button ref={trigger} type="button" className="gp-date-trigger" aria-expanded={open} aria-controls={id + '-calendar'} onClick={() => {
      if (!open) setMonth((selected || dateKey()).slice(0, 7));
      setOpen(v => !v);
    }}>{calendarDateLabel(selected)}</button>
    {open && <section id={id + '-calendar'} className="gp-date-picker gp-stack" aria-label={`${label}: Datum auswählen`} onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.current?.focus(); }
    }}>
      <div className="gp-date-heading">
        <button type="button" aria-label="Vorheriger Monat" onClick={() => moveMonth(-1)}>‹</button>
        <strong aria-live="polite">{first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" aria-label="Nächster Monat" onClick={() => moveMonth(1)}>›</button>
      </div>
      <table className="gp-date-table"><thead><tr><th scope="col">KW</th>{WEEKDAYS.map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: rowCount }, (_, row) => {
          const monday = addDays(firstMonday, row * 7);
          return <tr key={monday}><th scope="row">{calendarWeek(monday)}</th>{WEEKDAYS.map((_, col) => {
            const day = addDays(monday, col);
            return <td key={day}><button type="button" className={day.slice(0, 7) !== month ? 'gp-other-month' : undefined} aria-label={calendarDateLabel(day)} aria-pressed={selected === day} aria-current={day === dateKey() ? 'date' : undefined} onClick={() => select(day)}>{Number(day.slice(8))}</button></td>;
          })}</tr>;
        })}</tbody>
      </table>
      <button type="button" onClick={() => select(dateKey())}>Heute auswählen</button>
    </section>}
    <label className="gp-field">Uhrzeit · {label}<input type="time" required value={time} onChange={e => onChange(`${selected || dateKey()}T${e.target.value}`)} /></label>
  </div>;
}
