import React from 'react';
import { Link } from 'react-router-dom';
import {
  Ship, Calendar, User, Search, ShieldCheck, ChevronDown,
  Ticket, ArrowRight,
  Smartphone, CheckCircle, QrCode,
  Wallet, CreditCard, Landmark, Home, UserCircle
} from 'lucide-react';
import PublicHeader from './public/PublicHeader';
import PublicFooter from './public/PublicFooter';
import { useLanguage } from './i18n/LanguageContext';
import { useCurrency } from './currency/CurrencyContext';
import { getShipTypeLabel, getDestination, toISODate } from './data/customerData';
import useApiData from './hooks/useApiData';
import usePopularRoutes from './hooks/usePopularRoutes';
import { usePorts } from './data/ports';
import { LIFT, STAGGER } from './components/motion';

export default function LandingPage() {
  const HERO_IMG = "/ships/kho-roro.jpg";
  const FALLBACK_IMG = "/ships/montenegro-roro.jpg";
  const { t } = useLanguage();
  const { format } = useCurrency();
  const { ports } = usePorts();
  const { routes: featuredRoutes } = usePopularRoutes(4);
  const { data: boatData } = useApiData('/boats?status=active&limit=3');
  const featuredShips = boatData?.data || [];
  const tomorrow = toISODate(new Date(Date.now() + 86400000));

  const handleImgError = (e) => {
    e.target.src = FALLBACK_IMG;
  };
  const portCity = (code) => ports.find((port) => port.code === code)?.city || getDestination(code).city;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* ---------------- NAVBAR ---------------- */}
      <PublicHeader anchorNav />

      {/* ---------------- HERO SECTION (Full Sea Background) ---------------- */}
      <section id="home" className="relative overflow-hidden pt-12 lg:pt-32 pb-16 min-h-[550px] flex items-center bg-[#EAF3FF] scroll-mt-24">

        {/* Full Width Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_IMG}
            alt="SuperCat ferry sailing across the sea"
            className="h-full w-full object-cover object-center lg:object-right"
            onError={handleImgError}
          />

          {/* Gradient overlay so the text stays readable on the left side */}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#EAF3FF] via-[#EAF3FF]/85 via-35% to-transparent to-60%"></div>

          {/* Soft blend into the white page below */}
          <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-b from-transparent via-white/50 to-white" />
        </div>

        {/* Main Content Container */}
        <div className="max-w-[1280px] w-full mx-auto px-6 md:px-12 lg:px-16 relative z-20">
          <div className="flex flex-col lg:flex-row items-center">
            
            {/* Left Text */}
            <div className="w-full lg:w-1/2 lg:pr-12">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#1E56D6] tracking-wider mb-4 uppercase">
                <Ship className="w-4 h-4" /> {t('hero.badge')}
              </div>
              <h1 className="text-[2.25rem] md:text-[3.5rem] font-extrabold text-[#0B1527] leading-[1.05] mb-6 tracking-tight">
                {t('hero.title1')}<br />{t('hero.title2')}
              </h1>
              <p className="text-slate-700 text-[14px] mb-8 max-w-[420px] leading-relaxed font-medium">
                {t('hero.subtitle')}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ---------------- POPULAR ROUTES ---------------- */}
      <section id="destinations" className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-16 py-12 scroll-mt-24">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[22px] font-bold text-slate-900">{t('section.popular')}</h2>
          <Link to="/destinations" className="text-[14px] font-semibold text-[#1E56D6] flex items-center gap-1 hover:underline">
            {t('section.viewAll')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 ${STAGGER}`}>
          {featuredRoutes.map((r) => ({
            route: `${portCity(r.from)} → ${portCity(r.to)}`,
            type: r.shipType ? getShipTypeLabel(r.shipType) : 'Route',
            time: r.duration,
            price: r.price,
            sailings: r.sailings,
            img: r.image || HERO_IMG,
            from: r.from,
            to: r.to,
          })).map((item, i) => (
            <Link key={i} to={`/search?from=${item.from}&to=${item.to}&date=${tomorrow}&adults=1&shipType=any`} className={`relative rounded-xl overflow-hidden group cursor-pointer h-[240px] bg-slate-200 ${LIFT}`}>
              <img 
                src={item.img} 
                alt={item.route} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                onError={handleImgError}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1527]/95 via-[#0B1527]/40 to-transparent"></div>
              <div className="absolute top-4 left-4 bg-white/95 px-3 py-1.5 rounded-md text-[11px] font-semibold text-slate-800 shadow-sm">{item.type}</div>
              <div className="absolute bottom-4 left-4 right-4 text-white" data-surface="dark">
                <h3 className="font-bold text-[18px] mb-1">{item.route}</h3>
                <p className="text-[13px] text-slate-200 mb-1">
                  {item.time || 'No upcoming sailing'}
                </p>
                <p className="text-[14px] font-semibold">
                  {item.sailings > 0
                    ? <>{t('common.from')} {format(item.price)} <span className="text-[12px] font-normal text-slate-300">{t('common.perPerson')}</span></>
                    : 'No upcoming sailing'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- OUR SHIPS ---------------- */}
      <section id="ships" className="bg-white pb-14 scroll-mt-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-bold text-slate-900">{t('ships.title')}</h2>
              <p className="mt-1 text-[13px] text-slate-500">{t('ships.sub')}</p>
            </div>
            <Link to="/ships" className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#1E56D6] hover:underline">
              {t('nav.ships')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className={`grid gap-4 md:grid-cols-3 ${STAGGER}`}>
            {featuredShips.map((boat) => (
              <div key={boat._id} className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${LIFT}`}>
                <img
                  src={boat.imageUrl || HERO_IMG}
                  alt={boat.name}
                  className="h-40 w-full object-cover"
                  onError={handleImgError}
                />
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0056FF]">
                      <Ship className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{boat.name}</h3>
                      <p className="text-[11px] text-slate-500">{boat.operator}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">{getShipTypeLabel(boat.boatType)}</span>
                    <span className="text-[12px] font-semibold text-slate-700">{boat.seatCapacity} seats</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- SECONDARY FEATURES (WAVE BG) ---------------- */}
      <section className="relative bg-[#F0F7FF] py-8 border-y border-[#E2EFFF]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-16 flex flex-wrap justify-between items-center gap-6">
           <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100"><Ticket className="w-5 h-5 text-[#1E56D6]" /></div>
            <div><p className="font-bold text-[14px] text-slate-800">{t('feature.easy')}</p><p className="text-[12px] text-slate-500 mt-0.5">{t('feature.easyDesc')}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100"><Smartphone className="w-5 h-5 text-[#1E56D6]" /></div>
            <div><p className="font-bold text-[14px] text-slate-800">{t('feature.eticket')}</p><p className="text-[12px] text-slate-500 mt-0.5">{t('feature.eticketDesc')}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100"><User className="w-5 h-5 text-[#1E56D6]" /></div>
            <div><p className="font-bold text-[14px] text-slate-800">{t('feature.seat')}</p><p className="text-[12px] text-slate-500 mt-0.5">{t('feature.seatDesc')}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100"><ShieldCheck className="w-5 h-5 text-[#1E56D6]" /></div>
            <div><p className="font-bold text-[14px] text-slate-800">{t('feature.secure')}</p><p className="text-[12px] text-slate-500 mt-0.5">{t('feature.secureDesc')}</p></div>
          </div>
        </div>
      </section>

      {/* ---------------- MOBILE APP / HOW IT WORKS ---------------- */}
      <section className="bg-[#EAF3FF] pt-16 pb-12 overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-col xl:flex-row gap-12 items-center xl:items-start">
          
          {/* Left Side text */}
          <div className="xl:w-[25%] pt-4">
            <h2 className="text-[2rem] md:text-[2.5rem] leading-[1.1] font-extrabold text-[#0B1527] mb-5 tracking-tight">
              BOOKING<br /><span className="text-[#1E56D6]">MADE SIMPLE</span>
            </h2>
            <p className="text-slate-600 mb-8 text-[15px] leading-relaxed max-w-[280px]">
              Plan your trip, select your seat, and get your e-ticket — all from your phone.
            </p>

            <ul className="space-y-6">
              <li className="flex gap-3 items-start">
                <div className="bg-white p-2 rounded-full shadow-sm mt-0.5"><Search className="w-4 h-4 text-[#1E56D6]" /></div>
                <div><h4 className="font-bold text-[14px] text-slate-800">Search & Compare</h4><p className="text-[12px] text-slate-500 mt-0.5">Multiple ships and schedules</p></div>
              </li>
              <li className="flex gap-3 items-start">
                <div className="bg-white p-2 rounded-full shadow-sm mt-0.5"><User className="w-4 h-4 text-[#1E56D6]" /></div>
                <div><h4 className="font-bold text-[14px] text-slate-800">Choose Your Seat</h4><p className="text-[12px] text-slate-500 mt-0.5">View real-time seat map</p></div>
              </li>
              <li className="flex gap-3 items-start">
                <div className="bg-white p-2 rounded-full shadow-sm mt-0.5"><Ticket className="w-4 h-4 text-[#1E56D6]" /></div>
                <div><h4 className="font-bold text-[14px] text-slate-800">Instant E-Ticket</h4><p className="text-[12px] text-slate-500 mt-0.5">Get your ticket via email & app</p></div>
              </li>
              <li className="flex gap-3 items-start">
                <div className="bg-white p-2 rounded-full shadow-sm mt-0.5"><Calendar className="w-4 h-4 text-[#1E56D6]" /></div>
                <div><h4 className="font-bold text-[14px] text-slate-800">Manage Booking</h4><p className="text-[12px] text-slate-500 mt-0.5">Reschedule or cancel easily</p></div>
              </li>
            </ul>
          </div>

          {/* Right Side - Phone Mockups */}
          <div className="w-full xl:w-[75%] flex gap-2.5 overflow-x-auto xl:overflow-x-visible pb-8 pt-4 px-2 snap-x items-start justify-start xl:justify-between">
            
            {/* Phone 1: Search Results */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border-[8px] border-slate-900 w-[200px] h-[430px] shrink-0 flex flex-col relative overflow-hidden snap-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-b-2xl z-20"></div>
              
              <div className="px-5 py-4 border-b flex justify-between items-center mt-3">
                 <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E56D6]"><Ship className="w-4 h-4"/> LayagExpress</div>
                 <Search className="w-4 h-4 text-slate-400"/>
              </div>

              <div className="p-4 bg-slate-50 flex-1 overflow-y-auto">
                <h4 className="font-bold text-[14px] text-slate-900 mb-0.5">Search Results</h4>
                <p className="text-[10px] text-slate-500 mb-4">Mobo (MBO) → Pio Duran (PDU)<br/>Search by date • 1 Adult</p>
                
                <div className="flex flex-wrap gap-1.5 text-[10px] mb-4">
                   <span className="bg-[#1E56D6] text-white px-3 py-1 rounded-full font-medium">All</span>
                   <span className="bg-white border text-slate-600 px-3 py-1 rounded-full">Fast Craft</span>
                   <span className="bg-white border text-slate-600 px-3 py-1 rounded-full">RoRo / Ferry</span>
                </div>

                <div className="space-y-3">
                  {[
                    {name: "MV Esperanza Star", price: "₱380", img: "/ships/kho-roro.jpg"},
                    {name: "MV Mobo", price: "₱300", img: "/ships/kho-cargo.png"},
                    {name: "MV Ricardo 5", price: "₱320", img: "/ships/kho-fast-craft.jpg"}
                  ].map((s, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-xl p-2 flex gap-2 shadow-sm items-center">
                      <img 
                        src={s.img} 
                        className="w-10 h-10 rounded-lg object-cover bg-slate-200" 
                        alt="ship" 
                        onError={handleImgError}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-900">{s.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Fast Craft • 2h 30m</p>
                      </div>
                      <div className="text-right flex flex-col justify-between h-full shrink-0">
                        <p className="text-[10px] font-bold text-slate-900">{s.price}</p>
                        <button className="bg-[#1E56D6] text-white text-[9px] px-2 py-1 rounded-md mt-1">Select</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Bottom Nav */}
              <div className="border-t bg-white py-3 px-6 flex justify-between items-center text-slate-400">
                 <div className="flex flex-col items-center gap-1"><Home className="w-4 h-4 text-[#1E56D6]"/><span className="text-[8px] font-medium text-[#1E56D6]">Home</span></div>
                 <div className="flex flex-col items-center gap-1"><Ticket className="w-4 h-4"/><span className="text-[8px]">Tickets</span></div>
                 <div className="flex flex-col items-center gap-1"><Wallet className="w-4 h-4"/><span className="text-[8px]">Bookings</span></div>
                 <div className="flex flex-col items-center gap-1"><UserCircle className="w-4 h-4"/><span className="text-[8px]">Profile</span></div>
              </div>
            </div>

            {/* Phone 2: Seat Selection */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border-[8px] border-slate-900 w-[200px] h-[430px] shrink-0 flex flex-col relative overflow-hidden snap-center">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-b-2xl z-20"></div>
               
               <div className="px-4 py-4 border-b flex items-center gap-2 mt-3">
                 <ArrowRight className="w-4 h-4 rotate-180 text-slate-600"/> 
                 <span className="text-[12px] font-bold text-slate-900">Seat Selection</span>
               </div>
               
               <div className="p-4 flex-1 flex flex-col bg-white overflow-y-auto">
                 <h4 className="font-bold text-[13px] text-slate-900 mb-0.5">Mobo → Pio Duran</h4>
                 <p className="text-[10px] text-slate-500 mb-2">MV Esperanza Star • 5h</p>
                 
                 <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] mb-2">
                   <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded-sm"></div>Available</span>
                   <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#1E56D6] rounded-sm"></div>Selected</span>
                   <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-100 rounded-sm"></div>Occupied</span>
                 </div>

                 <div className="flex-1 flex flex-col items-center">
                    <div className="grid grid-cols-6 gap-1.5 mb-2">
                      {Array.from({length: 48}).map((_, i) => {
                        const isSelected = i === 14 || i === 15;
                        const isOccupied = i === 8 || i === 9 || i === 22 || i === 31;
                        const isAisle = i % 6 === 2 || i % 6 === 3;
                        return (
                          <React.Fragment key={i}>
                            {isAisle && i % 6 === 2 ? (
                              <div className="w-5 h-5 flex items-center justify-center text-[8px] text-slate-300">{String.fromCharCode(65 + Math.floor(i/6))}</div>
                            ) : isAisle ? (
                              <div className="w-5 h-5"></div>
                            ) : (
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-[8px] font-bold
                                ${isSelected ? 'bg-[#1E56D6] border-[#1E56D6] text-white' : 
                                  isOccupied ? 'bg-slate-100 border-slate-100' : 
                                  'bg-blue-50 border-blue-200 text-blue-500'}`}>
                                {(i%6 === 0 || i%6 === 1) ? (i%6 + 1) : (i%6 + 2)}
                              </div>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </div>
                 </div>

                 <div className="mt-auto border-t pt-2">
                    <div className="flex justify-between items-center mb-1.5 text-[10px] text-slate-500">
                      <span>Seats Selected</span>
                      <span className="font-bold text-slate-900">B5, B6</span>
                    </div>
                    <button className="bg-[#1E56D6] text-white text-[13px] py-2 rounded-xl font-bold w-full shadow-md">Next</button>
                 </div>
               </div>
            </div>

            {/* Phone 3: Passenger Details */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border-[8px] border-slate-900 w-[200px] h-[430px] shrink-0 flex flex-col relative overflow-hidden snap-center">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-b-2xl z-20"></div>
               
               <div className="px-4 py-4 border-b flex items-center gap-2 mt-3">
                 <ArrowRight className="w-4 h-4 rotate-180 text-slate-600"/> 
                 <span className="text-[12px] font-bold text-slate-900">Passenger Details</span>
               </div>
               
               <div className="p-4 flex-1 flex flex-col bg-white min-h-0">
                 <h4 className="font-bold text-[13px] text-slate-900 mb-3">Traveler 1</h4>
                 
                 <div className="space-y-1.5 mb-2 overflow-y-auto flex-1 min-h-0 pr-0.5">
                   <div>
                     <label className="text-[10px] font-medium text-slate-500">Full Name</label>
                     <input type="text" value="Your Name" className="w-full border border-slate-200 rounded-lg px-2.5 py-1 mt-1 text-[11px] text-slate-800" readOnly/>
                   </div>
                   <div>
                     <label className="text-[10px] font-medium text-slate-500">Contact Number</label>
                     <input type="text" value="+63 912 345 6789" className="w-full border border-slate-200 rounded-lg px-2.5 py-1 mt-1 text-[11px] text-slate-800" readOnly/>
                   </div>
                   <div>
                     <label className="text-[10px] font-medium text-slate-500">Email Address</label>
                     <input type="text" value="juan@email.com" className="w-full border border-slate-200 rounded-lg px-2.5 py-1 mt-1 text-[11px] text-slate-800" readOnly/>
                   </div>
                   <div>
                     <label className="text-[10px] font-medium text-slate-500">Payment Method</label>
                     <div className="border border-slate-200 rounded-xl p-2 mt-1.5 space-y-1.5 bg-slate-50">
                       <label className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                          <input type="radio" checked readOnly className="w-3 h-3 accent-[#1E56D6]"/> 
                          <Wallet className="w-4 h-4 text-[#1E56D6]"/> GCash
                       </label>
                       <label className="flex items-center gap-2 text-[11px] text-slate-500">
                          <input type="radio" readOnly className="w-3 h-3"/> 
                          <CreditCard className="w-4 h-4"/> Credit / Debit Card
                       </label>
                       <label className="flex items-center gap-2 text-[11px] text-slate-500">
                          <input type="radio" readOnly className="w-3 h-3"/> 
                          <Landmark className="w-4 h-4"/> Bank Transfer
                       </label>
                     </div>
                   </div>
                 </div>
                 <button className="bg-[#1E56D6] text-white text-[13px] py-2.5 rounded-xl font-bold w-full mt-2 shrink-0 shadow-md">Proceed to Payment</button>
               </div>
            </div>

            {/* Phone 4: Booking Confirmed */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border-[8px] border-slate-900 w-[200px] h-[430px] shrink-0 flex flex-col relative overflow-hidden items-center text-center snap-center">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-b-2xl z-20"></div>
               
               <div className="px-4 py-4 border-b w-full flex items-center gap-2 mt-3">
                 <ArrowRight className="w-4 h-4 rotate-180 text-slate-600"/> 
                 <span className="text-[12px] font-bold text-slate-900 mx-auto pr-4">Booking Confirmed</span>
               </div>

               <div className="p-4 flex flex-col items-center h-full w-full bg-slate-50/50 overflow-y-auto">
                 <div className="w-11 h-11 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-2">
                   <CheckCircle className="w-5 h-5" />
                 </div>
                 <h3 className="font-bold text-[#1E56D6] mb-1 text-[12px]">Your e-ticket has been issued!</h3>
                 <p className="text-[10px] text-slate-500 mb-3">Booking Reference<br/><span className="font-bold text-slate-900 text-[11px]">TRZ-20260520-001234</span></p>
                 
                 <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 mb-3">
                   <QrCode className="w-12 h-12 text-slate-900" />
                 </div>
                 
                 <div className="text-[10px] text-slate-600 mb-3 w-full border-t border-b border-slate-200 py-2">
                   <p className="font-bold text-slate-900 mb-0.5">Mobo → Pio Duran</p>
                   <p className="text-[9px] text-slate-500">Departs 5:00 AM • 5h</p>
                   <p className="font-bold text-slate-800 mt-1.5">Your Name</p>
                   <p className="text-[9px] text-slate-500">Seat B5 • MV Esperanza Star</p>
                 </div>
                 
                 <div className="mt-auto w-full space-y-1.5 pb-1">
                   <button className="border border-slate-300 text-slate-700 text-[11px] py-2 rounded-lg font-bold w-full bg-white">Download E-Ticket</button>
                   <button className="bg-[#1E56D6] text-white text-[11px] py-2 rounded-lg font-bold w-full shadow-md">View Booking</button>
                 </div>
               </div>
            </div>

          </div>
        </div>
        
        {/* Steps Indicator */}
        <div className="max-w-[1100px] mx-auto px-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { title: 'Search Results', desc: 'Choose your preferred ship and schedule.' },
              { title: 'Seat Selection', desc: 'Pick your preferred seat from the available map.' },
              { title: 'Passenger Details', desc: 'Fill in your information and choose a payment method.' },
              { title: 'E-Ticket Issued', desc: 'Get your e-ticket via email or in the app.' }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#1E56D6] text-white flex items-center justify-center font-bold text-[14px] mb-3 shadow-sm">{i+1}</div>
                <p className="font-bold text-[14px] text-slate-900 mb-1">{step.title}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed max-w-[180px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HELP / FAQ ---------------- */}
      <section id="help" className="bg-[#F0F7FF] py-14 border-t border-[#E2EFFF] scroll-mt-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-bold text-slate-900">{t('help.title')}</h2>
              <p className="mt-1 text-[13px] text-slate-500">{t('help.sub')}</p>
            </div>
            <Link to="/support" className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#1E56D6] hover:underline">
              {t('help.contact')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className={`grid gap-4 md:grid-cols-3 ${STAGGER}`}>
            {[
              { q: 'How do I cancel or reschedule?', a: 'Open My Bookings, select the trip, and choose Reschedule or Cancel. Changes made at least 24 hours before departure are free.' },
              { q: 'What is the baggage allowance?', a: 'Each passenger may bring up to 20 kg of checked baggage plus one hand-carry item.' },
              { q: 'Do I need to print my e-ticket?', a: 'No. Show the QR code in your Tickets page at the gate — a printed copy also works.' },
            ].map((item) => (
              <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}