// src/public/PublicHeader.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Globe, Menu, Ship, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCurrency } from '../currency/CurrencyContext';

function MenuButton({ label, value, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-white/60 hover:text-[#1E56D6]"
      >
        <Globe className="h-4 w-4" />
        {value}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label={label}
            className="absolute right-0 top-[calc(100%+6px)] z-40 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-scale-in"
          >
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PublicHeader({ anchorNav = false }) {
  const { pathname } = useLocation();
  const { t, language, setLanguage, languages } = useLanguage();
  const { currency, setCurrency, currencies } = useCurrency();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const links = anchorNav
    ? [
        { id: 'home', href: '#home', label: t('nav.home') },
        { id: 'destinations', href: '#destinations', label: t('nav.destinations') },
        { id: 'ships', href: '#ships', label: t('nav.ships') },
        { id: 'help', href: '#help', label: t('nav.help') },
      ]
    : [
        { to: '/', label: t('nav.home') },
        { to: '/destinations', label: t('nav.destinations') },
        { to: '/ships', label: t('nav.ships') },
        { to: '/support', label: t('nav.help') },
      ];

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));
  const activeLanguage = languages.find((item) => item.code === language) ?? languages[0];

  useEffect(() => {
    if (!anchorNav) return undefined;
    const ids = ['home', 'destinations', 'ships', 'help'];
    const handleScroll = () => {
      let current = 'home';
      ids.forEach((id) => {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 140) current = id;
      });
      setActiveSection(current);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [anchorNav]);

  const handleAnchorClick = (event, href) => {
    event.preventDefault();
    const target = document.getElementById(href.replace('#', ''));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', href);
      setActiveSection(href.replace('#', ''));
    }
    setMobileOpen(false);
  };

  return (
    <header className="relative z-50 bg-[#EAF3FF]">
      <nav className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-4 md:px-12 lg:px-16">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-[#0F3A8C]">
          <Ship className="h-7 w-7 fill-current" />
          <span className="text-[22px] font-bold tracking-tight">LayagExpress</span>
        </Link>

        <div className="hidden items-center gap-8 text-[14px] font-medium text-slate-700 lg:flex">
          {links.map((link) => (
            anchorNav ? (
              <a
                key={link.id}
                href={link.href}
                onClick={(event) => handleAnchorClick(event, link.href)}
                className={`pb-1 transition-colors hover:text-[#1E56D6] ${
                  activeSection === link.id ? 'border-b-2 border-[#1E56D6] text-[#1E56D6]' : ''
                }`}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className={`pb-1 transition-colors hover:text-[#1E56D6] ${
                  isActive(link.to) ? 'border-b-2 border-[#1E56D6] text-[#1E56D6]' : ''
                }`}
              >
                {link.label}
              </Link>
            )
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="hidden items-center gap-1 md:flex">
            <MenuButton label={t('common.language')} value={activeLanguage.native}>
              {(close) => languages.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={item.code === language}
                  onClick={() => { setLanguage(item.code); close(); }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    item.code === language ? 'bg-[#0056FF] text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{item.native}</span>
                  <span className="text-[11px] uppercase opacity-70">{item.code}</span>
                </button>
              ))}
            </MenuButton>
            <MenuButton label={t('common.currency')} value={currency}>
              {(close) => currencies.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={item.code === currency}
                  onClick={() => { setCurrency(item.code); close(); }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    item.code === currency ? 'bg-[#0056FF] text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-semibold">{item.symbol} {item.code}</span>
                  <span className="text-[11px] opacity-70">{item.rate === 1 ? '1.00' : `×${item.rate}`}</span>
                </button>
              ))}
            </MenuButton>
          </div>
          <Link
            to="/login"
            className="rounded-md bg-[#1E56D6] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-blue-800"
          >
            {t('nav.signin')}
          </Link>
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-slate-700 transition-colors hover:bg-white/70 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[280px] flex-col gap-2 bg-white p-5 shadow-2xl animate-sheet-right">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Menu</span>
              <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {links.map((link) => (
              anchorNav ? (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(event) => handleAnchorClick(event, link.href)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    activeSection === link.id ? 'bg-blue-50 text-[#1E56D6]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              )
            ))}
            <div className="mt-3 border-t border-slate-100 pt-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                {t('common.language')}
              </label>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
              >
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>{item.native}</option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                {t('common.currency')}
              </label>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
              >
                {currencies.map((item) => (
                  <option key={item.code} value={item.code}>{item.symbol} {item.code}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
