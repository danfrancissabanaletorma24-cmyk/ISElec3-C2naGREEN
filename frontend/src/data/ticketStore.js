import { useSyncExternalStore } from 'react';
import { TICKETS } from './customerData';

const DEMO_USER_EMAIL = 'kerwin.tagle@email.com';
const STORAGE_PREFIX = 'layagexpress_tickets:';
const stores = new Map();
const listeners = new Map();

function getUserKey(email) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) throw new Error('A signed-in user email is required to access tickets.');
  return normalized;
}

function getStore(email) {
  const userKey = getUserKey(email);
  if (!stores.has(userKey)) {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${userKey}`);
    const initialTickets = stored
      ? JSON.parse(stored)
      : (userKey === DEMO_USER_EMAIL ? TICKETS : []);
    if (!Array.isArray(initialTickets)) {
      throw new Error(`Saved tickets for ${userKey} are invalid.`);
    }
    stores.set(userKey, initialTickets);
  }
  return stores.get(userKey);
}

function emit(email) {
  listeners.get(getUserKey(email))?.forEach((listener) => listener());
}

function saveTickets(email, tickets) {
  const userKey = getUserKey(email);
  localStorage.setItem(`${STORAGE_PREFIX}${userKey}`, JSON.stringify(tickets));
  stores.set(userKey, tickets);
  emit(userKey);
}

export function subscribe(email, listener) {
  const userKey = getUserKey(email);
  if (!listeners.has(userKey)) listeners.set(userKey, new Set());
  const userListeners = listeners.get(userKey);
  userListeners.add(listener);
  return () => userListeners.delete(listener);
}

export function getTickets(email) {
  return getStore(email);
}

export function cancelTicket(email, id, reason) {
  const tickets = getStore(email).map((ticket) => (
    ticket.id === id
      ? {
        ...ticket,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: reason,
      }
      : ticket
  ));
  saveTickets(email, tickets);
}

export function addTicket(email, ticket) {
  saveTickets(email, [ticket, ...getStore(email)]);
}

function reschedulePatch(ticket, { date, departure, arrival, reason }) {
  return {
    ...ticket,
    date: date ?? ticket.date,
    departure: departure ?? ticket.departure,
    arrival: arrival ?? ticket.arrival,
    rescheduledFrom: {
      date: ticket.date,
      departure: ticket.departure,
      arrival: ticket.arrival,
    },
    rescheduleReason: reason,
    rescheduledAt: new Date().toISOString(),
  };
}

export function rescheduleTicket(email, id, patch) {
  const tickets = getStore(email).map((ticket) => (
    ticket.id === id ? reschedulePatch(ticket, patch) : ticket
  ));
  saveTickets(email, tickets);
}

/** Apply an admin schedule change to every upcoming ticket on that vessel. */
export function rescheduleTicketsByVessel(vessel, patch) {
  stores.forEach((tickets, email) => {
    const updatedTickets = tickets.map((ticket) => (
      ticket.ship === vessel && ticket.status === 'upcoming'
        ? reschedulePatch(ticket, patch)
        : ticket
    ));
    saveTickets(email, updatedTickets);
  });
}

export function useTickets(email) {
  return useSyncExternalStore(
    (listener) => subscribe(email, listener),
    () => getTickets(email),
    () => getTickets(email),
  );
}
