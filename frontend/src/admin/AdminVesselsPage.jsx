// src/admin/AdminVesselsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Ship, Plus, X, Users, Gauge, Anchor, Pencil, Trash2, Navigation, CalendarClock,
} from 'lucide-react';
import { formatISODate, toISODate } from '../data/customerData';
import AdminRescheduleTripDialog from './AdminRescheduleTripDialog';
import { upsertSchedule, useSchedules } from '../data/scheduleStore';
import { PORT_LABELS, getRoutePortCodes } from '../data/geo';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../api';
import { loadPorts } from '../data/ports';
import {
  useVessels,
  useRoutes,
  addVessel,
  updateVessel,
  deleteVessel,
  addRoute,
  updateRoute,
  deleteRoute,
  syncRoutesFromApi,
} from '../data/vesselStore';
import StatusBadge from './components/StatusBadge';
import ProgressBar from './components/ProgressBar';
import Toast from '../customer/Toast';

const VESSEL_TYPES = ['Fast Craft', 'RoRo / Ferry'];
const PORT_CODES = Object.keys(PORT_LABELS);
const CUSTOM_PORT = '__custom__';
const DELETE_REASONS = [
  'Sold or retired from service',
  'Transferred to another operator',
  'Damaged beyond repair',
  'Duplicate vessel entry',
  'Other',
];

const emptyVesselForm = (route = '') => ({
  name: '',
  type: 'Fast Craft',
  capacity: 200,
  businessSeats: 0,
  vipSeats: 0,
  economyFare: '',
  businessFare: '',
  vipFare: '',
  route,
  status: 'Active',
  image: '',
});

const routeLabel = (from, to, customFrom = '', customTo = '') => {
  const origin = from === CUSTOM_PORT ? customFrom.trim() : PORT_LABELS[from];
  const destination = to === CUSTOM_PORT ? customTo.trim() : PORT_LABELS[to];
  return `${origin || 'Origin'} → ${destination || 'Destination'}`;
};

const routeSelection = (name) => {
  const match = Object.entries(PORT_LABELS).find(([, label]) => label.toLowerCase() === name.toLowerCase());
  return match ? { value: match[0], custom: '' } : { value: CUSTOM_PORT, custom: name };
};

function createPortCode(name, ports) {
  const base = (name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'PRT').padEnd(3, 'X');
  const codes = new Set(ports.map((port) => String(port.code).toUpperCase()));
  let code = base;
  let suffix = 1;
  while (codes.has(code)) {
    code = `${base}${suffix}`;
    suffix += 1;
  }
  return code;
}

const boatApiPayload = (vessel, includeRegistration = false) => ({
  name: vessel.name,
  ...(includeRegistration
    ? { registrationNumber: `ADMIN-${Date.now()}-${Math.floor(Math.random() * 1000000)}` }
    : {}),
  boatType: vessel.type === 'Fast Craft' ? 'fastcraft' : 'roro',
  seatCounts: {
    economy: Number(vessel.economySeats ?? vessel.capacity),
    business: Number(vessel.businessSeats) || 0,
    vip: Number(vessel.vipSeats) || 0,
  },
  defaultFare: Number(vessel.economyFare) || 0,
  defaultFares: {
    economy: Number(vessel.economyFare) || 0,
    business: Number(vessel.businessFare) || 0,
    vip: Number(vessel.vipFare) || 0,
  },
  imageUrl: vessel.image || '',
  status: vessel.status === 'Active' ? 'active' : 'maintenance',
});

