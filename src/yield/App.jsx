import React, { useState } from 'react';
import Dashboard from './components/Layout/Dashboard';
import PlantSankeyModal from './components/Sankey/PlantSankeyModal';
import BacklogModal from './components/Backlog/BacklogModal';
import Toast from './components/Toast';
import { INITIAL_DATA, generatePlantData } from './data/mockData';

function App() {
    const [showSankey, setShowSankey] = useState(false);
    const [showBacklog, setShowBacklog] = useState(false);
    const [plantData, setPlantData] = useState(INITIAL_DATA);
    const [isTracing, setIsTracing] = useState(false);
    const [toast, setToast] = useState(null);

    const handleTraceValues = () => {
        setIsTracing(true);
        // Simulate optimization calculation
        setTimeout(() => {
            // Regenerate data (simulating "best" values involves randomness in our mock, 
            // but let's assume valid simulation for now or we could explicitly optimize)
            const optimized = generatePlantData().map(asset => ({
                ...asset,
                energy: {
                    ...asset.energy,
                    currentLoad: (parseFloat(asset.energy.currentLoad) * 0.9).toFixed(2), // 10% reduction
                    totalLoss: (parseFloat(asset.energy.totalLoss) * 0.8).toFixed(2) // 20% loss reduction
                }
            }));
            setPlantData(optimized);
            setIsTracing(false);
            setToast('Optimization complete — best operational parameters applied.');
        }, 1500);
    };

    return (
        <div className="h-full bg-canvas text-ink">
            <Dashboard
                data={plantData}
                onOpenSankey={() => setShowSankey(true)}
                onOpenBacklog={() => setShowBacklog(true)}
                onTraceValues={handleTraceValues}
                isTracing={isTracing}
            />

            {showSankey && <PlantSankeyModal data={plantData} onClose={() => setShowSankey(false)} />}

            {showBacklog && <BacklogModal onClose={() => setShowBacklog(false)} />}

            <Toast message={toast} onClose={() => setToast(null)} />
        </div>
    );
}

export default App;
