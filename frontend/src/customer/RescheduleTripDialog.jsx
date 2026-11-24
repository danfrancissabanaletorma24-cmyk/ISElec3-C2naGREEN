import { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../api';
import {
  formatISODate, getDestination, formatTime, getSeatClassLabel,
} from '../data/customerData';
import { REASON_MAX, cleanReasonText, validateReason } from './reasons';

const USER_REASONS = ['Change of plans', 'Medical emergency', 'Work or school schedule', 'Missed the ferry timing', 'Other'];
const ADMIN_REASONS = ['Bad weather', 'Vessel maintenance', 'Schedule change', 'Customer request', 'Other'];

const selectClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20';

const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * Reschedule a booking to another sailing on the same route - for the customer and for the admin.
 * Only dates that still have a sailing with room in the seat class that was paid for (economy / business / VIP)
 * can be chosen; each departure shows how many seats of that class are left.
 * `trip` is a booking from mapBooking() (or the admin's rescheduleTrip). The reason must be valid.
 */
export default function RescheduleTripDialog({ trip, open, onClose, onDone, asAdmin = false }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [date, setDate] = useState('');
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
    apiRequest(`/bookings/${trip.id}/reschedule-options`, { token })
      .then((result) => {
        if (!active) return;
        setData(result);
        const dates = (result.availableDates || []).map((d) => d.date).sort();
        setDate((current) => (dates.includes(current) ? current : dates[0] || ''));
      })
      .catch((e) => { if (active) { setData(null); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, trip, token]);

  const dates = useMemo(
    () => [...(data?.availableDates || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );
  const options = useMemo(
    () => (data?.options || []).filter((o) => o.date === date),
    [data, date],
  );
  const needed = data?.neededSeatsByClass || {};
  const neededText = Object.entries(needed).map(([cls, n]) => `${n} ${getSeatClassLabel(cls)}`).join(', ');

  const pickDate = (value) => {
    setDate(value);
    setNewTripId('');
    setSeatPlan({});
    setFreeSeats([]);
    setError('');
  };

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
    if (saving) return;
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    let reason = '';
    if (operatorCancelled) {
      reason = trip.tripCancelReason || 'Trip cancelled by the operator';
    } else {
      if (!reasonChoice) return setError('Please choose a reason for rescheduling.');
      reason = reasonChoice === 'Other' ? cleanReasonText(otherReason) : reasonChoice;
      const problem = validateReason(reason, 'reason for rescheduling');
      if (problem) return setError(problem);
    }
    if (!newTripId) return setError('Choose the new date and departure.');
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
      const chosen = (data?.options || []).find((o) => o.trip._id === newTripId);
      onDone?.(`Booking ${trip.bookingRef} moved to ${formatISODate(date)} at ${formatTime(chosen?.trip.departureAt)}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const from = trip?.from ? getDestination(trip.from) : null;
  const to = trip?.to ? getDestination(trip.to) : null;
  const reasons = asAdmin ? ADMIN_REASONS : USER_REASONS;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reschedule this trip"
      description={operatorCancelled
        ? 'This trip was cancelled by the operator. Pick a new departure at no extra cost.'
        : 'Move the booking to another departure on the same route.'}
      maxWidth="max-w-lg"
      footer={(
        <>
          <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            Keep Current Trip
          </button>
          <button type="button" onClick={handleConfirm} disabled={saving || loading} className="rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60">
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
              <span className="text-slate-500">Current schedule</span>
              <span className="text-right font-semibold text-slate-900">{formatISODate(trip.date)} · {trip.departure} – {trip.arrival}</span>
            </div>
            {neededText && (
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-slate-500">Paid for</span>
                <span className="text-right font-semibold text-slate-900">{neededText} seat{Object.values(needed).reduce((a, b) => a + b, 0) === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">New date (only dates with available seats)</span>
            {loading ? (
              <p className="text-sm text-slate-500">Checking available dates…</p>
            ) : dates.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                No upcoming departure on this route has room for this booking right now. Please check again later.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {dates.map((item) => (
                  <button
                    key={item.date}
                    type="button"
                    aria-pressed={date === item.date}
                    onClick={() => pickDate(item.date)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${date === item.date ? 'border-[#0056FF] bg-blue-50 text-[#0056FF]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {shortDate(item.date)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {dates.length > 0 && (
            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Available departures on {date ? formatISODate(date) : '—'}</span>
              <div className="space-y-2">
                {options.map((option) => {
                  const selected = newTripId === option.trip._id;
                  const seatInfo = trip.bookingType === 'passenger'
                    ? Object.keys(needed).map((cls) => `${option.availableSeatsByClass?.[cls] || 0} ${getSeatClassLabel(cls)} left`).join(' · ')
                    : `${Math.round(option.availableKg || 0).toLocaleString()} kg cargo space`;
                  return (
                    <button
                      key={option.trip._id}
                      type="button"
                      disabled={!option.canAccommodate}
                      onClick={() => choose(option)}
                      aria-pressed={selected}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${selected ? 'border-[#0056FF] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span className="font-semibold text-slate-900">
                        {formatTime(option.trip.departureAt)} – {formatTime(option.trip.arrivalAt)}
                        <span className="ml-2 text-xs font-normal text-slate-500">{option.trip.boat?.name}</span>
                      </span>
                      <span className="text-right text-xs text-slate-500">
                        {option.canAccommodate ? seatInfo : option.unavailableReason || 'Not available'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              <span className="mb-1 block text-xs font-semibold text-slate-600">Reason for rescheduling (required)</span>
              <select
                value={reasonChoice}
                onChange={(event) => { setReasonChoice(event.target.value); setError(''); }}
                className={selectClass}
              >
                <option value="">Select a reason…</option>
                {reasons.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {reasonChoice === 'Other' && (
                <textarea
                  value={otherReason}
                  onChange={(event) => { setOtherReason(event.target.value.slice(0, REASON_MAX)); setError(''); }}
                  rows={3}
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
              The fare stays the same. Seats are kept in the same class that was paid for
              {asAdmin ? '.' : ', and you can reschedule up to 4 hours before departure.'}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
