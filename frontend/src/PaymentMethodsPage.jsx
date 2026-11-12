// src/PaymentMethodsPage.jsx  -  payment history + pay what is still due
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Landmark, CreditCard, Wallet, Receipt, Plus, Trash2, X, ShieldCheck, Star } from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import Toast from './customer/Toast';
import { useAuth } from './auth/AuthContext';
import { useCurrency } from './currency/CurrencyContext';
import { apiRequest } from './api';
import { formatDateTime } from './data/customerData';

const METHODS = [
  { label: 'GCash', icon: Wallet, note: 'Choose GCash at checkout' },
  { label: 'Maya', icon: Wallet, note: 'Choose Maya at checkout' },
  { label: 'Credit / Debit Card', icon: CreditCard, note: 'Visa and Mastercard' },
  { label: 'Bank Transfer', icon: Landmark, note: 'Online banking transfer' },
  { label: 'Cash at the port counter', icon: Banknote, note: 'Seats are held for 24 hours' },
];

const METHOD_LABELS = { cash: 'Cash at the port counter', gcash: 'GCash', maya: 'Maya', card: 'Credit / Debit Card', bank_transfer: 'Bank Transfer' };
const EMPTY_CARD_FORM = { holderName: '', number: '', expiry: '', cvv: '', brand: '' };
const STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-700',
  refund_pending: 'bg-blue-100 text-blue-800',
  refunded: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-slate-100 text-slate-700',
};

