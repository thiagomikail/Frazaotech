import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { parseWordDocument } from '../../utils/wordParser';
import { useFMEA } from '../../context/FMEAContext';

const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedComponentId, addFMEARow } = useFMEA();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('Please upload a valid .docx file.');
      return;
    }

    if (!selectedComponentId) {
      setError('Please select a component from the Analysis Tree first.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const parsedRows = await parseWordDocument(file);
      
      if (parsedRows && parsedRows.length > 0) {
        // Add all parsed rows to the current component
        parsedRows.forEach(row => {
          addFMEARow(selectedComponentId, row);
        });
      } else {
        setError('No FMEA rows were found in the document.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error parsing document.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <header className="h-14 border-b border-slate-700 bg-slate-800/80 flex items-center px-4 justify-between shrink-0 shadow-sm z-10 relative">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-primary-500/20 text-primary-500 flex items-center justify-center font-bold border border-primary-500/30 shadow-inner shadow-primary-500/20">
          F
        </div>
        <h1 className="font-semibold text-lg tracking-tight text-slate-100">FrazaoTech</h1>
        
        {error && (
          <div className="ml-4 flex items-center text-xs text-danger-400 bg-danger-500/10 px-2 py-1 rounded border border-danger-500/20">
            <AlertCircle size={14} className="mr-1" />
            {error}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-3 text-sm font-medium">
        <input 
          type="file" 
          accept=".docx" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !selectedComponentId}
          className="flex items-center px-3 py-1.5 rounded bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title={!selectedComponentId ? "Select a component first" : "Upload Word Document"}
        >
          {isUploading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
          Import .docx
        </button>

        <button className="px-3 py-1.5 rounded bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300 transition-all shadow-sm">
          Connect to CMMS
        </button>
        <button className="px-3 py-1.5 rounded bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300 transition-all shadow-sm">
          Export to DVP&R
        </button>
        <div className="h-4 w-px bg-slate-600 mx-2"></div>
        <button className="px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-500 text-white transition-all shadow-sm shadow-primary-600/20 border border-primary-500">
          FRACAS Sync
        </button>
      </div>
    </header>
  );
};

export default Toolbar;
