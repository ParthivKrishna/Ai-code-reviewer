import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, CornerDownLeft } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { LogEntry } from '../types';

interface RunLogProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onExecuteCommand: (command: string) => void;
}

export const RunLog: React.FC<RunLogProps> = ({
  logs,
  onClearLogs,
  onExecuteCommand,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs on new entry
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    soundManager.playBeep(950, 0.04);
    onExecuteCommand(commandInput.trim());
    setCommandInput('');
  };

  return (
    <div className="w-full bg-[#FFFFFF] border-4 border-black shadow-[6px_6px_0px_0px_#000000] overflow-hidden flex flex-col font-mono select-none">
      {/* Run Log Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black border-b-2 border-black text-white text-xs">
        <div className="flex items-center gap-2 text-white font-black tracking-wider uppercase font-['Space_Grotesk'] text-sm">
          <Terminal className="w-4 h-4 text-[#00FF66]" />
          <span>RUN LOG // STDOUT</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-white">
          <span className="hidden sm:inline bg-[#FFFF00] text-black font-bold px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]">
            BAUD: 9600
          </span>
          <button
            onClick={() => {
              soundManager.playBeep(400, 0.04);
              onClearLogs();
            }}
            className="hover:bg-[#FF3366] hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 bg-white text-black font-bold border border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5"
            title="Clear Logs"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">CLEAR</span>
          </button>
        </div>
      </div>

      {/* Log Output Area */}
      <div
        ref={logContainerRef}
        className="p-3.5 text-xs md:text-sm text-black leading-relaxed max-h-36 min-h-[90px] overflow-y-auto font-mono select-text bg-[#FFFFFF]"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {logs.map((log) => {
            let badgeClass = 'text-black font-medium';
            if (log.type === 'warn') badgeClass = 'bg-[#FFFF00] text-black font-bold px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]';
            if (log.type === 'error') badgeClass = 'bg-[#FF3366] text-white font-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]';
            if (log.type === 'success') badgeClass = 'bg-[#00FF66] text-black font-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]';
            if (log.type === 'combat') badgeClass = 'bg-black text-[#00FF66] font-bold px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]';

            return (
              <span key={log.id} className={badgeClass}>
                {log.text}
              </span>
            );
          })}
          {/* Blinking Underscore Terminal Cursor */}
          <span className="inline-block w-2.5 h-4 bg-black align-middle animate-blink"></span>
        </div>
      </div>

      {/* Interactive Command Prompt */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center bg-[#F5F5F5] border-t-2 border-black px-3.5 py-2 gap-2"
      >
        <span className="bg-black text-[#00FF66] text-xs font-black px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000] shrink-0">
          CMD &gt;
        </span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Enter command ('run', 'patch', 'emp', 'status', 'help')..."
          className="flex-1 bg-transparent text-xs text-black font-bold placeholder-black/40 outline-none font-mono"
        />
        <button
          type="submit"
          className="bg-black hover:bg-[#00FF66] hover:text-black text-white px-3 py-1 text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1 font-mono"
          title="Send Command"
        >
          <span>SEND</span>
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
