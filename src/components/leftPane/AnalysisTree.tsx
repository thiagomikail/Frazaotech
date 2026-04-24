import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, Component as ComponentIcon, Layers } from 'lucide-react';
import { useFMEA } from '../../context/FMEAContext';

const AnalysisTree: React.FC = () => {
  const { systems, selectedComponentId, setSelectedComponentId } = useFMEA();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['sys-plant']));

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  // Group subsystems by their system prefix (e.g. "Reheat Furnace – Walking Beam" → group by "Reheat Furnace")
  const groupedSubsystems = useMemo(() => {
    if (!systems[0]) return [];
    
    const groups: Map<string, typeof systems[0]['subsystems']> = new Map();
    
    for (const sub of systems[0].subsystems) {
      const dashIdx = sub.name.indexOf(' – ');
      const groupName = dashIdx > 0 ? sub.name.substring(0, dashIdx) : sub.name;
      
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(sub);
    }
    
    return Array.from(groups.entries()).map(([name, subs]) => ({
      id: `group-${name.replace(/\s+/g, '-').toLowerCase()}`,
      name,
      subsystems: subs,
    }));
  }, [systems]);

  return (
    <div className="text-sm font-medium text-slate-300">
      {/* Dashboard button */}
      <div 
        className={`flex items-center p-2 mb-4 rounded cursor-pointer transition-colors border ${!selectedComponentId ? 'bg-primary-500/20 border-primary-500/30 text-primary-300 shadow-sm' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}
        onClick={() => setSelectedComponentId(null)}
      >
        <div className="mr-2 text-primary-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        </div>
        <span className="font-bold tracking-wide">Plant Dashboard</span>
      </div>

      {/* Plant level */}
      {systems.map(sys => (
        <div key={sys.id} className="mb-1">
          <div 
            className="flex items-center p-1.5 hover:bg-slate-700/50 rounded cursor-pointer transition-colors"
            onClick={(e) => toggleNode(sys.id, e)}
          >
            <span className="mr-1 text-slate-500">
              {expandedNodes.has(sys.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <span className="mr-2 text-primary-400">
              {expandedNodes.has(sys.id) ? <FolderOpen size={16} /> : <Folder size={16} />}
            </span>
            <span className="truncate font-semibold">{sys.name}</span>
          </div>
          
          {expandedNodes.has(sys.id) && (
            <div className="ml-4 pl-2 border-l border-slate-700">
              {/* System groups (e.g. Reheat Furnace, Scalper, Reversing Mill...) */}
              {groupedSubsystems.map(group => (
                <div key={group.id} className="mb-0.5 mt-0.5">
                  <div 
                    className="flex items-center p-1.5 hover:bg-slate-700/50 rounded cursor-pointer transition-colors"
                    onClick={(e) => toggleNode(group.id, e)}
                  >
                    <span className="mr-1 text-slate-500">
                      {expandedNodes.has(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="mr-2 text-amber-400/80">
                      <Layers size={14} />
                    </span>
                    <span className="truncate text-slate-300">{group.name}</span>
                    <span className="ml-auto text-[10px] text-slate-500 tabular-nums">
                      {group.subsystems.reduce((acc, s) => acc + s.components.length, 0)}
                    </span>
                  </div>

                  {expandedNodes.has(group.id) && (
                    <div className="ml-4 pl-2 border-l border-slate-700/50">
                      {group.subsystems.map(sub => {
                        // Show only the part after " – " for the subsystem name
                        const dashIdx = sub.name.indexOf(' – ');
                        const displayName = dashIdx > 0 ? sub.name.substring(dashIdx + 3) : sub.name;

                        return (
                          <div key={sub.id} className="mb-0.5 mt-0.5">
                            <div 
                              className="flex items-center p-1 hover:bg-slate-700/50 rounded cursor-pointer transition-colors"
                              onClick={(e) => toggleNode(sub.id, e)}
                            >
                              <span className="mr-1 text-slate-500">
                                {expandedNodes.has(sub.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                              <span className="mr-2 text-primary-400/60">
                                {expandedNodes.has(sub.id) ? <FolderOpen size={14} /> : <Folder size={14} />}
                              </span>
                              <span className="truncate text-slate-400 text-xs">{displayName}</span>
                            </div>

                            {expandedNodes.has(sub.id) && (
                              <div className="ml-4 pl-2 border-l border-slate-700/30">
                                {sub.components.map(comp => (
                                  <div 
                                    key={comp.id} 
                                    className={`flex items-center p-1 mt-0.5 rounded cursor-pointer transition-colors text-xs ${selectedComponentId === comp.id ? 'bg-primary-500/20 text-primary-300' : 'hover:bg-slate-700/50 text-slate-400'}`}
                                    onClick={() => setSelectedComponentId(comp.id)}
                                  >
                                    <span className="mr-2 ml-4">
                                      <ComponentIcon size={12} />
                                    </span>
                                    <span className="truncate">{comp.name}</span>
                                    <span className="ml-auto text-[10px] text-slate-600 tabular-nums">{comp.fmeaRows.length}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AnalysisTree;
