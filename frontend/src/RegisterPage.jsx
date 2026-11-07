// src/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, Ship, User } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { PRESSABLE } from './components/motion';

const inputClass = (invalid) => `w-full py-3 pl-11 pr-11 rounded-xl border text-[13px] text-slate-800 outline-none transition-all shadow-sm ${
  invalid
    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
    : 'border-slate-200 focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2]'
}`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.mobile.replace(/\D/g, '').length < 10) next.mobile = 'Enter a valid mobile number (at least 10 digits).';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match.';
    if (!terms) next.terms = 'Please accept the Terms of Service and Privacy Policy.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await register(form);
      navigate('/dashboard');
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EAF3FF] px-4 py-10 font-sans">
      <div className="absolute inset-0">
        <img
          src="/supercat.jpg"
          alt="LayagExpress ferry"
          className="h-full w-full object-cover object-right"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-[#0B1527]/15" />
      </div>

      <div className="absolute left-6 top-6 z-20 md:left-10 md:top-8">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl bg-white/50 px-4 py-2.5 text-sm font-semibold text-[#0A2540] shadow-sm backdrop-blur-sm transition-all hover:bg-white/80"
        >
          <ArrowLeft className="h-4 w-4" /> {t('auth.back')}
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[460px] rounded-[28px] border border-white/50 bg-[#F8FAFC] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)] md:p-8">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-[#0A2540]">
          <Ship className="h-8 w-8 fill-current" />
          <span className="text-[26px] font-bold tracking-tight">LayagExpress</span>
        </div>

        <h1 className="text-center text-lg font-bold text-[#0A2540]">{t('register.title')}</h1>
        <p className="mt-1 text-center text-[13px] text-slate-500">{t('register.sub')}</p>

        <form className="mt-6 space-y-3.5" onSubmit={handleSubmit} noValidate>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder={t('register.name')}
              aria-label={t('register.name')}
              aria-invalid={Boolean(errors.name)}
              className={inputClass(errors.name)}
            />
          </div>
          {errors.name && <p role="alert" className="text-xs font-medium text-red-600">{errors.name}</p>}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder={t('register.email')}
              aria-label={t('register.email')}
              aria-invalid={Boolean(errors.email)}
              className={inputClass(errors.email)}
            />
          </div>
          {errors.email && <p role="alert" className="text-xs font-medium text-red-600">{errors.email}</p>}

          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              value={form.mobile}
              onChange={(event) => update('mobile', event.target.value)}
              placeholder={t('register.mobile')}
              aria-label={t('register.mobile')}
              aria-invalid={Boolean(errors.mobile)}
              className={inputClass(errors.mobile)}
            />
          </div>
          {errors.mobile && <p role="alert" className="text-xs font-medium text-red-600">{errors.mobile}</p>}

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder={t('register.password')}
              aria-label={t('register.password')}
              aria-invalid={Boolean(errors.password)}
              className={inputClass(errors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {errors.password && <p role="alert" className="text-xs font-medium text-red-600">{errors.password}</p>}

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirm}
              onChange={(event) => update('confirm', event.target.value)}
              placeholder={t('register.confirm')}
              aria-label={t('register.confirm')}
              aria-invalid={Boolean(errors.confirm)}
              className={inputClass(errors.confirm)}
            />
          </div>
          {errors.confirm && <p role="alert" className="text-xs font-medium text-red-600">{errors.confirm}</p>}

          <label className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => { setTerms(event.target.checked); setErrors((current) => ({ ...current, terms: undefined })); }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0056D2]"
            />
            <span className="text-[12px] leading-relaxed text-slate-600">{t('register.terms')}</span>
          </label>
          {errors.terms && <p role="alert" className="text-xs font-medium text-red-600">{errors.terms}</p>}
          {serverError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{serverError}</p>}

          <button
            type="submit"
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0056D2] py-3 text-[14px] font-semibold text-white shadow-md hover:bg-blue-800 ${PRESSABLE} group`}
          >
            {t('register.create')} <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-slate-500">
          {t('register.have')}{' '}
          <Link to="/login" className="font-semibold text-[#0056D2] hover:underline">{t('register.login')}</Link>
        </p>
      </div>
    </div>
  );
}