export default function PaymentMethodsPage() {
  const { user, token, updateUser } = useAuth();
  const { format } = useCurrency();
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({ storageKey: 'travezia.customer.sidebarCollapsed' });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [payingId, setPayingId] = useState('');
  const [walletFormOpen, setWalletFormOpen] = useState(false);
  const [methodType, setMethodType] = useState('wallet');
  const [walletForm, setWalletForm] = useState({ provider: 'gcash', accountNumber: '' });
  const [walletError, setWalletError] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  const [removingWalletId, setRemovingWalletId] = useState('');
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);
  const [cardError, setCardError] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [removingCardId, setRemovingCardId] = useState('');
  const wallets = user?.preferences?.wallets || [];
  const cards = user?.preferences?.cards || [];

  const openMethodForm = (type) => {
    setMethodType(type);
    setCardForm({ ...EMPTY_CARD_FORM });
    setWalletError('');
    setCardError('');
    setWalletFormOpen(true);
  };

  const closeMethodForm = () => {
    setWalletFormOpen(false);
    setCardForm({ ...EMPTY_CARD_FORM });
    setWalletError('');
    setCardError('');
  };

  const load = useCallback(async () => {
    try {
      const result = await apiRequest('/payments/my', { token });
      setPayments(result.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const payNow = async (payment) => {
    setPayingId(payment._id);
    try {
      await apiRequest(`/payments/${payment._id}/pay-online`, { token, method: 'POST' });
      setToast('Payment received. Your ticket is ready.');
      await load();
    } catch (e) {
      setToast(e.message);
    } finally {
      setPayingId('');
    }
  };

  const saveWallet = async (event) => {
    event.preventDefault();
    const accountNumber = walletForm.accountNumber.trim();
    const digits = accountNumber.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      setWalletError('Enter a valid wallet mobile number.');
      return;
    }
    if (wallets.some((wallet) => wallet.provider === walletForm.provider
      && wallet.accountNumber.replace(/\D/g, '') === digits)) {
      setWalletError('This wallet is already saved.');
      return;
    }

    setSavingWallet(true);
    setWalletError('');
    try {
      await updateUser({ preferences: { wallets: [...wallets, { provider: walletForm.provider, accountNumber }] } });
      setWalletForm({ provider: 'gcash', accountNumber: '' });
      setWalletFormOpen(false);
      setToast('Wallet added. You can select it at checkout.');
    } catch (e) {
      setWalletError(e.message || 'Could not save this wallet.');
    } finally {
      setSavingWallet(false);
    }
  };

  const saveCard = async (event) => {
    event.preventDefault();
    const digits = cardForm.number.replace(/\D/g, '');
    const expiry = cardForm.expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    const cvv = cardForm.cvv.replace(/\D/g, '');
    if (cardForm.holderName.trim().length < 2) {
      setCardError('Enter the name shown on the card.');
      return;
    }
    const brand = cardForm.brand.trim();
    if (digits.length !== 16) {
      setCardError('Card number must contain exactly 16 digits.');
      return;
    }
    if (brand.length < 2 || brand.length > 30) {
      setCardError('Enter the card brand (2 to 30 characters).');
      return;
    }
    if (!expiry) {
      setCardError('Enter the expiry date as MM/YY.');
      return;
    }
    const expiryMonth = Number(expiry[1]);
    const expiryYear = 2000 + Number(expiry[2]);
    const now = new Date();
    if (expiryYear < now.getFullYear() || (expiryYear === now.getFullYear() && expiryMonth < now.getMonth() + 1)) {
      setCardError('This card has expired.');
      return;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setCardError('Enter a valid CVV.');
      return;
    }

    const savedCard = {
      holderName: cardForm.holderName.trim(),
      brand,
      last4: digits.slice(-4),
      expiryMonth,
      expiryYear,
      isDefault: cards.length === 0,
    };
    setSavingCard(true);
    setCardError('');
    try {
      await updateUser({ preferences: { cards: [...cards, savedCard] } });
      setCardForm({ ...EMPTY_CARD_FORM });
      setWalletFormOpen(false);
      setToast('Card added.');
    } catch (e) {
      setCardError(e.message || 'Could not save this card.');
    } finally {
      setSavingCard(false);
    }
  };

  const removeCard = async (card) => {
    const id = String(card._id);
    setRemovingCardId(id);
    try {
      await updateUser({
        preferences: {
          cards: cards.filter((item) => String(item._id) !== id),
        },
      });
      setToast('Card removed.');
    } catch (e) {
      setToast(e.message || 'Could not remove this card.');
    } finally {
      setRemovingCardId('');
    }
  };

  const setDefaultCard = async (card) => {
    try {
      await updateUser({
        preferences: {
          cards: cards.map((item) => ({ ...item, isDefault: String(item._id) === String(card._id) })),
        },
      });
      setToast(`${card.brand} set as your default card.`);
    } catch (e) {
      setToast(e.message || 'Could not update your default card.');
    }
  };

  const removeWallet = async (wallet) => {
    const id = String(wallet._id || `${wallet.provider}:${wallet.accountNumber}`);
    setRemovingWalletId(id);
    try {
      await updateUser({
        preferences: {
          wallets: wallets.filter((item) => String(item._id || `${item.provider}:${item.accountNumber}`) !== id),
        },
      });
      setToast('Wallet removed.');
    } catch (e) {
      setToast(e.message || 'Could not remove this wallet.');
    } finally {
      setRemovingWalletId('');
    }
  };

  const maskedWalletNumber = (value) => `•••• ${value.replace(/\D/g, '').slice(-4)}`;

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">
      <CustomerSidebar open={mobileOpen} onClose={closeMobile} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      <main className="flex flex-1 flex-col">
        <CustomerHeader title="Payments" subtitle="Your payment history and ways to pay" onOpenMenu={openMobile} />
        <div className="px-4 md:px-8 pb-10 max-w-[1100px] mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Payment Methods</h1>
            <p className="text-slate-500 text-sm">Manage your saved cards and e-wallets for faster checkout.</p>
          </div>

          <section className="mb-8 grid gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#0056FF]" />
                <h2 className="text-lg font-bold text-slate-900">Saved Cards</h2>
              </div>
              <div className="space-y-4">
                {cards.length === 0 && (
                  <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    No saved cards yet.
                  </p>
                )}
                {cards.map((card) => (
                  <div key={card._id} className={`relative h-[180px] overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg ${card.brand === 'Visa' ? 'from-blue-900 to-slate-800' : 'from-slate-700 to-slate-900'}`}>
                    <Landmark className="pointer-events-none absolute right-8 top-[4.5rem] h-16 w-16 text-white/20" strokeWidth={3} aria-hidden="true" />
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-7 w-11 shrink-0 rounded-md bg-white/20" aria-hidden="true" />
                        <p className="truncate text-lg font-bold italic">{card.brand}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {card.isDefault && <span className="rounded-md bg-emerald-500/25 px-2 py-1 text-xs font-bold text-emerald-200">Default</span>}
                        {!card.isDefault && (
                          <button type="button" onClick={() => setDefaultCard(card)} className="rounded-md bg-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/25">
                            <Star className="mr-1 inline h-3.5 w-3.5" /> Set default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCard(card)}
                          disabled={removingCardId === String(card._id)}
                          aria-label={`Remove ${card.brand} ending in ${card.last4}`}
                          className="rounded-md p-1.5 text-white/75 hover:bg-white/15 hover:text-white disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="relative z-10 mt-6 font-mono text-lg tracking-[0.18em]">•••• •••• •••• {card.last4}</p>
                    <div className="relative z-10 mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-white/65">Card Holder</p>
                        <p className="mt-1 max-w-[260px] truncate text-sm font-bold uppercase">{card.holderName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/65">Expires</p>
                        <p className="mt-1 text-sm font-bold">{String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#0056FF]" />
                <h2 className="text-lg font-bold text-slate-900">E-Wallets</h2>
              </div>
              <div className="space-y-4">
                {wallets.map((wallet) => {
                  const walletId = String(wallet._id || `${wallet.provider}:${wallet.accountNumber}`);
                  const label = wallet.provider === 'maya' ? 'Maya' : 'GCash';
                  return (
                    <div key={walletId} className="flex min-h-[88px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-[#0056FF]" aria-hidden="true">{wallet.provider === 'maya' ? 'M' : 'G'}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{label}</p>
                          <p className="text-xs text-slate-500">{maskedWalletNumber(wallet.accountNumber)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWallet(wallet)}
                        disabled={removingWalletId === walletId}
                        aria-label={`Remove ${label} wallet`}
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => openMethodForm('wallet')}
                  className="flex min-h-[128px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-transparent px-4 py-5 text-center transition-colors hover:border-[#0056FF] hover:bg-blue-50/40"
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Plus className="h-5 w-5" /></span>
                  <span className="text-sm font-bold text-slate-900">Add Payment Method</span>
                  <span className="mt-1 text-xs text-slate-500">Credit/Debit Card or E-Wallet</span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-800 lg:col-span-2">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Only masked card details and wallet numbers are saved. CVV codes and wallet PINs are never stored.</p>
            </div>
          </section>

          {walletFormOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeMethodForm();
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-wallet-title"
                className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 id="add-wallet-title" className="text-lg font-bold text-slate-900">Add payment method</h2>
                    <p className="mt-1 text-sm text-slate-500">Card details are masked after saving. CVV is never stored.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeMethodForm}
                    aria-label="Close"
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mx-5 mt-5 flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMethodType('card');
                      setCardForm({ ...EMPTY_CARD_FORM });
                      setCardError('');
                    }}
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold ${methodType === 'card' ? 'bg-white text-[#0056FF] shadow-sm' : 'text-slate-600'}`}
                  >
                    Credit / Debit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethodType('wallet');
                      setCardForm({ ...EMPTY_CARD_FORM });
                      setWalletError('');
                    }}
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold ${methodType === 'wallet' ? 'bg-white text-[#0056FF] shadow-sm' : 'text-slate-600'}`}
                  >
                    E-Wallet
                  </button>
                </div>

                {methodType === 'wallet' ? (
                <form onSubmit={saveWallet} className="space-y-4 p-5">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">Wallet</span>
                    <select
                      value={walletForm.provider}
                      onChange={(event) => setWalletForm({ ...walletForm, provider: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
                    >
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">Mobile number</span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      required
                      value={walletForm.accountNumber}
                      onChange={(event) => setWalletForm({ ...walletForm, accountNumber: event.target.value })}
                      placeholder="+63 912 345 6789"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
                    />
                  </label>
                  {walletError && <p role="alert" className="text-xs font-medium text-red-600">{walletError}</p>}
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={closeMethodForm}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingWallet}
                      className="rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
                    >
                      {savingWallet ? 'Saving…' : 'Save method'}
                    </button>
                  </div>
                </form>
                ) : (
                  <form onSubmit={saveCard} className="space-y-4 p-5">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">Card holder</span>
                      <input
                        type="text"
                        autoComplete="cc-name"
                        required
                        value={cardForm.holderName}
                        onChange={(event) => setCardForm({ ...cardForm, holderName: event.target.value })}
                        placeholder="Name on card"
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">Card type</span>
                      <input
                        type="text"
                        required
                        maxLength={30}
                        value={cardForm.brand}
                        onChange={(event) => setCardForm({ ...cardForm, brand: event.target.value })}
                        placeholder="e.g. Visa"
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">Card number</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        required
                        maxLength={19}
                        value={cardForm.number}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '').slice(0, 16);
                          const groups = digits.match(/.{1,4}/g) || [];
                          setCardForm({ ...cardForm, number: groups.filter(Boolean).join(' ') });
                        }}
                        placeholder="1234 5678 9012 3456"
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Expiry (MM/YY)</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          required
                          maxLength={5}
                          value={cardForm.expiry}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                            setCardForm({ ...cardForm, expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits });
                          }}
                          placeholder="12/28"
                          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-slate-600">CVV</span>
                        <input
                          type="password"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          required
                          maxLength={4}
                          value={cardForm.cvv}
                          onChange={(event) => setCardForm({ ...cardForm, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) })}
                          placeholder="••••"
                          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/20"
                        />
                      </label>
                    </div>
                    {cardError && <p role="alert" className="text-xs font-medium text-red-600">{cardError}</p>}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={closeMethodForm}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingCard}
                        className="rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
                      >
                        {savingCard ? 'Saving…' : 'Save method'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </div>
          )}

          <section className="mb-10">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Ways to pay</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {METHODS.map(({ label, icon: Icon, note }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Icon className="mb-3 h-6 w-6 text-[#0056FF]" />
                  <p className="text-sm font-bold text-slate-900">{label}</p>
                  <p className="mt-1 text-xs text-slate-500">{note}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Choose a method when booking. Online payment is simulated in this demo; card details and wallet PINs are never stored.</p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold text-slate-900">Payment history</h2>
            {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {loading && <p className="text-sm text-slate-500">Loading payments…</p>}
            {!loading && payments.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <Receipt className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                <h3 className="mb-1 text-lg font-bold text-slate-900">No payments yet</h3>
                <p className="text-sm text-slate-500">Your payments will appear here after you book a trip.</p>
                <Link to="/find-ships" className="mt-4 inline-block rounded-lg bg-[#0056FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Book a Trip</Link>
              </div>
            )}
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment._id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{payment.booking?.bookingReference || 'Booking'}</p>
                      <span className={`rounded-full px-3 py-0.5 text-xs font-bold capitalize ${STATUS_STYLES[payment.status] || 'bg-slate-100 text-slate-700'}`}>
                        {payment.status === 'pending' && payment.method === 'bank_transfer' ? 'Awaiting verification' : payment.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {METHOD_LABELS[payment.method] || payment.method}
                      {payment.walletAccountLast4 ? ` · Wallet ending ${payment.walletAccountLast4}` : ''}
                      {payment.cardAccountLast4 ? ` · ${payment.cardBrand || 'Card'} ending ${payment.cardAccountLast4}` : ''}
                      {payment.bankTransferReference ? ` · Transfer ref ${payment.bankTransferReference}` : ''}
                      {payment.bankTransferProofFileName ? ` · Proof ${payment.bankTransferProofFileName}` : ''}
                      {' · '}{formatDateTime(payment.paidAt || payment.createdAt)}
                      {payment.transactionRef ? ` · ${payment.transactionRef}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-[#0056FF]">{format(payment.amount)}</p>
                    {payment.status === 'pending' && payment.channel === 'online' && payment.method !== 'bank_transfer' && (
                      <button
                        type="button"
                        onClick={() => payNow(payment)}
                        disabled={payingId === payment._id}
                        className="rounded-lg bg-[#0056FF] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                      >
                        {payingId === payment._id ? 'Processing…' : 'Pay now'}
                      </button>
                    )}
                    {payment.booking?._id && (
                      <Link to={`/bookings/${payment.booking._id}`} className="text-sm font-semibold text-[#0056FF] hover:underline">View</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
