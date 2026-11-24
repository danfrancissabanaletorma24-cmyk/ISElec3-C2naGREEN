import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Ship, ArrowRight, SlidersHorizontal, ArrowUpDown, SearchX,
} from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import SearchWidget from './customer/SearchWidget';
import { valuesFromSearchParams } from './customer/searchValues';
import useSidebarState from './hooks/useSidebarState';
import useDismiss from './customer/useDismiss';
import {
  getDestination, getShipTypeLabel, formatTime, formatTripDuration, formatISODate, getSeatClassLabel, formatDate,
} from './data/customerData';
import { apiRequest, tripRoute } from './api';
import { useCurrency } from './currency/CurrencyContext';

const HERO_IMG = '/ships/kho-roro.jpg';

const SORT_OPTIONS = [
  { id: 'price-asc', label: 'Price: Low to High', field: 'price', direction: 'asc' },
  { id: 'price-desc', label: 'Price: High to Low', field: 'price', direction: 'desc' },
  { id: 'departure-asc', label: 'Departure: Earliest', field: 'departure', direction: 'asc' },
  { id: 'duration-asc', label: 'Duration: Shortest', field: 'duration', direction: 'asc' },
];

function sortValue(trip, field) {
  if (field === 'price') return trip.lowestFare;
  if (field === 'departure') return new Date(trip.departureAt).getTime();
  return new Date(trip.arrivalAt) - new Date(trip.departureAt);
}

const lowestFare = (trip) => {
  const fares = Object.values(trip.fares || {}).filter((fare) => Number(fare) > 0);
  return fares.length ? Math.min(...fares) : 0;
};

