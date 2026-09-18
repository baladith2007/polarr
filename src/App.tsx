/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LandingPage } from './components/LandingPage';
import { OpsDashboard } from './components/OpsDashboard';
import { CargoScanner } from './components/CargoScanner';
import { MapTracking } from './components/MapTracking';
import { InventoryAI } from './components/InventoryAI';
import { EmergencyProtocolView } from './components/EmergencyProtocolView';
import { EmergencyModal } from './components/EmergencyModal';
import { Toast } from './components/Toast';
import { 
  initialWeatherData, 
  sampleCargoDatabase, 
  initialConvoys, 
  initialInventory, 
  initialLogStream 
} from './data/mockData';
import { CargoItem, ConvoyUnit, InventorySupply, LogEvent, TabType, WeatherData } from './types';
import { soundManager } from './utils/audio';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('landing');
  const [weather, setWeather] = useState<WeatherData>(initialWeatherData);
  const [cargoList, setCargoList] = useState<CargoItem[]>(sampleCargoDatabase);
  const [currentScanned, setCurrentScanned] = useState<CargoItem>(sampleCargoDatabase[0]);
  const [convoys, setConvoys] = useState<ConvoyUnit[]>(initialConvoys);
  const [selectedConvoyId, setSelectedConvoyId] = useState<string>('convoy-alpha');
  const [inventory, setInventory] = useState<InventorySupply[]>(initialInventory);
  const [logStream, setLogStream] = useState<LogEvent[]>(initialLogStream);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
    if (next) {
      soundManager.playScanBeep();
    }
    showToast(next ? 'Tactical Audio: Enabled' : 'Tactical Audio: Muted');
  };

  const handleAddLog = (newLog: Omit<LogEvent, 'id' | 'time'>) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC';
    const log: LogEvent = {
      id: `log-${Date.now()}`,
      time,
      ...newLog,
    };
    setLogStream((prev) => [log, ...prev]);
    showToast(`Logged to Station Feed: ${newLog.title}`);
  };

  const handleConfirmScan = (updatedCargo: CargoItem) => {
    // Update cargo list
    setCargoList((prev) =>
      prev.map((item) => (item.id === updatedCargo.id ? updatedCargo : item))
    );
    setCurrentScanned(updatedCargo);

    // If it was fuel or rations, update stock
    if (updatedCargo.category === 'fuel') {
      setInventory((prev) =>
        prev.map((inv) =>
          inv.category === 'fuel'
            ? { ...inv, currentStock: Math.min(inv.capacity, inv.currentStock + 200) }
            : inv
        )
      );
    }

    // Add log
    handleAddLog({
      type: 'qr_verify',
      title: `CONFIRMED: #${updatedCargo.code}`,
      detail: `${updatedCargo.title} movement logged to Step ${updatedCargo.currentStep} (${updatedCargo.condition.toUpperCase()}).`,
      actor: 'Cargo Scanner Visor (Port Dock)',
      status: 'VERIFIED',
    });

    showToast(`Scan verified & synchronized: #${updatedCargo.code}`);
  };

  const handleUpdateStock = (id: string, amount: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStock = Math.min(item.capacity, item.currentStock + amount);
          return {
            ...item,
            currentStock: newStock,
            daysRemaining: parseFloat((newStock / item.burnRatePerDay).toFixed(1)),
          };
        }
        return item;
      })
    );

    const found = inventory.find((i) => i.id === id);
    if (found) {
      handleAddLog({
        type: 'qr_verify',
        title: `RESTOCK: ${found.name}`,
        detail: `Added +${amount} ${found.unit} to central station depot reserves.`,
        actor: 'Logistics Quartermaster',
        status: 'COMMITTED',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      
      {/* Top Header with Station Telemetry and Controls */}
      <Header
        weather={weather}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenSos={() => setIsSosOpen(true)}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          soundManager.playScanBeep();
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Desktop Sub-Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          soundManager.playScanBeep();
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        activeAlertCount={1}
      />

      {/* Main View Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-12">
        {currentTab === 'landing' && (
          <LandingPage
            weather={weather}
            onLaunchConsole={(tab) => {
              setCurrentTab(tab || 'ops');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenSos={() => setIsSosOpen(true)}
          />
        )}

        {currentTab === 'ops' && (
          <OpsDashboard
            weather={weather}
            convoys={convoys}
            logStream={logStream}
            onAddLog={handleAddLog}
            onNavigateTab={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectConvoy={(convoyId) => {
              setSelectedConvoyId(convoyId);
              setCurrentTab('map');
            }}
          />
        )}

        {currentTab === 'cargo' && (
          <CargoScanner
            cargoList={cargoList}
            currentScanned={currentScanned}
            onSelectCargo={(item) => setCurrentScanned(item)}
            onConfirmScan={handleConfirmScan}
          />
        )}

        {currentTab === 'map' && (
          <MapTracking
            convoys={convoys}
            selectedConvoyId={selectedConvoyId}
            onSelectConvoyId={(id) => setSelectedConvoyId(id)}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryAI
            inventory={inventory}
            onUpdateStock={handleUpdateStock}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'emergency' && (
          <EmergencyProtocolView
            weather={weather}
            onOpenSosModal={() => setIsSosOpen(true)}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Emergency Distress Modal */}
      <EmergencyModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onShowToast={showToast}
      />

      {/* Real-time feedback toast */}
      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </div>
  );
}

