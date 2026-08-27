import React from 'react';
import { X, Sparkles, Cpu, Bug, Zap } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { DiagnosticItem } from '../types';

interface AIDiagnosticModalProps {
  diagnostic: DiagnosticItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyPatch: (diag: DiagnosticItem) => void;
}

export const AIDiagnosticModal: React.FC<AIDiagnosticModalProps> = ({
  diagnostic,
  isOpen,
  onClose,
  onApplyPatch,
}) => {
  if (!isOpen || !diagnostic) return null;

  const isThreat = diagnostic.type === 'threat';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none font-mono">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border-4 border-black shadow-[8px_8px_0px_0px_#000000] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-black border-b-2 border-black flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#00FF66]" />
            <span className="text-sm font-black text-white font-['Space_Grotesk'] tracking-wide uppercase italic">
              AI DIAGNOSTIC DEEP DIVE // {diagnostic.title}
            </span>
          </div>
          <button
            onClick={() => {
              soundManager.playBeep(400, 0.04);
              onClose();
            }}
            className="text-white hover:bg-[#FF3366] p-1 border border-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs text-black overflow-y-auto max-h-[70vh] bg-[#F9F9FB]">
          {/* Issue summary */}
          <div className={`p-3.5 border-2 border-black ${isThreat ? 'bg-[#FFFFFF] shadow-[3px_3px_0px_0px_#FF3366]' : 'bg-[#FFFFFF] shadow-[3px_3px_0px_0px_#00FF66]'}`}>
            <div className="font-black text-black mb-1.5 flex items-center gap-2 text-sm font-['Space_Grotesk']">
              {isThreat ? (
                <span className="bg-[#FF3366] text-white px-2 py-0.5 border border-black font-mono text-xs">CRITICAL THREAT</span>
              ) : (
                <span className="bg-[#00FF66] text-black px-2 py-0.5 border border-black font-mono text-xs">OPTIMIZATION</span>
              )}
              <span>{diagnostic.message}</span>
            </div>
            <p className="text-black/80 font-medium leading-relaxed">{diagnostic.explanation}</p>
          </div>

          {/* Patch Diff preview */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-black uppercase text-black">RECOMMENDED CODE PATCH:</div>
            <div className="p-3 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000000] font-mono text-[13px] overflow-x-auto space-y-2.5">
              <div>
                <div className="text-white bg-[#FF3366] px-2 py-0.5 inline-block text-[10px] font-black border border-black mb-1">
                  - TARGET CODE TO REPLACE:
                </div>
                <pre className="text-black bg-[#FF3366]/15 border-l-4 border-[#FF3366] p-2 font-bold">{diagnostic.patchTarget}</pre>
              </div>
              <div>
                <div className="text-black bg-[#00FF66] px-2 py-0.5 inline-block text-[10px] font-black border border-black mb-1">
                  + REPLACEMENT CODE:
                </div>
                <pre className="text-black bg-[#00FF66]/20 border-l-4 border-[#00CC55] p-2 font-bold">{diagnostic.patchCode}</pre>
              </div>
            </div>
          </div>

          {/* Suggestion note */}
          <div className="p-3 bg-[#FFFF00] border-2 border-black shadow-[2px_2px_0px_0px_#000000] text-black text-[11px] font-bold">
            <span className="font-black block mb-0.5 uppercase">TACTICAL IMPLICATION:</span>
            {diagnostic.suggestion}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#F5F5F5] border-t-2 border-black flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-black text-black hover:bg-black/10 border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 bg-white"
          >
            CANCEL
          </button>
          <button
            onClick={() => {
              onApplyPatch(diagnostic);
              onClose();
            }}
            className={`px-4 py-1.5 text-xs font-black border-2 border-black shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 ${
              isThreat ? 'bg-[#FF3366] hover:bg-black text-white' : 'bg-[#00FF66] hover:bg-black hover:text-[#00FF66] text-black'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>APPLY THIS FIX</span>
          </button>
        </div>
      </div>
    </div>
  );
};