export default function SearchResultsPage({
  showSearch = false,
  title = 'Search Results',
  subtitle = 'Available trips for your route',
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { format } = useCurrency();
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  const [searchValues, setSearchValues] = useState(() => valuesFromSearchParams(searchParams));

  const [sortId, setSortId] = useState('price-asc');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const closeSort = useCallback(() => setIsSortOpen(false), []);
  const sortRef = useDismiss(isSortOpen, closeSort);

  const fromCode = searchParams.get('from') || '';
  const toCode = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  const returnDate = searchParams.get('returnDate') || '';
  const tripType = searchParams.get('tripType') || 'one-way';
  const shipType = searchParams.get('shipType') || 'any';
  const adults = Number(searchParams.get('adults')) || 1;
  const children = Number(searchParams.get('children')) || 0;
  const infants = Number(searchParams.get('infants')) || 0;
  const seniors = Number(searchParams.get('seniors')) || 0;

  const origin = getDestination(fromCode);
  const destination = getDestination(toCode);

  const modifySearchUrl = useMemo(() => {
    const params = new URLSearchParams({
      from: fromCode,
      to: toCode,
      date,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      seniors: String(seniors),
      shipType,
      tripType,
    });
    if (returnDate) params.set('returnDate', returnDate);
    return `/dashboard?${params.toString()}`;
  }, [fromCode, toCode, date, adults, children, infants, seniors, shipType, tripType, returnDate]);

  const bookingUrl = (trip) => {
    const params = new URLSearchParams({
      adults: String(adults),
      children: String(children),
      seniors: String(seniors),
    });
    return `/book/${trip._id}?${params.toString()}`;
  };

  const [rawTrips, setRawTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // With a route + date: that search. Without: every upcoming sailing on every route (the "view all routes" list).
  const browsingAll = !fromCode && !toCode && !date;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    const query = new URLSearchParams({ status: 'scheduled', limit: '100', boatType: shipType });
    if (fromCode) query.set('origin', fromCode);
    if (toCode) query.set('destination', toCode);
    if (date) query.set('date', date); else query.set('upcoming', 'true');
    apiRequest(`/trips?${query}`)
      .then((result) => { if (active) setRawTrips(result.data || []); })
      .catch((error) => { if (active) { setRawTrips([]); setLoadError(error.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fromCode, toCode, date, shipType]);

  const trips = useMemo(() => {
    const option = SORT_OPTIONS.find((item) => item.id === sortId) ?? SORT_OPTIONS[0];
    return rawTrips
      .map((trip) => ({ ...trip, lowestFare: lowestFare(trip) }))
      .sort((a, b) => {
        const diff = sortValue(a, option.field) - sortValue(b, option.field);
        return option.direction === 'desc' ? -diff : diff;
      });
  }, [rawTrips, sortId]);

  const activeSort = SORT_OPTIONS.find((item) => item.id === sortId) ?? SORT_OPTIONS[0];

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
        <CustomerHeader
          title={title}
          subtitle={subtitle}
          onOpenMenu={openMobile}
        />

        <div className="px-4 md:px-8 pb-10 max-w-[1000px] mx-auto w-full">

          {showSearch && (
            <div className="mb-6">
              <SearchWidget
                values={searchValues}
                onChange={setSearchValues}
                onSearch={(query) => navigate(`/find-ships?${query}`)}
              />
            </div>
          )}
          
          {/* Results Header */}
          <div className="flex justify-between items-center mb-6 gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              {browsingAll ? 'All Routes' : 'Available Trips'}
              <span className="text-slate-400 text-sm font-normal ml-2">({trips.length} results)</span>
            </h1>

            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={isSortOpen}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 bg-white px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Sort by:</span> {activeSort.label.split(':')[0]}
                <span aria-hidden="true">{activeSort.direction === 'desc' ? '↓' : '↑'}</span>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isSortOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={option.id === sortId}
                      onClick={() => { setSortId(option.id); closeSort(); }}
                      className={`flex w-full items-center px-4 py-2 text-left text-sm transition-colors ${
                        option.id === sortId
                          ? 'bg-blue-50 font-semibold text-[#0056FF]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trips List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">Searching available ships…</div>
          ) : trips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <SearchX className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-900 mb-1">No trips found</h2>
              <p className="text-sm text-slate-500 mb-5">
                {loadError || (browsingAll
                  ? 'There are no upcoming sailings yet.'
                  : `We couldn't find any ${shipType === 'any' ? '' : `${getShipTypeLabel(shipType).toLowerCase()} `}trips${fromCode && toCode ? ` from ${origin.city} to ${destination.city}` : ''}${date ? ` on ${formatISODate(date)}` : ''}.`)}
              </p>
              <Link
                to={modifySearchUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800"
              >
                Modify Search
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => {
                const route = tripRoute(trip);
                return (
                <div key={trip._id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-[#0056FF]/30 hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    
                    {/* Left: Ship Info */}
                    <div className="flex items-center gap-4 w-full md:w-[35%]">
                      <img src={trip.boat?.imageUrl || HERO_IMG} alt={trip.boat?.name} className="w-16 h-16 rounded-xl object-cover" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0056FF]">
                          {getDestination(route.fromCode).city} → {getDestination(route.toCode).city}
                        </p>
                        <h3 className="font-bold text-lg text-slate-900">{trip.boat?.name}</h3>
                        <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                          {getShipTypeLabel(trip.boat?.boatType)}{trip.boat?.operator ? ` • ${trip.boat.operator}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Time & Duration */}
                    <div className="flex items-center justify-between w-full md:w-[40%] bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-center">
                        <p className="font-bold text-lg text-slate-900">{formatTime(trip.departureAt)}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(trip.departureAt, { month: 'short', day: 'numeric' })}</p>
                        <p className="text-xs text-slate-500">{route.fromCode}</p>
                      </div>
                      <div className="flex flex-col items-center px-4 flex-1">
                        <p className="text-[10px] font-medium text-slate-400 mb-1">{formatTripDuration(trip.departureAt, trip.arrivalAt)}</p>
                        <div className="w-full flex items-center gap-1">
                          <div className="h-[2px] bg-slate-300 flex-1 rounded-full relative">
                            <div className="w-2 h-2 bg-[#0056FF] rounded-full absolute left-0 top-1/2 -translate-y-1/2"></div>
                            <div className="w-2 h-2 bg-[#0056FF] rounded-full absolute right-0 top-1/2 -translate-y-1/2"></div>
                          </div>
                          <Ship className="w-3 h-3 text-[#0056FF]" />
                        </div>
                        <p className="text-[10px] text-green-600 font-medium mt-1">{trip.seatsAvailable} seats left</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg text-slate-900">{formatTime(trip.arrivalAt)}</p>
                        <p className="text-xs text-slate-500">{route.toCode}</p>
                      </div>
                    </div>

                    {/* Right: Price & Action */}
                    <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-[25%] gap-2">
                      <div className="text-left md:text-right">
                        <p className="text-xs text-slate-500 mb-0.5">Price per person, from</p>
                        <p className="text-2xl font-bold text-[#0056FF]">{format(trip.lowestFare)}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-emerald-600">Child 50% · Senior, student, PWD 20% off</p>
                      </div>
                      <Link to={bookingUrl(trip)} aria-disabled={trip.seatsAvailable === 0 && !(trip.cargoRatePerKg > 0)} className="bg-[#0056FF] hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-2">
                        Select <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                  </div>
                </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
