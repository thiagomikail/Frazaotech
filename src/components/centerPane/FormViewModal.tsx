import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFMEA } from '../../context/FMEAContext';
import { getAPColor } from '../../utils/calculations';

const field = 'w-full rounded-lg border bg-surface px-3 py-2 text-[14px] text-ink outline-none transition-shadow focus:ring-4';
const plainField = `${field} border-line focus:border-accent focus:ring-accent/15`;
const failureField = `${field} border-red/40 focus:border-red focus:ring-red/15`;
const label = 'flex items-center h-5 text-[12px] text-ink-2 mb-1';

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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-pop w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-line">
          <h2 className="text-[17px] font-semibold text-ink">Edit FMEA Record</h2>
          <button 
            onClick={() => setEditingRowId(null)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-fill hover:bg-fill-strong text-ink-2 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Functional Analysis */}
          <div className="space-y-4">
            <h3 className="text-[13px] font-semibold text-accent">Functional Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Function</label>
                <textarea 
                  value={formData.function} 
                  onChange={(e) => handleChange('function', e.target.value)}
                  className={plainField}
                  rows={2}
                />
              </div>
              <div>
                <label className={`${label} justify-between`}>
                  <span>Failure Mode</span>
                  <span className="text-[11px] leading-4 font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full cursor-pointer hover:bg-accent/15">Use SmartSuggest ➔</span>
                </label>
                <textarea 
                  value={formData.failureMode} 
                  onChange={(e) => handleChange('failureMode', e.target.value)}
                  className={failureField}
                  rows={2}
                />
              </div>
            </div>
            
            <div>
              <label className={label}>Effect of Failure</label>
              <textarea 
                value={formData.effect} 
                onChange={(e) => handleChange('effect', e.target.value)}
                className={plainField}
                rows={2}
              />
            </div>
          </div>

          <div className="border-t border-line my-4"></div>

          {/* Risk Assessment */}
          <div className="space-y-4">
            <h3 className="text-[13px] font-semibold text-orange-ink">Risk Assessment & Controls</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-8">
                <label className={label}>Cause of Failure</label>
                <textarea 
                  value={formData.cause} 
                  onChange={(e) => handleChange('cause', e.target.value)}
                  className={plainField}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-4 grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Severity (S)</label>
                  <input 
                    type="number" min="1" max="10" 
                    value={formData.severity} 
                    onChange={(e) => handleChange('severity', parseInt(e.target.value) || 1)}
                    className={`${plainField} text-center tabular-nums`}
                  />
                </div>
                <div>
                  <label className={label}>Occurrence (O)</label>
                  <input 
                    type="number" min="1" max="10" 
                    value={formData.occurrence} 
                    onChange={(e) => handleChange('occurrence', parseInt(e.target.value) || 1)}
                    className={`${plainField} text-center tabular-nums`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-8">
                <label className={label}>Current Control (Prevention/Detection)</label>
                <textarea 
                  value={formData.control} 
                  onChange={(e) => handleChange('control', e.target.value)}
                  className={plainField}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-4 grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Detection (D)</label>
                  <input 
                    type="number" min="1" max="10" 
                    value={formData.detection} 
                    onChange={(e) => handleChange('detection', parseInt(e.target.value) || 1)}
                    className={`${plainField} text-center tabular-nums`}
                  />
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <div className="px-5 py-4 border-t border-line flex justify-between items-center gap-3">
          <div className="flex flex-wrap gap-2">
             <div className="rounded-full bg-fill px-3 py-1 flex items-center gap-2">
                <span className="text-[12px] text-ink-2">RPN</span>
                <span className="font-semibold text-[15px] tabular-nums text-ink">{formData.rpn}</span>
             </div>
             <div className="rounded-full bg-fill pl-3 pr-1 py-1 flex items-center gap-2">
                <span className="text-[12px] text-ink-2">Action Priority</span>
                <span className={`rounded-full px-2.5 text-[13px] font-semibold leading-6 ${getAPColor(formData.actionPriority)}`}>{formData.actionPriority}</span>
             </div>
          </div>
          <button 
            onClick={() => setEditingRowId(null)}
            className="shrink-0 h-9 px-5 bg-accent hover:bg-accent-hover text-on-accent rounded-full text-[14px] font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormViewModal;
