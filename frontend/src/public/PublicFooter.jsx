// src/public/PublicFooter.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Ship } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

import { SITE } from '../config/site';

export default function PublicFooter() {
  const { t } = useLanguage();
  return (
    <footer className="mt-auto bg-[#0B1527] text-slate-300">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-12 md:grid-cols-4 md:px-12">
        <div className="md:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-white">
            <Ship className="h-6 w-6 fill-current" />
            <span className="text-lg font-bold">LayagExpress</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">
            Safe, convenient, and reliable sea travel across the Philippine islands.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t('help.title')}</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/destinations" className="hover:text-white">{t('nav.destinations')}</Link></li>
            <li><Link to="/ships" className="hover:text-white">{t('nav.ships')}</Link></li>
            <li><Link to="/support" className="hover:text-white">{t('nav.help')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t('help.contact')}</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {SITE.supportEmail}</li>
            {SITE.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {SITE.phone}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-slate-500">
        © 2026 LayagExpress · Mock data for demonstration
      </div>
    </footer>
  );
}
