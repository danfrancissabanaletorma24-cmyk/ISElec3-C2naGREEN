// src/data/adminData.js
// Mock data for the LayagExpress admin console. No backend — everything is in-memory.

export const adminKpis = [
  {
    id: 'bookings',
    label: "Today's Bookings",
    value: '168',
    delta: 12.4,
    hint: 'vs. yesterday',
    icon: 'ticket',
  },
  {
    id: 'revenue',
    label: 'Revenue Today',
    value: '₱312,480',
    delta: 8.2,
    hint: 'vs. yesterday',
    icon: 'revenue',
  },
  {
    id: 'passengers',
    label: 'Passengers',
    value: '1,284',
    delta: 5.1,
    hint: 'sailing today',
    icon: 'passengers',
  },
  {
    id: 'vessels',
    label: 'Active Vessels',
    value: '9 / 11',
    delta: -3.4,
    hint: '2 under maintenance',
    icon: 'vessels',
  },
];

export const statusBreakdown = [
  { label: 'Confirmed', value: 612, color: '#16A34A' },
  { label: 'Pending', value: 148, color: '#F59E0B' },
  { label: 'Cancelled', value: 64, color: '#EF4444' },
  { label: 'Refunded', value: 32, color: '#64748B' },
];

export const revenueSeries = {
  7: [
    { label: 'Mon', value: 214000, bookings: 96 },
    { label: 'Tue', value: 246500, bookings: 112 },
    { label: 'Wed', value: 198200, bookings: 88 },
    { label: 'Thu', value: 268400, bookings: 124 },
    { label: 'Fri', value: 352800, bookings: 148 },
    { label: 'Sat', value: 398600, bookings: 172 },
    { label: 'Sun', value: 312480, bookings: 168 },
  ],
  30: [
    { label: 'Sep 30', value: 198400, bookings: 92 },
    { label: 'Oct 3', value: 226800, bookings: 104 },
    { label: 'Oct 6', value: 248600, bookings: 118 },
    { label: 'Oct 9', value: 214200, bookings: 96 },
    { label: 'Oct 12', value: 268400, bookings: 126 },
    { label: 'Oct 15', value: 302600, bookings: 142 },
    { label: 'Oct 18', value: 284800, bookings: 132 },
    { label: 'Oct 21', value: 326200, bookings: 152 },
    { label: 'Oct 24', value: 381400, bookings: 178 },
    { label: 'Oct 27', value: 352800, bookings: 164 },
    { label: 'Oct 29', value: 312480, bookings: 168 },
  ],
  90: [
    { label: 'Aug 1', value: 152400, bookings: 74 },
    { label: 'Aug 10', value: 176800, bookings: 82 },
    { label: 'Aug 20', value: 164200, bookings: 78 },
    { label: 'Sep 1', value: 188600, bookings: 90 },
    { label: 'Sep 10', value: 205400, bookings: 98 },
    { label: 'Sep 20', value: 232800, bookings: 110 },
    { label: 'Oct 1', value: 248600, bookings: 118 },
    { label: 'Oct 10', value: 274200, bookings: 126 },
    { label: 'Oct 20', value: 318400, bookings: 154 },
    { label: 'Oct 29', value: 312480, bookings: 168 },
  ],
};

