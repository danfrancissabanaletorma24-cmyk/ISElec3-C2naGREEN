import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ship, Ticket, Download,
  CheckCircle, Clock, XCircle, MapPin, CalendarClock, AlertTriangle,
} from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import Modal from './customer/Modal';
import Toast from './customer/Toast';
import CancelTripDialog from './customer/CancelTripDialog';
import RescheduleTripDialog from './customer/RescheduleTripDialog';
import QrImage, { qrDataUrl } from './customer/QrImage';
import useMyBookings from './hooks/useMyBookings';
import { useAuth } from './auth/AuthContext';
import { apiRequest } from './api';
import {
  getDestination, formatISODate, getSeatClassLabel, fullName,
} from './data/customerData';
import VoyageMapLazy from './customer/VoyageMapLazy';
import { getVoyageState } from './data/geo';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past Tickets' },
  { id: 'cancelled', label: 'Cancelled' },
];

const STATUS_META = {
  upcoming: {
    label: 'Confirmed',
    header: 'bg-[#0056FF]',
    icon: CheckCircle,
  },
  past: {
    label: 'Completed',
    header: 'bg-slate-700',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    header: 'bg-red-600',
    icon: XCircle,
  },
  refunded: {
    label: 'Refunded',
    header: 'bg-emerald-600',
    icon: CheckCircle,
  },
  awaiting: {
    label: 'Awaiting payment',
    header: 'bg-amber-500',
    icon: Clock,
  },
  operator: {
    label: 'Trip cancelled by operator',
    header: 'bg-amber-600',
    icon: AlertTriangle,
  },
};

const metaFor = (ticket) => {
  if (ticket.refundStatus === 'refunded') return STATUS_META.refunded;
  if (ticket.status === 'upcoming' && ticket.needsReschedule) return STATUS_META.operator;
  if (ticket.status === 'upcoming' && !ticket.paid) return STATUS_META.awaiting;
  return STATUS_META[ticket.status];
};

// one card per ticket (a booking with 3 passengers has 3 tickets, each with its own QR code)
function flattenTickets(bookings) {
  return bookings.flatMap((booking) => booking.tickets
    .filter((t) => booking.status === 'cancelled' || t.status !== 'cancelled')
    .map((t) => ({
      ...booking,
      ticketId: t._id,
      ticketNumber: t.ticketNumber,
      passenger: booking.bookingType === 'cargo' ? (t.cargo?.description || 'Cargo') : fullName(t.passenger),
      seats: t.seatNumber ? [t.seatNumber] : [],
      seatClass: booking.bookingType === 'cargo'
        ? (t.seatNumber ? `Cargo · ${getSeatClassLabel(t.seatClass)}` : 'Cargo')
        : getSeatClassLabel(t.seatClass),
      price: t.price,
    })));
}

function ticketRoute(ticket) {
  const from = getDestination(ticket.from);
  const to = getDestination(ticket.to);
  return { from, to };
}

