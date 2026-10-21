import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFMEA } from '../../context/FMEAContext';
import { getAPColor } from '../../utils/calculations';

// HMI form parts (src/theme.css): square white fields, uppercase labels.
const field = 'w-full rounded-sm border bg-field px-2.5 py-1.5 text-[13px] text-ink outline-none transition-colors';
const plainField = `${field} border-line focus:border-accent`;
const failureField = `${field} border-red/60 focus:border-red`;
const label = 'flex items-center h-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2 mb-1';
const section = 'border-b border-line pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2';

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
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <div className="bg-raised rounded-sm border border-line shadow-pop w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex h-10 shrink-0 justify-between items-center gap-3 border-b border-line bg-strip pl-4 pr-1.5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink">Edit FMEA Record</h2>
          <button 
            onClick={() => setEditingRowId(null)}
            className="h-7 w-7 flex items-center justify-center rounded-sm border border-line bg-raised hover:bg-fill-strong text-ink-2 transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Functional Analysis */}
          <div className="space-y-3">
            <h3 className={section}>Functional Analysis</h3>
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
                  <span className="text-[10px] leading-4 font-bold tracking-[0.04em] text-accent border border-accent/50 px-1.5 py-0.5 rounded-sm cursor-pointer hover:bg-accent/10">Use SmartSuggest ➔</span>
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

          {/* Risk Assessment */}
          <div className="space-y-3">
            <h3 className={section}>Risk Assessment & Controls</h3>
            
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
                    className={`${plainField} text-center font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className={label}>Occurrence (O)</label>
                  <input 
                    type="number" min="1" max="10" 
                    value={formData.occurrence} 
                    onChange={(e) => handleChange('occurrence', parseInt(e.target.value) || 1)}
                    className={`${plainField} text-center font-mono tabular-nums`}
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
                    className={`${plainField} text-center font-mono tabular-nums`}
                  />
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <div className="px-4 py-3 border-t border-line bg-surface flex justify-between items-center gap-3">
          <div className="flex flex-wrap gap-2">
             <div className="rounded-sm border border-line bg-field px-2.5 py-1 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">RPN</span>
                <span className="font-mono font-medium text-[15px] tabular-nums text-ink">{formData.rpn}</span>
             </div>
             <div className="rounded-sm border border-line bg-field pl-2.5 pr-1 py-1 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">Action Priority</span>
                <span className={`rounded-sm px-1.5 text-[11px] font-bold uppercase tracking-[0.04em] leading-6 ${getAPColor(formData.actionPriority)}`}>{formData.actionPriority}</span>
             </div>
          </div>
          <button 
            onClick={() => setEditingRowId(null)}
            className="shrink-0 h-8 px-4 rounded-sm border border-accent-hover bg-accent hover:bg-accent-hover text-on-accent text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormViewModal;
