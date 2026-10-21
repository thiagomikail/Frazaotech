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
    <div className="flex flex-col h-screen w-screen bg-canvas text-ink overflow-hidden font-sans">
      <Toolbar />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane */}
        <aside className="w-1/5 min-w-[260px] max-w-[350px] border-r border-line bg-canvas overflow-y-auto flex flex-col relative z-0">
          <div className="p-3 flex-1">
            <h2 className="text-[11px] font-semibold text-ink-3 px-2 mt-1 mb-2 flex items-center">
              Analysis Tree
            </h2>
            <AnalysisTree />
          </div>
        </aside>

        {/* Center Pane */}
        <section className="flex-1 min-w-0 flex flex-col overflow-hidden bg-canvas">
          <div className="px-5 h-12 border-b border-line bg-surface flex justify-between items-center gap-3 shrink-0">
            <h2 className="flex items-baseline gap-2 min-w-0 truncate text-[15px] font-semibold text-ink">
              FMEA Worksheet
              <span className="text-[13px] font-normal text-ink-2">AIAG-VDA 2026</span>
            </h2>
            <button
              onClick={handleAddRow}
              disabled={!selectedComponentId}
              className="flex shrink-0 items-center h-8 px-3.5 rounded-full bg-accent/10 enabled:hover:bg-accent/15 text-accent text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={15} className="mr-1" />
              Add Row
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <FMEAWorksheet />
          </div>
        </section>

        {/* Right Pane */}
        <aside className="hidden md:flex w-1/4 min-w-[320px] max-w-[400px] border-l border-line bg-canvas overflow-y-auto flex-col">
          <div className="p-3 flex-1">
            <h2 className="text-[11px] font-semibold text-ink-3 px-2 mt-1 mb-2 flex items-center">
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
