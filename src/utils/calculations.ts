export function calculateRPN(severity: number, occurrence: number, detection: number): number {
  return (severity || 1) * (occurrence || 1) * (detection || 1);
}

export function calculateActionPriority(severity: number, occurrence: number, detection: number): 'High' | 'Medium' | 'Low' | 'None' {
  if (!severity || !occurrence || !detection) return 'None';

  // Simplified AIAG-VDA 2026 Action Priority Logic
  // High Severity (9-10) with Moderate/High Occurrence (4-10) is always High AP regardless of Detection
  if (severity >= 9) {
    if (occurrence >= 4) return 'High';
    if (occurrence >= 2 && detection >= 5) return 'High';
    return 'Medium';
  }

  // Moderate Severity (7-8)
  if (severity >= 7) {
    if (occurrence >= 8) return 'High';
    if (occurrence >= 4 && detection >= 5) return 'High';
    if (occurrence >= 2 && detection >= 2) return 'Medium';
    return 'Low';
  }

  // Low/Moderate Severity (5-6)
  if (severity >= 5) {
    if (occurrence >= 8 && detection >= 5) return 'High';
    if (occurrence >= 4) return 'Medium';
    return 'Low';
  }

  // Low Severity (2-4)
  if (severity >= 2) {
    if (occurrence >= 8 && detection >= 5) return 'Medium';
    return 'Low';
  }

  // Very Low Severity (1)
  return 'Low';
}

export function getAPColor(ap: 'High' | 'Medium' | 'Low' | 'None'): string {
  switch (ap) {
    case 'High':
      return 'bg-danger-500/20 text-danger-500 border-danger-500/50';
    case 'Medium':
      return 'bg-warning-500/20 text-warning-500 border-warning-500/50';
    case 'Low':
      return 'bg-success-500/20 text-success-500 border-success-500/50';
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}
