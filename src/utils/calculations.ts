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
      return 'bg-red/15 text-red-ink';
    case 'Medium':
      return 'bg-orange/15 text-orange-ink';
    case 'Low':
      return 'bg-green/15 text-green-ink';
    default:
      return 'bg-fill text-ink-2';
  }
}
