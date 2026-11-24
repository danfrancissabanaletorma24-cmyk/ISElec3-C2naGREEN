export const statusStyles = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Reschedule pending': 'bg-blue-50 text-blue-700 ring-blue-200',
  Cancelled: 'bg-red-50 text-red-700 ring-red-200',
  Completed: 'bg-slate-100 text-slate-600 ring-slate-200',
  Refunded: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rescheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Maintenance: 'bg-amber-50 text-amber-700 ring-amber-200',
  Retired: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export const currency = (amount) =>
  `₱${Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

export const adminKpis = [
  { id: 'bookings', label: 'Bookings', value: '856', delta: 12.4, hint: 'vs. last month', icon: 'ticket' },
  { id: 'revenue', label: 'Revenue', value: currency(1245600), delta: 8.2, hint: 'vs. last month', icon: 'revenue' },
  { id: 'passengers', label: 'Passengers', value: '642', delta: 6.1, hint: 'vs. last month', icon: 'passengers' },
  { id: 'vessels', label: 'Active vessels', value: '11', delta: 0, hint: 'in service', icon: 'vessels' },
];

export const adminBookings = [
  {
    id: 'BK-1048',
    passenger: 'Juan Dela Cruz',
    email: 'juan@example.com',
    route: 'Mobo → Pio Duran',
    vessel: 'MV Esperanza Star',
    date: '2026-11-18',
    time: '05:00 AM',
    bookedAt: 'Nov 14, 2026',
    payment: 'GCash',
    amount: 760,
    seats: 2,
    status: 'Confirmed',
  },
  {
    id: 'BK-1047',
    passenger: 'Maria Santos',
    email: 'maria@example.com',
    route: 'Masbate City → Pilar',
    vessel: 'Montenegro Lines Fast Craft',
    date: '2026-11-19',
    time: '06:30 AM',
    bookedAt: 'Nov 14, 2026',
    payment: 'Cash',
    amount: 350,
    seats: 1,
    status: 'Pending',
  },
  {
    id: 'BK-1046',
    passenger: 'Jose Reyes',
    email: 'jose@example.com',
    route: 'Mobo → Pilar',
    vessel: 'MV Ricardo 5',
    date: '2026-11-20',
    time: '07:00 AM',
    bookedAt: 'Nov 13, 2026',
    payment: 'GCash',
    amount: 640,
    seats: 2,
    status: 'Confirmed',
  },
  {
    id: 'BK-1045',
    passenger: 'Ana Garcia',
    email: 'ana@example.com',
    route: 'Pio Duran → Mobo',
    vessel: 'MV Esperanza Star',
    date: '2026-11-21',
    time: '12:00 PM',
    bookedAt: 'Nov 13, 2026',
    payment: 'Card',
    amount: 560,
    seats: 1,
    status: 'Refunded',
  },
  {
    id: 'BK-1044',
    passenger: 'Pedro Ramos',
    email: 'pedro@example.com',
    route: 'Pilar → Masbate City',
    vessel: 'Montenegro Lines Fast Craft',
    date: '2026-11-22',
    time: '09:00 AM',
    bookedAt: 'Nov 12, 2026',
    payment: 'Cash',
    amount: 350,
    seats: 1,
    status: 'Cancelled',
  },
];

export const passengers = [
  {
    id: 'P-1001',
    name: 'Juan Dela Cruz',
    email: 'juan@example.com',
    phone: '09171234567',
    verified: true,
    tier: 'Gold',
    trips: 12,
    spend: 12400,
    lastTrip: 'Nov 10, 2026',
    joined: 'Jan 12, 2025',
  },
  {
    id: 'P-1002',
    name: 'Maria Santos',
    email: 'maria@example.com',
    phone: '09181234567',
    verified: true,
    tier: 'Silver',
    trips: 6,
    spend: 5200,
    lastTrip: 'Oct 28, 2026',
    joined: 'Apr 3, 2025',
  },
  {
    id: 'P-1003',
    name: 'Jose Reyes',
    email: 'jose@example.com',
    phone: '09191234567',
    verified: false,
    tier: 'Bronze',
    trips: 2,
    spend: 1280,
    lastTrip: 'Sep 15, 2026',
    joined: 'Aug 9, 2026',
  },
];

export const popularRoutes = [
  { route: 'Mobo → Pio Duran', bookings: 248, revenue: 94240, occupancy: 88, share: 72 },
  { route: 'Mobo → Pilar', bookings: 192, revenue: 61440, occupancy: 76, share: 58 },
  { route: 'Masbate City → Pilar', bookings: 164, revenue: 57400, occupancy: 81, share: 44 },
  { route: 'Pio Duran → Masbate City', bookings: 126, revenue: 50400, occupancy: 69, share: 36 },
];

const makeSeries = (labels, revenue, bookings) =>
  labels.map((label, index) => ({
    label,
    value: revenue[index],
    bookings: bookings[index],
  }));

export const revenueSeries = {
  7: makeSeries(
    ['Nov 8', 'Nov 9', 'Nov 10', 'Nov 11', 'Nov 12', 'Nov 13', 'Nov 14'],
    [12500, 14800, 13900, 17200, 16100, 19400, 18200],
    [34, 41, 38, 46, 43, 52, 48],
  ),
  30: makeSeries(
    ['Oct 16', 'Oct 21', 'Oct 26', 'Oct 31', 'Nov 5', 'Nov 10', 'Nov 14'],
    [68000, 74500, 71200, 83000, 79800, 91400, 88700],
    [182, 198, 190, 221, 214, 243, 236],
  ),
  90: makeSeries(
    ['Aug 17', 'Aug 31', 'Sep 14', 'Sep 28', 'Oct 12', 'Oct 26', 'Nov 14'],
    [182000, 196000, 205000, 198000, 224000, 238000, 251000],
    [486, 522, 544, 526, 596, 634, 668],
  ),
};

export const statusBreakdown = [
  { label: 'Confirmed', value: 512, color: '#10B981' },
  { label: 'Pending', value: 186, color: '#F59E0B' },
  { label: 'Cancelled', value: 98, color: '#EF4444' },
  { label: 'Refunded', value: 60, color: '#94A3B8' },
];

export const upcomingDepartures = [
  {
    id: 'TRIP-101',
    vesselId: 'VES-001',
    vessel: 'MV Esperanza Star',
    route: 'Mobo → Pio Duran',
    departure: '05:00 AM',
    arrival: '10:00 AM',
    status: 'Active',
    sold: 82,
    capacity: 120,
  },
  {
    id: 'TRIP-102',
    vesselId: 'VES-002',
    vessel: 'MV Ricardo 5',
    route: 'Mobo → Pilar',
    departure: '07:00 AM',
    arrival: '09:15 AM',
    status: 'Active',
    sold: 56,
    capacity: 80,
  },
  {
    id: 'TRIP-103',
    vesselId: 'VES-003',
    vessel: 'Montenegro Lines Fast Craft',
    route: 'Masbate City → Pilar',
    departure: '08:00 AM',
    arrival: '10:30 AM',
    status: 'Rescheduled',
    sold: 42,
    capacity: 60,
    date: '2026-11-15',
  },
];

export const paymentBreakdown = [
  { method: 'GCash', value: 48, color: '#0056FF' },
  { method: 'Cash', value: 32, color: '#10B981' },
  { method: 'Card', value: 20, color: '#F59E0B' },
];

export const schedules = upcomingDepartures.map((trip) => ({
  ...trip,
  date: trip.date ?? '2026-11-14',
}));
