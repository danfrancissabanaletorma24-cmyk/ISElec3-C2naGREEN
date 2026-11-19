import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import Modal from '../customer/Modal';
import { formatISODate, toISODate } from '../data/customerData';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20';

function toInputTime(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value || '');
  if (!match) return fallback;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

function toDisplayTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${String(hours % 12 || 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

export default function AdminRescheduleTripDialog({ trip, onClose, onConfirm }) {
  const [today] = useState(() => toISODate(new Date()));
  const [date, setDate] = useState(() => (trip.date && trip.date >= today ? trip.date : today));
  const [departure, setDeparture] = useState(() => toInputTime(trip.departure, '06:00'));
  const [arrival, setArrival] = useState(() => toInputTime(trip.arrival, '08:30'));
  const [reason, setReason] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onConfirm({
      date,
      departure: toDisplayTime(departure),
      arrival: toDisplayTime(arrival),
      reason: reason.trim(),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Reschedule trip"
      description="Choose the new departure date and times for this vessel."
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="admin-reschedule-trip-form"
            className="rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800"
          >
            Save reschedule
          </button>
        </>
      )}
    >
      <form id="admin-reschedule-trip-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-900">{trip.vessel}</p>
          <p className="mt-1 text-slate-600">{trip.route}</p>
          <p className="mt-2 text-xs text-slate-500">
            Current schedule: {trip.date ? formatISODate(trip.date) : 'Not set'} · {trip.departure || '—'} – {trip.arrival || '—'}
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">New date</span>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(event) => setDate(event.target.value)}
            required
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Departure</span>
            <input
              type="time"
              value={departure}
              onChange={(event) => setDeparture(event.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Arrival</span>
            <input
              type="time"
              value={arrival}
              onChange={(event) => setArrival(event.target.value)}
              required
              className={inputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            minLength={3}
            placeholder="For example, bad weather or maintenance"
            className={inputClass}
          />
        </label>

        <p className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarClock className="h-4 w-4 shrink-0" />
          The updated schedule will appear in the Fleet schedule list.
        </p>
      </form>
    </Modal>
  );
}
