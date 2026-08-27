import { DiagnosticItem } from '../types';

export const DEFAULT_SNIPPET = `import random

class DataProcessor:
    def __init__(self, data):
        self.data = data
        self.is_processed = False

    def process(self):
        # BUG: This can throw an error if data is empty
        if not self.data:
            return "ERROR"
            
        processed = [x * 2 for x in self.data]
        self.is_processed = True
        return processed

    def get_results(self):
        pass # TODO: Implement results retrieval
`;

export const DEFAULT_DIAGNOSTICS: DiagnosticItem[] = [
  {
    id: 'threat-1',
    type: 'threat',
    title: 'UNIMPLEMENTED METHOD',
    line: 17,
    badgeText: 'MISSING LOGIC',
    message: "Line 17: `get_results` is undefined.",
    suggestion: "Implement the method to return processed data or throw an exception if not processed.",
    patchTarget: "pass # TODO: Implement results retrieval",
    patchCode: `if not self.is_processed:
            raise ValueError("Data not processed yet")
        return self.data`,
    resolved: false,
    explanation: "The get_results method currently has a pass statement. This will lead to unexpected None returns when called."
  },
  {
    id: 'warning-1',
    type: 'warning',
    title: 'EDGE CASE DETECTED',
    line: 9,
    badgeText: 'TYPE SAFETY',
    message: "Line 9: Returning string 'ERROR' breaks expected list return type.",
    suggestion: "Raise an exception or return an empty list for consistency.",
    patchTarget: `if not self.data:
            return "ERROR"`,
    patchCode: `if not self.data:
            raise ValueError("Empty data provided")`,
    resolved: false,
    explanation: "Returning a string 'ERROR' when a list is normally expected can cause downstream type errors."
  }
];

export const INITIAL_LOGS = [
  '> INIT SYSTEM... [OK]',
  '> LOADING SNIPPET... [OK]',
  '> RUNNING STATIC ANALYSIS... [DONE]',
  '> SYSTEM READY. _'
];