async function downloadTicketPdf(ticket) {
  const { jsPDF } = await import('jspdf');
  const { from, to } = ticketRoute(ticket);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFillColor(0, 86, 255);
  doc.rect(0, 0, 595, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('LayagExpress', 40, 45);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('E-Ticket / Boarding Pass', 40, 65);
  doc.text(ticket.bookingRef, 555, 50, { align: 'right' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${from.city} (${from.code})  >  ${to.city} (${to.code})`, 40, 140);

  const rows = [
    ['Ship', `${ticket.ship} - ${ticket.shipType}`],
    ['Operator', ticket.operator || '-'],
    ['Passenger', ticket.passenger],
    ['Class', ticket.seatClass],
    ['Seat', ticket.seats.join(', ') || '-'],
    ['Date', formatISODate(ticket.date)],
    ['Departure', ticket.departure],
    ['Arrival', ticket.arrival],
    ['Ticket no.', ticket.ticketNumber],
    ['Fare', `PHP ${ticket.price.toLocaleString()}`],
  ];

  doc.setFontSize(12);
  let y = 190;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, 40, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), 160, y);
    y += 26;
  });

  doc.addImage(await qrDataUrl(ticket.ticketNumber, 300), 'PNG', 400, 170, 150, 150);

  doc.setDrawColor(203, 213, 225);
  doc.line(40, y + 6, 555, y + 6);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Please arrive at the terminal at least 1 hour before departure. Bring a valid ID.',
    40,
    y + 30,
  );

  doc.save(`ticket-${ticket.ticketNumber}.pdf`);
}

export default function TicketsPage() {
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return TABS.some((tab) => tab.id === requested) ? requested : 'upcoming';
  });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [trackTarget, setTrackTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [sort, setSort] = useState('newest');

  const { token } = useAuth();
  const { bookings, loading, error: loadError, reload } = useMyBookings();
  const tickets = useMemo(() => flattenTickets(bookings), [bookings]);

  const counts = useMemo(
    () => TABS.reduce((accumulator, tab) => {
      accumulator[tab.id] = tickets.filter((ticket) => ticket.status === tab.id).length;
      return accumulator;
    }, {}),
    [tickets],
  );

  const visibleTickets = useMemo(() => {
    const items = tickets.filter((ticket) => ticket.status === activeTab);
    if (activeTab === 'upcoming') return items;
    return [...items].sort((a, b) => {
      const aTime = new Date(a.departureAt || 0).getTime();
      const bTime = new Date(b.departureAt || 0).getTime();
      return sort === 'newest' ? bTime - aTime : aTime - bTime;
    });
  }, [tickets, activeTab, sort]);

  const handleDownload = async (ticket) => {
    try {
      await downloadTicketPdf(ticket);
      setToast(`Downloaded e-ticket ${ticket.bookingRef}`);
    } catch {
      setToast('Could not generate the PDF. Please try again.');
    }
  };

  const handleRescheduled = (message) => {
    setRescheduleTarget(null);
    setToast(message);
    reload();
  };

  const handleConfirmCancel = async (reason) => {
    if (!cancelTarget) return;
    try {
      await apiRequest(`/bookings/${cancelTarget.id}/cancel`, { token, method: 'PATCH', body: { reason } });
      setToast(cancelTarget.paid
        ? `Booking ${cancelTarget.bookingRef} cancelled. Your refund ${cancelTarget.paidOnline ? 'request was sent and ' : ''}is being processed.`
        : `Booking ${cancelTarget.bookingRef} cancelled.`);
      setActiveTab('cancelled');
      reload();
    } catch (e) {
      setToast(e.message);
    }
    setCancelTarget(null);
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">
      
      {/* ================= SIDEBAR ================= */}
      <CustomerSidebar
        open={mobileOpen}
        onClose={closeMobile}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex flex-1 flex-col">
        
        {/* Top Header */}
        <CustomerHeader
          title="Tickets"
          subtitle="Your e-tickets and booking passes"
          onOpenMenu={openMobile}
        />

        <div className="px-4 md:px-8 pb-10 w-full max-w-[1280px] mx-auto">
          
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-[#0056FF]" /> My E-Tickets
            </h1>
            <p className="text-slate-500 text-sm">Present these tickets upon boarding. You can download them or show the QR code on your phone.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-slate-200 pb-4" role="tablist" aria-label="Ticket filters">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[#0056FF] text-white font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 font-medium'
                  }`}
                >
                  {tab.label} ({counts[tab.id]})
                </button>
              );
            })}

            {activeTab !== 'upcoming' && (
              <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-500">
                Sort
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0056FF]"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            )}
          </div>

          {/* Tickets */}
          {loadError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Could not load your tickets: {loadError}</p>}
          {loading ? (
            <p className="text-sm text-slate-500">Loading your tickets…</p>
          ) : visibleTickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Ticket className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-900 mb-1">No tickets here</h2>
              <p className="text-sm text-slate-500">
                There are no {TABS.find((tab) => tab.id === activeTab)?.label.toLowerCase()} tickets yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleTickets.map((ticket) => {
                const status = metaFor(ticket);
                const StatusIcon = status.icon;
                const { from, to } = ticketRoute(ticket);
                const refund = ticket.payment?.refund || null;

                return (
                  <div
                    key={ticket.ticketId}
                    className="bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden relative"
                  >
                    {/* Top Status Bar */}
                    <div className={`${status.header} px-6 py-3 flex justify-between items-center text-white`}>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <StatusIcon className="w-4 h-4" /> {status.label}
                      </div>
                      <div className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full">
                        Booking Ref: {ticket.bookingRef}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row">
                      
                      {/* Left Side: Ticket Details */}
                      <div className="flex-1 p-8">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="bg-blue-50 p-3 rounded-xl">
                            <Ship className="w-8 h-8 text-[#0056FF]" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900">{ticket.ship}</h2>
                            <p className="text-sm text-slate-500">{ticket.shipType}{ticket.operator ? ` • ${ticket.operator}` : ''} • {ticket.seatClass}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">From</p>
                            <p className="font-bold text-lg">{from.city} ({from.code})</p>
                            <p className="text-sm text-slate-600 mt-1">{formatISODate(ticket.date)}</p>
                            <p className="text-sm font-semibold text-[#0056FF] mt-1">{ticket.departure}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">To</p>
                            <p className="font-bold text-lg">{to.city} ({to.code})</p>
                            <p className="text-sm text-slate-600 mt-1">{formatISODate(ticket.date)}</p>
                            <p className="text-sm font-semibold text-[#0056FF] mt-1">{ticket.arrival}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-6 border-t border-slate-200 pt-6">
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">Passenger</p>
                            <p className="font-semibold text-sm">{ticket.passenger}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">Seat Number</p>
                            <p className="font-semibold text-sm">{ticket.seats.join(', ') || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">Class</p>
                            <p className="font-semibold text-sm">{ticket.seatClass}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">Fare</p>
                            <p className="font-semibold text-sm">₱{ticket.price.toLocaleString()}</p>
                          </div>
                        </div>

                        {ticket.rescheduleHistory?.length > 0 && (
                          <div className="mt-6 border-t border-slate-200 pt-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Reschedule history</p>
                            <ul className="space-y-2">
                              {ticket.rescheduleHistory.map((item, index) => (
                                <li key={index} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                  <p className="font-semibold text-slate-800">
                                    {item.fromAt ? new Date(item.fromAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Previous schedule'}
                                    {' → '}
                                    {item.toAt ? new Date(item.toAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'New schedule'}
                                  </p>
                                  <p>
                                    Moved by {item.by === 'admin' ? 'the operator' : 'you'}
                                    {item.at ? ` · ${new Date(item.at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                  </p>
                                  {item.reason && <p className="mt-0.5 text-slate-500">{item.reason}</p>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Right Side: QR Code & Actions */}
                      <div className="md:w-[300px] border-t md:border-t-0 md:border-l border-dashed border-slate-300 p-8 flex flex-col items-center justify-center bg-slate-50 relative">
                        
                        {/* Ticket cutouts (design detail) */}
                        <div className="hidden md:block absolute -left-4 top-0 w-8 h-8 bg-[#F4F7FB] rounded-full border-b border-r border-slate-200 -translate-y-1/2"></div>
                        <div className="hidden md:block absolute -left-4 bottom-0 w-8 h-8 bg-[#F4F7FB] rounded-full border-t border-r border-slate-200 translate-y-1/2"></div>

                        {ticket.status === 'cancelled' ? (
                          <div className="flex flex-col items-center text-center">
                            <div className={`rounded-full p-4 ${ticket.refundStatus === 'refunded' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                              {ticket.refundStatus === 'refunded'
                                ? <CheckCircle className="h-10 w-10 text-emerald-500" />
                                : <XCircle className="h-10 w-10 text-red-500" />}
                            </div>
                            <p className="mt-4 text-sm font-bold text-slate-900">
                              {ticket.refundStatus === 'refunded' ? 'Refunded' : 'Trip cancelled'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {refund?.processedAt
                                ? `Refunded by the operator (admin) · ${new Date(refund.processedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                                : `${ticket.cancelledBy
                                  ? `Cancelled by ${ticket.cancelledBy === 'admin' ? 'the operator (admin)' : 'you'}`
                                  : 'Booking cancelled'}${ticket.cancelledAt
                                  ? ` · ${new Date(ticket.cancelledAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                                  : ''}`}
                            </p>
                            {refund?.status && (
                              <p className={`mt-2 text-xs font-semibold ${
                                refund.status === 'refunded' ? 'text-emerald-600'
                                  : refund.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                Refund: {refund.status === 'refunded' ? 'successful' : refund.status === 'rejected' ? 'declined' : 'pending approval'}
                              </p>
                            )}
                            {(refund?.adminReason || ticket.cancelReason) && (
                              <p className="mt-3 text-xs text-slate-400">Reason: {refund?.adminReason || ticket.cancelReason}</p>
                            )}
                          </div>
                        ) : ticket.needsReschedule || !ticket.paid ? (
                          <div className="flex flex-col items-center text-center">
                            <div className="rounded-full bg-amber-50 p-4">
                              <AlertTriangle className="h-10 w-10 text-amber-500" />
                            </div>
                            <p className="mt-4 text-sm font-bold text-slate-900">
                              {ticket.needsReschedule ? 'Choose a new departure' : 'Pay to get your QR ticket'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {ticket.needsReschedule
                                ? 'The operator cancelled this trip. Reschedule at no cost or cancel for a refund.'
                                : 'Your seat is reserved. The QR code appears once the payment is confirmed.'}
                            </p>
                            <Link
                              to={`/bookings/${ticket.id}`}
                              className="mt-4 w-full rounded-xl bg-[#0056FF] py-3 text-center font-bold text-white transition-colors hover:bg-blue-800"
                            >
                              {ticket.needsReschedule ? 'Reschedule or cancel' : 'Open booking'}
                            </Link>
                            {!ticket.needsReschedule && ticket.canReschedule && (
                              <button type="button" onClick={() => setRescheduleTarget(ticket)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-3 font-bold text-[#0056FF] transition-colors hover:bg-blue-50">
                                <CalendarClock className="w-5 h-5" /> Reschedule Trip
                              </button>
                            )}
                            {!ticket.needsReschedule && ticket.canCancel && (
                              <button type="button" onClick={() => setCancelTarget(ticket)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 font-bold text-red-600 transition-colors hover:bg-red-50">
                                <XCircle className="w-5 h-5" /> Cancel Trip
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-slate-400 tracking-widest mb-3 uppercase">Scan at boarding</p>
                            <button
                              type="button"
                              onClick={() => setSelectedTicket(ticket)}
                              aria-label={`Enlarge QR code for ticket ${ticket.ticketNumber}`}
                              className="mb-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                            >
                              <QrImage value={ticket.ticketNumber} size={112} />
                            </button>
                            <p className="mb-5 text-[11px] font-medium text-slate-400">{ticket.ticketNumber}</p>

                            {ticket.status === 'upcoming' && (
                              <button
                                type="button"
                                onClick={() => setTrackTarget(ticket)}
                                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 font-bold text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                <MapPin className="w-5 h-5" /> Track vessel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDownload(ticket)}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0056FF] bg-white py-3 font-bold text-[#0056FF] transition-colors hover:bg-blue-50"
                            >
                              <Download className="w-5 h-5" /> Download PDF
                            </button>
                            {ticket.status === 'upcoming' && (
                              <>
                                {ticket.canReschedule ? (
                                  <button
                                    type="button"
                                    onClick={() => setRescheduleTarget(ticket)}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-3 font-bold text-[#0056FF] transition-colors hover:bg-blue-50"
                                  >
                                    <CalendarClock className="w-5 h-5" /> Reschedule Trip
                                  </button>
                                ) : (
                                  <button type="button" disabled title={ticket.cancelLockedReason} className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-bold text-slate-400">
                                    <CalendarClock className="w-5 h-5" /> Reschedule Trip
                                  </button>
                                )}
                                {ticket.canCancel && (
                                  <button
                                    type="button"
                                    onClick={() => setCancelTarget(ticket)}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 font-bold text-red-600 transition-colors hover:bg-red-50"
                                  >
                                    <XCircle className="w-5 h-5" /> {ticket.paidOnline ? 'Cancel & Refund' : 'Cancel Trip'}
                                  </button>
                                )}
                                {ticket.cancelLockedReason && (
                                  <p className="mt-3 text-center text-[11px] text-slate-400">{ticket.cancelLockedReason}</p>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Note/Reminder */}
          {activeTab !== 'cancelled' && (
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
              <Clock className="w-5 h-5 shrink-0" />
              <p>Please arrive at the terminal at least <strong>1 hour before departure</strong>. Bring a valid ID and present this e-ticket for scanning.</p>
            </div>
          )}

        </div>
      </main>

      <Modal
        open={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title="Boarding QR code"
        description={selectedTicket ? `Ticket ${selectedTicket.ticketNumber}` : undefined}
        maxWidth="max-w-sm"
        footer={(
          <button
            type="button"
            onClick={() => setSelectedTicket(null)}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        )}
      >
        {selectedTicket && (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <QrImage value={selectedTicket.ticketNumber} size={192} />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {selectedTicket.passenger} • {selectedTicket.ship} • {selectedTicket.departure}
            </p>
            <p className="text-xs text-slate-500">
              Present this code to the crew when boarding.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(trackTarget)}
        onClose={() => setTrackTarget(null)}
        title="Track vessel"
        description={
          trackTarget
            ? `${trackTarget.ship} · ${ticketRoute(trackTarget).from.city} → ${ticketRoute(trackTarget).to.city}`
            : undefined
        }
        maxWidth="max-w-3xl"
        footer={(
          <button
            type="button"
            onClick={() => setTrackTarget(null)}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        )}
      >
        {trackTarget && (() => {
          const voyageState = getVoyageState(trackTarget);
          return (
            <div className="space-y-3">
              <VoyageMapLazy
                from={trackTarget.from}
                to={trackTarget.to}
                progress={voyageState.progress}
                shipName={trackTarget.ship}
                voyageState={voyageState}
                height="360px"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Departure {trackTarget.departure} · Arrival {trackTarget.arrival}
                </span>
                <span className="font-semibold text-slate-700">
                  {voyageState.status === 'at-sea'
                    ? `About ${Math.round(voyageState.progress * 100)}% of the way there`
                    : voyageState.status === 'arrived'
                      ? 'Arrived at destination'
                      : 'Voyage has not departed yet'}
                </span>
              </div>
            </div>
          );
        })()}
      </Modal>

      {rescheduleTarget && (
        <RescheduleTripDialog
          trip={rescheduleTarget}
          open
          onClose={() => setRescheduleTarget(null)}
          onDone={handleRescheduled}
        />
      )}

      <CancelTripDialog
        ticket={cancelTarget}
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
      />

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
