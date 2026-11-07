import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ship, User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { PRESSABLE } from './components/motion';

export default function LoginPage() {
  const HERO_IMG = '/supercat.jpg';
  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1599827552599-eadf5f19bd4c?auto=format&fit=crop&w=1920&q=80';
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await login('customer', email, password);
      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError.message);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center font-sans overflow-hidden">

      {/* ================= BACK TO HOME BUTTON ================= */}
      <div className="absolute top-8 left-8 md:top-10 md:left-12 z-50">
        <Link
          to="/"
          className="flex items-center gap-2 text-[#0A2540] font-semibold bg-white/40 hover:bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" /> {t('auth.back')}
        </Link>
      </div>

      {/* ================= 1. FULL SCREEN BACKGROUND ================= */}
      <div className="absolute inset-0 z-0">
        <img
          src={HERO_IMG}
          alt="LayagExpress ferry"
          className="w-full h-full object-cover object-[30%_center]"
          onError={(e) => { e.target.src = FALLBACK_IMG; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1527]/60 via-[#0B1527]/20 to-transparent"></div>
      </div>

      {/* ================= 2. MAIN CONTENT CONTAINER ================= */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-8 md:px-16 lg:px-20 flex flex-col lg:flex-row items-center justify-between min-h-screen py-12">

        {/* -------- LEFT SIDE -------- */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center mb-16 lg:mb-0 lg:mt-[-5%]">
          <Link to="/" className="flex items-center gap-3 text-white mb-6">
            <Ship className="w-8 h-8 fill-current" />
            <span className="text-[26px] font-bold tracking-tight">LayagExpress</span>
          </Link>

          <h1 className="text-[2.5rem] md:text-[3.25rem] leading-[1.05] font-bold text-white mb-5 tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
            Your Journey,<br />Our Priority
          </h1>

          <p className="text-white/90 text-[16px] max-w-[420px] leading-[1.6] font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
            Book your next trip with ease, comfort, and reliability — all in one place.
          </p>
        </div>

        {/* -------- RIGHT SIDE (Login Card) -------- */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          <div className="w-full max-w-[400px] bg-[#F8FAFC] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-6 md:p-8 border border-white/50">

            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2.5 text-[#0A2540] mb-5">
                <Ship className="w-9 h-9 fill-current" />
                <span className="text-[28px] font-bold tracking-tight">LayagExpress</span>
              </div>
              <h2 className="text-[18px] font-bold text-[#0A2540] mb-1.5">{t('auth.welcome')}</h2>
              <p className="text-[13px] text-slate-500">{t('auth.sub')}</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError(''); }}
                  placeholder={t('auth.email')}
                  aria-label={t('auth.email')}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2] text-[13px] text-slate-800 placeholder:text-slate-400 transition-all shadow-sm"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-[18px] w-[18px] text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(''); }}
                  placeholder={t('auth.password')}
                  aria-label={t('auth.password')}
                  className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2] text-[13px] text-slate-800 placeholder:text-slate-400 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[13px] pt-1 pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="peer appearance-none w-[18px] h-[18px] border border-[#0056D2] rounded-[4px] checked:bg-[#0056D2] cursor-pointer transition-colors"
                    />
                    <svg className="absolute w-3 h-3 text-white pointer-events-none" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-slate-600 font-medium">{t('auth.remember')}</span>
                </label>
                <a href="#" className="text-[#0056D2] font-semibold hover:underline">
                  {t('auth.forgot')}
                </a>
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
              )}

              <button
                type="submit"
                className={`w-full flex items-center justify-center gap-2 bg-[#0056D2] hover:bg-blue-800 text-white font-semibold py-3 rounded-xl text-[14px] shadow-md mt-2 ${PRESSABLE} group`}
              >
                {t('auth.login')} <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="relative flex items-center py-6">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-[13px]">{t('auth.or')}</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl transition-colors text-[13px] shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t('auth.google')}
            </button>

            <p className="text-center text-[13px] text-slate-500 mt-6">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-[#0056D2] font-semibold hover:underline">{t('auth.signup')}</Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
