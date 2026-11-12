import { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../api';
import {
  formatISODate, getDestination, toISODate, formatTime, getSeatClassLabel,
} from '../data/customerData';

const VOLUNTARY_REASONS = ['Change of plans', 'Medical emergency', 'Work or school schedule', 'Missed the ferry timing', 'Other'];

const selectClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20';

/**
 * Reschedule a booking to another sailing on the same route.
 * `trip` is a booking from mapBooking(). The server only offers sailings that are valid for it
 * (same route, in the future, seats of the same class free, fare not higher than what was paid).
 */
export default function RescheduleTripDialog({ trip, open, onClose, onDone }) {
  const { token } = useAuth();
  const [today] = useState(() => toISODate(new Date()));
  const [date, setDate] = useState(() => (trip?.date && trip.date > today ? trip.date : today));
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTripId, setNewTripId] = useState('');
  const [seatPlan, setSeatPlan] = useState({}); // ticketId -> seatNumber
  const [freeSeats, setFreeSeats] = useState([]);
  const [reasonChoice, setReasonChoice] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const operatorCancelled = Boolean(trip?.needsReschedule);
  const passengerTickets = useMemo(
    () => (trip?.tickets || []).filter((t) => t.type === 'passenger' && t.status === 'valid'),
    [trip],
  );

  useEffect(() => {
    if (!open || !trip) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setNewTripId('');
    apiRequest(`/bookings/${trip.id}/reschedule-options?date=${date}`, { token })
      .then((result) => { if (active) setOptions(result.options || []); })
      .catch((e) => { if (active) { setOptions([]); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, trip, date, token]);

  const choose = async (option) => {
    setNewTripId(option.trip._id);
    setError('');
    setSeatPlan({});
    setFreeSeats([]);
    if (trip.bookingType !== 'passenger') return;
    try {
      const result = await apiRequest(`/trips/${option.trip._id}/seats`);
      const available = result.seats.filter((s) => s.isAvailable);
      setFreeSeats(available);
      // pre-assign the first free seat of the same class to each passenger
      const used = new Set();
      const plan = {};
      passengerTickets.forEach((ticket) => {
        const seat = available.find((s) => s.seatClass === ticket.seatClass && !used.has(s.seatNumber));
        if (seat) { plan[ticket._id] = seat.seatNumber; used.add(seat.seatNumber); }
      });
      setSeatPlan(plan);
    } catch (e) {
      setError(e.message);
    }
  };

  const close = () => {
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    const reason = operatorCancelled
      ? (trip.tripCancelReason || 'Trip cancelled by the operator')
      : (reasonChoice === 'Other' ? otherReason.trim() : reasonChoice);
    if (!newTripId) return setError('Choose the new departure.');
    if (!reason || reason.length < 3) return setError('Please give a reason for rescheduling.');
    if (trip.bookingType === 'passenger' && passengerTickets.some((t) => !seatPlan[t._id])) {
      return setError('Choose a seat for every passenger.');
    }
    const picked = Object.values(seatPlan);
    if (new Set(picked).size !== picked.length) return setError('Each passenger needs a different seat.');
    setSaving(true);
    try {
      await apiRequest(`/bookings/${trip.id}/reschedule`, {
        token,
        method: 'POST',
        body: {
          newTripId,
          reason,
          ...(trip.bookingType === 'passenger'
            ? { seats: passengerTickets.map((t) => ({ ticketId: t._id, seatNumber: seatPlan[t._id] })) }
            : {}),
        },
      });
      const chosen = options.find((o) => o.trip._id === newTripId);
      onDone?.(`Booking ${trip.bookingRef} moved to ${formatISODate(date)} at ${formatTime(chosen?.trip.departureAt)}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const from = trip?.from ? getDestination(trip.from) : null;
  const to = trip?.to ? getDestination(trip.to) : null;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reschedule this trip"
      description={operatorCancelled
        ? 'Your trip was cancelled by the operator. Pick a new departure at no extra cost.'
        : 'Move your booking to another departure on the same route.'}
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
            disabled={saving}
            className="rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Confirm Reschedule'}
          </button>
        </>
      )}
    >
      {trip && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Route</span>
              <span className="text-right font-semibold text-slate-900">{from.city} ({from.code}) → {to.city} ({to.code})</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-500">Vessel</span>
              <span className="font-semibold text-slate-900">{trip.ship}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-500">Current schedule</span>
              <span className="text-right font-semibold text-slate-900">
                {formatISODate(trip.date)} · {trip.departure} – {trip.arrival}
              </span>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">New date</span>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(event) => setDate(event.target.value)}
              className={selectClass}
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">New departure</span>
            {loading ? (
              <p className="text-sm text-slate-500">Checking available departures…</p>
            ) : options.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                No departures on this route for {formatISODate(date)}. Try another date.
              </p>
            ) : (
              <div className="space-y-2">
                {options.map((option) => {
                  const selected = newTripId === option.trip._id;
                  return (
                    <button
                      key={option.trip._id}
                      type="button"
                      disabled={!option.canAccommodate}
                      onClick={() => choose(option)}
                      aria-pressed={selected}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                        selected ? 'border-[#0056FF] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span className="font-semibold text-slate-900">
                        {formatTime(option.trip.departureAt)} – {formatTime(option.trip.arrivalAt)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {option.trip.boat?.name}
                        {!option.canAccommodate && ' · not available for your booking'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {trip.bookingType === 'passenger' && newTripId && (
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-600">Seats on the new trip</span>
              {passengerTickets.map((ticket) => (
                <label key={ticket._id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">
                    {ticket.passenger?.firstName} {ticket.passenger?.lastName}
                    <span className="ml-1 text-xs text-slate-400">({getSeatClassLabel(ticket.seatClass)})</span>
                  </span>
                  <select
                    value={seatPlan[ticket._id] || ''}
                    onChange={(event) => setSeatPlan((current) => ({ ...current, [ticket._id]: event.target.value }))}
                    className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-[#0056FF]"
                  >
                    <option value="">Seat…</option>
                    {freeSeats.filter((s) => s.seatClass === ticket.seatClass).map((s) => (
                      <option key={s.seatNumber} value={s.seatNumber}>{s.seatNumber}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}

          {!operatorCancelled && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Reason</span>
              <select
                value={reasonChoice}
                onChange={(event) => { setReasonChoice(event.target.value); setError(''); }}
                className={selectClass}
              >
                <option value="">Select a reason…</option>
                {VOLUNTARY_REASONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {reasonChoice === 'Other' && (
                <input
                  type="text"
                  value={otherReason}
                  onChange={(event) => setOtherReason(event.target.value)}
                  placeholder="Tell us why"
                  className={`${selectClass} mt-2`}
                />
              )}
            </label>
          )}
          {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}

          <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <p>
              Your fare stays the same. You can reschedule up to 4 hours before departure, to a sailing on the
              same route with seats in the same class and a fare that is not higher than what you paid.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
