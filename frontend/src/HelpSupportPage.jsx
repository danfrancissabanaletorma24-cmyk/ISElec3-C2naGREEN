import React from 'react';
import {
  Search, Mail, Phone, MessageSquare,
  ChevronRight, FileText
} from 'lucide-react';
import CustomerSidebar from './customer/CustomerSidebar';
import CustomerHeader from './customer/CustomerHeader';
import useSidebarState from './hooks/useSidebarState';

import { SITE } from './config/site';

export default function HelpSupportPage() {
  const { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed } = useSidebarState({
    storageKey: 'travezia.customer.sidebarCollapsed',
  });

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] font-sans text-slate-800">

      {/* ================= SIDEBAR ================= */}
      <CustomerSidebar
        open={mobileOpen}
        onClose={closeMobile}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex flex-1 flex-col">
        <CustomerHeader
          title="Help & Support"
          subtitle="FAQs, live chat and contact details"
          onOpenMenu={openMobile}
        />

        <div className="px-4 md:px-8 pb-10 max-w-[1000px] mx-auto w-full">

          {/* Header & Search */}
          <div className="text-center mb-10 mt-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">How can we help you?</h1>
            <p className="text-slate-500 mb-6">Search our knowledge base or contact our 24/7 support team.</p>

            <div className="relative max-w-lg mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search for booking, refunds, schedules..."
                className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#0056FF] focus:border-[#0056FF] outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* FAQs */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0056FF]" /> Frequently Asked Questions
              </h2>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {[
                  "How do I cancel or reschedule my trip?",
                  "What is the baggage allowance?",
                  "Can I change the passenger name on my ticket?",
                  "How long does a refund take?",
                  "Do I need to print my e-ticket?"
                ].map((faq, i) => (
                  <button key={i} className="w-full text-left px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                    <span className="text-sm font-medium text-slate-700 group-hover:text-[#0056FF]">{faq}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0056FF]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Support */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0056FF]" /> Contact Support
              </h2>

              <div className="space-y-4">
                {/* Live Chat */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-[#0056FF] transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <MessageSquare className="w-6 h-6 text-[#0056FF]" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-[#0056FF]">Live Chat</p>
                    <p className="text-xs text-slate-500">Available 24/7. Average wait: 2 mins.</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 ml-auto group-hover:text-[#0056FF]" />
                </div>

                {/* Email */}
                <a href={`mailto:${SITE.supportEmail}`} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-[#0056FF] transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-[#0056FF]">Email Support</p>
                    <p className="text-xs text-slate-500">{SITE.supportEmail}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 ml-auto group-hover:text-[#0056FF]" />
                </a>

                {SITE.phone && (
                <>
                {/* Phone */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-[#0056FF] transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-[#0056FF]">Call Us</p>
                    <p className="text-xs text-slate-500">{SITE.phone}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 ml-auto group-hover:text-[#0056FF]" />
                </div>
                </>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}