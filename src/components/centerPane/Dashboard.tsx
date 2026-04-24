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
    <div className="flex-1 p-6 overflow-y-auto bg-slate-900 custom-scrollbar text-slate-200">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100">Critical Risks Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">Overview of all high-priority action items across the plant.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex items-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-danger-500/20 text-danger-500 flex items-center justify-center mr-4">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">High AP Risks</p>
            <p className="text-2xl font-bold text-slate-100">{highPriorityRows.length}</p>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex items-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-warning-500/20 text-warning-500 flex items-center justify-center mr-4">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Critical Severity (S≥9)</p>
            <p className="text-2xl font-bold text-slate-100">{criticalSeverityRows.length}</p>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex items-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center mr-4">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Total Evaluated Risks</p>
            <p className="text-2xl font-bold text-slate-100">{totalRisks}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[500px]">
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80 flex justify-between items-center">
          <h3 className="font-semibold text-slate-200">High Priority Action Items</h3>
          <span className="text-xs bg-danger-500/10 text-danger-400 px-2 py-1 rounded border border-danger-500/20">Requires Mitigation</span>
        </div>
        
        <div className="overflow-y-auto custom-scrollbar">
          {highPriorityRows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic">No High Priority risks identified. Great job!</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {highPriorityRows.map(row => (
                <div key={row.id} className="p-4 hover:bg-slate-700/30 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{row.systemName}</span>
                        <span className="text-xs text-slate-300 font-medium">{row.compName}</span>
                      </div>
                      <h4 className="text-base font-medium text-red-300">{row.failureMode}</h4>
                    </div>
                    <button 
                      onClick={() => handleNavigateToRow(row.compId, row.id)}
                      className="text-xs bg-primary-600/10 text-primary-400 hover:bg-primary-600 hover:text-white px-3 py-1.5 rounded transition-colors flex items-center border border-primary-500/20 hover:border-primary-500"
                    >
                      Analyze <ArrowRight size={14} className="ml-1" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">{row.effect}</p>
                  
                  <div className="flex items-center space-x-4 text-xs font-medium">
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500">SEV:</span>
                      <span className={row.severity >= 9 ? "text-danger-400 font-bold" : "text-slate-300"}>{row.severity}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500">OCC:</span>
                      <span className={row.occurrence >= 8 ? "text-danger-400 font-bold" : "text-slate-300"}>{row.occurrence}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500">DET:</span>
                      <span className={row.detection >= 8 ? "text-danger-400 font-bold" : "text-slate-300"}>{row.detection}</span>
                    </div>
                    <div className="h-3 w-px bg-slate-700"></div>
                    <div className="flex items-center space-x-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getAPColor(row.actionPriority)}`}>
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
