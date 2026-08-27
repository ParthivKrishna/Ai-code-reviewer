/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CodeEditor } from './components/CodeEditor';
import { AnalysisPanel } from './components/AnalysisPanel';
import { RunLog } from './components/RunLog';
import { AIDiagnosticModal } from './components/AIDiagnosticModal';
import { DEFAULT_SNIPPET, DEFAULT_DIAGNOSTICS, INITIAL_LOGS } from './data/snippet';
import { DiagnosticItem, LogEntry } from './types';
import { soundManager } from './utils/audio';

export default function App() {
  const [code, setCode] = useState<string>(DEFAULT_SNIPPET);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>(DEFAULT_DIAGNOSTICS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<DiagnosticItem | null>(null);
  const [isAIDiagOpen, setIsAIDiagOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize logs
  useEffect(() => {
    loadSnippet();
  }, []);

  const loadSnippet = () => {
    setCode(DEFAULT_SNIPPET);
    setDiagnostics(DEFAULT_DIAGNOSTICS);
    setHighlightedLine(null);

    const initialEntries: LogEntry[] = INITIAL_LOGS.map((logText, index) => ({
      id: `log-${Date.now()}-${index}`,
      timestamp: new Date().toLocaleTimeString(),
      type: logText.includes('WARN') ? 'warn' : logText.includes('ERR') ? 'error' : 'info',
      text: logText
    }));
    setLogs(initialEntries);
  };

  // Handle code change
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    // Auto evaluate diagnostics based on current code
    setDiagnostics((prevDiags) =>
      prevDiags.map((diag) => {
        let isResolved = diag.resolved;
        if (diag.id === 'threat-1') {
          // If code no longer contains the unhandled pass statement
          isResolved = !newCode.includes('pass # TODO: Implement results retrieval') && newCode.includes('def get_results');
        } else if (diag.id === 'warning-1') {
          // If code uses optimized exception
          isResolved = newCode.includes('raise ValueError');
        }
        return { ...diag, resolved: isResolved };
      })
    );
  };

  // Apply auto-patch from diagnostic card or inline button
  const handleApplyPatch = (diag: DiagnosticItem) => {
    soundManager.playSuccess();

    let updatedCode = code;
    if (code.includes(diag.patchTarget)) {
      updatedCode = code.replace(diag.patchTarget, diag.patchCode);
    } 

    handleCodeChange(updatedCode);

    // Mark diagnostic as resolved
    setDiagnostics((prev) =>
      prev.map((d) => (d.id === diag.id ? { ...d, resolved: true } : d))
    );

    // Append to Run Log
    addLog(`> PATCH APPLIED: ${diag.badgeText} on Line ${diag.line}. [VERIFIED]`, 'success');
  };

  // Add Log Entry helper
  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type,
        text
      }
    ]);
  };

  // Handle Start Run Action
  const handleStartRun = () => {
    setIsRunning(true);
    addLog(`> EXECUTING data_processor.py...`, 'info');
    
    setTimeout(() => {
      setIsRunning(false);
      const unresolved = diagnostics.filter(d => !d.resolved);
      if (unresolved.length > 0) {
        addLog(`> EXECUTION HALTED: ${unresolved.length} unresolved issues detected.`, 'error');
        soundManager.playError();
      } else {
        addLog(`> EXECUTION SUCCESSFUL. All diagnostics clear.`, 'success');
        soundManager.playSuccess();
      }
    }, 800);
  };

  // Handle Terminal Command
  const handleExecuteCommand = (cmd: string) => {
    const trimmed = cmd.toLowerCase().trim();
    addLog(`> ${cmd}`, 'info');

    if (trimmed === 'clear') {
      setLogs([]);
      return;
    }

    if (trimmed === 'help') {
      addLog(`Available commands: 'run' (execute code), 'patch' (apply all fixes), 'reset' (restore code), 'clear'`, 'info');
      return;
    }

    if (trimmed === 'run' || trimmed === 'start') {
      handleStartRun();
      return;
    }

    if (trimmed === 'patch' || trimmed === 'fix') {
      diagnostics.forEach((d) => {
        if (!d.resolved) handleApplyPatch(d);
      });
      addLog(`> ALL DIAGNOSTIC PATCHES INJECTED.`, 'success');
      return;
    }

    if (trimmed === 'reset') {
      handleResetCode();
      return;
    }

    // Default unknown command response
    soundManager.playError();
    addLog(`Command not recognized: '${cmd}'. Type 'help' for tactical syntax.`, 'warn');
  };

  const handleResetCode = () => {
    loadSnippet();
    addLog(`> SOURCE RESTORED TO INITIAL STATE.`, 'info');
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setSoundEnabled(next);
    if (next) soundManager.playBeep(880, 0.05);
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] text-black flex flex-col relative overflow-hidden font-mono">
      {/* CRT Scanline Global Overlay */}
      {crtEnabled && <div className="crt-overlay fixed inset-0 z-40 pointer-events-none opacity-40"></div>}

      {/* Top Application Header */}
      <Header
        onStartRun={handleStartRun}
        isRunning={isRunning}
        crtEnabled={crtEnabled}
        onToggleCrt={() => setCrtEnabled(!crtEnabled)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onResetCode={handleResetCode}
      />

      {/* Main Console Workspace Grid in Artistic Flair style */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-2 sm:p-3 md:p-4 flex flex-col gap-4">
        {/* Upper Split: Code Editor (Left) + Analysis Panel (Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[440px]">
          {/* Left: Code Editor (8 cols on lg) */}
          <div className="lg:col-span-8 h-full">
            <CodeEditor
              filename={"data_processor.py"}
              code={code}
              onChangeCode={handleCodeChange}
              diagnostics={diagnostics}
              highlightedLine={highlightedLine}
              onSelectDiagnostic={(diag) => {
                setHighlightedLine(diag.line);
                setTimeout(() => setHighlightedLine(null), 3000);
              }}
              onApplyPatch={handleApplyPatch}
            />
          </div>

          {/* Right: Analysis Panel (4 cols on lg) */}
          <div className="lg:col-span-4 h-full">
            <AnalysisPanel
              diagnostics={diagnostics}
              onSelectDiagnostic={(diag) => {
                setHighlightedLine(diag.line);
                setTimeout(() => setHighlightedLine(null), 3000);
              }}
              onApplyPatch={handleApplyPatch}
              onOpenAIDiagnostic={(diag) => {
                setSelectedDiagnostic(diag);
                setIsAIDiagOpen(true);
              }}
            />
          </div>
        </div>

        {/* Lower Full-Width: Integrated RUN LOG Terminal */}
        <div className="w-full">
          <RunLog
            logs={logs}
            onClearLogs={() => setLogs([])}
            onExecuteCommand={handleExecuteCommand}
          />
        </div>
      </main>

      {/* AI Diagnostic Deep Dive Modal */}
      <AIDiagnosticModal
        diagnostic={selectedDiagnostic}
        isOpen={isAIDiagOpen}
        onClose={() => setIsAIDiagOpen(false)}
        onApplyPatch={handleApplyPatch}
      />
    </div>
  );
}
