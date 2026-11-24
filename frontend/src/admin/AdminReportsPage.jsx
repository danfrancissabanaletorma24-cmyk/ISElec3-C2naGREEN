import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, TrendingUp, Ticket, Wallet, Percent, ArrowUpRight, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api';
import { useAuth } from '../auth/AuthContext';
import { currency } from '../data/adminData';
import { buildAdminRouteMetrics, loadAllAdminBookings } from './adminBookingData';
import ProgressBar from './components/ProgressBar';
import { AreaChart, BarChart } from './components/Charts';

const RANGES = [
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
  { key: 90, label: '90 days' },
];

const PAYMENT_METHODS = [
  { method: 'gcash', label: 'GCash', color: '#0056FF' },
  { method: 'maya', label: 'Maya', color: '#10B981' },
  { method: 'card', label: 'Credit / Debit Card', color: '#7C3AED' },
  { method: 'bank_transfer', label: 'Bank Transfer', color: '#F59E0B' },
  { method: 'cash', label: 'Pay at the port counter', color: '#0F766E' },
];

async function loadAllAdminTrips(token) {
  const trips = [];
  let page = 1;
  let pages = 1;

  do {
    const result = await apiRequest(`/trips?page=${page}&limit=100`, { token });
    if (!Array.isArray(result.data)) {
      throw new Error('The trips API returned an unexpected response.');
    }
    trips.push(...result.data);
    pages = Math.max(Number(result.pages) || 1, 1);
    page += 1;
  } while (page <= pages);

  return trips;
}

function isWithinPeriod(value, start, end) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date < end;
}

