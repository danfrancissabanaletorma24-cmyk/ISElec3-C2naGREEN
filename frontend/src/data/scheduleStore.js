import { useSyncExternalStore } from 'react';
import { schedules as defaultSchedules } from './adminData';

const STORAGE_KEY = 'layagexpres_admin_schedules';

function readSchedules() {
  const defaults = defaultSchedules.map((schedule) => ({ ...schedule }));
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
    console.error('Saved Fleet schedules are invalid; using defaults.');
  } catch (error) {
    console.error('Could not load saved Fleet schedules.', error);
  }
  return defaults;
}

let schedules = readSchedules();
const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const emit = () => listeners.forEach((listener) => listener());

export function useSchedules() {
  return useSyncExternalStore(subscribe, () => schedules, () => schedules);
}

export function upsertSchedule(schedule) {
  const exists = schedules.some((item) => item.id === schedule.id);
  schedules = exists
    ? schedules.map((item) => (item.id === schedule.id ? { ...item, ...schedule } : item))
    : [...schedules, schedule];

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
    } catch (error) {
      console.error('Could not save Fleet schedules.', error);
    }
  }
  emit();
}
