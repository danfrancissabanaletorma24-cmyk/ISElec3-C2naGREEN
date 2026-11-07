import { toISODate } from '../data/customerData';

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days) => toISODate(new Date(Date.now() + days * DAY));

export function defaultSearchValues() {
  return {
    tripType: 'one-way',
    from: 'MNL',
    to: 'CEB',
    date: inDays(7),
    returnDate: inDays(14),
    legFrom: 'CEB',
    legTo: 'TAG',
    legDate: inDays(14),
    adults: 1,
    children: 0,
    infants: 0,
    seniors: 0,
    shipType: 'any',
  };
}

export function valuesFromSearchParams(searchParams) {
  const defaults = defaultSearchValues();
  const number = (key, fallback, min) => {
    const value = Number(searchParams.get(key));
    if (searchParams.get(key) === null || !Number.isFinite(value)) return fallback;
    return Math.max(min, value);
  };

  return {
    ...defaults,
    tripType: searchParams.get('tripType') || defaults.tripType,
    from: searchParams.get('from') || defaults.from,
    to: searchParams.get('to') || defaults.to,
    date: searchParams.get('date') || defaults.date,
    returnDate: searchParams.get('returnDate') || defaults.returnDate,
    legFrom: searchParams.get('legFrom') || defaults.legFrom,
    legTo: searchParams.get('legTo') || defaults.legTo,
    legDate: searchParams.get('legDate') || defaults.legDate,
    adults: number('adults', defaults.adults, 1),
    children: number('children', defaults.children, 0),
    infants: number('infants', defaults.infants, 0),
    seniors: number('seniors', defaults.seniors, 0),
    shipType: searchParams.get('shipType') || defaults.shipType,
  };
}

export function buildSearchParams(values) {
  const params = new URLSearchParams({
    from: values.from,
    to: values.to,
    date: values.date,
    adults: String(values.adults),
    children: String(values.children),
    infants: String(values.infants),
    seniors: String(values.seniors ?? 0),
    shipType: values.shipType,
    tripType: values.tripType,
  });
  if (values.tripType === 'round-trip') params.set('returnDate', values.returnDate);
  if (values.tripType === 'multi-city') {
    params.set('legFrom', values.legFrom);
    params.set('legTo', values.legTo);
    params.set('legDate', values.legDate);
  }
  return params.toString();
}

export function passengerSummary(values) {
  const parts = [];
  if (values.adults > 0) parts.push(`${values.adults} Adult${values.adults > 1 ? 's' : ''}`);
  if (values.children > 0) parts.push(`${values.children} Child${values.children > 1 ? 'ren' : ''}`);
  if (values.seniors > 0) parts.push(`${values.seniors} Senior${values.seniors > 1 ? 's' : ''}`);
  if (values.infants > 0) parts.push(`${values.infants} Infant${values.infants > 1 ? 's' : ''}`);
  return parts.join(', ');
}
