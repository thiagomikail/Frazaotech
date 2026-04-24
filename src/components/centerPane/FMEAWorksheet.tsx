import React from 'react';
import { getAPColor } from '../../utils/calculations';
import { useFMEA } from '../../context/FMEAContext';
import Dashboard from './Dashboard';
import { Edit2 } from 'lucide-react';

const gridCols = '2fr 2fr 2fr 0.5fr 2fr 0.5fr 2fr 0.5fr 0.5fr 0.5fr 0.5fr';

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
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[1200px]">
        {/* Table Header */}
        <div className="grid gap-1 bg-slate-800 p-2 rounded-t font-semibold text-xs text-slate-400 tracking-wider" style={{gridTemplateColumns: gridCols}}>
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
        <div className="bg-slate-900 border border-slate-700 rounded-b">
          {selectedComponent.fmeaRows.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No FMEA records found for this component.</div>
          ) : (
            selectedComponent.fmeaRows.map((row) => (
              <div 
                key={row.id} 
                className={`grid gap-1 p-2 border-b border-slate-800 text-sm hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedRowId === row.id ? 'bg-slate-800 border-l-2 border-l-primary-500' : 'border-l-2 border-l-transparent'}`}
                style={{gridTemplateColumns: gridCols}}
                onClick={() => setSelectedRowId(row.id)}
                onDoubleClick={() => setEditingRowId(row.id)}
              >
                <div className="truncate pr-2" title={row.function}>{row.function}</div>
                <div className="text-red-300 truncate pr-2" title={row.failureMode}>{row.failureMode}</div>
                <div className="truncate pr-2" title={row.effect}>{row.effect}</div>
                <div className="text-center font-medium text-slate-300">{row.severity}</div>
                <div className="truncate pr-2" title={row.cause}>{row.cause}</div>
                <div className="text-center font-medium text-slate-300">{row.occurrence}</div>
                <div className="truncate pr-2" title={row.control}>{row.control}</div>
                <div className="text-center font-medium text-slate-300">{row.detection}</div>
                <div className="text-center font-medium text-slate-300">{row.rpn}</div>
                <div className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getAPColor(row.actionPriority)}`}>
                    {row.actionPriority.substring(0, 1)}
                  </span>
                </div>
                <div className="flex justify-center items-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRowId(row.id);
                    }}
                    className="p-1 text-slate-400 hover:text-primary-400 hover:bg-slate-700 rounded transition-colors"
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
  );
};

export default FMEAWorksheet;
