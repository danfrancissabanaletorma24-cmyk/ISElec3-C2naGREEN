const STATUS = {
  requested: { label: 'Refund requested', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  refunded: { label: 'Refunded', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'Refund declined', tone: 'bg-red-50 text-red-700 ring-red-200' },
};

const when = (value) => (value
  ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : '');

/**
 * Shows a payment's refund request / decision with BOTH reasons: the customer's and the admin's.
 * Shared by the customer booking page and the admin bookings page.
 */
export default function RefundStatusCard({ refund, className = '' }) {
  if (!refund?.status) return null;
  const status = STATUS[refund.status] || STATUS.requested;
  const requester = refund.requestedBy === 'admin' ? 'Admin' : 'Customer';

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-slate-900">Refund</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.tone}`}>{status.label}</span>
      </div>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {requester}&apos;s reason{refund.requestedAt ? ` · ${when(refund.requestedAt)}` : ''}
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{refund.reason || 'No reason given.'}</dd>
        </div>
        {refund.adminReason && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Admin&apos;s reason{refund.processedAt ? ` · ${when(refund.processedAt)}` : ''}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{refund.adminReason}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
