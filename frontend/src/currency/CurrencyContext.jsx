// src/currency/CurrencyContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'layagexpres_currency';

export const CURRENCIES = [
  { code: 'PHP', symbol: '₱', rate: 1, label: 'Philippine Peso' },
  { code: 'USD', symbol: '$', rate: 0.018, label: 'US Dollar' },
];

const CurrencyContext = createContext(null);

const readCurrency = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return CURRENCIES.some((currency) => currency.code === stored) ? stored : 'PHP';
  } catch {
    return 'PHP';
  }
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(readCurrency);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      /* storage unavailable — keep in-memory */
    }
  }, [currency]);

  const value = useMemo(() => {
    const active = CURRENCIES.find((item) => item.code === currency) ?? CURRENCIES[0];
    const format = (amount, { compact = false } = {}) => {
      const converted = Number(amount || 0) * active.rate;
      const rounded = converted >= 100 ? Math.round(converted) : Math.round(converted * 100) / 100;
      return `${active.symbol}${rounded.toLocaleString('en-PH', compact ? {} : { maximumFractionDigits: 2 })}`;
    };
    return { currency, setCurrency, currencies: CURRENCIES, format };
  }, [currency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used inside a CurrencyProvider');
  return context;
}
