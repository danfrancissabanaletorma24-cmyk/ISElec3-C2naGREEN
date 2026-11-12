// src/public/SupportPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, MessageCircle, PhoneCall } from 'lucide-react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { useLanguage } from '../i18n/LanguageContext';

const FAQS = [
  { q: 'How do I cancel or reschedule my trip?', a: 'Open My Bookings, select the trip and choose Reschedule or Cancel. Changes made at least 24 hours before departure are free of charge.' },
  { q: 'What is the baggage allowance?', a: 'Each passenger may bring up to 20 kg of checked baggage plus one hand-carry item. Extra baggage is charged per kilogram at the terminal.' },
  { q: 'Can I change the passenger name on my ticket?', a: 'Names can be corrected once before departure by contacting support with a valid ID.' },
  { q: 'How long does a refund take?', a: 'Approved refunds are returned to the original payment method within 5–10 business days.' },
  { q: 'Do I need to print my e-ticket?', a: 'No. Show the QR code in your Tickets page at the gate — a printed copy also works.' },
  { q: 'How do child and senior discounts work?', a: 'Children aged 2–11 get 50% off and seniors 60+ get 20% off. Proof of age is checked at boarding.' },
];

import { SITE } from '../config/site';

export default function SupportPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <PublicHeader />

      <section className="bg-[#F0F7FF] px-6 py-14 md:px-12">
        <div className="mx-auto max-w-[1000px]">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0B1527]">{t('help.title')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">{t('help.sub')}</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1000px] gap-8 px-6 py-12 md:grid-cols-3 md:px-12">
        <div className="md:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-slate-900">{t('help.faq')}</h2>
          <div className="space-y-3">
            {FAQS.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-800">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        <aside>
          <h2 className="mb-4 text-lg font-bold text-slate-900">{t('help.contact')}</h2>
          <div className="space-y-3">
            <Link to="/login" className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#0056FF]/40">
              <MessageCircle className="mt-0.5 h-5 w-5 text-[#0056FF]" />
              <span>
                <span className="block text-sm font-bold text-slate-900">Live Chat</span>
                <span className="block text-xs text-slate-500">Available 24/7 · avg. 2 min</span>
              </span>
            </Link>
            <a href={`mailto:${SITE.supportEmail}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#0056FF]/40">
              <Mail className="mt-0.5 h-5 w-5 text-[#0056FF]" />
              <span>
                <span className="block text-sm font-bold text-slate-900">Email</span>
                <span className="block text-xs text-slate-500">{SITE.supportEmail}</span>
              </span>
            </a>
            {SITE.phone && (
            <a href={`tel:${SITE.phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#0056FF]/40">
              <PhoneCall className="mt-0.5 h-5 w-5 text-[#0056FF]" />
              <span>
                <span className="block text-sm font-bold text-slate-900">Call us</span>
                <span className="block text-xs text-slate-500">{SITE.phone}</span>
              </span>
            </a>
            )}
          </div>
        </aside>
      </section>

      <PublicFooter />
    </div>
  );
}
