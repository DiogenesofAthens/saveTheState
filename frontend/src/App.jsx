import { useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import MapView from "./views/MapView";
import ParcelDetail from "./views/ParcelDetail";
import AuditTrail from "./views/AuditTrail";
import AddCovenantModal from "./components/AddCovenantModal";
import DemoOverlay from "./components/DemoOverlay";
import RequestDemoModal from "./components/RequestDemoModal";
import FilterPanel from "./views/FilterPanel";
import { Landmark } from "lucide-react";

export default function App() {
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(1);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showAddCovenant, setShowAddCovenant] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showRequestDemo, setShowRequestDemo] = useState(false);
  const [parcels, setParcels] = useState([]);

  const handleParcelSelect = useCallback(
    (parcel) => {
      setSelectedParcel(parcel);
      setShowAudit(false);
      if (demoMode && demoStep === 2) setDemoStep(3);
    },
    [demoMode, demoStep]
  );

  const handleCovenantAdded = useCallback(
    (result) => {
      setSelectedParcel(result.parcel);
      setShowAddCovenant(false);
      setParcels((prev) =>
        prev.map((p) =>
          p.apn === result.parcel.apn
            ? { ...p, active_covenant_count: (p.active_covenant_count || 0) + 1 }
            : p
        )
      );
      if (demoMode && demoStep === 4) setDemoStep(5);
    },
    [demoMode, demoStep]
  );

  const handleToggleDemoMode = useCallback(() => {
    setDemoMode((prev) => {
      if (!prev) setDemoStep(1);
      return !prev;
    });
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <Navbar
        demoMode={demoMode}
        onToggleDemoMode={handleToggleDemoMode}
        demoStep={demoStep}
        filterPanelOpen={showFilterPanel}
        onToggleFilterPanel={() => setShowFilterPanel((v) => !v)}
      />

      <div className="flex-1 relative overflow-hidden">
        <MapView
          parcels={parcels}
          setParcels={setParcels}
          selectedParcel={selectedParcel}
          onParcelSelect={handleParcelSelect}
          demoMode={demoMode}
          demoStep={demoStep}
          onDemoStepChange={setDemoStep}
          filterPanelOpen={showFilterPanel}
        />

        {showFilterPanel && (
          <FilterPanel
            parcels={parcels}
            onParcelSelect={handleParcelSelect}
            onClose={() => setShowFilterPanel(false)}
          />
        )}

        {selectedParcel && !showAudit && (
          <ParcelDetail
            parcel={selectedParcel}
            onClose={() => setSelectedParcel(null)}
            onAddCovenant={() => {
              setShowAddCovenant(true);
              if (demoMode && demoStep === 3) setDemoStep(4);
            }}
            onShowAudit={() => {
              setShowAudit(true);
              if (demoMode && demoStep === 4) setDemoStep(5);
            }}
            demoMode={demoMode}
            demoStep={demoStep}
          />
        )}

        {selectedParcel && showAudit && (
          <AuditTrail
            parcel={selectedParcel}
            onBack={() => setShowAudit(false)}
            onClose={() => {
              setShowAudit(false);
              setSelectedParcel(null);
            }}
          />
        )}

        {showAddCovenant && selectedParcel && (
          <AddCovenantModal
            parcel={selectedParcel}
            onClose={() => setShowAddCovenant(false)}
            onSuccess={handleCovenantAdded}
          />
        )}

        {demoMode && (
          <DemoOverlay
            step={demoStep}
            onStepChange={setDemoStep}
            selectedParcel={selectedParcel}
            showAudit={showAudit}
          />
        )}

        <button
          onClick={() => setShowRequestDemo(true)}
          className="absolute bottom-5 left-5 z-40 flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#253C6B] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg transition-colors"
        >
          <Landmark size={15} />
          Bring This to Your County
        </button>

        {showRequestDemo && <RequestDemoModal onClose={() => setShowRequestDemo(false)} />}
      </div>
    </div>
  );
}
