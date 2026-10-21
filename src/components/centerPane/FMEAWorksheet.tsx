import React from 'react';
import { getAPColor } from '../../utils/calculations';
import { useFMEA } from '../../context/FMEAContext';
import Dashboard from './Dashboard';
import { Edit2 } from 'lucide-react';

// Text columns share the width; the ratings keep a fixed width so RPN and AP stay on screen.
const gridCols = 'repeat(3, minmax(0, 1fr)) 2rem minmax(0, 1fr) 2rem minmax(0, 1fr) 2rem 2.75rem 2.5rem 2rem';

const FMEAWorksheet: React.FC = () => {
  const { systems, selectedComponentId, setSelectedRowId, selectedRowId, setEditingRowId } = useFMEA();

  // Find the selected component
  let selectedComponent = null;
  for (const sys of systems) {
    for (const sub of sys.subsystems) {
      for (const comp of sub.components) {
        if (comp.id === selectedComponentId) {
          selectedComponent = comp;
        }
      }
    }
  }

  if (!selectedComponent) {
    return <Dashboard />;
  }

  return (
    <div className="w-full rounded-sm border border-line bg-field overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[660px]">
          {/* Table Header */}
          <div className="grid gap-1 px-3 py-2 border-b border-line bg-strip font-bold uppercase tracking-[0.06em] text-[11px] text-ink-2" style={{gridTemplateColumns: gridCols}}>
            <div>Function</div>
            <div>Failure Mode</div>
            <div>Effect</div>
            <div className="text-center" title="Severity">S</div>
            <div>Cause</div>
            <div className="text-center" title="Occurrence">O</div>
            <div>Control</div>
            <div className="text-center" title="Detection">D</div>
            <div className="text-center">RPN</div>
            <div className="text-center">AP</div>
            <div className="text-center"></div>
          </div>

          {/* Table Body */}
          <div>
            {selectedComponent.fmeaRows.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-ink-3">No FMEA records found for this component.</div>
            ) : (
              selectedComponent.fmeaRows.map((row) => (
                <div 
                  key={row.id} 
                  className={`grid gap-1 items-center px-3 py-2 border-b border-line last:border-b-0 text-[13px] cursor-pointer transition-colors ${selectedRowId === row.id ? 'bg-accent/10 shadow-[inset_3px_0_0_var(--color-accent)]' : 'hover:bg-fill'}`}
                  style={{gridTemplateColumns: gridCols}}
                  onClick={() => setSelectedRowId(row.id)}
                  onDoubleClick={() => setEditingRowId(row.id)}
                >
                  <div className="truncate pr-2" title={row.function}>{row.function}</div>
                  <div className="text-red-ink truncate pr-2" title={row.failureMode}>{row.failureMode}</div>
                  <div className="truncate pr-2" title={row.effect}>{row.effect}</div>
                  <div className="text-center font-mono text-[12px] tabular-nums">{row.severity}</div>
                  <div className="truncate pr-2" title={row.cause}>{row.cause}</div>
                  <div className="text-center font-mono text-[12px] tabular-nums">{row.occurrence}</div>
                  <div className="truncate pr-2" title={row.control}>{row.control}</div>
                  <div className="text-center font-mono text-[12px] tabular-nums">{row.detection}</div>
                  <div className="text-center font-mono text-[12px] tabular-nums text-ink-2">{row.rpn}</div>
                  <div className="flex justify-center">
                    <span className={`min-w-5 px-1.5 rounded-sm text-center text-[11px] font-bold uppercase leading-5 ${getAPColor(row.actionPriority)}`}>
                      {row.actionPriority.substring(0, 1)}
                    </span>
                  </div>
                  <div className="flex justify-center items-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRowId(row.id);
                      }}
                      className="p-1 rounded-sm border border-transparent text-ink-3 hover:border-line hover:bg-raised hover:text-accent transition-colors"
                      title="Edit Record"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FMEAWorksheet;
