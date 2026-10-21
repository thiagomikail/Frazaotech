import React from 'react';
import { useFMEA } from '../../context/FMEAContext';
import { AlertTriangle, ShieldAlert, Activity, ArrowRight } from 'lucide-react';
import { getAPColor } from '../../utils/calculations';

// HMI panel title strip (src/theme.css).
const strip =
  'flex min-h-7 items-center gap-2 border-b border-line bg-strip px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2';

const Dashboard: React.FC = () => {
  const { systems, setSelectedComponentId, setSelectedRowId } = useFMEA();

  // Aggregate data
  const allRows: any[] = [];
  systems.forEach(sys => {
    sys.subsystems.forEach(sub => {
      sub.components.forEach(comp => {
        comp.fmeaRows.forEach(row => {
          allRows.push({ ...row, systemName: sys.name, compName: comp.name, compId: comp.id });
        });
      });
    });
  });

  const highPriorityRows = allRows.filter(r => r.actionPriority === 'High');
  const criticalSeverityRows = allRows.filter(r => r.severity >= 9);
  const totalRisks = allRows.length;

  const handleNavigateToRow = (compId: string, rowId: string) => {
    setSelectedComponentId(compId);
    setSelectedRowId(rowId);
    // Optional: jump straight into edit mode
    // setEditingRowId(rowId);
  };

  return (
    <div className="flex-1 text-ink">
      <div className="mb-4">
        <h2 className="text-[22px] font-bold uppercase tracking-[0.04em] text-ink">Critical Risks Dashboard</h2>
        <p className="text-ink-2 text-[14px]">Overview of all high-priority action items across the plant.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-sm border border-line bg-field overflow-hidden">
          <div className={strip}>
            <AlertTriangle size={14} className="text-red" />
            High AP Risks
          </div>
          <p className="px-3 py-3 font-mono text-[32px] font-medium leading-none tabular-nums text-red-ink">{highPriorityRows.length}</p>
        </div>

        <div className="rounded-sm border border-line bg-field overflow-hidden">
          <div className={strip}>
            <ShieldAlert size={14} className="text-orange" />
            Critical Severity (S≥9)
          </div>
          <p className="px-3 py-3 font-mono text-[32px] font-medium leading-none tabular-nums text-orange-ink">{criticalSeverityRows.length}</p>
        </div>

        <div className="rounded-sm border border-line bg-field overflow-hidden">
          <div className={strip}>
            <Activity size={14} />
            Total Evaluated Risks
          </div>
          <p className="px-3 py-3 font-mono text-[32px] font-medium leading-none tabular-nums text-ink">{totalRisks}</p>
        </div>
      </div>

      <div className="rounded-sm border border-line bg-field overflow-hidden flex flex-col max-h-[500px]">
        <div className={`${strip} min-h-8 shrink-0 justify-between`}>
          <h3>High Priority Action Items</h3>
          <span className="shrink-0 rounded-sm bg-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-white">Requires Mitigation</span>
        </div>

        <div className="overflow-y-auto">
          {highPriorityRows.length === 0 ? (
            <div className="p-8 text-center text-[14px] text-ink-3">No High Priority risks identified. Great job!</div>
          ) : (
            <div className="divide-y divide-line">
              {highPriorityRows.map(row => (
                <div key={row.id} className="px-4 py-3 hover:bg-fill transition-colors group">
                  <div className="flex justify-between items-start gap-3 mb-1.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="rounded-sm border border-line bg-raised px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-2">{row.systemName}</span>
                        <span className="text-[12px] text-ink-2 font-semibold">{row.compName}</span>
                      </div>
                      <h4 className="text-[15px] font-semibold text-red-ink">{row.failureMode}</h4>
                    </div>
                    <button 
                      onClick={() => handleNavigateToRow(row.compId, row.id)}
                      className="shrink-0 h-7 rounded-sm border border-line bg-raised px-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink hover:bg-fill-strong transition-colors flex items-center"
                    >
                      Analyze <ArrowRight size={13} className="ml-1" />
                    </button>
                  </div>
                  
                  <p className="text-[13px] text-ink-2 mb-2 line-clamp-2">{row.effect}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-ink-3">SEV</span>
                      <span className={`font-mono tabular-nums ${row.severity >= 9 ? "text-red-ink font-bold" : "text-ink"}`}>{row.severity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-ink-3">OCC</span>
                      <span className={`font-mono tabular-nums ${row.occurrence >= 8 ? "text-red-ink font-bold" : "text-ink"}`}>{row.occurrence}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-ink-3">DET</span>
                      <span className={`font-mono tabular-nums ${row.detection >= 8 ? "text-red-ink font-bold" : "text-ink"}`}>{row.detection}</span>
                    </div>
                    <div className="h-3 w-px bg-line"></div>
                    <div className="flex items-center">
                      <span className={`px-1.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.04em] leading-5 ${getAPColor(row.actionPriority)}`}>
                        AP: {row.actionPriority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
