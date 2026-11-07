import { NavLink } from 'react-router-dom';
import { Ship, LayoutDashboard, X, ChevronLeft, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function CustomerSidebar({
  open = false,
  onClose = () => {},
  collapsed = false,
  onToggleCollapse = () => {},
  highlight,
}) {
  const isCollapsed = collapsed && !open;

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      <aside
        aria-label="Customer navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isCollapsed ? 'lg:w-[80px]' : ''
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-20 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:bg-slate-50 hover:text-[#0056FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0056FF]/40 lg:flex"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          )}
        </button>

        {/* Logo row — its bottom border lines up with the header border */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-slate-200 text-[#0056FF] ${
            isCollapsed ? 'justify-center' : 'justify-between px-4'
          }`}
        >
          <div className="flex items-center gap-2">
            <Ship className="h-7 w-7 shrink-0 fill-current" />
            {!isCollapsed && <span className="text-xl font-bold tracking-tight">LayagExpress</span>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4 pt-10">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={isCollapsed ? label : undefined}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg py-3 font-medium transition-colors ${
                  isCollapsed ? 'justify-center px-4 lg:px-0' : 'px-4'
                } ${
                  isActive || to === highlight
                    ? 'bg-[#0056FF] text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && label}
            </NavLink>
          ))}
        </nav>

        {!isCollapsed && (
          <div className="mt-auto px-4 pb-6 pt-10 text-center text-[#0056FF]">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#EBF2FF]">
              <Ship className="h-12 w-12 text-[#A0C4FF]" />
            </div>
            <p className="text-sm font-bold leading-tight">
              More Journeys,
              <br />
              Bigger Stories.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
