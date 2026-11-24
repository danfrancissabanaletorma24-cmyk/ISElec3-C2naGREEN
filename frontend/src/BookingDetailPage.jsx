// src/BookingDetailPage.jsx  -  one booking: trip, passengers, payment, invoice and the actions the rules allow
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CheckCircle, Download, Ticket, XCircle } from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import PaymentConfirmationModal from './customer/PaymentConfirmationModal';
import Toast from './customer/Toast';
import CancelTripDialog from './customer/CancelTripDialog';
import RescheduleTripDialog from './customer/RescheduleTripDialog';
import RefundStatusCard from './customer/RefundStatusCard';
import { statusBadge } from './MyBookingsPage';
import { useAuth } from './auth/AuthContext';
import { useCurrency } from './currency/CurrencyContext';
import { apiRequest } from './api';
import { mapBooking } from './data/bookings';
import { getDestination, formatISODate, formatDateTime, FARE_CATEGORY_LABELS, getSeatClassLabel } from './data/customerData';

const METHOD_LABELS = {
  cash: 'Cash at the port counter',
  gcash: 'GCash',
  maya: 'Maya',
  card: 'Credit / Debit Card',
  bank_transfer: 'Bank Transfer',
};

async function downloadInvoicePdf(booking, invoice) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const from = getDestination(booking.from);
  const to = getDestination(booking.to);
  doc.setFillColor(0, 86, 255);
  doc.rect(0, 0, 595, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('LayagExpress', 40, 45);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice', 40, 65);
  doc.text(invoice.invoiceNumber, 555, 50, { align: 'right' });
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${from.city} > ${to.city}  |  ${booking.ship}`, 40, 130);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${formatISODate(booking.date)}  ${booking.departure} - ${booking.arrival}   |   Booking ${booking.bookingRef}`, 40, 148);
  let y = 185;
  invoice.items.forEach((item) => {
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(item.description, 380), 40, y);
    doc.text(`PHP ${item.amount.toLocaleString()}`, 555, y, { align: 'right' });
    y += 24;
  });
  doc.setDrawColor(203, 213, 225);
  doc.line(40, y, 555, y);
  y += 22;
  doc.text('Subtotal', 40, y); doc.text(`PHP ${invoice.subtotal.toLocaleString()}`, 555, y, { align: 'right' });
  if (invoice.discountTotal > 0) { y += 18; doc.text('Discounts', 40, y); doc.text(`- PHP ${invoice.discountTotal.toLocaleString()}`, 555, y, { align: 'right' }); }
  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', 40, y); doc.text(`PHP ${invoice.total.toLocaleString()}`, 555, y, { align: 'right' });
  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { token } = useAuth();
  const { format } = useCurrency();
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({ storageKey: 'travezia.customer.sidebarCollapsed' });

  const [booking, setBooking] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(() => {
    const state = location.state;
    if (!state?.justBooked) return '';
    if (state.paid) return 'Payment received. Your ticket is ready.';
    if (state.paymentMethod === 'bank_transfer') return 'Bank transfer proof submitted. Awaiting verification.';
    return state.paymentChannel === 'physical'
      ? 'Seats reserved. Pay at the port counter to confirm your ticket.'
      : '';
  });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [payPromptOpen, setPayPromptOpen] = useState(false);
  const [payPromptDismissed, setPayPromptDismissed] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await apiRequest(`/bookings/${id}`, { token });
      setBooking(mapBooking(raw));
      setInvoice(await apiRequest(`/invoices/booking/${id}`, { token }).catch(() => null));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (reason) => {
    try {
      await apiRequest(`/bookings/${id}/cancel`, { token, method: 'PATCH', body: { reason } });
      setToast(booking.paidOnline
        ? 'Booking cancelled. Your refund request was sent and is being processed.'
        : booking.paid ? 'Booking cancelled. Your refund is being processed.' : 'Booking cancelled.');
    } catch (e) {
      setToast(e.message);
    }
    setCancelOpen(false);
    load();
  };

  const handlePayNow = async (verificationCode) => {
    setPaying(true);
    try {
      await apiRequest(`/payments/${booking.payment._id}/pay-online`, {
        token,
        method: 'POST',
        body: { verificationCode },
      });
      setPayPromptOpen(false);
      setPayPromptDismissed(true);
      setToast('Payment received. Your ticket is ready.');
      load();
    } catch (e) {
      setToast(e.message);
    } finally {
      setPaying(false);
    }
  };

  const from = booking ? getDestination(booking.from) : null;
  const to = booking ? getDestination(booking.to) : null;
  const badge = booking ? statusBadge(booking) : null;
  const payment = booking?.payment;

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">
      <CustomerSidebar open={mobileOpen} onClose={closeMobile} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      <main className="flex flex-1 flex-col">
        <CustomerHeader title="Booking" subtitle={booking ? booking.bookingRef : 'Booking details'} onOpenMenu={openMobile} />
        <div className="px-4 md:px-8 pb-10 w-full max-w-[1000px] mx-auto">
          <Link to="/bookings" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0056FF]">
            <ArrowLeft className="h-4 w-4" /> All bookings
          </Link>

          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {!booking && !error && <p className="text-sm text-slate-500">Loading booking…</p>}

          {booking && (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src={booking.image} alt={booking.ship} className="h-40 w-full object-cover" />
                <div className="p-6">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{from.city} → {to.city}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.style}`}>{badge.label}</span>
                  </div>
                  <p className="text-sm text-slate-600">{booking.ship}{booking.operator ? ` · ${booking.operator}` : ''} · {booking.shipType}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatISODate(booking.date)} · {booking.departure} – {booking.arrival}</p>

                  {booking.needsReschedule && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-bold">Your trip was cancelled{booking.tripCancelReason ? `: ${booking.tripCancelReason}` : ''}.</p>
                      <p className="mt-1">Choose a new departure at no extra cost, or cancel for a refund.</p>
                    </div>
                  )}
                  {booking.status === 'cancelled' && (
                    <div className="mt-3 text-sm text-slate-500">
                      <p>
                        Cancelled by {booking.cancelledBy === 'admin' ? 'the operator (admin)' : booking.cancelledBy === 'user' ? 'you' : 'the system'}
                        {booking.cancelledAt ? ` · ${formatDateTime(booking.cancelledAt)}` : ''}
                      </p>
                      {booking.cancelReason && <p className="mt-1">Reason: {booking.cancelReason}</p>}
                    </div>
                  )}

                  {booking.rescheduleHistory?.length > 0 && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Reschedule history</p>
                      <ul className="mt-2 space-y-2 text-blue-900">
                        {booking.rescheduleHistory.map((item, index) => (
                          <li key={index} className="rounded-lg bg-white/70 px-3 py-2 text-xs">
                            <p className="font-semibold">
                              {item.fromAt ? formatDateTime(item.fromAt) : 'Previous schedule'}
                              {' → '}
                              {item.toAt ? formatDateTime(item.toAt) : 'New schedule'}
                            </p>
                            <p>Moved by {item.by === 'admin' ? 'the operator' : 'you'}{item.at ? ` · ${formatDateTime(item.at)}` : ''}</p>
                            {item.reason && <p className="mt-0.5 text-blue-800">{item.reason}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {booking.paid && booking.status !== 'cancelled' && (
                      <Link to="/tickets" className="flex items-center gap-2 rounded-xl bg-[#0056FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"><Ticket className="h-4 w-4" /> View tickets</Link>
                    )}
                    {booking.awaitingPayment && payment?.channel === 'online' && payment?.method !== 'bank_transfer' && (
                      <button type="button" onClick={() => setPayPromptOpen(true)} disabled={paying} className="rounded-xl bg-[#0056FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
                        Pay {format(booking.price)} now
                      </button>
                    )}
                    {(booking.canReschedule || booking.needsReschedule) ? (
                      <button type="button" onClick={() => setRescheduleOpen(true)} className="flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-[#0056FF] hover:bg-blue-50"><CalendarClock className="h-4 w-4" /> Reschedule trip</button>
                    ) : booking.cancelLockedReason && (
                      <button type="button" disabled title={booking.cancelLockedReason} className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400"><CalendarClock className="h-4 w-4" /> Reschedule trip</button>
                    )}
                    {(booking.canCancel || booking.needsReschedule) && (
                      <button type="button" onClick={() => setCancelOpen(true)} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><XCircle className="h-4 w-4" /> {booking.paidOnline ? 'Cancel & refund' : 'Cancel booking'}</button>
                    )}
                  </div>
                  {booking.cancelLockedReason && <p className="mt-3 text-xs text-slate-400">{booking.cancelLockedReason}</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-base font-bold text-slate-900">{booking.bookingType === 'cargo' ? 'Cargo' : 'Passengers'}</h3>
                {booking.bookingType === 'cargo' ? (
                  booking.tickets.map((t) => (
                    <div key={t._id} className="text-sm text-slate-700">
                      <p className="font-semibold">{t.cargo?.description} · {t.cargo?.weightKg} kg</p>
                      {t.seatNumber && <p className="text-slate-500">VIP seat: {t.seatNumber} · {format(t.cargo?.vipSeatPrice || 0)}</p>}
                      {t.cargo?.recipientName && <p className="text-slate-500">Recipient: {t.cargo.recipientName} {t.cargo.recipientContact}</p>}
                      <p className="text-xs text-slate-400">Ticket {t.ticketNumber}</p>
                    </div>
                  ))
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {booking.tickets.map((t) => (
                      <li key={t._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                        <span className="font-semibold text-slate-800">{t.passenger?.firstName} {t.passenger?.lastName}</span>
                        <span className="text-slate-500">Seat {t.seatNumber} · {getSeatClassLabel(t.seatClass)} · {FARE_CATEGORY_LABELS[t.fareCategory]}</span>
                        <span className="font-semibold text-slate-800">{format(t.price)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-base font-bold text-slate-900">Payment</h3>
                  {payment ? (
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Method</dt>
                        <dd className="font-semibold">
                          {METHOD_LABELS[payment.method] || payment.method}
                          {payment.walletAccountLast4 ? ` · Wallet ending ${payment.walletAccountLast4}` : ''}
                          {payment.bankTransferReference ? ` · Ref ${payment.bankTransferReference}` : ''}
                        </dd>
                      </div>
                      <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-semibold capitalize">{payment.status.replace('_', ' ')}</dd></div>
                      {payment.method === 'bank_transfer' && payment.status === 'pending' && (
                        <div className="flex justify-between"><dt className="text-slate-500">Transfer proof</dt><dd className="font-semibold">Awaiting verification</dd></div>
                      )}
                      <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="font-semibold">{format(payment.amount)}</dd></div>
                      {payment.paidAt && <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="font-semibold">{formatDateTime(payment.paidAt)}</dd></div>}
                      {payment.transactionRef && <div className="flex justify-between"><dt className="text-slate-500">Reference</dt><dd className="font-semibold">{payment.transactionRef}</dd></div>}
                      {payment.status === 'pending' && payment.dueAt && <div className="flex justify-between"><dt className="text-slate-500">Pay before</dt><dd className="font-semibold">{formatDateTime(payment.dueAt)}</dd></div>}
                    </dl>
                  ) : <p className="text-sm text-slate-500">No payment record.</p>}
                  <RefundStatusCard refund={payment?.refund} className="mt-4" />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">Invoice</h3>
                    {invoice && (
                      <button type="button" onClick={() => downloadInvoicePdf(booking, invoice).catch(() => setToast('Could not create the PDF.'))} className="flex items-center gap-1.5 text-sm font-semibold text-[#0056FF] hover:underline">
                        <Download className="h-4 w-4" /> PDF
                      </button>
                    )}
                  </div>
                  {invoice ? (
                    <div className="space-y-2 text-sm">
                      <p className="text-xs text-slate-400">{invoice.invoiceNumber} · {formatDateTime(invoice.issuedAt)}</p>
                      {invoice.items.map((item, index) => (
                        <div key={index} className="flex justify-between gap-3"><span className="text-slate-600">{item.description}</span><span className="shrink-0 font-semibold">{format(item.amount)}</span></div>
                      ))}
                      {invoice.discountTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Discounts</span><span>−{format(invoice.discountTotal)}</span></div>}
                      <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Total</span><span>{format(invoice.total)}</span></div>
                    </div>
                  ) : <p className="text-sm text-slate-500">Invoice not available.</p>}
                </div>
              </div>

              {booking.status !== 'cancelled' && booking.paid && (
                <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle className="h-4 w-4" /> Paid. Show your QR ticket at boarding.</p>
              )}
            </div>
          )}
        </div>
      </main>

      {booking && rescheduleOpen && (
        <RescheduleTripDialog trip={booking} open onClose={() => setRescheduleOpen(false)} onDone={(message) => { setRescheduleOpen(false); setToast(message); load(); }} />
      )}
      <PaymentConfirmationModal
        open={(payPromptOpen || (location.state?.justBooked && !payPromptDismissed))
          && Boolean(booking?.awaitingPayment && payment?.channel === 'online' && payment?.method !== 'bank_transfer')}
        onClose={() => {
          setPayPromptOpen(false);
          setPayPromptDismissed(true);
        }}
        onConfirm={handlePayNow}
        method={payment?.method}
        identifier={payment?.cardAccountLast4
          ? `${payment.cardBrand || 'Card'} ending ${payment.cardAccountLast4}`
          : payment?.walletAccountLast4
            ? `ending ${payment.walletAccountLast4}`
            : ''}
        amount={booking ? format(booking.price) : ''}
        processing={paying}
      />
      <CancelTripDialog ticket={booking} open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancel} />
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