export const adminBookings = [
  { id: 'TVZ-10482', passenger: 'Kerwin Tagle', email: 'kerwin.tagle@email.com', route: 'Manila → Cebu', date: '2026-05-20', time: '2:00 PM', vessel: 'SuperCat 2', seats: 2, amount: 1680, status: 'Confirmed', payment: 'GCash', bookedAt: '2026-10-28' },
  { id: 'TVZ-10481', passenger: 'Maria Santos', email: 'maria.santos@email.com', route: 'Cebu → Bohol', date: '2026-05-21', time: '8:30 AM', vessel: 'OceanJet 7', seats: 1, amount: 650, status: 'Pending', payment: 'PayMaya', bookedAt: '2026-10-28' },
  { id: 'TVZ-10480', passenger: 'Juan Dela Cruz', email: 'juan.dc@email.com', route: 'Caticlan → Boracay', date: '2026-05-20', time: '10:00 AM', vessel: 'Island Jet 3', seats: 3, amount: 1650, status: 'Confirmed', payment: 'Credit Card', bookedAt: '2026-10-28' },
  { id: 'TVZ-10479', passenger: 'Ana Reyes', email: 'ana.reyes@email.com', route: 'Bacolod → Iloilo', date: '2026-05-19', time: '1:15 PM', vessel: 'Weesam 4', seats: 2, amount: 840, status: 'Cancelled', payment: 'GCash', bookedAt: '2026-10-27' },
  { id: 'TVZ-10478', passenger: 'Mark Villanueva', email: 'mark.v@email.com', route: 'Manila → Cebu', date: '2026-05-22', time: '6:00 AM', vessel: 'SuperCat 1', seats: 1, amount: 840, status: 'Confirmed', payment: 'Credit Card', bookedAt: '2026-10-27' },
  { id: 'TVZ-10477', passenger: 'Liza Mendoza', email: 'liza.m@email.com', route: 'Cebu → Bohol', date: '2026-05-23', time: '4:30 PM', vessel: 'OceanJet 9', seats: 4, amount: 2600, status: 'Pending', payment: 'PayMaya', bookedAt: '2026-10-27' },
  { id: 'TVZ-10476', passenger: 'Paolo Garcia', email: 'paolo.g@email.com', route: 'Caticlan → Boracay', date: '2026-05-20', time: '12:45 PM', vessel: 'Island Jet 3', seats: 2, amount: 1100, status: 'Refunded', payment: 'GCash', bookedAt: '2026-10-26' },
  { id: 'TVZ-10475', passenger: 'Bea Cruz', email: 'bea.cruz@email.com', route: 'Manila → Cebu', date: '2026-05-18', time: '9:00 PM', vessel: 'SuperCat 2', seats: 1, amount: 840, status: 'Confirmed', payment: 'Credit Card', bookedAt: '2026-10-26' },
  { id: 'TVZ-10474', passenger: 'Ramon Aquino', email: 'ramon.a@email.com', route: 'Bacolod → Iloilo', date: '2026-05-18', time: '7:30 AM', vessel: 'Weesam 4', seats: 2, amount: 840, status: 'Confirmed', payment: 'GCash', bookedAt: '2026-10-26' },
  { id: 'TVZ-10473', passenger: 'Grace Lim', email: 'grace.lim@email.com', route: 'Cebu → Bohol', date: '2026-05-17', time: '11:00 AM', vessel: 'OceanJet 7', seats: 3, amount: 1950, status: 'Cancelled', payment: 'PayMaya', bookedAt: '2026-10-25' },
  { id: 'TVZ-10472', passenger: 'Nico Tan', email: 'nico.tan@email.com', route: 'Manila → Cebu', date: '2026-05-19', time: '2:00 PM', vessel: 'SuperCat 3', seats: 2, amount: 1680, status: 'Confirmed', payment: 'Credit Card', bookedAt: '2026-10-25' },
  { id: 'TVZ-10471', passenger: 'Carla Dizon', email: 'carla.d@email.com', route: 'Caticlan → Boracay', date: '2026-05-16', time: '8:00 AM', vessel: 'Island Jet 1', seats: 1, amount: 550, status: 'Pending', payment: 'GCash', bookedAt: '2026-10-25' },
  { id: 'TVZ-10470', passenger: 'Ferdinand Ramos', email: 'ferdie.r@email.com', route: 'Cebu → Bohol', date: '2026-05-15', time: '3:30 PM', vessel: 'OceanJet 9', seats: 2, amount: 1300, status: 'Confirmed', payment: 'Credit Card', bookedAt: '2026-10-24' },
  { id: 'TVZ-10469', passenger: 'Sofia Bernardo', email: 'sofia.b@email.com', route: 'Bacolod → Iloilo', date: '2026-05-15', time: '5:45 PM', vessel: 'Weesam 2', seats: 1, amount: 420, status: 'Refunded', payment: 'PayMaya', bookedAt: '2026-10-24' },
];

