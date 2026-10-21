import React from 'react';
import { useFMEA } from '../../context/FMEAContext';
import { AlertTriangle, ShieldAlert, Activity, ArrowRight } from 'lucide-react';
import { getAPColor } from '../../utils/calculations';

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
    <div className="flex-1 p-1 text-ink">
      <div className="mb-6">
        <h2 className="text-[28px] font-semibold tracking-tight text-ink">Critical Risks Dashboard</h2>
        <p className="text-ink-2 text-[15px] mt-1">Overview of all high-priority action items across the plant.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-surface shadow-card p-5 flex items-center">
          <div className="w-11 h-11 shrink-0 rounded-full bg-red/12 text-red flex items-center justify-center mr-4">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-ink-2 text-[13px]">High AP Risks</p>
            <p className="text-[34px] leading-tight font-semibold tracking-tight tabular-nums text-ink">{highPriorityRows.length}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface shadow-card p-5 flex items-center">
          <div className="w-11 h-11 shrink-0 rounded-full bg-orange/12 text-orange flex items-center justify-center mr-4">
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="text-ink-2 text-[13px]">Critical Severity (S≥9)</p>
            <p className="text-[34px] leading-tight font-semibold tracking-tight tabular-nums text-ink">{criticalSeverityRows.length}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface shadow-card p-5 flex items-center">
          <div className="w-11 h-11 shrink-0 rounded-full bg-accent/12 text-accent flex items-center justify-center mr-4">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-ink-2 text-[13px]">Total Evaluated Risks</p>
            <p className="text-[34px] leading-tight font-semibold tracking-tight tabular-nums text-ink">{totalRisks}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-surface shadow-card overflow-hidden flex flex-col max-h-[500px]">
        <div className="px-5 py-3.5 border-b border-line flex justify-between items-center gap-3">
          <h3 className="text-[15px] font-semibold text-ink">High Priority Action Items</h3>
          <span className="shrink-0 rounded-full bg-red/10 px-2.5 py-0.5 text-[12px] font-medium text-red-ink">Requires Mitigation</span>
        </div>
        
        <div className="overflow-y-auto">
          {highPriorityRows.length === 0 ? (
            <div className="p-8 text-center text-[14px] text-ink-3">No High Priority risks identified. Great job!</div>
          ) : (
            <div className="divide-y divide-line">
              {highPriorityRows.map(row => (
                <div key={row.id} className="px-5 py-4 hover:bg-fill/50 transition-colors group">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] text-ink-2">{row.systemName}</span>
                        <span className="text-[12px] text-ink-2 font-medium">{row.compName}</span>
                      </div>
                      <h4 className="text-[15px] font-medium text-red-ink">{row.failureMode}</h4>
                    </div>
                    <button 
                      onClick={() => handleNavigateToRow(row.compId, row.id)}
                      className="shrink-0 text-[12px] font-medium rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-on-accent px-3 py-1.5 transition-colors flex items-center"
                    >
                      Analyze <ArrowRight size={14} className="ml-1" />
                    </button>
                  </div>
                  
                  <p className="text-[13px] text-ink-2 mb-3 line-clamp-2">{row.effect}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium">
                    <div className="flex items-center gap-1">
                      <span className="text-ink-3">SEV:</span>
                      <span className={`tabular-nums ${row.severity >= 9 ? "text-red-ink font-semibold" : "text-ink"}`}>{row.severity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-ink-3">OCC:</span>
                      <span className={`tabular-nums ${row.occurrence >= 8 ? "text-red-ink font-semibold" : "text-ink"}`}>{row.occurrence}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-ink-3">DET:</span>
                      <span className={`tabular-nums ${row.detection >= 8 ? "text-red-ink font-semibold" : "text-ink"}`}>{row.detection}</span>
                    </div>
                    <div className="h-3 w-px bg-line"></div>
                    <div className="flex items-center">
                      <span className={`px-2 rounded-full text-[11px] font-semibold leading-5 ${getAPColor(row.actionPriority)}`}>
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
