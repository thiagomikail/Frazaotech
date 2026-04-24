import React from 'react';
import { FMEAProvider, useFMEA } from './context/FMEAContext';
import AnalysisTree from './components/leftPane/AnalysisTree';
import FMEAWorksheet from './components/centerPane/FMEAWorksheet';
import FormViewModal from './components/centerPane/FormViewModal';
import SmartSuggestPanel from './components/rightPane/SmartSuggestPanel';
import Toolbar from './components/layout/Toolbar';
import { Plus } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { selectedComponentId, addFMEARow } = useFMEA();

  const handleAddRow = () => {
    if (selectedComponentId) {
      addFMEARow(selectedComponentId, {
        function: 'New Function',
        failureMode: '',
        effect: '',
        severity: 1,
        cause: '',
        occurrence: 1,
        control: '',
        detection: 1
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Toolbar />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane */}
        <aside className="w-1/5 min-w-[260px] max-w-[350px] border-r border-slate-700 bg-slate-800/40 overflow-y-auto flex flex-col custom-scrollbar relative z-0">
          <div className="p-4 flex-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
              Analysis Tree
            </h2>
            <AnalysisTree />
          </div>
        </aside>

        {/* Center Pane */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-900/50">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center shrink-0">
            <h2 className="text-base font-semibold text-slate-200">FMEA Worksheet (AIAG-VDA 2026)</h2>
            <button 
              onClick={handleAddRow}
              disabled={!selectedComponentId}
              className="flex items-center text-xs font-medium px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} className="mr-1" />
              Add Row
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <FMEAWorksheet />
          </div>
        </section>

        {/* Right Pane */}
        <aside className="w-1/4 min-w-[320px] max-w-[400px] border-l border-slate-700 bg-slate-800/40 overflow-y-auto flex flex-col custom-scrollbar">
          <div className="p-4 flex-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
              AI Assistant
            </h2>
            <SmartSuggestPanel />
          </div>
        </aside>
      </main>

      <FormViewModal />
    </div>
  );
};

function App() {
  return (
    <FMEAProvider>
      <MainLayout />
    </FMEAProvider>
  );
}

export default App;
