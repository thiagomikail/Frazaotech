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
      <div className="rounded-sm border border-line bg-field p-3 text-[13px] text-ink-2">
        Select a component and row to use SmartSuggest.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="rounded-sm border border-line bg-field mb-3 overflow-hidden">
        <h3 className="flex h-7 items-center gap-2 border-b border-line bg-strip px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
          <Sparkles size={14} />
          Risk Brainstorming
        </h3>
        <div className="p-3">
          <p className="text-[13px] leading-relaxed text-ink-2 mb-3">
            Generate likely failure modes for <strong className="font-semibold text-ink">{componentName}</strong>.
            {rowFunction && <span> Function: <em className="text-ink">{rowFunction}</em></span>}
          </p>
        
          <button 
            onClick={handleSuggest}
            disabled={loading || !selectedRowId}
            className="w-full h-8 rounded-sm border border-accent-hover bg-accent enabled:hover:bg-accent-hover text-on-accent disabled:border-line disabled:bg-raised disabled:text-ink-3 disabled:cursor-not-allowed text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors flex items-center justify-center"
          >
            {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : <Sparkles size={15} className="mr-2" />}
            {loading ? 'Generating...' : 'Suggest Failure Modes'}
          </button>
          {!selectedRowId && <p className="text-[11px] font-semibold text-center mt-2 text-orange-ink">Select a row in the worksheet first.</p>}
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-ink bg-red/10 p-2.5 rounded-sm border border-red/50 border-l-4 border-l-red mb-3">
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2 mb-2">Suggestions</h4>
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-sm border border-line bg-field p-2.5">
              <p className="text-[13px] text-ink mb-2">{s}</p>
              <button 
                onClick={() => handleApply(s)}
                className="text-[12px] flex items-center text-accent hover:underline font-semibold"
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
