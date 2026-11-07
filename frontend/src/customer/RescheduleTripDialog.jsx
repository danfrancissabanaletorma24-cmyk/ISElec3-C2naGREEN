import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import Modal from './Modal';
import { formatISODate, getDestination, toISODate } from '../data/customerData';

const RESCHEDULE_REASONS = [
  'Bad weather',
  'Vessel maintenance',
  'Technical issue',
  'Medical emergency',
  'Change of plans',
  'Other',
];

const TIME_SLOTS = [
  { departure: '06:00 AM', arrival: '08:30 AM' },
  { departure: '08:30 AM', arrival: '10:30 AM' },
  { departure: '10:00 AM', arrival: '11:00 AM' },
  { departure: '01:15 PM', arrival: '02:45 PM' },
  { departure: '02:00 PM', arrival: '04:30 PM' },
  { departure: '04:30 PM', arrival: '06:30 PM' },
  { departure: '06:00 PM', arrival: '08:30 PM' },
  { departure: '09:00 PM', arrival: '11:30 PM' },
];

const normalizeTime = (value) => String(value ?? '').trim().replace(/^0(\d:)/, '$1');

/**
 * Shared reschedule dialog used by the customer tickets/dashboard and the
 * admin schedules table. `trip` may be a ticket (from/to codes) or a schedule
 * (route label); `onConfirm` receives { date, departure, arrival, reason }.
 */
export default function RescheduleTripDialog({ trip, open, onClose, onConfirm }) {
  const [today] = useState(() => toISODate(new Date()));
  const [date, setDate] = useState(() => (
    trip?.date && trip.date >= today ? trip.date : today
  ));
  const [slotIndex, setSlotIndex] = useState(() => {
    const currentDeparture = normalizeTime(trip?.departure ?? trip?.time);
    const currentIndex = TIME_SLOTS.findIndex((slot) => normalizeTime(slot.departure) === currentDeparture);
    return currentIndex >= 0 ? currentIndex : 0;
  });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    setError('');
    onClose();
  };

  const from = trip?.from ? getDestination(trip.from) : null;
  const to = trip?.to ? getDestination(trip.to) : null;
  const routeLabel = trip?.route
    || (from && to ? `${from.city} (${from.code}) → ${to.city} (${to.code})` : '');

  const handleConfirm = () => {
    if (!date) {
      setError('Please choose a new departure date.');
      return;
    }
    if (!reason) {
      setError('Please choose a reason for rescheduling.');
      return;
    }
    const slot = TIME_SLOTS[slotIndex];
    onConfirm({ date, departure: slot.departure, arrival: slot.arrival, reason });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reschedule this trip"
      description="Move your booking to another departure at no extra cost."
      maxWidth="max-w-lg"
      footer={(
        <>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Keep Current Trip
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800"
          >
            Confirm Reschedule
          </button>
        </>
      )}
    >
      {trip && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Route</span>
              <span className="text-right font-semibold text-slate-900">{routeLabel}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-500">Vessel</span>
              <span className="font-semibold text-slate-900">{trip.ship ?? trip.vessel}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-500">Current schedule</span>
              <span className="text-right font-semibold text-slate-900">
                {trip.date ? `${formatISODate(trip.date)} · ` : ''}
                {trip.departure ?? trip.time} – {trip.arrival ?? '—'}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">New date</span>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(event) => {
                  setDate(event.target.value);
                  setError('');
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">New departure</span>
              <select
                value={slotIndex}
                onChange={(event) => {
                  setSlotIndex(Number(event.target.value));
                  setError('');
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
              >
                {TIME_SLOTS.map((slot, index) => (
                  <option key={`${slot.departure}-${slot.arrival}`} value={index}>
                    {slot.departure} – {slot.arrival}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Reason</span>
            <select
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError('');
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
            >
              <option value="">Select a reason…</option>
              {RESCHEDULE_REASONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
          </label>

          <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <p>
              Weather-related changes are free of charge. Your seats are kept and the new
              schedule replaces the old one immediately.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
