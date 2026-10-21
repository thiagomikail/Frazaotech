import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { parseWordDocument } from '../../utils/wordParser';
import { useFMEA } from '../../context/FMEAContext';

// A square button on the dark HMI title bar.
const barButton =
  'items-center h-8 px-3 rounded-sm border border-bar-line bg-bar-raised text-on-bar text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors enabled:hover:bg-bar-line disabled:opacity-40 disabled:cursor-not-allowed';

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
    <header className="h-11 bg-bar text-on-bar border-b border-black/40 flex items-center px-3 justify-between gap-3 shrink-0 z-10 relative">
      <div className="flex items-center gap-3 min-w-0">
        <a href="/" className="group flex items-center gap-2 shrink-0" title="OT Workbench home">
          <img src="/workbench-icon.svg" alt="" className="h-6 w-6" />
          <span className="hidden sm:inline text-[12px] font-semibold uppercase tracking-[0.08em] text-on-bar-2 group-hover:text-on-bar">OT Workbench</span>
        </a>
        <div className="h-5 w-px bg-bar-line shrink-0"></div>
        <div className="flex items-center gap-2 shrink-0">
          <img src="/fmea-icon.svg" alt="" className="h-6 w-6" />
          <h1 className="text-[14px] font-bold uppercase tracking-[0.08em] text-on-bar">FMEA</h1>
        </div>

        {error && (
          <div className="ml-1 flex items-center min-w-0 rounded-sm bg-red px-2 py-1 text-[12px] font-semibold text-white">
            <AlertCircle size={14} className="mr-1 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
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
          className={`${barButton} flex`}
          title={!selectedComponentId ? "Select a component first" : "Upload Word Document"}
          aria-label="Import .docx"
        >
          {isUploading ? <Loader2 size={15} className="animate-spin sm:mr-1.5" /> : <Upload size={15} className="sm:mr-1.5" />}
          <span className="hidden sm:inline">Import .docx</span>
        </button>

        <button className={`${barButton} hidden lg:flex`}>
          Connect to CMMS
        </button>
        <button className={`${barButton} hidden lg:flex`}>
          Export to DVP&R
        </button>
        <div className="hidden lg:block h-5 w-px bg-bar-line mx-1"></div>
        <button className="flex items-center h-8 px-3 rounded-sm border border-accent-hover bg-accent hover:bg-accent-hover text-on-accent text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors">
          FRACAS Sync
        </button>
      </div>
    </header>
  );
};

export default Toolbar;
