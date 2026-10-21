import React from 'react';
import { FMEAProvider, useFMEA } from './context/FMEAContext';
import AnalysisTree from './components/leftPane/AnalysisTree';
import FMEAWorksheet from './components/centerPane/FMEAWorksheet';
import FormViewModal from './components/centerPane/FormViewModal';
import SmartSuggestPanel from './components/rightPane/SmartSuggestPanel';
import Toolbar from './components/layout/Toolbar';
import { Plus } from 'lucide-react';

// Industrial HMI panel and the gray strip its title sits on (src/theme.css).
const panel = 'flex-col rounded-sm border border-line bg-surface overflow-hidden';
const strip =
  'flex h-8 shrink-0 items-center gap-2 border-b border-line bg-strip px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2';

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

      {/* Side by side from md up; on a phone the tree sits above the worksheet. */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row gap-1.5 p-1.5 overflow-hidden">
        {/* Left Pane */}
        <aside className={`${panel} flex shrink-0 max-h-[38vh] md:max-h-none md:shrink md:w-1/5 md:min-w-[260px] md:max-w-[350px] relative z-0`}>
          <h2 className={strip}>Analysis Tree</h2>
          <div className="flex-1 overflow-y-auto p-2">
            <AnalysisTree />
          </div>
        </aside>

        {/* Center Pane */}
        <section className={`${panel} flex flex-1 min-w-0 min-h-0`}>
          <div className={`${strip} justify-between pr-1.5`}>
            <h2 className="min-w-0 truncate">
              FMEA Worksheet <span className="font-semibold text-ink-3">· AIAG-VDA 2026</span>
            </h2>
            <button
              onClick={handleAddRow}
              disabled={!selectedComponentId}
              className="flex shrink-0 items-center h-6 px-2.5 rounded-sm border border-accent-hover bg-accent enabled:hover:bg-accent-hover text-on-accent text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors disabled:border-line disabled:bg-raised disabled:text-ink-3 disabled:cursor-not-allowed"
            >
              <Plus size={14} className="mr-1" />
              Add Row
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <FMEAWorksheet />
          </div>
        </section>

        {/* Right Pane */}
        <aside className={`${panel} hidden md:flex w-1/4 min-w-[320px] max-w-[400px]`}>
          <h2 className={strip}>AI Assistant</h2>
          <div className="flex-1 overflow-y-auto p-3">
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
