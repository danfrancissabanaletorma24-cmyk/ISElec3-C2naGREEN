// src/public/DestinationsPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Ship } from 'lucide-react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { getDestination, getShipTypeLabel, toISODate } from '../data/customerData';
import { usePorts } from '../data/ports';
import usePopularRoutes from '../hooks/usePopularRoutes';
import { useLanguage } from '../i18n/LanguageContext';
import { useCurrency } from '../currency/CurrencyContext';

export default function DestinationsPage() {
  const { t } = useLanguage();
  const { format } = useCurrency();
  const { ports: DESTINATIONS } = usePorts();
  const { routes: POPULAR_ROUTES } = usePopularRoutes(100);
  const tomorrow = toISODate(new Date(Date.now() + 86400000));

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <PublicHeader />

      <section className="bg-[#F0F7FF] px-6 py-14 md:px-12">
        <div className="mx-auto max-w-[1100px]">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E56D6]">
            <MapPin className="h-4 w-4" /> LayagExpress
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0B1527]">{t('dest.title')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">{t('dest.sub')}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1100px] px-6 py-12 md:px-12">
        <h2 className="mb-5 text-lg font-bold text-slate-900">{t('dest.routes')}</h2>
        <div className="mb-12 grid gap-4 sm:grid-cols-2">
          {POPULAR_ROUTES.map((route) => {
            const from = getDestination(route.from);
            const to = getDestination(route.to);
            return (
              <Link
                key={`${route.from}-${route.to}`}
                to={`/search?from=${route.from}&to=${route.to}&date=${tomorrow}&adults=1&children=0&seniors=0&shipType=any&tripType=one-way`}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0056FF]/40 hover:shadow-md"
              >
                <div>
                  <p className="text-base font-bold text-slate-900">{from.city} → {to.city}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Ship className="h-3.5 w-3.5 text-[#0056FF]" />
                    {route.shipType
                      ? `${getShipTypeLabel(route.shipType)} · ${route.duration}`
                      : 'No upcoming sailing'}
                  </p>
                </div>
                <div className="text-right">
                  {route.sailings > 0 ? (
                    <>
                      <p className="text-lg font-bold text-[#0056FF]">{format(route.price)}</p>
                      <p className="text-[10px] text-slate-500">{t('common.perPerson')}</p>
                    </>
                  ) : (
                    <p className="max-w-28 text-xs font-medium text-slate-500">Schedule not available</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <h2 className="mb-5 text-lg font-bold text-slate-900">{t('dest.title')}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {DESTINATIONS.map((destination) => (
            <div key={destination.code} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#0056FF]">{destination.code}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{destination.city}</p>
              <p className="text-xs text-slate-500">{destination.province}</p>
            </div>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
