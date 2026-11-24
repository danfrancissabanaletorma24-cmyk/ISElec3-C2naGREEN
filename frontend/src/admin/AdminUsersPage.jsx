// src/admin/AdminUsersPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, BadgeCheck, X, Users, Wallet, Ticket, CalendarDays, Phone, Mail, ArrowUpRight, Pencil, KeyRound, UserPlus,
} from 'lucide-react';
import { currency } from '../data/adminData';
import { loadAllAdminBookings } from './adminBookingData';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from './components/StatusBadge';
import { apiRequest } from '../api';

async function loadAllUsers(token) {
  const users = [];
  let page = 1;
  let pages = 1;

  do {
    const result = await apiRequest(`/users?role=user&page=${page}&limit=100`, { token });
    if (!Array.isArray(result.data)) {
      throw new Error('The users API returned an unexpected response.');
    }
    users.push(...result.data);
    pages = Math.max(Number(result.pages) || 1, 1);
    page += 1;
  } while (page <= pages);

  return users;
}

function buildUsers(accounts, bookings) {
  const usersById = new Map();
  const usersByEmail = new Map();

  accounts.forEach((account) => {
    const user = {
      id: String(account._id),
      name: [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email || 'Unknown user',
      email: account.email || '',
      phone: account.contactNumber || '',
      firstName: account.firstName || '',
      lastName: account.lastName || '',
      address: account.address || '',
      age: account.age ?? '',
      gender: account.gender || '',
      joined: account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '—',
      isActive: account.isActive !== false,
      trips: 0,
      spend: 0,
      bookings: [],
    };
    usersById.set(user.id, user);
    if (user.email) usersByEmail.set(user.email.toLowerCase(), user);
  });

  bookings.forEach((booking) => {
    const user = usersById.get(String(booking.userId))
      || usersByEmail.get(String(booking.email || '').toLowerCase());
    if (!user) return;

    user.trips += 1;
    user.spend += booking.paymentStatus === 'paid' ? booking.amount : 0;
    user.bookings.push(booking);
  });

  return [...usersById.values()].map((user) => ({
    ...user,
    bookings: user.bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    lastTrip: [...user.bookings]
      .sort((a, b) => new Date(b.departureAt) - new Date(a.departureAt))[0]?.date || '—',
  }));
}

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    address: '',
    age: '',
    gender: '',
  });
  const [editError, setEditError] = useState('');
  const EMPTY_ADD_FORM = { firstName: '', lastName: '', email: '', contactNumber: '', password: '', age: '', gender: '' };
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError('');

    Promise.all([loadAllUsers(token), loadAllAdminBookings(token)])
      .then(([userItems, bookingItems]) => {
        if (active) {
          setAccounts(userItems);
          setBookings(bookingItems);
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const users = useMemo(() => buildUsers(accounts, bookings), [accounts, bookings]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.name, user.email, user.phone, user.id].join(' ').toLowerCase().includes(term),
    );
  }, [users, query]);

  const selected = users.find((user) => user.id === selectedId) ?? null;
  const editingUser = users.find((user) => user.id === editingUserId) ?? null;
  const resettingPasswordUser = users.find((user) => user.id === resettingPasswordUserId) ?? null;

  const totals = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      spend: users.reduce((sum, user) => sum + user.spend, 0),
      trips: users.reduce((sum, user) => sum + user.trips, 0),
    }),
    [users],
  );

  const handleToggleUser = async (user) => {
    setActionError('');
    setActionNotice('');
    setUpdatingUserId(user.id);
    try {
      const updatedUser = await apiRequest(`/users/${encodeURIComponent(user.id)}`, {
        token,
        method: 'PUT',
        body: { isActive: !user.isActive },
      });
      setAccounts((current) => current.map((account) => (
        String(account._id) === String(updatedUser._id) ? updatedUser : account
      )));
    } catch (error) {
      setActionError(error.message || `Could not ${user.isActive ? 'disable' : 'enable'} this user.`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openEditUser = (user) => {
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      contactNumber: user.phone,
      address: user.address,
      age: user.age === '' ? '' : String(user.age),
      gender: user.gender,
    });
    setEditError('');
    setEditingUserId(user.id);
  };

  const handleEditUser = async (event) => {
    event.preventDefault();
    const firstName = editForm.firstName.trim();
    const email = editForm.email.trim().toLowerCase();
    const contactNumber = editForm.contactNumber.trim();
    const age = editForm.age === '' ? null : Number(editForm.age);

    if (!firstName) {
      setEditError('First name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEditError('Enter a valid email address.');
      return;
    }
    if (contactNumber.replace(/\D/g, '').length < 10) {
      setEditError('Enter a valid phone number with at least 10 digits.');
      return;
    }
    if (age !== null && !(age >= 1 && age <= 120)) {
      setEditError('Age must be between 1 and 120.');
      return;
    }

    setEditError('');
    setActionError('');
    setActionNotice('');
    setUpdatingUserId(editingUserId);
    try {
      const updatedAccount = await apiRequest(`/users/${encodeURIComponent(editingUserId)}`, {
        token,
        method: 'PUT',
        body: {
          firstName,
          lastName: editForm.lastName.trim(),
          email,
          contactNumber,
          address: editForm.address.trim(),
          age,
          gender: editForm.gender || null,
        },
      });
      setAccounts((current) => current.map((account) => (
        String(account._id) === String(updatedAccount._id) ? updatedAccount : account
      )));
      setActionNotice(`${firstName}'s information was updated.`);
      setEditingUserId(null);
    } catch (error) {
      setEditError(error.message || 'Could not update user information.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openAddUser = () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddError('');
    setIsAddOpen(true);
  };

  const handleAddUser = async (event) => {
    event.preventDefault();
    const firstName = addForm.firstName.trim();
    const email = addForm.email.trim().toLowerCase();
    const contactNumber = addForm.contactNumber.trim();
    const age = addForm.age === '' ? undefined : Number(addForm.age);

    if (!firstName) { setAddError('First name is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAddError('Enter a valid email address.'); return; }
    if (contactNumber.replace(/\D/g, '').length < 10) { setAddError('Enter a valid phone number with at least 10 digits.'); return; }
    if (addForm.password.length < 6) { setAddError('Password must be at least 6 characters.'); return; }
    if (age !== undefined && !(age >= 1 && age <= 120)) { setAddError('Age must be between 1 and 120.'); return; }

    setAddError('');
    setActionError('');
    setActionNotice('');
    setIsAdding(true);
    try {
      const created = await apiRequest('/users', {
        token,
        method: 'POST',
        body: {
          firstName,
          lastName: addForm.lastName.trim(),
          email,
          contactNumber,
          password: addForm.password,
          role: 'user',
          ...(age !== undefined ? { age } : {}),
          ...(addForm.gender ? { gender: addForm.gender } : {}),
        },
      });
      setAccounts((current) => [created, ...current]);
      setActionNotice(`${firstName} was added as a user.`);
      setIsAddOpen(false);
    } catch (error) {
      setAddError(error.message || 'Could not add this user.');
    } finally {
      setIsAdding(false);
    }
  };

  const openPasswordReset = (user) => {
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setResettingPasswordUserId(user.id);
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordError('');
    setActionError('');
    setActionNotice('');
    setUpdatingUserId(resettingPasswordUserId);
    try {
      await apiRequest(`/users/${encodeURIComponent(resettingPasswordUserId)}/reset-password`, {
        token,
        method: 'PUT',
        body: { newPassword: passwordForm.newPassword },
      });
      setResettingPasswordUserId(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setActionNotice(`Password reset for ${resettingPasswordUser?.name}. Provide the new password securely.`);
    } catch (error) {
      setPasswordError(error.message || 'Could not reset the user password.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total users', value: totals.total, icon: Users },
          { label: 'Active users', value: totals.active, icon: BadgeCheck },
          { label: 'Lifetime trips', value: totals.trips.toLocaleString(), icon: Ticket },
          { label: 'Lifetime spend', value: currency(totals.spend), icon: Wallet },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <Icon className="h-4 w-4 text-[#0056FF]" />
            </div>
            <p className="mt-2 truncate text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">User directory</h2>
            <p className="text-xs text-slate-500">{filtered.length} of {users.length} users</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email or phone…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#0056FF] focus:bg-white focus:ring-2 focus:ring-[#0056FF]/15"
            />
          </div>
          <button
            type="button"
            onClick={openAddUser}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0056FF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" /> Add user
          </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Contact</th>
                <th className="px-3 py-3 font-semibold">Trips</th>
                <th className="px-3 py-3 font-semibold">Total spend</th>
                <th className="px-3 py-3 font-semibold">Last trip</th>
                <th className="px-3 py-3 font-semibold">Account status</th>
                <th className="px-6 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {actionError && (
                <tr>
                  <td colSpan={7} className="px-6 py-3 text-sm text-red-600" role="alert">
                    {actionError}
                  </td>
                </tr>
              )}
              {actionNotice && (
                <tr>
                  <td colSpan={7} className="px-6 py-3 text-sm text-emerald-700" role="status">
                    {actionNotice}
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                    Loading users…
                  </td>
                </tr>
              )}
              {!isLoading && loadError && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-red-600">
                    Could not load users: {loadError}
                  </td>
                </tr>
              )}
              {!isLoading && !loadError && filtered.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#0056FF]">
                        {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                      </div>
                      <p className="font-semibold text-slate-800">{user.name}</p>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <p className="text-slate-600">{user.email || '—'}</p>
                    <p className="text-xs text-slate-400">{user.phone || '—'}</p>
                  </td>
                  <td className="px-3 py-4 text-slate-600">{user.trips}</td>
                  <td className="px-3 py-4 font-semibold text-slate-800">{currency(user.spend)}</td>
                  <td className="px-3 py-4 text-slate-600">{user.lastTrip}</td>
                  <td className="px-3 py-4">
                    <StatusBadge status={user.isActive ? 'Active' : 'Disabled'} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(user.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0056FF] transition-colors hover:border-[#0056FF]/40 hover:bg-blue-50"
                      >
                        View <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleUser(user)}
                        disabled={updatingUserId === user.id}
                        aria-label={`${user.isActive ? 'Disable' : 'Enable'} ${user.name}`}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                          user.isActive
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {updatingUserId === user.id ? 'Saving…' : user.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && !loadError && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                    No users found for “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User side panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <button className="flex-1" aria-label="Close panel" onClick={() => setSelectedId(null)} />
          <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl animate-sheet-right">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[#0056FF]">
                  {selected.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-lg font-bold text-slate-900">
                    {selected.name}
                  </p>
                  <p className="text-xs text-slate-500">{selected.id} · Joined {selected.joined}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm text-slate-600"><Mail className="h-4 w-4 text-slate-400" /> {selected.email || '—'}</p>
                <p className="flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4 text-slate-400" /> {selected.phone || '—'}</p>
                <p className="flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="h-4 w-4 text-slate-400" /> Last trip on {selected.lastTrip}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{selected.trips}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Trips</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{currency(selected.spend)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Spend</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openEditUser(selected)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" /> Edit information
                </button>
                <button
                  type="button"
                  onClick={() => openPasswordReset(selected)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <KeyRound className="h-4 w-4" /> Reset password
                </button>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-900">Recent bookings</h3>
                {selected.bookings.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    No bookings on record for this user yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selected.bookings.map((booking) => (
                      <div key={booking.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{booking.route}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{booking.date} · {booking.time}</p>
                            <p className="mt-0.5 text-xs text-slate-400">{booking.vessel} · {booking.bookingRef}</p>
                          </div>
                          <StatusBadge status={booking.status} />
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-900">{currency(booking.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleToggleUser(selected)}
                disabled={updatingUserId === selected.id}
                className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-60 ${
                  selected.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {updatingUserId === selected.id
                  ? 'Saving…'
                  : selected.isActive
                    ? 'Disable user account'
                    : 'Enable user account'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleEditUser}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit user information</h2>
                <p className="mt-1 text-sm text-slate-500">{editingUser.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUserId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close edit form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                First name
                <input
                  required
                  value={editForm.firstName}
                  onChange={(event) => setEditForm({ ...editForm, firstName: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Last name
                <input
                  value={editForm.lastName}
                  onChange={(event) => setEditForm({ ...editForm, lastName: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Phone
              <input
                type="tel"
                required
                value={editForm.contactNumber}
                onChange={(event) => setEditForm({ ...editForm, contactNumber: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Address
              <input
                value={editForm.address}
                onChange={(event) => setEditForm({ ...editForm, address: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Age
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={editForm.age}
                  onChange={(event) => setEditForm({ ...editForm, age: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Gender
                <select
                  value={editForm.gender}
                  onChange={(event) => setEditForm({ ...editForm, gender: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
            </div>

            {editError && <p className="text-sm text-red-600" role="alert">{editError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUserId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingUserId === editingUserId}
                className="rounded-lg bg-[#0056FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {updatingUserId === editingUserId ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <form onSubmit={handleAddUser} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add user</h2>
                <p className="mt-1 text-sm text-slate-500">Creates a customer account that can sign in right away.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close add user form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['firstName', 'First name', 'text', 'given-name'],
                ['lastName', 'Last name', 'text', 'family-name'],
                ['email', 'Email', 'email', 'off'],
                ['contactNumber', 'Contact number', 'tel', 'off'],
                ['password', 'Temporary password', 'password', 'new-password'],
                ['age', 'Age (optional)', 'number', 'off'],
              ].map(([field, label, type, autoComplete]) => (
                <label key={field} className="block space-y-1 text-sm font-medium text-slate-700">
                  {label}
                  <input
                    type={type}
                    autoComplete={autoComplete}
                    value={addForm[field]}
                    onChange={(event) => setAddForm({ ...addForm, [field]: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
                  />
                </label>
              ))}
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Gender (optional)
                <select
                  value={addForm.gender}
                  onChange={(event) => setAddForm({ ...addForm, gender: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
            </div>
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Share the temporary password with the user securely. A one-time code is also emailed to them at every sign in.
            </p>
            {addError && <p className="text-sm text-red-600" role="alert">{addError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding}
                className="rounded-lg bg-[#0056FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isAdding ? 'Adding…' : 'Add user'}
              </button>
            </div>
          </form>
        </div>
      )}

      {resettingPasswordUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleResetPassword}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Reset user password</h2>
                <p className="mt-1 text-sm text-slate-500">{resettingPasswordUser.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setResettingPasswordUserId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close password reset form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              This changes the password immediately. Share the new password with the user securely.
            </p>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#0056FF]"
              />
            </label>
            {passwordError && <p className="text-sm text-red-600" role="alert">{passwordError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResettingPasswordUserId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingUserId === resettingPasswordUserId}
                className="rounded-lg bg-[#0056FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {updatingUserId === resettingPasswordUserId ? 'Resetting…' : 'Reset password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
