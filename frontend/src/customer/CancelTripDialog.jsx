import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { formatISODate, getDestination } from '../data/customerData';
import { REASON_MAX, cleanReasonText, validateReason } from './reasons';

const CANCEL_REASONS = [
  'Change of plans',
  'Found another trip',
  'Emergency',
  'Trip was cancelled by the operator',
  'Other',
];

/**
 * Cancellation confirmation used by the Dashboard, Tickets and Booking pages.
 * When the booking was paid online it is a "Cancel & refund": the refund request is sent with the cancellation.
 * Calls onConfirm(reason) only after a valid reason is given.
 */
export default function CancelTripDialog({ ticket, open, onClose, onConfirm }) {
  const [choice, setChoice] = useState('');
  const [other, setOther] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refund = Boolean(ticket?.paidOnline);

  const reset = () => { setChoice(''); setOther(''); setError(''); };
  const close = () => { if (busy) return; reset(); onClose(); };

  const from = ticket ? getDestination(ticket.from) : null;
  const to = ticket ? getDestination(ticket.to) : null;

  const handleConfirm = async () => {
    if (!choice) { setError('Please choose a reason for cancelling.'); return; }
    const reason = choice === 'Other' ? cleanReasonText(other) : choice;
    if (choice === 'Other') {
      const problem = validateReason(reason, 'reason');
      if (problem) { setError(problem); return; }
    }
    setBusy(true);
    try {
      await onConfirm(reason);
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={refund ? 'Cancel and request a refund?' : 'Cancel this trip?'}
      description="This action cannot be undone."
      maxWidth="max-w-lg"
      footer={(
        <>
          <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            Keep Trip
          </button>
          <button type="button" onClick={handleConfirm} disabled={busy} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60">
            {busy ? 'Cancelling…' : refund ? 'Cancel & Refund' : 'Yes, Cancel Trip'}
          </button>
        </>
      )}
    >
      {ticket && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Route</span>
              <span className="font-semibold text-slate-900">{from.city} ({from.code}) → {to.city} ({to.code})</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-500">Trip</span>
              <span className="font-semibold text-slate-900">{ticket.ship} • {formatISODate(ticket.date)} • {ticket.departure}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-500">Seats</span>
              <span className="font-semibold text-slate-900">{ticket.seats.length ? ticket.seats.join(', ') : ticket.passenger}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-500">Booking Ref</span>
              <span className="font-semibold text-slate-900">{ticket.bookingRef}</span>
            </div>
            {ticket.paid && (
              <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                <span className="text-slate-500">Refund amount</span>
                <span className="font-bold text-[#0056FF]">₱{ticket.price.toLocaleString()}</span>
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Reason for cancelling</span>
            <select
              value={choice}
              onChange={(event) => { setChoice(event.target.value); setError(''); }}
              aria-invalid={Boolean(error)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-[#0056FF] focus:ring-[#0056FF]/20'}`}
            >
              <option value="">Select a reason…</option>
              {CANCEL_REASONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {choice === 'Other' && (
              <textarea
                value={other}
                onChange={(event) => { setOther(event.target.value.slice(0, REASON_MAX)); setError(''); }}
                rows={3}
                placeholder="Tell us why you are cancelling"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
              />
            )}
            {error && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
          </label>

          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              {refund
                ? 'Your online payment will be refunded to your original payment method once the operator approves it. You can cancel up to 4 hours before departure.'
                : ticket.paid
                  ? 'You can cancel up to 4 hours before departure. Your refund is handled by the operator after cancellation.'
                  : 'You can cancel up to 4 hours before departure.'}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