export const passengers = [
  { id: 'PSG-2031', name: 'Kerwin Tagle', email: 'kerwin.tagle@email.com', phone: '+63 917 555 0142', trips: 24, spend: 18420, verified: true, joined: '2024-03-12', lastTrip: '2026-05-20', tier: 'Gold' },
  { id: 'PSG-2030', name: 'Maria Santos', email: 'maria.santos@email.com', phone: '+63 918 222 8871', trips: 11, spend: 7480, verified: true, joined: '2024-08-04', lastTrip: '2026-05-21', tier: 'Silver' },
  { id: 'PSG-2029', name: 'Juan Dela Cruz', email: 'juan.dc@email.com', phone: '+63 920 441 3320', trips: 7, spend: 5120, verified: false, joined: '2025-01-19', lastTrip: '2026-05-20', tier: 'Silver' },
  { id: 'PSG-2028', name: 'Ana Reyes', email: 'ana.reyes@email.com', phone: '+63 915 778 9090', trips: 3, spend: 1980, verified: true, joined: '2025-06-27', lastTrip: '2026-05-19', tier: 'Bronze' },
  { id: 'PSG-2027', name: 'Mark Villanueva', email: 'mark.v@email.com', phone: '+63 927 110 4455', trips: 18, spend: 13860, verified: true, joined: '2024-05-02', lastTrip: '2026-05-22', tier: 'Gold' },
  { id: 'PSG-2026', name: 'Liza Mendoza', email: 'liza.m@email.com', phone: '+63 916 903 2211', trips: 9, spend: 6740, verified: false, joined: '2024-11-11', lastTrip: '2026-05-23', tier: 'Silver' },
  { id: 'PSG-2025', name: 'Paolo Garcia', email: 'paolo.g@email.com', phone: '+63 921 664 0098', trips: 5, spend: 3410, verified: true, joined: '2025-02-22', lastTrip: '2026-05-20', tier: 'Bronze' },
  { id: 'PSG-2024', name: 'Bea Cruz', email: 'bea.cruz@email.com', phone: '+63 919 332 7766', trips: 14, spend: 10920, verified: true, joined: '2024-07-16', lastTrip: '2026-05-18', tier: 'Gold' },
  { id: 'PSG-2023', name: 'Ramon Aquino', email: 'ramon.a@email.com', phone: '+63 917 889 1122', trips: 6, spend: 4410, verified: false, joined: '2025-03-08', lastTrip: '2026-05-18', tier: 'Bronze' },
  { id: 'PSG-2022', name: 'Grace Lim', email: 'grace.lim@email.com', phone: '+63 926 445 6633', trips: 2, spend: 1300, verified: true, joined: '2025-09-30', lastTrip: '2026-05-17', tier: 'Bronze' },
];

export const vessels = [
  { id: 'VSL-01', name: 'SuperCat 1', type: 'Fast Craft', capacity: 320, sold: 284, route: 'Manila → Cebu', status: 'Active' },
  { id: 'VSL-02', name: 'SuperCat 2', type: 'Fast Craft', capacity: 320, sold: 302, route: 'Manila → Cebu', status: 'Active' },
  { id: 'VSL-03', name: 'SuperCat 3', type: 'Fast Craft', capacity: 280, sold: 198, route: 'Manila → Cebu', status: 'Active' },
  { id: 'VSL-04', name: 'OceanJet 7', type: 'Fast Craft', capacity: 210, sold: 176, route: 'Cebu → Bohol', status: 'Active' },
  { id: 'VSL-05', name: 'OceanJet 9', type: 'Fast Craft', capacity: 210, sold: 142, route: 'Cebu → Bohol', status: 'Active' },
  { id: 'VSL-06', name: 'Island Jet 3', type: 'Fast Craft', capacity: 160, sold: 154, route: 'Caticlan → Boracay', status: 'Active' },
  { id: 'VSL-07', name: 'Weesam 4', type: 'RoRo / Ferry', capacity: 420, sold: 268, route: 'Bacolod → Iloilo', status: 'Active' },
  { id: 'VSL-08', name: 'Weesam 2', type: 'RoRo / Ferry', capacity: 380, sold: 0, route: 'Bacolod → Iloilo', status: 'Maintenance' },
  { id: 'VSL-09', name: 'OceanJet 5', type: 'Fast Craft', capacity: 210, sold: 0, route: 'Cebu → Bohol', status: 'Maintenance' },
  { id: 'VSL-10', name: 'Island Jet 1', type: 'Fast Craft', capacity: 160, sold: 112, route: 'Caticlan → Boracay', status: 'Active' },
  { id: 'VSL-11', name: 'SuperCat 5', type: 'Fast Craft', capacity: 300, sold: 244, route: 'Manila → Cebu', status: 'Active' },
];

