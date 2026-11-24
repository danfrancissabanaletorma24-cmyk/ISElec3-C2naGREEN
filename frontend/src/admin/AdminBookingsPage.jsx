
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Filter, X, CalendarDays, Ship, MapPin, CreditCard,
  CheckCircle2, XCircle, RotateCcw, ChevronLeft, ChevronRight,
  Armchair, CalendarClock, Trash2,
} from 'lucide-react';
import { apiRequest } from '../api';
import { currency } from '../data/adminData';
import { loadAllAdminBookings } from './adminBookingData';
import { useAuth } from '../auth/AuthContext';
import RescheduleTripDialog from '../customer/RescheduleTripDialog';
import RefundStatusCard from '../customer/RefundStatusCard';
import Modal from '../customer/Modal';
import Toast from '../customer/Toast';
import StatusBadge from './components/StatusBadge';
import { validateReason, cleanReasonText } from '../customer/reasons';

const ADMIN_CANCEL_REASONS = ['Bad weather', 'Vessel maintenance', 'Schedule change by the operator', 'Duplicate booking', 'Other'];

const whenText = (value) => (value
  ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : '');

const REFUND_REQUESTS = 'Refund requests';

const STATUS_TABS = [
  'All',
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
  REFUND_REQUESTS,
  'Refunded',
];

const PAGE_SIZE = 8;

const SUMMARY_STATUSES = [
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
  'Refunded',
];

const SORTS = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  departure: (a, b) => new Date(a.departureAt) - new Date(b.departureAt),
  amount: (a, b) => b.amount - a.amount,
};

// A booking can be deleted once it is cancelled or its refund was approved, and no refund is still waiting.
const canDeleteBooking = (booking) => (
  (
    booking.status === 'Cancelled' &&
    !['paid', 'refund_pending'].includes(booking.paymentStatus)
  ) ||
  booking.status === 'Completed' ||
  booking.status === 'Refunded'
);

