// src/public/ShipsPage.jsx  -  every ship with its next sailing (live from the API)
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Ship, Users } from 'lucide-react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import useApiData from '../hooks/useApiData';
import { tripRoute } from '../api';
import {
  getShipTypeLabel, getDestination, formatDate, formatTime, formatTripDuration,
} from '../data/customerData';
import { useLanguage } from '../i18n/LanguageContext';
import { useCurrency } from '../currency/CurrencyContext';

export default function ShipsPage() {
  const { t } = useLanguage();
  const { format } = useCurrency();
  const boats = useApiData('/boats?status=active&limit=100');
  const trips = useApiData('/trips?upcoming=true&status=scheduled&limit=100');

  const ships = useMemo(() => (boats.data?.data || []).map((boat) => {
    const next = (trips.data?.data || []).find((trip) => trip.boat?._id === boat._id);
    return { boat, next };
  }), [boats.data, trips.data]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <PublicHeader />

      <section className="bg-[#F0F7FF] px-6 py-14 md:px-12">
        <div className="mx-auto max-w-[1100px]">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E56D6]">
            <Ship className="h-4 w-4" /> LayagExpress
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0B1527]">{t('ships.title')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">{t('ships.sub')}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1100px] px-6 py-12 md:px-12">
        {boats.error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{boats.error}</p>}
        {boats.loading && <p className="text-sm text-slate-500">Loading ships…</p>}
        <div className="grid gap-4">
          {ships.map(({ boat, next }) => {
            const { fromCode, toCode } = tripRoute(next);
            const fares = Object.values(next?.fares || {}).filter((fare) => fare > 0);
            return (
              <div key={boat._id} className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:flex-row md:items-stretch">
                <img
                  src={boat.imageUrl || '/ships/kho-roro.jpg'}
                  alt={boat.name}
                  className="h-44 w-full object-cover md:h-auto md:w-60"
                />
                <div className="flex flex-1 flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{boat.name}</h2>
                    <p className="text-xs text-slate-500">
                      {boat.operator ? `${boat.operator} · ` : ''}{getShipTypeLabel(boat.boatType)}
                    </p>
                    {boat.amenities?.length > 0 && <p className="mt-2 text-xs text-slate-500">{boat.amenities.join(' · ')}</p>}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> {boat.seatCapacity} seats</p>
                  </div>

                  {next ? (
                    <>
                      <div className="text-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Next sailing</p>
                        <p className="font-semibold text-slate-900">{getDestination(fromCode).city} → {getDestination(toCode).city}</p>
                        <p className="text-xs text-slate-500">{formatDate(next.departureAt)} · {formatTime(next.departureAt)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> {formatTripDuration(next.departureAt, next.arrivalAt)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                        {fares.length > 0 && <p className="text-lg font-bold text-[#0056FF]">{format(Math.min(...fares))}</p>}
                        <Link
                          to={`/book/${next._id}`}
                          className="flex items-center gap-1.5 rounded-xl bg-[#0056FF] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800"
                        >
                          {t('ships.select')} <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No upcoming sailings.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
