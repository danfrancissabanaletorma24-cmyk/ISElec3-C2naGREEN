import { useState } from 'react';
import Modal from './Modal';

const MIN_LENGTH = 5;
const MAX_LENGTH = 500;

/**
 * Asks for a refund reason (required). Calls onConfirm(reason) and shows any server error inline.
 * `amount` is already formatted by the caller.
 */
export default function RefundRequestDialog({ open, onClose, onConfirm, bookingRef, amount }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setReason('');
    setError('');
    onClose();
  };

  const submit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_LENGTH) {
      setError('Please tell us why you are requesting a refund.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(trimmed);
      setReason('');
    } catch (submitError) {
      setError(submitError.message || 'Could not send your refund request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Request a refund"
      description="Our team reviews every request. You will be notified of the decision."
      maxWidth="max-w-lg"
      footer={(
        <>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Submit request'}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <span className="text-slate-500">Booking {bookingRef}</span>
          <span className="font-bold text-[#0056FF]">{amount}</span>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Reason for the refund (required)</span>
          <textarea
            value={reason}
            onChange={(event) => { setReason(event.target.value.slice(0, MAX_LENGTH)); setError(''); }}
            rows={4}
            placeholder="e.g. I can no longer travel because…"
            aria-invalid={Boolean(error)}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-200 focus:border-[#0056FF] focus:ring-[#0056FF]/20'
            }`}
          />
          <span className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span>{error && <span role="alert" className="font-medium text-red-600">{error}</span>}</span>
            <span>{reason.length}/{MAX_LENGTH}</span>
          </span>
        </label>
        <p className="text-xs text-slate-500">
          If approved, your booking is cancelled and the amount is returned to your original payment method.
        </p>
      </div>
    </Modal>
  );
}
