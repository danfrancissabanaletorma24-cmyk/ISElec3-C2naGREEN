import { useCallback, useState } from 'react';
import {
  Ship, User, CalendarDays, ChevronDown, MapPin, ArrowRightLeft, Search,
  Map, RefreshCcw, Minus, Plus, X,
} from 'lucide-react';
import useDismiss from './useDismiss';
import {
  DESTINATIONS, SHIP_TYPES, getDestination, getShipTypeLabel, toISODate,
} from '../data/customerData';
import { buildSearchParams, passengerSummary } from './searchValues';
import { PRESSABLE } from '../components/motion';

const TRIP_TYPES = [
  { id: 'one-way', label: 'One-Way', icon: ArrowRightLeft },
  { id: 'round-trip', label: 'Round Trip', icon: RefreshCcw },
  { id: 'multi-city', label: 'Multi-City', icon: Map },
];

function Stepper({ label, hint, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Remove one ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-4 text-center text-sm font-bold text-slate-900" aria-live="polite">{value}</span>
        <button
          type="button"
          aria-label={`Add one ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FieldButton({ label, icon: Icon, value, isOpen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      className={`flex w-full min-w-0 flex-1 flex-col rounded-xl border p-3 text-left transition-colors ${
        isOpen ? 'border-[#0056FF] ring-2 ring-[#0056FF]/15' : 'border-slate-200 hover:border-slate-300'
      } bg-white`}
    >
      <span className="mb-1 text-[11px] font-medium text-slate-500">{label}</span>
      <span className="flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[#0056FF]" />
          <span className="truncate text-sm font-semibold text-slate-800">{value}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </span>
    </button>
  );
}

function DestinationMenu({ label, selected, onSelect }) {
  return (
    <div
      role="listbox"
      aria-label={label}
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
    >
      {DESTINATIONS.map((destination) => (
        <button
          key={destination.code}
          type="button"
          role="option"
          aria-selected={destination.code === selected}
          onClick={() => onSelect(destination.code)}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            destination.code === selected
              ? 'bg-[#0056FF] text-white'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="font-medium">{destination.city}</span>
          <span className="text-xs opacity-70">{destination.code}</span>
        </button>
      ))}
    </div>
  );
}

function DateField({ label, value, min, onChange }) {
  return (
    <label className="flex w-full min-w-0 flex-1 cursor-pointer flex-col rounded-xl border border-slate-200 p-3 transition-colors hover:border-slate-300 bg-white focus-within:border-[#0056FF] focus-within:ring-2 focus-within:ring-[#0056FF]/15">
      <span className="mb-1 text-[11px] font-medium text-slate-500">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="date"
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none [color-scheme:light]"
        />
      </span>
    </label>
  );
}

export default function SearchWidget({
  values,
  onChange,
  onSearch,
  submitLabel = 'Search Ships',
  className = '',
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [error, setError] = useState('');
  const [today] = useState(() => toISODate(new Date()));

  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const panelRef = useDismiss(openMenu !== null, closeMenu);

  const update = (patch) => onChange({ ...values, ...patch });

  const setPassenger = (key, rawValue) => {
    const next = { ...values, [key]: rawValue };
    next.adults = Math.max(1, Math.min(9, next.adults));
    next.children = Math.max(0, Math.min(8, next.children));
    next.seniors = Math.max(0, Math.min(8, next.seniors ?? 0));
    next.infants = Math.max(0, Math.min(next.adults, next.infants));
    onChange(next);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (values.from === values.to) {
      setError('Origin and destination must be different.');
      return;
    }
    if (!values.date) {
      setError('Please choose a departure date.');
      return;
    }
    if (values.tripType === 'round-trip' && values.returnDate < values.date) {
      setError('Return date cannot be before the departure date.');
      return;
    }
    setError('');
    closeMenu();
    onSearch(buildSearchParams(values));
  };

  const originLabel = `${getDestination(values.from).city} (${values.from})`;
  const destinationLabel = `${getDestination(values.to).city} (${values.to})`;

  return (
    <div
      ref={panelRef}
      className={`bg-white rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 ${className}`}
    >
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Trip type">
        {TRIP_TYPES.map(({ id, label, icon: Icon }) => {
          const isActive = values.tripType === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => { update({ tripType: id }); closeMenu(); setError(''); }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive ? 'bg-[#0056FF] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col items-stretch gap-3 lg:flex-row">
          <div className="relative flex w-full flex-[2] gap-3 min-w-0">
            <div className="relative min-w-0 flex-1">
              <FieldButton
                label="From"
                icon={MapPin}
                value={originLabel}
                isOpen={openMenu === 'from'}
                onClick={() => setOpenMenu(openMenu === 'from' ? null : 'from')}
              />
              {openMenu === 'from' && (
                <DestinationMenu
                  label="Origin"
                  selected={values.from}
                  onSelect={(code) => { update({ from: code }); closeMenu(); setError(''); }}
                />
              )}
            </div>

            <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => {
                  update({ from: values.to, to: values.from });
                  setError('');
                }}
                aria-label="Swap origin and destination"
                title="Swap origin and destination"
                className="rounded-full border-2 border-white bg-[#0056FF] p-1.5 text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative min-w-0 flex-1">
              <FieldButton
                label="To"
                icon={MapPin}
                value={destinationLabel}
                isOpen={openMenu === 'to'}
                onClick={() => setOpenMenu(openMenu === 'to' ? null : 'to')}
              />
              {openMenu === 'to' && (
                <DestinationMenu
                  label="Destination"
                  selected={values.to}
                  onSelect={(code) => { update({ to: code }); closeMenu(); setError(''); }}
                />
              )}
            </div>
          </div>

          <DateField
            label="Departure Date"
            value={values.date}
            min={today}
            onChange={(date) => update({ date })}
          />

          {values.tripType === 'round-trip' && (
            <DateField
              label="Return Date"
              value={values.returnDate}
              min={values.date || today}
              onChange={(returnDate) => update({ returnDate })}
            />
          )}

          <div className="relative w-full min-w-0 flex-1">
            <FieldButton
              label="Passenger"
              icon={User}
              value={passengerSummary(values)}
              isOpen={openMenu === 'passengers'}
              onClick={() => setOpenMenu(openMenu === 'passengers' ? null : 'passengers')}
            />
            {openMenu === 'passengers' && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] z-30 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
                role="dialog"
                aria-label="Select passengers"
              >
                <Stepper
                  label="Adults"
                  hint="Age 12 and above"
                  value={values.adults}
                  min={1}
                  max={9}
                  onChange={(value) => setPassenger('adults', value)}
                />
                <div className="my-1 border-t border-slate-100" />
                <Stepper
                  label="Children"
                  hint="Age 2 – 11 · 50% off"
                  value={values.children}
                  min={0}
                  max={8}
                  onChange={(value) => setPassenger('children', value)}
                />
                <div className="my-1 border-t border-slate-100" />
                <Stepper
                  label="Senior Citizens"
                  hint="Age 60+ · 20% off"
                  value={values.seniors ?? 0}
                  min={0}
                  max={8}
                  onChange={(value) => setPassenger('seniors', value)}
                />
                <div className="my-1 border-t border-slate-100" />
                <Stepper
                  label="Infants"
                  hint="Under 2 (lap seat)"
                  value={values.infants}
                  min={0}
                  max={values.adults}
                  onChange={(value) => setPassenger('infants', value)}
                />
                <button
                  type="button"
                  onClick={closeMenu}
                  className="mt-3 w-full rounded-lg bg-[#0056FF] py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          <div className="relative w-full min-w-0 flex-1">
            <FieldButton
              label="Ship Type"
              icon={Ship}
              value={getShipTypeLabel(values.shipType)}
              isOpen={openMenu === 'shipType'}
              onClick={() => setOpenMenu(openMenu === 'shipType' ? null : 'shipType')}
            />
            {openMenu === 'shipType' && (
              <div
                role="listbox"
                aria-label="Ship type"
                className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
              >
                {SHIP_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    role="option"
                    aria-selected={values.shipType === type.id}
                    onClick={() => { update({ shipType: type.id }); closeMenu(); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      values.shipType === type.id
                        ? 'bg-[#0056FF] text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`mt-2 flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0056FF] px-6 py-4 font-bold text-white shadow-md hover:bg-blue-800 lg:mt-0 lg:w-auto ${PRESSABLE}`}
          >
            <Search className="h-5 w-5" /> {submitLabel}
          </button>
        </div>

        {values.tripType === 'multi-city' && (
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col">
              <span className="mb-1 text-[11px] font-medium text-slate-500">Second leg — From</span>
              <select
                value={values.legFrom}
                onChange={(event) => update({ legFrom: event.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/15"
              >
                {DESTINATIONS.map((destination) => (
                  <option key={destination.code} value={destination.code}>
                    {destination.city} ({destination.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col">
              <span className="mb-1 text-[11px] font-medium text-slate-500">Second leg — To</span>
              <select
                value={values.legTo}
                onChange={(event) => update({ legTo: event.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/15"
              >
                {DESTINATIONS.map((destination) => (
                  <option key={destination.code} value={destination.code}>
                    {destination.city} ({destination.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col">
              <span className="mb-1 text-[11px] font-medium text-slate-500">Second leg — Date</span>
              <input
                type="date"
                value={values.legDate}
                min={values.date || today}
                onChange={(event) => update({ legDate: event.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none [color-scheme:light] focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/15"
              />
            </label>
            <button
              type="button"
              onClick={() => { update({ tripType: 'one-way' }); setError(''); }}
              className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" /> Remove leg
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