export default function AdminBookingsPage() {
  const { token } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [notice, setRescheduleNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [loadingProof, setLoadingProof] = useState(false);
  // refund dialog: { booking, decision: 'approve' | 'reject' }
  const [refundDialog, setRefundDialog] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  // cancel dialog: the booking being cancelled by an admin (a valid reason is required)
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelChoice, setCancelChoice] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  // delete dialog: the booking being permanently deleted
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState('');

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setLoadError('');

    loadAllAdminBookings(token)
      .then((items) => {
        if (active) setBookings(items);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Calculate the number of bookings under each status.
  const counts = useMemo(() => {
    return Object.fromEntries([
      ['All', bookings.length],
      [REFUND_REQUESTS, bookings.filter((booking) => booking.paymentStatus === 'refund_pending').length],
      ...SUMMARY_STATUSES.map((status) => [
        status,
        bookings.filter((booking) => (
          status === 'Refunded'
            ? booking.paymentStatus === 'refunded'
            : booking.status === status
        )).length,
      ]),
    ]);
  }, [bookings]);

  // Filter and sort bookings.
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return bookings
      .filter((booking) => (
        tab === 'All' ||
        (
          tab === REFUND_REQUESTS
            ? booking.paymentStatus === 'refund_pending'
            : tab === 'Refunded'
              ? booking.paymentStatus === 'refunded'
              : booking.status === tab
        )
      ))
      .filter((booking) => !term || booking.searchText.includes(term))
      .sort(SORTS[sort]);
  }, [bookings, tab, query, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const selected =
    bookings.find((booking) => booking.id === selectedId) ?? null;

  // Reload bookings after an administrator action.
  const refreshBookings = async () => {
    const items = await loadAllAdminBookings(token);
    setBookings(items);
  };

  // Confirm payment, cancel booking, or process refund.
  const updateStatus = async (id, status) => {
    const booking = bookings.find((item) => item.id === id);

    if (!booking) return;

    setActionError('');

    try {
      if (status === 'Confirmed') {
        if (
          (
            booking.paymentChannel !== 'physical' &&
            booking.paymentMethod !== 'bank_transfer'
          ) ||
          booking.paymentStatus !== 'pending'
        ) {
          throw new Error(
            'Only pending counter payments or bank transfers can be confirmed by an administrator.'
          );
        }

        await apiRequest(`/payments/${booking.paymentId}/confirm`, {
          token,
          method: 'PATCH',
          body: {},
        });
      }

      await refreshBookings();
    } catch (error) {
      setActionError(error.message);
    }
  };

  const openCancelDialog = (booking) => {
    setCancelTarget(booking);
    setCancelChoice('');
    setCancelOther('');
    setCancelError('');
  };

  const closeCancelDialog = () => {
    if (isCancelling) return;
    setCancelTarget(null);
  };

  // Cancel a booking as an administrator. The reason is saved and shown in the booking details and to the customer.
  const submitCancel = async () => {
    if (!cancelChoice) { setCancelError('Please choose a reason for cancelling.'); return; }
    const reason = cancelChoice === 'Other' ? cleanReasonText(cancelOther) : cancelChoice;
    const problem = validateReason(reason, 'reason for cancelling');
    if (problem) { setCancelError(problem); return; }
    setIsCancelling(true);
    setCancelError('');
    try {
      await apiRequest(`/bookings/${cancelTarget.rawId}/cancel`, { token, method: 'PATCH', body: { reason } });
      setCancelTarget(null);
      setActionError('');
      await refreshBookings();
    } catch (error) {
      setCancelError(error.message || 'Could not cancel this booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  const openDeleteDialog = (booking) => {
    setDeleteTarget(booking);
    setDeleteError('');
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  // Permanently delete a cancelled or refunded booking and everything linked to it.
  const submitDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await apiRequest(`/bookings/${encodeURIComponent(deleteTarget.rawId)}`, {
        token,
        method: 'DELETE',
        body: {
          bookingId: deleteTarget.rawId,
          bookingReference: deleteTarget.bookingRef,
        },
      });
      setBookings((current) => current.filter((item) => item.rawId !== deleteTarget.rawId));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      setActionError('');
      setNotice('Booking deleted.');
      setDeleteToast(`Booking ${deleteTarget.bookingRef} was permanently deleted.`);
      await refreshBookings();
    } catch (error) {
      setDeleteError(error.message || 'Could not delete this booking.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openRefundDialog = (booking, decision) => {
    setRefundDialog({ booking, decision });
    setRefundReason('');
    setRefundError('');
    setActionNotice('');
  };

  const closeRefundDialog = () => {
    if (isRefunding) return;
    setRefundDialog(null);
    setRefundReason('');
    setRefundError('');
  };

  // Approve / reject a customer's refund request, or refund a paid booking directly. A reason is required.
  const submitRefund = async () => {
    const reason = refundReason.trim();
    if (reason.length < 5) {
      setRefundError('Please give a reason (at least 5 characters). The customer can read it.');
      return;
    }
    setIsRefunding(true);
    setRefundError('');
    try {
      const updatedPayment = await apiRequest(`/payments/${refundDialog.booking.paymentId}/refund`, {
        token,
        method: 'PATCH',
        body: { reason, decision: refundDialog.decision },
      });
      if (refundDialog.decision === 'approve') {
        setBookings((current) => current.map((item) => (
          item.paymentId === refundDialog.booking.paymentId
            ? {
                ...item,
                paymentStatus: 'refunded',
                status: 'Refunded',
                refunded: true,
                refund: updatedPayment?.refund?.status
                  ? updatedPayment.refund
                  : { status: 'refunded' },
              }
            : item
        )));
      }
      setRefundDialog(null);
      setRefundReason('');
      setActionError('');
      setSelectedId(null);
      setActionNotice(refundDialog.decision === 'reject'
        ? 'Refund request declined. The customer was notified.'
        : 'Refund successful. The customer was notified.');
      setNotice(refundDialog.decision === 'reject'
        ? 'Refund request declined. The customer was notified.'
        : 'Refund successful. The customer was notified.');
      await refreshBookings();
    } catch (error) {
      setRefundError(error.message || 'Could not process this refund.');
    } finally {
      setIsRefunding(false);
    }
  };

  // Open the uploaded bank transfer proof.
  const viewTransferProof = async () => {
    if (!selected?.paymentId) {
      setActionError('Payment ID is missing.');
      return;
    }

    // Open the new tab immediately to avoid popup blockers.
    const preview = window.open('about:blank', '_blank');

    if (!preview) {
      setActionError('Allow pop-ups to view the transfer proof.');
      return;
    }

    preview.opener = null;

    preview.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loading transfer proof</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #475569;
            }
          </style>
        </head>
        <body>
          <p>Loading transfer proof...</p>
        </body>
      </html>
    `);

    setLoadingProof(true);
    setActionError('');

    try {
      // Retrieve the payment, including the uploaded proof.
      const payment = await apiRequest(
        `/payments/${selected.paymentId}`,
        { token }
      );

      const proofData = payment?.bankTransferProofDataUrl;

      if (!proofData || !proofData.startsWith('data:')) {
        throw new Error(
          'Transfer proof is missing or unavailable. Please check the uploaded file.'
        );
      }

      // Convert the Base64 data URL into a Blob.
      const response = await fetch(proofData);

      if (!response.ok) {
        throw new Error(
          'Unable to read the uploaded transfer proof.'
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error('The uploaded transfer proof is empty.');
      }

      // Only allow supported image and PDF files.
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
      ];

      if (!allowedTypes.includes(blob.type)) {
        throw new Error('Unsupported transfer proof file type.');
      }

      // Create a temporary browser URL for the uploaded file.
      const fileUrl = URL.createObjectURL(blob);

      // Open the actual file in the new tab.
      preview.location.replace(fileUrl);
    } catch (error) {
      if (!preview.closed) {
        preview.close();
      }

      setActionError(
        error.message || 'Unable to open the transfer proof.'
      );
    } finally {
      setLoadingProof(false);
    }
  };

  const handleRescheduleDone = async (message) => {
    setRescheduleTarget(null);
    setRescheduleNotice(message);
    await refreshBookings();
  };

  const resetFilters = () => {
    setTab('All');
    setQuery('');
    setSort('newest');
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {SUMMARY_STATUSES.map((status) => (
          <div
            key={status}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {status}
            </p>

            <p className="mt-1.5 text-2xl font-bold text-slate-900">
              {counts[status] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:p-6">

          {/* Status tabs */}
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1.5">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setTab(status);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  tab === status
                    ? 'bg-white text-[#0056FF] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {status}

                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    tab === status
                      ? 'bg-blue-50 text-[#0056FF]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {counts[status] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search and sorting */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by booking ID, passenger, route or vessel…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#0056FF] focus:bg-white focus:ring-2 focus:ring-[#0056FF]/15"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-slate-600 outline-none focus:border-[#0056FF]"
                >
                  <option value="newest">Newest first</option>
                  <option value="departure">Departure date</option>
                  <option value="amount">Highest amount</option>
                </select>
              </div>

              <button
                onClick={resetFilters}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {notice && (
          <p className="mx-5 mt-4 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200 md:mx-6">
            {notice}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-semibold">Booking</th>
                <th className="px-3 py-3 font-semibold">Passenger</th>
                <th className="px-3 py-3 font-semibold">Route</th>
                <th className="px-3 py-3 font-semibold">Departure</th>
                <th className="px-3 py-3 font-semibold">Payment</th>
                <th className="px-3 py-3 font-semibold">Amount</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-500">
                    Loading bookings from the database…
                  </td>
                </tr>
              )}

              {!isLoading && loadError && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-sm text-red-600">
                    Could not load bookings: {loadError}
                  </td>
                </tr>
              )}

              {!isLoading && !loadError && visible.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {booking.bookingRef}
                  </td>

                  <td className="px-3 py-4">
                    <p className="font-medium text-slate-700">
                      {booking.passenger}
                    </p>
                    <p className="text-xs text-slate-400">
                      {booking.email}
                    </p>
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    {booking.route}
                  </td>

                  <td className="px-3 py-4">
                    <p className="text-slate-700">{booking.date}</p>
                    <p className="text-xs text-slate-400">{booking.time}</p>
                  </td>

                  <td className="px-3 py-4 text-slate-600">
                    {booking.payment}
                  </td>

                  <td className="px-3 py-4 font-semibold text-slate-800">
                    {currency(booking.amount)}
                  </td>

                  <td className="px-3 py-4">
                    <StatusBadge status={booking.status} />
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">

                      {booking.status !== 'Cancelled' &&
                        booking.status !== 'Completed' &&
                        booking.status !== 'Refunded' && (
                          <button
                            onClick={() => {
                              setActionError('');
                              setRescheduleTarget(booking.rescheduleTrip);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-[#0056FF] transition-colors hover:bg-blue-50"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            Reschedule
                          </button>
                        )}

                      {canDeleteBooking(booking) && (
                        <button
                          onClick={() => {
                            setActionError('');
                            openDeleteDialog(booking);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setActionError('');
                          setActionNotice('');
                          setSelectedId(booking.id);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0056FF] transition-colors hover:border-[#0056FF]/40 hover:bg-blue-50"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && !loadError && visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-500">
                    No bookings match your filters.

                    <button
                      onClick={resetFilters}
                      className="ml-2 font-semibold text-[#0056FF] hover:underline"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row">
          <p className="text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} bookings
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((number) => (
              <button
                key={number}
                onClick={() => setPage(number)}
                className={`h-9 w-9 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === number
                    ? 'bg-[#0056FF] text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {number}
              </button>
            ))}

            <button
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6 animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl animate-modal-in">

            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Booking details
                </p>

                <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                  {selected.bookingRef}
                </h3>
              </div>

              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">

              {/* Customer details */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {selected.passenger}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selected.email}
                  </p>
                </div>

                <StatusBadge status={selected.status} />
              </div>

              {/* Booking information */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailRow
                  icon={MapPin}
                  label="Route"
                  value={selected.route}
                />

                <DetailRow
                  icon={CalendarDays}
                  label="Departure"
                  value={`${selected.date} · ${selected.time}`}
                />

                <DetailRow
                  icon={Ship}
                  label="Vessel"
                  value={selected.vessel}
                />

                <DetailRow
                  icon={Armchair}
                  label="Seats / cargo"
                  value={selected.seatDetails}
                />

                <DetailRow
                  icon={CreditCard}
                  label="Payment"
                  value={selected.payment}
                />

                <DetailRow
                  icon={CalendarDays}
                  label="Booked on"
                  value={selected.bookedAt}
                />
              </div>

              {/* Bank transfer details and proof */}
              {selected.paymentMethod === 'bank_transfer' && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
                  <p>
                    <span className="text-slate-500">Sender:</span>{' '}
                    <span className="font-semibold">
                      {selected.bankTransferSenderName}
                    </span>
                  </p>

                  <p>
                    <span className="text-slate-500">Bank:</span>{' '}
                    <span className="font-semibold">
                      {selected.bankTransferSenderBank}
                    </span>
                  </p>

                  <p>
                    <span className="text-slate-500">Reference:</span>{' '}
                    <span className="font-semibold">
                      {selected.bankTransferReference}
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={viewTransferProof}
                    disabled={loadingProof || !selected.paymentId}
                    className="text-sm font-semibold text-[#0056FF] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingProof
                      ? 'Loading proof…'
                      : `View proof${
                          selected.bankTransferProofFileName
                            ? `: ${selected.bankTransferProofFileName}`
                            : ''
                        }`}
                  </button>
                </div>
              )}

              {/* Total amount */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <span className="text-sm font-medium text-slate-500">
                  Total amount
                </span>

                <span className="text-xl font-bold text-slate-900">
                  {currency(selected.amount)}
                </span>
              </div>

              {(selected.status === 'Cancelled' || selected.status === 'Refunded' || selected.status === 'Reschedule pending' || selected.rescheduleHistory.length > 0) && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  {(selected.status === 'Cancelled' || selected.status === 'Refunded') && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cancelled by {selected.cancelledBy === 'admin' ? 'administrator' : selected.cancelledBy === 'user' ? 'customer' : 'the system'}
                        {selected.cancelledAt ? ` · ${whenText(selected.cancelledAt)}` : ''}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{selected.cancelReason || 'No reason was recorded for this older cancellation.'}</p>
                    </div>
                  )}
                  {selected.tripCancelReason && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trip cancelled by the operator</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{selected.tripCancelReason}</p>
                    </div>
                  )}
                  {selected.rescheduleHistory.map((item, index) => (
                    <div key={index}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Rescheduled by {item.by === 'admin' ? 'administrator' : 'customer'}{item.at ? ` · ${whenText(item.at)}` : ''}
                      </p>
                      {item.fromAt && item.toAt && (
                        <p className="mt-0.5 text-xs text-slate-500">{whenText(item.fromAt)} → {whenText(item.toAt)}</p>
                      )}
                      <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{item.reason || 'No reason given.'}</p>
                    </div>
                  ))}
                </div>
              )}

              <RefundStatusCard refund={selected.refund} />

              {/* Action error */}
              {actionError && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600"
                >
                  {actionError}
                </p>
              )}

              {actionNotice && (
                <p
                  role="status"
                  className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700"
                >
                  {actionNotice}
                </p>
              )}

              {/* Booking actions */}
              <div className="flex flex-col gap-2 sm:flex-row">

                {selected.status !== 'Cancelled' &&
                  selected.status !== 'Completed' &&
                  selected.status !== 'Refunded' && (
                    <button
                      onClick={() => setRescheduleTarget(selected.rescheduleTrip)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 py-2.5 text-sm font-semibold text-[#0056FF] transition-colors hover:bg-blue-50"
                    >
                      <CalendarClock className="h-4 w-4" />
                      Reschedule
                    </button>
                  )}

                {/* Confirm payment only for pending eligible payments. */}
                {selected.status !== 'Cancelled' &&
                  selected.status !== 'Completed' &&
                  selected.status !== 'Confirmed' &&
                  selected.paymentStatus === 'pending' &&
                  (
                    selected.paymentChannel === 'physical' ||
                    selected.paymentMethod === 'bank_transfer'
                  ) && (
                    <button
                      onClick={() => updateStatus(selected.id, 'Confirmed')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0056FF] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {selected.paymentMethod === 'bank_transfer'
                        ? 'Confirm bank transfer'
                        : 'Confirm counter payment'}
                    </button>
                  )}

                {selected.status !== 'Cancelled' &&
                  selected.status !== 'Completed' &&
                  selected.status !== 'Refunded' && (
                    <button
                      onClick={() => openCancelDialog(selected)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </button>
                  )}

                {/* Refunds: approve a request, decline it, or refund a paid booking directly. */}
                {selected.paymentStatus === 'refund_pending' && (
                  <button
                    onClick={() => openRefundDialog(selected, 'approve')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Approve refund
                  </button>
                )}
                {selected.paymentStatus === 'refund_pending' &&
                  selected.refund?.status === 'requested' && (
                    <button
                      onClick={() => openRefundDialog(selected, 'reject')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>
                  )}
                {selected.paymentStatus === 'paid' &&
                  selected.status === 'Cancelled' && (
                    <button
                      onClick={() => openRefundDialog(selected, 'approve')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Approve refund
                    </button>
                  )}
                {selected.paymentStatus === 'paid' &&
                  selected.status !== 'Completed' &&
                  selected.status !== 'Cancelled' && (
                    <button
                      onClick={() => openRefundDialog(selected, 'approve')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Refund
                    </button>
                  )}

                {canDeleteBooking(selected) && (
                  <button
                    onClick={() => openDeleteDialog(selected)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund dialog */}
      <Modal
        open={Boolean(refundDialog)}
        onClose={closeRefundDialog}
        title={refundDialog?.decision === 'reject' ? 'Decline refund request' : 'Refund this booking'}
        description={refundDialog ? `${refundDialog.booking.bookingRef} · ${currency(refundDialog.booking.amount)}` : ''}
        maxWidth="max-w-lg"
        footer={(
          <>
            <button
              type="button"
              onClick={closeRefundDialog}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submitRefund}
              disabled={isRefunding}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-wait disabled:opacity-60 ${
                refundDialog?.decision === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isRefunding ? 'Saving…' : refundDialog?.decision === 'reject' ? 'Decline request' : 'Confirm refund'}
            </button>
          </>
        )}
      >
        {refundDialog && (
          <div className="space-y-4">
            {refundDialog.booking.refund?.reason && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {refundDialog.booking.refund.requestedBy === 'admin' ? "Admin's" : "Customer's"} reason
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{refundDialog.booking.refund.reason}</p>
              </div>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">
                {refundDialog.decision === 'reject' ? 'Reason for declining (required)' : 'Reason for the refund (required)'}
              </span>
              <textarea
                value={refundReason}
                onChange={(event) => { setRefundReason(event.target.value.slice(0, 500)); setRefundError(''); }}
                rows={4}
                placeholder={refundDialog.decision === 'reject' ? 'Explain why this request cannot be refunded…' : 'e.g. Trip cancelled due to bad weather…'}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
              />
              {refundError && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{refundError}</span>}
            </label>
            {refundDialog.decision !== 'reject' && (
              <p className="text-xs text-slate-500">
                The booking will be cancelled, its seats released, and the customer will see your reason.
              </p>
            )}
            {refundDialog.decision === 'reject' && (
              <p className="text-xs text-slate-500">
                If the booking was already cancelled, declining reopens it and re-holds its seats. This is blocked if the trip already departed or the seats were taken.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel dialog */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={closeCancelDialog}
        title="Cancel this booking"
        description={cancelTarget ? `${cancelTarget.bookingRef} · ${cancelTarget.passenger}` : ''}
        maxWidth="max-w-lg"
        footer={(
          <>
            <button type="button" onClick={closeCancelDialog} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">Back</button>
            <button type="button" onClick={submitCancel} disabled={isCancelling} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60">
              {isCancelling ? 'Cancelling…' : 'Cancel booking'}
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Reason (required, the customer can read it)</span>
            <select value={cancelChoice} onChange={(event) => { setCancelChoice(event.target.value); setCancelError(''); }} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20">
              <option value="">Select a reason…</option>
              {ADMIN_CANCEL_REASONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {cancelChoice === 'Other' && (
              <textarea value={cancelOther} onChange={(event) => { setCancelOther(event.target.value.slice(0, 300)); setCancelError(''); }} rows={3} placeholder="Explain why this booking is cancelled…" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20" />
            )}
            {cancelError && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{cancelError}</span>}
          </label>
          <p className="text-xs text-slate-500">Seats are released. If the booking was paid, a refund is opened for it.</p>
        </div>
      </Modal>

      {/* Delete dialog */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={closeDeleteDialog}
        title="Delete this booking?"
        description={deleteTarget ? `${deleteTarget.bookingRef} · ${deleteTarget.passenger}` : ''}
        maxWidth="max-w-md"
        footer={(
          <>
            <button type="button" onClick={closeDeleteDialog} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={submitDelete} disabled={isDeleting} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60">
              {isDeleting ? 'Deleting…' : 'Delete permanently'}
            </button>
          </>
        )}
      >
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-slate-900">Are you sure you want to delete this? It cannot be restored.</p>
          <p className="text-slate-600">This also removes its tickets, payment and invoice records.</p>
          {deleteError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{deleteError}</p>}
        </div>
      </Modal>
      <Toast message={deleteToast} onClose={() => setDeleteToast('')} />

      {/* Reschedule dialog */}
      {rescheduleTarget && (
        <RescheduleTripDialog
          asAdmin
          trip={rescheduleTarget}
          open
          onClose={() => setRescheduleTarget(null)}
          onDone={handleRescheduleDone}
        />
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0056FF]">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="truncate text-sm font-medium text-slate-700" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}