export default function AdminVesselsPage() {
  const { token } = useAuth();
  const vessels = useVessels();
  const routes = useRoutes();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVesselId, setEditingVesselId] = useState(null);
  const [editingApiId, setEditingApiId] = useState(null);
  const [isLoadingVessel, setIsLoadingVessel] = useState(false);
  const [form, setForm] = useState(() => emptyVesselForm());
  const [error, setError] = useState('');

  const [deletingVessel, setDeletingVessel] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteNote, setDeleteNote] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingVessel, setIsDeletingVessel] = useState(false);

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [routeForm, setRouteForm] = useState({
    from: PORT_CODES[0],
    to: PORT_CODES[1],
    customFrom: '',
    customTo: '',
  });
  const [routeError, setRouteError] = useState('');
  const [routeNotice, setRouteNotice] = useState('');
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isSavingVessel, setIsSavingVessel] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState(null);

  const scheduleList = useSchedules();
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [scheduleToast, setScheduleToast] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/routes?isActive=true&limit=100', { token })
      .then((result) => {
        if (!Array.isArray(result.data)) {
          throw new Error('The routes API returned an unexpected response.');
        }
        if (active) syncRoutesFromApi(result.data);
      })
      .catch((loadError) => {
        if (active) setRouteNotice(loadError.message || 'Could not load routes.');
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleRescheduleSchedule = (patch) => {
    if (!rescheduleTarget) return;
    upsertSchedule({
      ...rescheduleTarget,
      ...patch,
      status: 'Rescheduled',
      rescheduleReason: patch.reason,
    });
    setScheduleToast(
      `${rescheduleTarget.vessel}'s trip schedule has been updated to ${formatISODate(patch.date)} at ${patch.departure}.`,
    );
    setRescheduleTarget(null);
  };

  const editingVessel = vessels.find((vessel) => vessel.id === editingVesselId) ?? null;
  const editingSchedule = editingVessel
    ? scheduleList.find((item) => (
      item.vesselId === editingVessel.id || item.vessel === editingVessel.name
    )) ?? null
    : null;

  const openVesselReschedule = () => {
    if (!editingVessel) return;
    setRescheduleTarget(
      editingSchedule ?? {
        id: `SCH-${editingVessel.id}`,
        vesselId: editingVessel.id,
        vessel: editingVessel.name,
        route: editingVessel.route,
        date: toISODate(new Date()),
        departure: '06:00 AM',
        arrival: '08:30 AM',
        sold: editingVessel.sold,
        capacity: editingVessel.capacity,
        status: editingVessel.status,
      },
    );
    setIsModalOpen(false);
  };

  const stats = useMemo(() => {
    const active = vessels.filter((vessel) => vessel.status === 'Active').length;
    const capacity = vessels.reduce((sum, vessel) => sum + vessel.capacity, 0);
    const sold = vessels.reduce((sum, vessel) => sum + vessel.sold, 0);
    return {
      total: vessels.length,
      active,
      maintenance: vessels.length - active,
      occupancy: capacity ? Math.round((sold / capacity) * 100) : 0,
    };
  }, [vessels]);

  const openAddVessel = () => {
    setEditingVesselId(null);
    setEditingApiId(null);
    setForm(emptyVesselForm(routes[0]?.label ?? ''));
    setError('');
    setIsModalOpen(true);
  };

  const openEditVessel = async (vessel) => {
    setEditingVesselId(vessel.id);
    setForm({
      name: vessel.name,
      type: vessel.type,
      capacity: vessel.capacity,
      businessSeats: vessel.businessSeats ?? 0,
      vipSeats: vessel.vipSeats ?? 0,
      economyFare: vessel.defaultFares?.economy ?? vessel.economyFare ?? '',
      businessFare: vessel.defaultFares?.business ?? vessel.businessFare ?? '',
      vipFare: vessel.defaultFares?.vip ?? vessel.vipFare ?? '',
      route: vessel.route,
      status: vessel.status,
      image: vessel.image ?? '',
    });
    setEditingApiId(vessel.apiId ?? null);
    setError('');
    setIsModalOpen(true);
    setIsLoadingVessel(true);

    try {
      const result = await apiRequest(
        vessel.apiId
          ? `/boats/${encodeURIComponent(vessel.apiId)}`
          : `/boats?search=${encodeURIComponent(vessel.name)}&limit=100`,
        { token },
      );
      const apiVessel = Array.isArray(result.data)
        ? result.data.find((item) => item.name.toLowerCase() === vessel.name.toLowerCase())
        : result;
      if (!apiVessel) {
        setEditingApiId(null);
        setError('This vessel could not be matched to a saved vessel used by customer trips.');
        return;
      }

      const seatCounts = (apiVessel.seats || []).reduce((counts, seat) => {
        counts[seat.seatClass] = (counts[seat.seatClass] || 0) + 1;
        return counts;
      }, {});
      const defaults = apiVessel.defaultFares || {};
      const tripResult = await apiRequest(
        `/trips?boat=${encodeURIComponent(apiVessel._id)}&upcoming=true&limit=100`,
        { token },
      );
      const tripFares = tripResult.data?.[0]?.fares || {};
      setEditingApiId(apiVessel._id);
      setForm((current) => ({
        ...current,
        capacity: seatCounts.economy || 0,
        businessSeats: seatCounts.business || 0,
        vipSeats: seatCounts.vip || 0,
        economyFare: defaults.economy || apiVessel.defaultFare || tripFares.economy || '',
        businessFare: defaults.business || tripFares.business || '',
        vipFare: defaults.vip || tripFares.vip || '',
        image: apiVessel.imageUrl || current.image,
      }));
      updateVessel(vessel.id, {
        apiId: apiVessel._id,
        capacity: Object.values(seatCounts).reduce((sum, count) => sum + count, 0),
        economySeats: seatCounts.economy || 0,
        businessSeats: seatCounts.business || 0,
        vipSeats: seatCounts.vip || 0,
        defaultFares: {
          economy: defaults.economy || apiVessel.defaultFare || tripFares.economy || 0,
          business: defaults.business || tripFares.business || 0,
          vip: defaults.vip || tripFares.vip || 0,
        },
      });
    } catch (loadError) {
      setEditingApiId(null);
      setError(loadError.message || 'Could not load this vessel from the customer trip data.');
    } finally {
      setIsLoadingVessel(false);
    }
  };

  const closeVesselModal = () => {
    setIsModalOpen(false);
    setEditingVesselId(null);
    setEditingApiId(null);
    setIsLoadingVessel(false);
    setError('');
  };

  const handleVesselImagePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image is too large. Please choose a file under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, image: String(reader.result) }));
      setError('');
    };
    reader.onerror = () => setError('Could not read the selected image. Please try another file.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Vessel name is required.');
      return;
    }
    const capacity = Number(form.capacity);
    const businessSeats = Number(form.businessSeats);
    const vipSeats = Number(form.vipSeats);
    const seatCounts = { economy: capacity, business: businessSeats, vip: vipSeats };
    if (Object.values(seatCounts).some((count) => !Number.isInteger(count) || count < 0)) {
      setError('Seat counts must be whole numbers and cannot be negative.');
      return;
    }
    const totalCapacity = Object.values(seatCounts).reduce((sum, count) => sum + count, 0);
    if (totalCapacity < 1) {
      setError('At least one seat is required.');
      return;
    }
    const defaultFares = {
      economy: Number(form.economyFare) || 0,
      business: Number(form.businessFare) || 0,
      vip: Number(form.vipFare) || 0,
    };
    if (Object.entries(seatCounts).some(([seatClass, count]) => (
      count > 0 && (!Number.isFinite(defaultFares[seatClass]) || defaultFares[seatClass] <= 0)
    ))) {
      setError('Set a ticket price greater than zero for every seat class with seats.');
      return;
    }
    if (!form.route) {
      setError('Add a route before assigning a vessel.');
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      capacity: totalCapacity,
      economySeats: capacity,
      businessSeats,
      vipSeats,
      defaultFares,
    };

    setError('');
    setIsSavingVessel(true);
    try {
      if (editingVesselId) {
        if (!editingApiId) {
          throw new Error('This vessel is not linked to the saved customer trip data.');
        }
        await apiRequest(`/boats/${encodeURIComponent(editingApiId)}`, {
          token,
          method: 'PUT',
          body: boatApiPayload(payload),
        });
        updateVessel(editingVesselId, { ...payload, apiId: editingApiId });
        const currentSchedule = scheduleList.find((item) => (
          item.vesselId === editingVesselId || item.vessel === editingVessel.name
        ));
        if (currentSchedule) {
          upsertSchedule({
            ...currentSchedule,
            vesselId: editingVesselId,
            vessel: payload.name,
            route: payload.route,
            capacity: totalCapacity,
          });
        }
      } else {
        const createdBoat = await apiRequest('/boats', {
          token,
          method: 'POST',
          body: boatApiPayload(payload, true),
        });
        addVessel({ ...payload, sold: 0, apiId: createdBoat._id });
      }
      closeVesselModal();
    } catch (saveError) {
      setError(saveError.message || 'Could not save this vessel.');
    } finally {
      setIsSavingVessel(false);
    }
  };

  const openDeleteVessel = (vessel) => {
    setDeletingVessel(vessel);
    setDeleteReason('');
    setDeleteNote('');
    setDeleteError('');
  };

  const closeDeleteVessel = () => {
    setDeletingVessel(null);
    setDeleteReason('');
    setDeleteNote('');
    setDeleteError('');
  };

  const handleDeleteVessel = async (event) => {
    event.preventDefault();
    if (!deletingVessel) return;
    if (!deleteReason) {
      setDeleteError('Select a reason before deleting this vessel.');
      return;
    }
    if (deleteReason === 'Other' && !deleteNote.trim()) {
      setDeleteError('Please describe the reason in the details field.');
      return;
    }

    setIsDeletingVessel(true);
    setDeleteError('');
    try {
      if (deletingVessel.apiId) {
        await apiRequest(`/boats/${encodeURIComponent(deletingVessel.apiId)}`, {
          token,
          method: 'DELETE',
        });
      }
      deleteVessel(deletingVessel.id, deleteReason);
      closeDeleteVessel();
    } catch (deleteErrorResponse) {
      setDeleteError(deleteErrorResponse.message || 'Could not delete this vessel.');
    } finally {
      setIsDeletingVessel(false);
    }
  };

  const openAddRoute = () => {
    setEditingRouteId(null);
    setRouteForm({
      from: PORT_CODES[0],
      to: PORT_CODES[1],
      customFrom: '',
      customTo: '',
    });
    setRouteError('');
    setIsRouteModalOpen(true);
  };

  const openEditRoute = (route) => {
    const [fromName, toName] = route.label.split('→').map((part) => part.trim());
    const from = routeSelection(fromName || '');
    const to = routeSelection(toName || '');
    const codes = getRoutePortCodes(route.label);
    setEditingRouteId(route.id);
    setRouteForm({
      from: codes?.[0] ?? from.value,
      to: codes?.[1] ?? to.value,
      customFrom: codes ? '' : from.custom,
      customTo: codes ? '' : to.custom,
    });
    setRouteError('');
    setIsRouteModalOpen(true);
  };

  const closeRouteModal = () => {
    setIsRouteModalOpen(false);
    setEditingRouteId(null);
    setRouteError('');
  };

  const handleRouteSubmit = async (event) => {
    event.preventDefault();
    const fromName = routeForm.from === CUSTOM_PORT ? routeForm.customFrom.trim() : PORT_LABELS[routeForm.from];
    const toName = routeForm.to === CUSTOM_PORT ? routeForm.customTo.trim() : PORT_LABELS[routeForm.to];
    if (!fromName || !toName) {
      setRouteError('Enter both an origin and a destination.');
      return;
    }
    if (fromName.toLowerCase() === toName.toLowerCase()) {
      setRouteError('Origin and destination must be different.');
      return;
    }

    const label = routeLabel(
      routeForm.from,
      routeForm.to,
      routeForm.customFrom,
      routeForm.customTo,
    );
    const duplicate = routes.find(
      (route) => route.label.toLowerCase() === label.toLowerCase() && route.id !== editingRouteId,
    );
    if (duplicate) {
      setRouteError('That route already exists.');
      return;
    }

    setRouteError('');
    setIsSavingRoute(true);
    try {
      const portsResult = await apiRequest('/ports?limit=100', { token });
      if (!Array.isArray(portsResult.data)) {
        throw new Error('The ports API returned an unexpected response.');
      }
      const ports = portsResult.data;
      const findOrCreatePort = async (name, preferredCode) => {
        const normalizedName = name.trim().toLowerCase();
        const existing = ports.find((port) => (
          (preferredCode && String(port.code).toUpperCase() === preferredCode)
          || [port.city, port.name].some((value) => String(value || '').trim().toLowerCase() === normalizedName)
        ));
        if (existing) {
          if (existing.isActive === false) {
            throw new Error(`${name} is currently inactive. Activate the port before using it.`);
          }
          return existing;
        }

        const code = preferredCode && !ports.some(
          (port) => String(port.code).toUpperCase() === preferredCode,
        ) ? preferredCode : createPortCode(name, ports);
        const port = await apiRequest('/ports', {
          token,
          method: 'POST',
          body: { name: name.trim(), city: name.trim(), code },
        });
        ports.push(port);
        return port;
      };

      const origin = await findOrCreatePort(
        fromName,
        routeForm.from === CUSTOM_PORT ? null : routeForm.from,
      );
      const destination = await findOrCreatePort(
        toName,
        routeForm.to === CUSTOM_PORT ? null : routeForm.to,
      );
      const routeResult = await apiRequest('/routes?limit=100', { token });
      if (!Array.isArray(routeResult.data)) {
        throw new Error('The routes API returned an unexpected response.');
      }
      const editingRoute = routes.find((route) => route.id === editingRouteId);
      const matchingRoute = routeResult.data.find((route) => (
        String(route.origin?._id ?? route.origin) === String(origin._id)
        && String(route.destination?._id ?? route.destination) === String(destination._id)
      ));
      if (
        matchingRoute
        && editingRoute?.apiId
        && String(matchingRoute._id) !== String(editingRoute.apiId)
      ) {
        throw new Error('That route already exists.');
      }

      let savedRoute;
      if (editingRoute?.apiId) {
        savedRoute = await apiRequest(`/routes/${encodeURIComponent(editingRoute.apiId)}`, {
          token,
          method: 'PUT',
          body: { origin: origin._id, destination: destination._id, isActive: true },
        });
      } else if (matchingRoute) {
        savedRoute = matchingRoute;
        if (savedRoute.isActive === false) {
          savedRoute = await apiRequest(`/routes/${encodeURIComponent(savedRoute._id)}`, {
            token,
            method: 'PUT',
            body: { isActive: true },
          });
        }
      } else {
        savedRoute = await apiRequest('/routes', {
          token,
          method: 'POST',
          body: { origin: origin._id, destination: destination._id },
        });
      }

      if (editingRouteId) {
        updateRoute(editingRouteId, { label, apiId: savedRoute._id });
      } else {
        addRoute(label, savedRoute._id);
      }
      await loadPorts(true);
      setRouteNotice('');
      closeRouteModal();
    } catch (saveError) {
      setRouteError(saveError.message || 'Could not save this route.');
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (route) => {
    if (vessels.some((vessel) => vessel.route === route.label)) {
      setRouteNotice('Reassign vessels before deleting this route.');
      return;
    }

    setDeletingRouteId(route.id);
    setRouteNotice('');
    try {
      if (route.apiId) {
        await apiRequest(`/routes/${encodeURIComponent(route.apiId)}`, {
          token,
          method: 'DELETE',
        });
      }
      const result = deleteRoute(route.id);
      setRouteNotice(result.ok ? '' : result.message);
      if (result.ok) await loadPorts(true);
    } catch (deleteError) {
      setRouteNotice(deleteError.message || 'Could not delete this route.');
    } finally {
      setDeletingRouteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total fleet', value: stats.total, icon: Ship },
          { label: 'Active vessels', value: stats.active, icon: Anchor },
          { label: 'Under maintenance', value: stats.maintenance, icon: Gauge },
          { label: 'Fleet occupancy', value: `${stats.occupancy}%`, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <Icon className="h-4 w-4 text-[#0056FF]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Fleet */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Fleet</h2>
            <p className="text-xs text-slate-500">Capacity and live status per vessel</p>
          </div>
          <button
            onClick={openAddVessel}
            className="flex items-center gap-2 rounded-xl bg-[#0056FF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add vessel
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vessels.map((vessel) => {
            const occupancy = Math.round((vessel.sold / vessel.capacity) * 100);
            return (
              <div key={vessel.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0056FF]">
                      {vessel.image ? (
                        <img src={vessel.image} alt="" className="h-11 w-11 rounded-xl object-cover" />
                      ) : (
                        <Ship className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{vessel.name}</p>
                      <p className="text-xs text-slate-500">{vessel.id} · {vessel.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={vessel.status} />
                    <button
                      type="button"
                      onClick={() => openEditVessel(vessel)}
                      aria-label={`Edit ${vessel.name}`}
                      title={`Edit ${vessel.name}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0056FF]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteVessel(vessel)}
                      aria-label={`Delete ${vessel.name}`}
                      title={`Delete ${vessel.name}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{vessel.route}</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Users className="h-3.5 w-3.5" /> {vessel.sold}/{vessel.capacity}
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    value={vessel.sold}
                    max={vessel.capacity}
                    color={vessel.status === 'Maintenance' ? '#94A3B8' : occupancy > 90 ? '#F59E0B' : '#0056FF'}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{occupancy}% occupied</span>
                  <span>{vessel.status === 'Maintenance' ? 'Out of service' : 'Sailing today'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedules */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Today&apos;s schedules</h2>
            <p className="text-xs text-slate-500">Departures across all routes</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0056FF]">
            {scheduleList.length} trips
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-semibold">Vessel</th>
                <th className="px-3 py-3 font-semibold">Route</th>
                <th className="px-3 py-3 font-semibold">Departure</th>
                <th className="px-3 py-3 font-semibold">Arrival</th>
                <th className="px-3 py-3 font-semibold">Load</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scheduleList.map((schedule) => {
                const vessel = vessels.find((item) => item.name === schedule.vessel);
                const sold = schedule.sold ?? vessel?.sold ?? 0;
                const capacity = schedule.capacity ?? vessel?.capacity ?? 0;
                return (
                  <tr key={schedule.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-semibold text-slate-800">{schedule.vessel}</td>
                    <td className="px-3 py-4 text-slate-600">{schedule.route}</td>
                    <td className="px-3 py-4 text-slate-600">
                      <span className="block">{schedule.departure}</span>
                      <span className="text-[11px] text-slate-400">
                        {schedule.date ? formatISODate(schedule.date) : 'Today'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-600">{schedule.arrival}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={sold} max={capacity} className="w-24" />
                        <span className="text-xs text-slate-500">{sold}/{capacity}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={schedule.status} />
                      {schedule.rescheduleReason && (
                        <span className="mt-1 block text-[11px] text-slate-400">{schedule.rescheduleReason}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setRescheduleTarget(schedule)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-[#0056FF] transition-colors hover:bg-blue-50"
                      >
                        <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Route management</h2>
            <p className="text-xs text-slate-500">Occupancy and demand per route</p>
          </div>
          <button
            onClick={openAddRoute}
            className="flex items-center gap-2 rounded-xl bg-[#0056FF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add route
          </button>
        </div>

        {routeNotice && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            {routeNotice}
          </p>
        )}

        <div className="space-y-4">
          {routes.map((route) => {
            const inUse = vessels.some((vessel) => vessel.route === route.label);
            return (
              <div key={route.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Navigation className="h-4 w-4 shrink-0 text-[#0056FF]" />
                    <span className="truncate">{route.label}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {route.bookings.toLocaleString()} bookings this month
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:w-72">
                  <ProgressBar value={route.occupancy} max={100} className="flex-1" />
                  <span className="w-10 text-right text-xs font-semibold text-slate-600">{route.occupancy}%</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditRoute(route)}
                      aria-label={`Edit ${route.label}`}
                      title={`Edit ${route.label}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0056FF]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoute(route)}
                      disabled={deletingRouteId === route.id}
                      aria-label={`Delete ${route.label}`}
                      title={inUse ? 'Reassign its vessels before deleting' : `Delete ${route.label}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vessel modal (add / edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6 animate-fade-in">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl animate-modal-in"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fleet</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingVesselId ? 'Edit vessel' : 'Add new vessel'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeVesselModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Vessel name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. SuperCat 6"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/15"
                />
              </label>

              <div>
                <span className="mb-1 block text-xs font-semibold text-slate-500">Vessel image</span>
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt="Vessel preview"
                      className="h-16 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-blue-50 text-[#0056FF]">
                      <Ship className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                      {form.image ? 'Change image' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleVesselImagePick}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-1.5 text-[11px] text-slate-400">JPG, PNG, or WebP · Max 2 MB</p>
                  </div>
                  {form.image && (
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, image: '' }))}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove vessel image"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Type</span>
                  <select
                    value={form.type}
                    onChange={(event) => setForm({ ...form, type: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF]"
                  >
                    {VESSEL_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Economy seats</span>
                  <input
                    type="number"
                    min="0"
                    value={form.capacity}
                    onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/15"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['businessSeats', 'Business seats'],
                  ['vipSeats', 'VIP seats'],
                ].map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form[field]}
                      onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/15"
                    />
                  </label>
                ))}
              </div>
              <p className="-mt-2 text-[11px] text-slate-400">
                Seat availability on each sailing updates automatically as seats are booked.
              </p>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">Ticket prices per passenger (₱)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['economyFare', 'Economy price'],
                    ['businessFare', 'Business price'],
                    ['vipFare', 'VIP price'],
                  ].map(([field, label]) => (
                    <label key={field} className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form[field]}
                        onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                        placeholder="e.g. 350"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/15"
                      />
                    </label>
                  ))}
                </div>
                <span className="mt-1.5 block text-[11px] text-slate-400">
                  These vessel prices apply to all its upcoming scheduled trips; each trip keeps its own route and departure time.
                </span>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Assigned route</span>
                <select
                  value={form.route}
                  onChange={(event) => setForm({ ...form, route: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF]"
                >
                  {routes.length === 0 && <option value="">No routes yet</option>}
                  {routes.map((route) => (
                    <option key={route.id} value={route.label}>{route.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF]"
                >
                  <option>Active</option>
                  <option>Maintenance</option>
                </select>
                <span className="mt-1.5 block text-[11px] text-slate-400">
                  Set to Maintenance to take the vessel out of service.
                </span>
              </label>

              {editingVessel && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trip schedule</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {editingSchedule
                          ? `${editingSchedule.date ? formatISODate(editingSchedule.date) : 'Today'} · ${editingSchedule.departure} – ${editingSchedule.arrival}`
                          : 'No departure scheduled yet'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Move the trip to another departure because of bad weather, maintenance or other delays.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openVesselReschedule}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0056FF] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <CalendarClock className="h-4 w-4" /> Reschedule trip
                  </button>
                </div>
              )}

              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeVesselModal}
                disabled={isSavingVessel}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingVessel}
                className="flex-1 rounded-xl bg-[#0056FF] py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSavingVessel ? 'Saving…' : editingVesselId ? 'Save changes' : 'Save vessel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Route modal (add / edit) */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6 animate-fade-in">
          <form
            onSubmit={handleRouteSubmit}
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl animate-modal-in"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Routes</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingRouteId ? 'Edit route' : 'Add route'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeRouteModal}
                disabled={isSavingRoute}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">From</span>
                    <select
                      value={routeForm.from}
                      onChange={(event) => setRouteForm({ ...routeForm, from: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF]"
                    >
                      {PORT_CODES.map((code) => (
                        <option key={code} value={code}>{PORT_LABELS[code]}</option>
                      ))}
                      <option value={CUSTOM_PORT}>Type a new location…</option>
                    </select>
                  </label>
                  {routeForm.from === CUSTOM_PORT && (
                    <label className="mt-2 block">
                      <span className="mb-1 block text-xs font-semibold text-slate-500">New origin</span>
                      <input
                        autoFocus
                        value={routeForm.customFrom}
                        onChange={(event) => setRouteForm({ ...routeForm, customFrom: event.target.value })}
                        placeholder="Type a port or city"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF]"
                      />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">To</span>
                    <select
                      value={routeForm.to}
                      onChange={(event) => setRouteForm({ ...routeForm, to: event.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF]"
                    >
                      {PORT_CODES.map((code) => (
                        <option key={code} value={code}>{PORT_LABELS[code]}</option>
                      ))}
                      <option value={CUSTOM_PORT}>Type a new location…</option>
                    </select>
                  </label>
                  {routeForm.to === CUSTOM_PORT && (
                    <label className="mt-2 block">
                      <span className="mb-1 block text-xs font-semibold text-slate-500">New destination</span>
                      <input
                        value={routeForm.customTo}
                        onChange={(event) => setRouteForm({ ...routeForm, customTo: event.target.value })}
                        placeholder="Type a port or city"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF]"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Route preview</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {routeLabel(
                    routeForm.from,
                    routeForm.to,
                    routeForm.customFrom,
                    routeForm.customTo,
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {editingRouteId
                    ? 'Renaming keeps all assigned vessels on this route.'
                    : 'The route appears on the user-side Destinations page. Schedule a sailing before tickets can be booked.'}
                </p>
              </div>

              {routeError && <p role="alert" className="text-xs font-medium text-red-600">{routeError}</p>}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeRouteModal}
                disabled={isSavingRoute}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingRoute}
                className="flex-1 rounded-xl bg-[#0056FF] py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSavingRoute ? 'Saving…' : editingRouteId ? 'Save changes' : 'Save route'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete vessel modal */}
      {deletingVessel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6 animate-fade-in">
          <form
            onSubmit={handleDeleteVessel}
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl animate-modal-in"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fleet</p>
                <h3 className="text-lg font-bold text-slate-900">Delete vessel</h3>
              </div>
              <button
                type="button"
                onClick={closeDeleteVessel}
                disabled={isDeletingVessel}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-red-50 px-4 py-3 ring-1 ring-inset ring-red-200">
                <p className="text-sm font-semibold text-red-700">
                  Delete {deletingVessel.name}?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-red-600">
                  {deletingVessel.id} will be removed from the fleet. This action cannot be undone.
                </p>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Reason for deletion <span className="text-red-500">*</span>
                </span>
                <select
                  value={deleteReason}
                  onChange={(event) => {
                    setDeleteReason(event.target.value);
                    setDeleteError('');
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0056FF]"
                >
                  <option value="">Select a reason</option>
                  {DELETE_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Details {deleteReason === 'Other' ? <span className="text-red-500">*</span> : '(optional)'}
                </span>
                <textarea
                  rows={3}
                  value={deleteNote}
                  onChange={(event) => {
                    setDeleteNote(event.target.value);
                    setDeleteError('');
                  }}
                  placeholder="Add any notes about why this vessel is being removed…"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0056FF] focus:ring-2 focus:ring-[#0056FF]/15"
                />
              </label>

              {deleteError && <p className="text-xs font-medium text-red-600">{deleteError}</p>}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeDeleteVessel}
                disabled={isDeletingVessel}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeletingVessel}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isDeletingVessel ? 'Deleting…' : 'Delete vessel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {rescheduleTarget && (
        <AdminRescheduleTripDialog
          trip={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={handleRescheduleSchedule}
        />
      )}
      <Toast message={scheduleToast} onClose={() => setScheduleToast('')} />
    </div>
  );
}
