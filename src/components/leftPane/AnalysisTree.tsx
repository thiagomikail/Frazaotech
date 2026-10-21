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
    <div className="text-[13px] text-ink">
      {/* Dashboard button */}
      <div 
        className={`flex items-center px-2 py-1.5 mb-3 rounded-md cursor-pointer transition-colors ${!selectedComponentId ? 'bg-accent text-on-accent' : 'hover:bg-fill'}`}
        onClick={() => setSelectedComponentId(null)}
      >
        <div className={`mr-2 ${!selectedComponentId ? '' : 'text-accent'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        </div>
        <span className="font-semibold">Plant Dashboard</span>
      </div>

      {/* Plant level */}
      {systems.map(sys => (
        <div key={sys.id} className="mb-1">
          <div 
            className="flex items-center px-1.5 py-1 hover:bg-fill rounded-md cursor-pointer transition-colors"
            onClick={(e) => toggleNode(sys.id, e)}
          >
            <span className="mr-1 text-ink-3">
              {expandedNodes.has(sys.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <span className="mr-2 text-accent">
              {expandedNodes.has(sys.id) ? <FolderOpen size={16} /> : <Folder size={16} />}
            </span>
            <span className="truncate font-semibold">{sys.name}</span>
          </div>
          
          {expandedNodes.has(sys.id) && (
            <div className="ml-4 pl-2 border-l border-line">
              {/* System groups (e.g. Reheat Furnace, Scalper, Reversing Mill...) */}
              {groupedSubsystems.map(group => (
                <div key={group.id} className="mb-0.5 mt-0.5">
                  <div 
                    className="flex items-center px-1.5 py-1 hover:bg-fill rounded-md cursor-pointer transition-colors"
                    onClick={(e) => toggleNode(group.id, e)}
                  >
                    <span className="mr-1 text-ink-3">
                      {expandedNodes.has(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="mr-2 text-orange">
                      <Layers size={14} />
                    </span>
                    <span className="truncate text-ink">{group.name}</span>
                    <span className="ml-auto pl-2 text-[11px] text-ink-3 tabular-nums">
                      {group.subsystems.reduce((acc, s) => acc + s.components.length, 0)}
                    </span>
                  </div>

                  {expandedNodes.has(group.id) && (
                    <div className="ml-4 pl-2 border-l border-line">
                      {group.subsystems.map(sub => {
                        // Show only the part after " – " for the subsystem name
                        const dashIdx = sub.name.indexOf(' – ');
                        const displayName = dashIdx > 0 ? sub.name.substring(dashIdx + 3) : sub.name;

                        return (
                          <div key={sub.id} className="mb-0.5 mt-0.5">
                            <div 
                              className="flex items-center px-1.5 py-1 hover:bg-fill rounded-md cursor-pointer transition-colors"
                              onClick={(e) => toggleNode(sub.id, e)}
                            >
                              <span className="mr-1 text-ink-3">
                                {expandedNodes.has(sub.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                              <span className="mr-2 text-accent/70">
                                {expandedNodes.has(sub.id) ? <FolderOpen size={14} /> : <Folder size={14} />}
                              </span>
                              <span className="truncate text-ink-2 text-[12px]">{displayName}</span>
                            </div>

                            {expandedNodes.has(sub.id) && (
                              <div className="ml-4 pl-2 border-l border-line">
                                {sub.components.map(comp => (
                                  <div 
                                    key={comp.id} 
                                    className={`flex items-center px-1.5 py-1 mt-0.5 rounded-md cursor-pointer transition-colors text-[12px] ${selectedComponentId === comp.id ? 'bg-accent text-on-accent' : 'hover:bg-fill text-ink-2'}`}
                                    onClick={() => setSelectedComponentId(comp.id)}
                                  >
                                    <span className="mr-2 ml-4">
                                      <ComponentIcon size={12} />
                                    </span>
                                    <span className="truncate">{comp.name}</span>
                                    <span className={`ml-auto pl-2 text-[11px] tabular-nums ${selectedComponentId === comp.id ? 'text-on-accent/80' : 'text-ink-3'}`}>{comp.fmeaRows.length}</span>
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