export const schedules = [
  { id: 'SCH-01', vessel: 'SuperCat 1', route: 'Manila → Cebu', departure: '06:00 AM', arrival: '08:30 AM', sold: 284, capacity: 320, status: 'Boarding' },
  { id: 'SCH-02', vessel: 'OceanJet 7', route: 'Cebu → Bohol', departure: '08:30 AM', arrival: '10:30 AM', sold: 176, capacity: 210, status: 'On Time' },
  { id: 'SCH-03', vessel: 'Island Jet 3', route: 'Caticlan → Boracay', departure: '10:00 AM', arrival: '11:00 AM', sold: 154, capacity: 160, status: 'On Time' },
  { id: 'SCH-04', vessel: 'Weesam 4', route: 'Bacolod → Iloilo', departure: '01:15 PM', arrival: '02:45 PM', sold: 268, capacity: 420, status: 'Delayed' },
  { id: 'SCH-05', vessel: 'SuperCat 2', route: 'Manila → Cebu', departure: '02:00 PM', arrival: '04:30 PM', sold: 302, capacity: 320, status: 'On Time' },
  { id: 'SCH-06', vessel: 'OceanJet 9', route: 'Cebu → Bohol', departure: '04:30 PM', arrival: '06:30 PM', sold: 142, capacity: 210, status: 'On Time' },
  { id: 'SCH-07', vessel: 'SuperCat 5', route: 'Manila → Cebu', departure: '06:00 PM', arrival: '08:30 PM', sold: 244, capacity: 300, status: 'On Time' },
];

export const popularRoutes = [
  { route: 'Manila → Cebu', bookings: 1842, revenue: 1547280, share: 38, occupancy: 92 },
  { route: 'Cebu → Bohol', bookings: 1204, revenue: 782600, share: 25, occupancy: 84 },
  { route: 'Caticlan → Boracay', bookings: 986, revenue: 542300, share: 20, occupancy: 96 },
  { route: 'Bacolod → Iloilo', bookings: 731, revenue: 307020, share: 17, occupancy: 71 },
];

export const paymentBreakdown = [
  { method: 'GCash', value: 42, color: '#0056FF' },
  { method: 'Credit / Debit Card', value: 31, color: '#38BDF8' },
  { method: 'PayMaya', value: 18, color: '#F59E0B' },
  { method: 'Bank Transfer', value: 9, color: '#94A3B8' },
];

export const upcomingDepartures = schedules.slice(0, 5);

export const statusStyles = {
  Confirmed: 'bg-green-100 text-green-700 ring-green-200',
  Pending: 'bg-amber-100 text-amber-700 ring-amber-200',
  Rescheduled: 'bg-blue-100 text-blue-700 ring-blue-200',
  Cancelled: 'bg-red-100 text-red-700 ring-red-200',
  Refunded: 'bg-slate-100 text-slate-600 ring-slate-200',
  Active: 'bg-green-100 text-green-700 ring-green-200',
  Maintenance: 'bg-amber-100 text-amber-700 ring-amber-200',
  'On Time': 'bg-green-100 text-green-700 ring-green-200',
  Boarding: 'bg-blue-100 text-blue-700 ring-blue-200',
  Delayed: 'bg-red-100 text-red-700 ring-red-200',
};

export const currency = (amount) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);
