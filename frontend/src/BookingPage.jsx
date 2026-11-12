// src/BookingPage.jsx  -  book a real sailing: passengers + seats, or cargo, then pay
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Package, Plane, Ship, CalendarDays, MapPin, Plus, Trash2, Wallet, CreditCard, Landmark, Banknote, Loader2, Upload,
} from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';
import Modal from './customer/Modal';
import { useAuth } from './auth/AuthContext';
import { useCurrency } from './currency/CurrencyContext';
import { apiRequest, tripRoute } from './api';
import {
  getDestination, getShipTypeLabel, getSeatClassLabel, formatDate, formatTime, formatTripDuration,
  computeFare, FARE_CATEGORY_LABELS, DISCOUNT_RATES, fullName,
} from './data/customerData';

const MAX_PASSENGERS = 10; // backend limit

const PAYMENT_OPTIONS = [
  { channel: 'online', method: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
  { channel: 'physical', method: 'cash', label: 'Pay at the port counter', icon: Banknote },
];

const savedWalletOption = (wallet) => {
  const providerName = wallet.provider === 'maya' ? 'Maya' : 'GCash';
  const last4 = wallet.accountNumber.replace(/\D/g, '').slice(-4);
  return {
    channel: 'online',
    method: wallet.provider,
    label: `${providerName} · ending ${last4}`,
    icon: Wallet,
    walletId: String(wallet._id),
  };
};

const savedCardOption = (card) => ({
  channel: 'online',
  method: 'card',
  label: `${card.brand} · ending ${card.last4}`,
  icon: CreditCard,
  cardId: String(card._id),
});

const inputClass = (hasError) => `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 ${
  hasError
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
    : 'border-slate-200 focus:border-[#0066FF] focus:ring-[#0066FF]/20'
}`;

let sequence = 0;
const newPassenger = (fareCategory = 'regular') => {
  sequence += 1;
  return { key: `p-${Date.now()}-${sequence}`, firstName: '', lastName: '', age: '', gender: '', contactNumber: '', fareCategory, seat: '' };
};

export default function BookingPage() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const { format } = useCurrency();
  const savedWallets = user?.preferences?.wallets || [];
  const savedCards = user?.preferences?.cards || [];
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  const [trip, setTrip] = useState(null);
  const [seatData, setSeatData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('travel');

  // ---- passengers
  const [useMyDetails, setUseMyDetails] = useState(true);
  const [passengers, setPassengers] = useState(() => {
    const adults = Math.max(1, Number(searchParams.get('adults')) || 1);
    const children = Number(searchParams.get('children')) || 0;
    const seniors = Number(searchParams.get('seniors')) || 0;
    return [
      ...Array.from({ length: adults }, () => newPassenger('regular')),
      ...Array.from({ length: seniors }, () => newPassenger('senior')),
      ...Array.from({ length: children }, () => newPassenger('child')),
    ].slice(0, MAX_PASSENGERS);
  });
  const [activeKey, setActiveKey] = useState(null);

  // ---- cargo
  const [cargo, setCargo] = useState({ description: '', weightKg: '', recipientName: '', recipientContact: '', vipSeatNumber: '' });

  // ---- payment + submit
  const [payment, setPayment] = useState(null);
  const [bankTransfer, setBankTransfer] = useState({
    senderName: '',
    senderBank: '',
    referenceNumber: '',
    transferDate: '',
    proof: null,
  });
  const [bankTransferError, setBankTransferError] = useState('');
  const paymentOptions = [
    ...savedWallets.map(savedWalletOption),
    ...savedCards.map(savedCardOption),
    ...PAYMENT_OPTIONS,
  ];
  const [errors, setErrors] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([apiRequest(`/trips/${tripId}`), apiRequest(`/trips/${tripId}/seats`)])
      .then(([tripResult, seatResult]) => {
        if (!active) return;
        setTrip(tripResult);
        setSeatData(seatResult);
      })
      .catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [tripId]);

  useEffect(() => {
    if (!activeKey && passengers.length) setActiveKey(passengers[0].key);
  }, [passengers, activeKey]);

  const canCargo = Boolean(trip && trip.cargoRatePerKg > 0);
  const { fromCode, toCode } = tripRoute(trip);
  const origin = getDestination(fromCode);
  const destination = getDestination(toCode);
  const bookable = trip && trip.status === 'scheduled' && new Date(trip.departureAt) > new Date();

  const seatByNumber = useMemo(() => new Map((seatData?.seats || []).map((s) => [s.seatNumber, s])), [seatData]);
  const seatsByClass = useMemo(() => {
    const groups = {};
    (seatData?.seats || []).forEach((seat) => {
      (groups[seat.seatClass] ||= []).push(seat);
    });
    return groups;
  }, [seatData]);

  const updatePassenger = (key, patch) => {
    setPassengers((current) => current.map((p) => (p.key === key ? { ...p, ...patch } : p)));
    setErrors([]);
  };

  const addPassenger = () => {
    if (passengers.length >= MAX_PASSENGERS) return;
    const next = newPassenger('regular');
    setPassengers((current) => [...current, next]);
    setActiveKey(next.key);
  };

  const removePassenger = (key) => {
    setPassengers((current) => current.filter((p) => p.key !== key));
    if (activeKey === key) setActiveKey(null);
  };

  const pickSeat = (seatNumber) => {
    const takenBy = passengers.find((p) => p.seat === seatNumber);
    if (takenBy) {
      updatePassenger(takenBy.key, { seat: '' });
      setActiveKey(takenBy.key);
      return;
    }
    const target = passengers.find((p) => p.key === activeKey) || passengers.find((p) => !p.seat);
    if (!target) return;
    updatePassenger(target.key, { seat: seatNumber });
    const nextEmpty = passengers.find((p) => p.key !== target.key && !p.seat);
    if (nextEmpty) setActiveKey(nextEmpty.key);
  };

  // ---- pricing (same rules the server applies)
  const priced = useMemo(() => passengers.map((p) => {
    const seat = seatByNumber.get(p.seat);
    if (!seat) return { ...p, base: 0, discount: 0, price: 0 };
    const fare = computeFare(seat.price, p.fareCategory);
    return { ...p, base: fare.basePrice, discount: fare.discountAmount, price: fare.price };
  }), [passengers, seatByNumber]);
  const passengerTotal = priced.reduce((sum, p) => sum + p.price, 0);
  const cargoWeight = Number(cargo.weightKg) || 0;
  const cargoTotal = Math.round(cargoWeight * (trip?.cargoRatePerKg || 0) * 100) / 100;
  const vipSeat = cargo.vipSeatNumber ? seatByNumber.get(cargo.vipSeatNumber) : null;
  const vipSeatPrice = vipSeat?.seatClass === 'vip' ? vipSeat.price : 0;
  const total = activeTab === 'travel' ? passengerTotal : cargoTotal + vipSeatPrice;

  const profileNeedsAge = useMyDetails && !user?.age;

  const validate = () => {
    const found = [];
    if (!payment) found.push('Choose a payment method before booking.');
    if (payment?.method === 'bank_transfer') {
      if (!bankTransfer.senderName.trim()) found.push('Enter the sender account holder name.');
      if (!bankTransfer.senderBank.trim()) found.push('Enter the sender bank.');
      if (!bankTransfer.referenceNumber.trim()) found.push('Enter the transfer reference number.');
      if (!bankTransfer.transferDate || new Date(`${bankTransfer.transferDate}T00:00:00`) > new Date()) {
        found.push('Enter a valid transfer date that is not in the future.');
      }
      if (!bankTransfer.proof) found.push('Upload proof of bank transfer.');
    }
    if (activeTab === 'travel') {
      passengers.forEach((p, index) => {
        const label = `Passenger ${index + 1}`;
        const mine = index === 0 && useMyDetails;
        const age = Number(mine ? (user?.age || p.age) : p.age);
        if (!mine && (!p.firstName.trim() || !p.lastName.trim())) found.push(`${label}: enter first and last name.`);
        if (!Number.isFinite(age) || age < 0 || age > 120 || (mine ? !(user?.age || p.age) : p.age === '')) found.push(`${label}: enter a valid age.`);
        else {
          if (p.fareCategory === 'child' && age > 11) found.push(`${label}: the child fare is for ages 11 and below.`);
          if (p.fareCategory === 'senior' && age < 60) found.push(`${label}: the senior fare is for ages 60 and above.`);
        }
        if (!mine && age >= 18 && (p.contactNumber.replace(/\D/g, '').length < 10)) found.push(`${label}: enter a contact number (10+ digits).`);
        if (!p.seat) found.push(`${label}: choose a seat.`);
      });
    } else {
      if (!cargo.description.trim()) found.push('Describe the cargo.');
      if (!(cargoWeight > 0)) found.push('Enter the cargo weight in kg.');
      else if (seatData && cargoWeight > seatData.cargo.availableKg) found.push(`Only ${seatData.cargo.availableKg.toLocaleString()} kg of cargo space is left on this trip.`);
      if (!cargo.recipientName.trim()) found.push('Enter the recipient name.');
      if (!cargo.recipientContact.trim()) found.push('Enter the recipient contact number.');
      if (cargo.vipSeatNumber && (!vipSeat || vipSeat.seatClass !== 'vip' || !vipSeat.isAvailable || !(vipSeat.price > 0))) {
        found.push('Choose an available VIP seat.');
      }
    }
    return found;
  };

  const handleBankProofChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!acceptedTypes.includes(file.type)) {
      setBankTransfer((current) => ({ ...current, proof: null }));
      setBankTransferError('Choose a JPG, PNG, or PDF file.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setBankTransfer((current) => ({ ...current, proof: null }));
      setBankTransferError('Proof of transfer must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setBankTransferError('Could not read the selected proof file.');
        return;
      }
      setBankTransfer((current) => ({
        ...current,
        proof: { fileName: file.name, mimeType: file.type, dataUrl: reader.result },
      }));
      setBankTransferError('');
      setErrors((current) => current.filter((message) => message !== 'Upload proof of bank transfer.'));
    };
    reader.onerror = () => setBankTransferError('Could not read the selected proof file.');
    reader.readAsDataURL(file);
  };

  const handleProceed = () => {
    const found = validate();
    setErrors(found);
    if (found.length === 0) { setSubmitError(''); setReviewOpen(true); }
  };

  const handleConfirm = async () => {
    if (!payment) {
      setSubmitError('Choose a payment method before booking.');
      setReviewOpen(false);
      setErrors(['Choose a payment method before booking.']);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      // the account needs an age for "myself" - keep it on the profile for next time
      if (activeTab === 'travel' && useMyDetails && !user?.age && passengers[0].age) {
        await updateUser({ age: Number(passengers[0].age), ...(passengers[0].gender ? { gender: passengers[0].gender } : {}) });
      }
      const body = {
        tripId,
        bookingType: activeTab === 'travel' ? 'passenger' : 'cargo',
        payment: {
          channel: payment.channel,
          method: payment.method,
          ...(payment.walletId ? { walletId: payment.walletId } : {}),
          ...(payment.cardId ? { cardId: payment.cardId } : {}),
          ...(payment.method === 'bank_transfer' ? {
            bankTransfer: {
              senderName: bankTransfer.senderName.trim(),
              senderBank: bankTransfer.senderBank.trim(),
              referenceNumber: bankTransfer.referenceNumber.trim(),
              transferDate: bankTransfer.transferDate,
              proofFileName: bankTransfer.proof?.fileName,
              proofMimeType: bankTransfer.proof?.mimeType,
              proofDataUrl: bankTransfer.proof?.dataUrl,
            },
          } : {}),
        },
      };
      if (activeTab === 'travel') {
        body.passengers = passengers.map((p, index) => (index === 0 && useMyDetails
          ? { useMyDetails: true, seatNumber: p.seat, fareCategory: p.fareCategory, age: Number(p.age) || undefined, gender: p.gender || undefined }
          : {
            firstName: p.firstName.trim(),
            lastName: p.lastName.trim(),
            age: Number(p.age),
            gender: p.gender || undefined,
            contactNumber: p.contactNumber.trim() || undefined,
            seatNumber: p.seat,
            fareCategory: p.fareCategory,
          }));
      } else {
        body.cargo = {
          description: cargo.description.trim(),
          weightKg: cargoWeight,
          recipientName: cargo.recipientName.trim(),
          recipientContact: cargo.recipientContact.trim(),
          vipSeatNumber: cargo.vipSeatNumber || undefined,
        };
      }
      const booking = await apiRequest('/bookings', { token, method: 'POST', body });
      navigate(`/bookings/${booking._id}`, {
        state: { justBooked: true, paymentChannel: payment.channel, paymentMethod: payment.method },
      });
    } catch (error) {
      setSubmitError(error.message);
      // a seat may have just been taken - refresh the map so the person can pick another
      apiRequest(`/trips/${tripId}/seats`).then(setSeatData).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const renderSeat = (seat) => {
    const owner = passengers.findIndex((p) => p.seat === seat.seatNumber);
    const isSelected = owner >= 0;
    const unavailable = !seat.isAvailable;
    return (
      <button
        key={seat.seatNumber}
        type="button"
        disabled={unavailable}
        onClick={() => pickSeat(seat.seatNumber)}
        aria-pressed={isSelected}
        aria-label={`Seat ${seat.seatNumber}${unavailable ? ' (occupied)' : isSelected ? ` (passenger ${owner + 1})` : ''}`}
        className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-t-lg rounded-b-md border-2 flex items-center justify-center text-xs font-bold transition-all ${
          unavailable ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
            : isSelected ? 'bg-[#0066FF] border-[#0066FF] text-white shadow-lg scale-105'
              : 'bg-blue-50 border-blue-200 text-[#0066FF] hover:bg-blue-100 hover:border-blue-300 hover:scale-105'
        }`}
      >
        {isSelected ? owner + 1 : seat.seatNumber}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">
      <CustomerSidebar open={mobileOpen} onClose={closeMobile} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />

      <main className="flex flex-1 flex-col">
        <CustomerHeader title="Book a Trip" subtitle="Choose your seats and pay" onOpenMenu={openMobile} />

        <div className="px-4 md:px-8 pb-24 w-full max-w-[1200px] mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600" aria-label="Back to dashboard">
                  <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Book a Trip</h1>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto" role="group" aria-label="Booking type">
                <button
                  type="button"
                  aria-pressed={activeTab === 'travel'}
                  onClick={() => { setActiveTab('travel'); setErrors([]); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'travel' ? 'bg-white text-[#0056FF] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Plane className="w-4 h-4" /> Travel
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === 'cargo'}
                  disabled={!canCargo}
                  title={canCargo ? '' : 'This trip does not carry cargo'}
                  onClick={() => { setActiveTab('cargo'); setErrors([]); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${activeTab === 'cargo' ? 'bg-white text-[#0056FF] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Package className="w-4 h-4" /> Cargo
                </button>
              </div>
            </div>

            {loadError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
            {!trip && !loadError && <p className="text-sm text-slate-500">Loading trip…</p>}

            {trip && (
              <>
                <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <img src={trip.boat?.imageUrl} alt={trip.boat?.name} className="hidden h-16 w-24 rounded-xl object-cover sm:block" />
                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#0056FF]">Selected Trip</p>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                          <Ship className="h-5 w-5 text-[#0056FF]" /> {trip.boat?.name}
                        </h2>
                        <p className="text-sm text-slate-600">
                          {getShipTypeLabel(trip.boat?.boatType)}{trip.boat?.operator ? ` • ${trip.boat.operator}` : ''}
                        </p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
                          <span className="flex items-center gap-1 font-semibold">
                            <MapPin className="h-4 w-4 text-[#0056FF]" /> {origin.city} → {destination.city}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4 text-slate-400" /> {formatDate(trip.departureAt, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>{formatTime(trip.departureAt)} → {formatTime(trip.arrivalAt)}</span>
                          <span className="text-slate-300">•</span>
                          <span>{formatTripDuration(trip.departureAt, trip.arrivalAt)}</span>
                        </p>
                      </div>
                    </div>
                    <Link to="/find-ships" className="text-sm font-semibold text-[#0056FF] hover:underline">Change trip</Link>
                  </div>
                </div>

                {!bookable && (
                  <p role="alert" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    This trip can no longer be booked ({trip.status === 'scheduled' ? 'it has already departed' : trip.status}). Please choose another trip.
                  </p>
                )}

                {activeTab === 'travel' ? (
                  <>
                    <div className="mb-8">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900">Passengers</h3>
                        <button
                          type="button"
                          onClick={addPassenger}
                          disabled={passengers.length >= MAX_PASSENGERS}
                          className="flex items-center gap-1.5 text-sm font-semibold text-[#0056FF] hover:underline disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" /> Add passenger
                        </button>
                      </div>

                      <div className="space-y-4">
                        {passengers.map((p, index) => {
                          const mine = index === 0 && useMyDetails;
                          const isActive = activeKey === p.key;
                          return (
                            <div
                              key={p.key}
                              onClick={() => setActiveKey(p.key)}
                              className={`rounded-2xl border p-4 transition-colors ${isActive ? 'border-[#0066FF] bg-blue-50/40' : 'border-slate-200'}`}
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-sm font-bold text-slate-900">
                                  Passenger {index + 1}{mine ? ' (you)' : ''}
                                </p>
                                <div className="flex items-center gap-3">
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0056FF] ring-1 ring-blue-100">
                                    {p.seat ? `Seat ${p.seat} · ${getSeatClassLabel(seatByNumber.get(p.seat)?.seatClass)}` : 'Pick a seat below'}
                                  </span>
                                  {index > 0 && (
                                    <button type="button" onClick={() => removePassenger(p.key)} aria-label={`Remove passenger ${index + 1}`} className="text-slate-400 hover:text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {index === 0 && (
                                <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                                  <input type="checkbox" checked={useMyDetails} onChange={(e) => setUseMyDetails(e.target.checked)} />
                                  I am travelling ({fullName(user) || 'my account details'})
                                </label>
                              )}

                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {!mine && (
                                  <>
                                    <input aria-label={`Passenger ${index + 1} first name`} placeholder="First name" value={p.firstName} onChange={(e) => updatePassenger(p.key, { firstName: e.target.value })} className={inputClass(false)} />
                                    <input aria-label={`Passenger ${index + 1} last name`} placeholder="Last name" value={p.lastName} onChange={(e) => updatePassenger(p.key, { lastName: e.target.value })} className={inputClass(false)} />
                                  </>
                                )}
                                {(!mine || profileNeedsAge) && (
                                  <input aria-label={`Passenger ${index + 1} age`} type="number" min="0" max="120" placeholder="Age" value={p.age} onChange={(e) => updatePassenger(p.key, { age: e.target.value })} className={inputClass(false)} />
                                )}
                                {(!mine || !user?.gender) && (
                                  <select aria-label={`Passenger ${index + 1} gender`} value={p.gender} onChange={(e) => updatePassenger(p.key, { gender: e.target.value })} className={inputClass(false)}>
                                    <option value="">Gender (optional)</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                  </select>
                                )}
                                {!mine && (
                                  <input aria-label={`Passenger ${index + 1} contact number`} type="tel" placeholder="Contact number (adults)" value={p.contactNumber} onChange={(e) => updatePassenger(p.key, { contactNumber: e.target.value })} className={inputClass(false)} />
                                )}
                                <select aria-label={`Passenger ${index + 1} fare type`} value={p.fareCategory} onChange={(e) => updatePassenger(p.key, { fareCategory: e.target.value })} className={inputClass(false)}>
                                  {Object.entries(FARE_CATEGORY_LABELS).map(([id, label]) => (
                                    <option key={id} value={id}>
                                      {label}{DISCOUNT_RATES[id] ? ` (${DISCOUNT_RATES[id] * 100}% off)` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {mine && profileNeedsAge && (
                                <p className="mt-2 text-xs text-slate-500">Your age will be saved to your profile for your next booking.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">Discounted fares (student, senior, PWD, child) require a valid ID at boarding.</p>
                    </div>

                    <div className="mb-2">
                      <h3 className="mb-1 text-base font-bold text-slate-900">Choose seats</h3>
                      <p className="mb-4 text-xs text-slate-500">Select a passenger above, then tap a seat. Tap a chosen seat again to release it.</p>
                      <div className="w-full overflow-x-auto rounded-[2rem] border border-[#C7D7F2] bg-gradient-to-r from-[#EDF4FF] via-[#F8FBFF] to-white p-5">
                        <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          <span>◀ Bow · Front of Ship</span>
                          <span>Stern · Back of Ship ▶</span>
                        </div>
                        {!seatData ? (
                          <p className="text-sm text-slate-500">Loading seats…</p>
                        ) : (
                          <div className="space-y-5">
                            {Object.entries(seatsByClass).map(([cls, seatList]) => (
                              <div key={cls}>
                                <p className="mb-2 text-xs font-bold text-slate-600">
                                  {getSeatClassLabel(cls)} · {format(seatList[0].price)} per person ·{' '}
                                  {seatList.filter((s) => s.isAvailable).length} available
                                </p>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">{seatList.map(renderSeat)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mb-2 grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">What are you shipping?</span>
                      <input value={cargo.description} onChange={(e) => { setCargo({ ...cargo, description: e.target.value }); setErrors([]); }} placeholder="e.g. 5 sacks of rice" className={inputClass(false)} />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Weight (kg)</span>
                      <input type="number" min="0.1" step="0.1" value={cargo.weightKg} onChange={(e) => { setCargo({ ...cargo, weightKg: e.target.value }); setErrors([]); }} className={inputClass(false)} />
                      <span className="mt-1 block text-xs text-slate-500">
                        {format(trip.cargoRatePerKg)} per kg · {seatData ? `${seatData.cargo.availableKg.toLocaleString()} kg space left` : ''}
                      </span>
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-600">VIP seat for sender (optional)</span>
                      <select
                        value={cargo.vipSeatNumber}
                        onChange={(e) => { setCargo({ ...cargo, vipSeatNumber: e.target.value }); setErrors([]); }}
                        className={inputClass(false)}
                      >
                        <option value="">No VIP seat</option>
                        {(seatsByClass.vip || []).map((seat) => (
                          <option key={seat.seatNumber} value={seat.seatNumber} disabled={!seat.isAvailable || !(seat.price > 0)}>
                            {seat.seatNumber} · {format(seat.price)}{seat.isAvailable ? '' : ' (unavailable)'}
                          </option>
                        ))}
                      </select>
                      {!seatData && <span className="mt-1 block text-xs text-slate-500">Loading VIP seats…</span>}
                      {seatData && !(seatsByClass.vip || []).some((seat) => seat.isAvailable && seat.price > 0) && (
                        <span className="mt-1 block text-xs text-slate-500">No VIP seats are available on this trip.</span>
                      )}
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Recipient name <span className="text-red-600">*</span></span>
                      <input
                        value={cargo.recipientName}
                        onChange={(e) => { setCargo({ ...cargo, recipientName: e.target.value }); setErrors([]); }}
                        required
                        aria-required="true"
                        className={inputClass(false)}
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Recipient contact <span className="text-red-600">*</span></span>
                      <input
                        type="tel"
                        value={cargo.recipientContact}
                        onChange={(e) => { setCargo({ ...cargo, recipientContact: e.target.value }); setErrors([]); }}
                        required
                        aria-required="true"
                        className={inputClass(false)}
                      />
                    </label>
                  </div>
                )}

                {/* ---------- payment + summary ---------- */}
                <div className="mt-12 pt-8 border-t border-slate-200">
                  <h3 className="mb-3 text-base font-bold text-slate-900">Payment method</h3>
                  <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {paymentOptions.map((option) => {
                      const Icon = option.icon;
                      const selected = payment?.method === option.method
                        && payment?.walletId === option.walletId
                        && payment?.cardId === option.cardId;
                      return (
                        <button
                          key={option.walletId || option.cardId || option.method}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setPayment(option);
                            setErrors((current) => current.filter((message) => message !== 'Choose a payment method before booking.'));
                          }}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${selected ? 'border-[#0066FF] bg-blue-50 text-[#0056FF]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                          <Icon className="h-4 w-4" /> {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {savedCards.length === 0 && (
                    <p className="mb-5 text-xs text-slate-500">
                      To pay by card, first add one in <Link to="/payment-methods" className="font-semibold text-[#0056FF] hover:underline">Payment Methods</Link>.
                    </p>
                  )}
                  {savedWallets.length === 0 && (
                    <p className="mb-5 text-xs text-slate-500">
                      To pay with GCash or Maya, first save an e-wallet in <Link to="/payment-methods" className="font-semibold text-[#0056FF] hover:underline">Payment Methods</Link>.
                    </p>
                  )}
                  {payment?.method === 'bank_transfer' && (
                    <div className="mb-5 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Bank transfer details</h4>
                        <p className="mt-1 text-xs text-slate-500">Enter the sender details and upload proof of transfer.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-600">Account holder name *</span>
                          <input
                            type="text"
                            autoComplete="name"
                            value={bankTransfer.senderName}
                            onChange={(event) => { setBankTransfer({ ...bankTransfer, senderName: event.target.value }); setErrors([]); }}
                            className={inputClass(false)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-600">Sender bank *</span>
                          <input
                            type="text"
                            value={bankTransfer.senderBank}
                            onChange={(event) => { setBankTransfer({ ...bankTransfer, senderBank: event.target.value }); setErrors([]); }}
                            placeholder="e.g. BDO"
                            className={inputClass(false)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-600">Transfer reference number *</span>
                          <input
                            type="text"
                            value={bankTransfer.referenceNumber}
                            onChange={(event) => { setBankTransfer({ ...bankTransfer, referenceNumber: event.target.value }); setErrors([]); }}
                            className={inputClass(false)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-600">Transfer date *</span>
                          <input
                            type="date"
                            value={bankTransfer.transferDate}
                            onChange={(event) => { setBankTransfer({ ...bankTransfer, transferDate: event.target.value }); setErrors([]); }}
                            className={inputClass(false)}
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Proof of transfer * (JPG, PNG, PDF; max 2 MB)</span>
                        <span className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600">
                          <Upload className="h-4 w-4 shrink-0" />
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                            onChange={handleBankProofChange}
                            className="min-w-0 flex-1 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-semibold file:text-[#0056FF]"
                          />
                        </span>
                        {bankTransfer.proof && <span className="mt-1 block truncate text-xs text-emerald-700">Selected: {bankTransfer.proof.fileName}</span>}
                        {bankTransferError && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{bankTransferError}</span>}
                      </label>
                    </div>
                  )}
                  {payment?.channel === 'physical' && (
                    <p className="mb-5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                      Your seats are held for 24 hours (or until departure, whichever is sooner). Pay at the port counter to confirm your ticket.
                    </p>
                  )}

                  <div className="mb-5 flex flex-col gap-1 text-sm text-slate-600">
                    {activeTab === 'travel' ? priced.map((p, index) => (
                      <div key={p.key} className="flex justify-between">
                        <span>
                          Passenger {index + 1}{p.seat ? ` · ${p.seat}` : ''} · {FARE_CATEGORY_LABELS[p.fareCategory]}
                          {p.discount > 0 && <span className="text-emerald-600"> (−{format(p.discount)})</span>}
                        </span>
                        <span>{p.seat ? format(p.price) : '—'}</span>
                      </div>
                    )) : (
                      <div className="flex justify-between">
                        <span>Cargo ({cargoWeight.toLocaleString()} kg × {format(trip.cargoRatePerKg)})</span>
                        <span>{format(cargoTotal)}</span>
                      </div>
                    )}
                    {activeTab === 'cargo' && vipSeat && vipSeatPrice > 0 && (
                      <div className="flex justify-between">
                        <span>VIP seat · {vipSeat.seatNumber}</span>
                        <span>{format(vipSeatPrice)}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                      <span>Total</span><span>{format(total)}</span>
                    </div>
                  </div>

                  {errors.length > 0 && (
                    <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="mb-1 text-xs font-bold text-red-700">Please complete these before paying:</p>
                      <ul className="list-disc space-y-0.5 pl-4 text-xs font-medium text-red-600">
                        {errors.map((message) => <li key={message}>{message}</li>)}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleProceed}
                    disabled={!bookable}
                    className="w-full bg-[#0066FF] hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-colors shadow-lg text-base disabled:opacity-50"
                  >
                    {payment?.channel === 'physical' ? 'Reserve Seats' : payment ? 'Proceed to Pay' : 'Choose a payment method'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Modal
        open={reviewOpen}
        onClose={() => !submitting && setReviewOpen(false)}
        title={activeTab === 'travel' ? 'Review your booking' : 'Review your cargo booking'}
        description={`${origin.city} → ${destination.city}`}
        maxWidth="max-w-lg"
        footer={(
          <>
            <button type="button" onClick={() => setReviewOpen(false)} disabled={submitting} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              Back
            </button>
            <button type="button" onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-xl bg-[#0056FF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {payment?.channel === 'physical' ? 'Confirm Reservation' : `Pay ${format(total)}`}
            </button>
          </>
        )}
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex justify-between"><span className="text-slate-500">Ship</span><span className="font-semibold">{trip?.boat?.name}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-slate-500">Departure</span><span className="font-semibold">{trip && `${formatDate(trip.departureAt)} · ${formatTime(trip.departureAt)}`}</span></div>
            {activeTab === 'travel' ? (
              <div className="mt-2 flex justify-between"><span className="text-slate-500">Seats</span><span className="font-semibold">{passengers.map((p) => p.seat).join(', ')}</span></div>
            ) : (
              <>
                <div className="mt-2 flex justify-between"><span className="text-slate-500">Cargo</span><span className="font-semibold">{cargo.description} · {cargoWeight} kg</span></div>
                {vipSeat && <div className="mt-2 flex justify-between"><span className="text-slate-500">VIP seat</span><span className="font-semibold">{vipSeat.seatNumber}</span></div>}
                <div className="mt-2 flex justify-between"><span className="text-slate-500">Recipient</span><span className="font-semibold">{cargo.recipientName.trim()}</span></div>
              </>
            )}
            <div className="mt-2 flex justify-between"><span className="text-slate-500">Payment</span><span className="font-semibold">{payment?.label}</span></div>
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3"><span className="text-slate-500">Total</span><span className="font-bold text-[#0056FF]">{format(total)}</span></div>
          </div>
          {submitError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{submitError}</p>}
        </div>
      </Modal>
    </div>
  );
}
