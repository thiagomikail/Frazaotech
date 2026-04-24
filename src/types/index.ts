export interface FMEARowData {
  id: string;
  function: string;
  failureMode: string;
  effect: string;
  severity: number;
  cause: string;
  occurrence: number;
  control: string;
  detection: number;
  rpn: number;
  actionPriority: 'High' | 'Medium' | 'Low' | 'None';
}

export interface ComponentData {
  id: string;
  name: string;
  fmeaRows: FMEARowData[];
}

export interface SubsystemData {
  id: string;
  name: string;
  components: ComponentData[];
}

export interface SystemData {
  id: string;
  name: string;
  subsystems: SubsystemData[];
}
