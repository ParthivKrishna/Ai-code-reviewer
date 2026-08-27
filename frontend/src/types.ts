export interface DiagnosticItem {
  id: string;
  type: 'threat' | 'powerup' | 'warning' | 'info';
  title: string;
  line: number;
  message: string;
  suggestion: string;
  badgeText: string;
  patchCode: string;
  patchTarget: string;
  resolved: boolean;
  explanation: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  text: string;
}
