import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFMEA } from '../../context/FMEAContext';

const FormViewModal: React.FC = () => {
  const { systems, selectedComponentId, editingRowId, setEditingRowId, updateFMEARow } = useFMEA();
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (!selectedComponentId || !editingRowId) {
      setFormData(null);
      return;
    }

    let foundRow = null;
    for (const sys of systems) {
      for (const sub of sys.subsystems) {
        for (const comp of sub.components) {
          if (comp.id === selectedComponentId) {
            foundRow = comp.fmeaRows.find(r => r.id === editingRowId);
          }
        }
      }
    }
    
    if (foundRow) {
      setFormData(foundRow);
    }
  }, [systems, selectedComponentId, editingRowId]);

  if (!formData || !selectedComponentId || !editingRowId) return null;

  const handleChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    updateFMEARow(selectedComponentId, editingRowId, { [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex justify-center items-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-lg font-semibold text-slate-200">Edit FMEA Record</h2>
          <button 
            onClick={() => setEditingRowId(null)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Functional Analysis */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider">Functional Analysis</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Function</label>
                <textarea 
                  value={formData.function} 
                  onChange={(e) => handleChange('function', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center justify-between">
                  <span>Failure Mode</span>
                  <span className="text-[10px] text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary-500/20">Use SmartSuggest ➔</span>
                </label>
                <textarea 
                  value={formData.failureMode} 
                  onChange={(e) => handleChange('failureMode', e.target.value)}
                  className="w-full bg-slate-800 border border-red-500/50 rounded p-2 text-sm text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                  rows={2}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Effect of Failure</label>
              <textarea 
                value={formData.effect} 
                onChange={(e) => handleChange('effect', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-primary-500 outline-none"
                rows={2}
              />
            </div>
          </div>

          <div className="border-t border-slate-800 my-4"></div>

          {/* Risk Assessment */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-warning-400 uppercase tracking-wider">Risk Assessment & Controls</h3>
            
            <div className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-8">
                <label className="block text-xs text-slate-400 mb-1">Cause of Failure</label>
                <textarea 
                  value={formData.cause} 
                  onChange={(e) => handleChange('cause', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-warning-500 outline-none"
                  rows={2}
                />
              </div>
              <div className="col-span-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Severity (S)</label>
                  <input 
                    type="number" min="1" max="10" 
                    value={formData.severity} 
                    onChange={(e) => handleChange('severity', parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-center text-slate-200 focus:border-warning-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Occurrence (O)</label>
                  <input 
                    type="number" min="1" max="10" 
                    value={formData.occurrence} 
                    onChange={(e) => handleChange('occurrence', parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-center text-slate-200 focus:border-warning-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-8">
                <label className="block text-xs text-slate-400 mb-1">Current Control (Prevention/Detection)</label>
                <textarea 
                  value={formData.control} 
                  onChange={(e) => handleChange('control', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-success-500 outline-none"
                  rows={2}
                />
              </div>
              <div className="col-span-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Detection (D)</label>
                  <input 
                    type="number" min="1" max="10" 
                    value={formData.detection} 
                    onChange={(e) => handleChange('detection', parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-center text-slate-200 focus:border-success-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <div className="flex space-x-4">
             <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded flex items-center space-x-2">
                <span className="text-xs text-slate-400">RPN</span>
                <span className="font-bold text-lg">{formData.rpn}</span>
             </div>
             <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded flex items-center space-x-2">
                <span className="text-xs text-slate-400">Action Priority</span>
                <span className="font-bold text-lg">{formData.actionPriority}</span>
             </div>
          </div>
          <button 
            onClick={() => setEditingRowId(null)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormViewModal;
