import React from 'react';
import { 
  Globe,
  LayoutDashboard, 
  QrCode, 
  MapPin, 
  Boxes, 
  ShieldAlert 
} from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeAlertCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  activeAlertCount = 1,
}) => {
  const tabs: { id: TabType; label: string; shortLabel: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'landing',
      label: 'Mission Overview',
      shortLabel: 'Overview',
      icon: <Globe className="w-5 h-5" />,
    },
    {
      id: 'ops',
      label: 'Operations',
      shortLabel: 'Ops',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'cargo',
      label: 'Cargo Scanner',
      shortLabel: 'Cargo',
      icon: <QrCode className="w-5 h-5" />,
    },
    {
      id: 'map',
      label: 'Map & Sat GPS',
      shortLabel: 'Map',
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      id: 'inventory',
      label: 'Stock & AI',
      shortLabel: 'Stock',
      icon: <Boxes className="w-5 h-5" />,
      badge: activeAlertCount,
    },
    {
      id: 'emergency',
      label: 'Safety Protocol',
      shortLabel: 'Alert',
      icon: <ShieldAlert className="w-5 h-5" />,
    },
  ];

  return (
    <>
      {/* Desktop sub-navigation bar */}
      <div className="hidden sm:block bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 py-2.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-desktop-${tab.id}`}
                  onClick={() => onSelectTab(tab.id)}
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className={isActive ? 'text-sky-600' : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="ml-1 px-1.5 py-0.2 text-xs rounded-full bg-amber-100 text-amber-800 font-bold">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile bottom navigation bar */}
      <nav 
        id="mobile-bottom-nav" 
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-safe"
      >
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-mobile-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                type="button"
                className={`relative flex flex-col items-center justify-center min-w-[58px] py-1.5 px-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-sky-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <div
                  className={`w-9 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-sky-100 text-sky-700' : 'text-slate-500'
                  }`}
                >
                  {tab.icon}
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">
                  {tab.shortLabel}
                </span>

                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute top-1 right-2 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