function routeName(route) {
  const origin = route?.origin?.city || route?.origin?.name;
  const destination = route?.destination?.city || route?.destination?.name;
  return [origin, destination].filter(Boolean).join(' → ') || 'Route unavailable';
}

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [range, setRange] = useState(30);
  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState(''); // bookings failed: nothing useful to show
  const [tripsError, setTripsError] = useState(''); // trips failed: only occupancy is affected
  const [reloadKey, setReloadKey] = useState(0);
  const [today] = useState(() => new Date());

  const retry = useCallback(() => {
    setIsLoadingReports(true);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let active = true;
    // Load both independently so one failing request does not blank the whole page.
    Promise.allSettled([loadAllAdminBookings(token), loadAllAdminTrips(token)])
      .then(([bookingResult, tripResult]) => {
        if (!active) return;
        if (bookingResult.status === 'fulfilled') {
          setBookings(bookingResult.value);
          setReportsError('');
        } else {
          setReportsError(bookingResult.reason?.message || 'Could not load bookings.');
        }
        if (tripResult.status === 'fulfilled') {
          setTrips(tripResult.value);
          setTripsError('');
        } else {
          setTripsError(tripResult.reason?.message || 'Could not load trips.');
        }
      })
      .finally(() => {
        if (active) setIsLoadingReports(false);
      });

    return () => {
      active = false;
    };
  }, [token, reloadKey]);

  const period = useMemo(() => {
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - range);
    return { start, end };
  }, [range, today]);

  const series = useMemo(() => {
    const days = Array.from({ length: range }, (_, index) => {
      const date = new Date(period.start);
      date.setDate(date.getDate() + index);
      return {
        date,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: 0,
        bookings: 0,
        paidTransactions: 0,
      };
    });

    bookings.forEach((booking) => {
      if (isWithinPeriod(booking.createdAt, period.start, period.end)) {
        const index = Math.floor((new Date(booking.createdAt) - period.start) / 86400000);
        if (days[index]) days[index].bookings += 1;
      }

      if (booking.paymentStatus === 'paid' && isWithinPeriod(booking.paidAt, period.start, period.end)) {
        const index = Math.floor((new Date(booking.paidAt) - period.start) / 86400000);
        if (days[index]) {
          days[index].value += booking.amount;
          days[index].paidTransactions += 1;
        }
      }
    });

    return days;
  }, [bookings, period, range]);
  const bookingChartData = useMemo(
    () => series.map((item) => ({ label: item.label, value: item.bookings })),
    [series],
  );

  const tripStats = useMemo(() => {
    const occupancyByRoute = new Map();
    let occupiedSeats = 0;
    let totalCapacity = 0;

    trips.forEach((trip) => {
      if (trip.status === 'cancelled' || !isWithinPeriod(trip.departureAt, period.start, period.end)) return;
      const capacity = Number(trip.seatsTotal) || 0;
      if (!capacity) return;
      const available = Math.min(capacity, Math.max(0, Number(trip.seatsAvailable) || 0));
      const occupied = capacity - available;
      const name = routeName(trip.route);
      const route = occupancyByRoute.get(name) || { route: name, occupied: 0, capacity: 0 };
      route.occupied += occupied;
      route.capacity += capacity;
      occupancyByRoute.set(name, route);
      occupiedSeats += occupied;
      totalCapacity += capacity;
    });

    const routes = [...occupancyByRoute.values()].map((route) => ({
      ...route,
      occupancy: route.capacity ? Math.round((route.occupied / route.capacity) * 100) : 0,
    }));

    return {
      averageOccupancy: totalCapacity ? Math.round((occupiedSeats / totalCapacity) * 100) : 0,
      routes,
    };
  }, [period, trips]);

  const paymentBreakdown = useMemo(() => {
    const paidBookings = bookings.filter(
      (booking) => booking.paymentStatus === 'paid'
        && isWithinPeriod(booking.paidAt, period.start, period.end)
        && PAYMENT_METHODS.some((method) => method.method === booking.paymentMethod),
    );
    const counts = paidBookings.reduce((result, booking) => {
      result[booking.paymentMethod] = (result[booking.paymentMethod] || 0) + 1;
      return result;
    }, {});

    return PAYMENT_METHODS.map((method) => ({
      ...method,
      value: paidBookings.length
        ? Math.round(((counts[method.method] || 0) / paidBookings.length) * 100)
        : 0,
    }));
  }, [bookings, period]);

  const routePerformance = useMemo(
    () => buildAdminRouteMetrics(bookings, period),
    [bookings, period],
  );

  const summary = useMemo(() => ({
    revenue: series.reduce((sum, item) => sum + item.value, 0),
    bookings: series.reduce((sum, item) => sum + item.bookings, 0),
    average: (() => {
      const transactions = series.reduce((sum, item) => sum + item.paidTransactions, 0);
      const revenue = series.reduce((sum, item) => sum + item.value, 0);
      return Math.round(revenue / Math.max(transactions, 1));
    })(),
    occupancy: tripStats.averageOccupancy,
  }), [series, tripStats]);

  const topPaymentMethod = paymentBreakdown.reduce(
    (top, method) => (method.value > (top?.value || 0) ? method : top),
    null,
  );
  const topOccupancyRoute = [...tripStats.routes].sort((a, b) => b.occupancy - a.occupancy)[0];
  const maxRouteRevenue = Math.max(...routePerformance.map((route) => route.revenue), 1);

  const exportCsv = () => {
    const exportBookings = bookings.filter((booking) => (
      isWithinPeriod(booking.createdAt, period.start, period.end)
    ));
    const headers = ['Booking ID', 'Passenger', 'Email', 'Route', 'Departure', 'Vessel', 'Amount (PHP)', 'Status'];
    const rows = exportBookings.map((booking) => [
      booking.bookingRef,
      booking.passenger,
      booking.email,
      booking.route,
      `${booking.date} ${booking.time}`,
      booking.vessel,
      booking.amount,
      booking.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `layagexpres-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const metricValue = (value) => (
    isLoadingReports ? '…' : reportsError ? '—' : value
  );

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1.5">
          {RANGES.map((option) => (
            <button
              key={option.key}
              onClick={() => setRange(option.key)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                range === option.key ? 'bg-white text-[#0056FF] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Last {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          disabled={isLoadingReports || Boolean(reportsError)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#0056FF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export bookings CSV
        </button>
      </div>

      {(reportsError || tripsError) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>
            {reportsError
              ? `Could not load booking data: ${reportsError}`
              : `Occupancy data is unavailable right now (${tripsError}). Other figures are up to date.`}
          </span>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Revenue', value: metricValue(currency(summary.revenue)), icon: Wallet },
          { label: 'Bookings', value: metricValue(summary.bookings.toLocaleString()), icon: Ticket },
          { label: 'Average ticket', value: metricValue(currency(summary.average)), icon: TrendingUp },
          { label: 'Avg. occupancy', value: tripsError && !isLoadingReports ? '—' : metricValue(`${summary.occupancy}%`), icon: Percent },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <Icon className="h-4 w-4 text-[#0056FF]" />
            </div>
            <p className="mt-2 truncate text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-base font-bold text-slate-900">Revenue</h3>
          <p className="mb-4 text-xs text-slate-500">Collected in the last {range} days</p>
          {isLoadingReports ? <p className="text-sm text-slate-500">Loading report data…</p> : !reportsError && (
            <AreaChart data={series} valueFormat={(value) => currency(value)} />
          )}
          {!isLoadingReports && reportsError && <p role="alert" className="text-sm text-red-600">Revenue data unavailable.</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-base font-bold text-slate-900">Bookings volume</h3>
          <p className="mb-4 text-xs text-slate-500">Bookings created in the last {range} days</p>
          {isLoadingReports ? (
            <p className="text-sm text-slate-500">Loading report data…</p>
          ) : reportsError ? (
            <p role="alert" className="text-sm text-red-600">Booking volume data unavailable.</p>
          ) : summary.bookings === 0 ? (
            <p className="text-sm text-slate-500">No bookings created in the selected period.</p>
          ) : (
            <BarChart data={bookingChartData} valueFormat={(value) => `${value} bookings`} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
            <h3 className="text-base font-bold text-slate-900">Route performance</h3>
            <span className="text-xs text-slate-400">Last {range} days</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-semibold">Route</th>
                  <th className="px-3 py-3 font-semibold">Bookings</th>
                  <th className="px-3 py-3 font-semibold">Revenue</th>
                  <th className="px-6 py-3 font-semibold">Revenue share</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingReports ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">Loading report data…</td></tr>
                ) : reportsError ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-red-600">Route data unavailable.</td></tr>
                ) : routePerformance.length ? routePerformance.map((route) => (
                  <tr key={route.route} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-semibold text-slate-800">{route.route}</td>
                    <td className="px-3 py-4 text-slate-600">{route.bookings.toLocaleString()}</td>
                    <td className="px-3 py-4 font-semibold text-slate-800">{currency(route.revenue)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={route.revenue} max={maxRouteRevenue} className="w-28" />
                        <span className="text-xs font-semibold text-slate-500">{route.share}%</span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">No bookings in the selected period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-base font-bold text-slate-900">Payment methods</h3>
          <p className="mb-5 text-xs text-slate-500">Share of successful transactions in the selected period</p>
          <div className="space-y-4">
            {reportsError ? (
              <p role="alert" className="text-sm text-red-600">Payment method data unavailable.</p>
            ) : isLoadingReports ? (
              <p className="text-sm text-slate-500">Loading payment methods…</p>
            ) : paymentBreakdown.map((method) => (
              <div key={method.method}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{method.label}</span>
                  <span className="text-slate-500">{method.value}%</span>
                </div>
                <ProgressBar value={method.value} max={100} color={method.color} />
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-blue-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#0056FF]">
              <ArrowUpRight className="h-4 w-4" /> Insight
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {isLoadingReports
                ? 'Report insights are loading.'
                : reportsError
                  ? 'Report insights are unavailable.'
                  : topPaymentMethod?.value
                    ? `${topPaymentMethod.label} is the top payment method at ${topPaymentMethod.value}%. `
                    : 'No successful payment transactions in this period. '}
              {!isLoadingReports && !reportsError && (topOccupancyRoute?.occupied > 0
                ? `${topOccupancyRoute.route} has the highest occupancy at ${topOccupancyRoute.occupancy}%.`
                : tripsError
                  ? 'Trip occupancy is unavailable right now.'
                  : 'No trip occupancy data in this period.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
