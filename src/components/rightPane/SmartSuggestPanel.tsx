import React, { useState } from 'react';
import { Sparkles, Loader2, PlusCircle } from 'lucide-react';
import { useFMEA } from '../../context/FMEAContext';
import { suggestFailureModes } from '../../utils/llm';



const SmartSuggestPanel: React.FC = () => {
  const { systems, selectedComponentId, updateFMEARow, selectedRowId } = useFMEA();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get component name
  let componentName = '';
  let rowFunction = '';
  
  if (selectedComponentId) {
    for (const sys of systems) {
      for (const sub of sys.subsystems) {
        for (const comp of sub.components) {
          if (comp.id === selectedComponentId) {
            componentName = comp.name;
            if (selectedRowId) {
              const row = comp.fmeaRows.find(r => r.id === selectedRowId);
              if (row) rowFunction = row.function;
            }
          }
        }
      }
    }
  }

  const handleSuggest = async () => {
    if (!componentName) return;
    
    setLoading(true);
    setSuggestions([]);
    setError(null);

    try {
      const generatedSuggestions = await suggestFailureModes(componentName, rowFunction);
      setSuggestions(generatedSuggestions);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (suggestion: string) => {
    if (selectedComponentId && selectedRowId) {
      updateFMEARow(selectedComponentId, selectedRowId, { failureMode: suggestion });
    }
  };

  if (!selectedComponentId) {
    return (
      <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-400">
        Select a component and row to use SmartSuggest.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-800/80 rounded-lg p-4 border border-primary-500/30 mb-4 shadow-lg shadow-primary-500/5">
        <h3 className="text-sm font-semibold flex items-center text-primary-400 mb-2">
          <Sparkles size={16} className="mr-2" />
          Risk Brainstorming
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Generate likely failure modes for <strong className="text-slate-300">{componentName}</strong>.
          {rowFunction && <span> Function: <em className="text-slate-300">{rowFunction}</em></span>}
        </p>
        
        <button 
          onClick={handleSuggest}
          disabled={loading || !selectedRowId}
          className="w-full py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-colors flex items-center justify-center"
        >
          {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
          {loading ? 'Generating...' : 'Suggest Failure Modes'}
        </button>
        {!selectedRowId && <p className="text-[10px] text-center mt-2 text-warning-400">Select a row in the worksheet first.</p>}
      </div>

      {error && (
        <div className="text-xs text-danger-400 bg-danger-500/10 border border-danger-500/20 p-2 rounded mb-4">
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Suggestions</h4>
          {suggestions.map((s, i) => (
            <div key={i} className="bg-slate-800 p-3 rounded border border-slate-700 hover:border-primary-500/50 group transition-colors">
              <p className="text-sm text-slate-300 mb-3">{s}</p>
              <button 
                onClick={() => handleApply(s)}
                className="text-xs flex items-center text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary-300 font-medium"
              >
                <PlusCircle size={14} className="mr-1" />
                Apply to Selected Row
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartSuggestPanel;
