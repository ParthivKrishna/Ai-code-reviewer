import React from 'react';
import { Bug, Zap, CheckCircle2, Sparkles, ShieldAlert } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { DiagnosticItem } from '../types';

interface AnalysisPanelProps {
  diagnostics: DiagnosticItem[];
  onSelectDiagnostic: (diag: DiagnosticItem) => void;
  onApplyPatch: (diag: DiagnosticItem) => void;
  onOpenAIDiagnostic: (diag: DiagnosticItem) => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  diagnostics,
  onSelectDiagnostic,
  onApplyPatch,
  onOpenAIDiagnostic,
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-[#FFFFFF] border-4 border-black shadow-[6px_6px_0px_0px_#000000] overflow-hidden select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b-2 border-black text-white">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#FF3366]" />
          <h2 className="text-base md:text-lg font-black tracking-tight text-white font-['Space_Grotesk'] uppercase italic">
            ANALYSIS RESULTS
          </h2>
        </div>
        <div className="px-2 py-0.5 bg-[#00FF66] text-black font-mono font-bold text-xs border border-black shadow-[2px_2px_0px_0px_#000000]">
          {diagnostics.length} ISSUES
        </div>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto font-mono bg-[#F9F9FB]">
        {/* Diagnostic Issue Cards */}
        {diagnostics.length === 0 ? (
          <div className="p-4 text-center text-black/60 font-bold border-2 border-dashed border-black/20">
            No issues detected. Code is clean.
          </div>
        ) : (
          diagnostics.map((diag) => {
            const isThreat = diag.type === 'threat' || diag.type === 'warning';

            return (
              <div
                key={diag.id}
                id={`diag-card-${diag.id}`}
                className={`p-3.5 border-2 border-black transition-all ${
                  diag.resolved
                    ? 'bg-[#FFFFFF] opacity-85 shadow-[2px_2px_0px_0px_#000000]'
                    : isThreat
                    ? 'bg-[#FFFFFF] shadow-[4px_4px_0px_0px_#FF3366]'
                    : 'bg-[#FFFFFF] shadow-[4px_4px_0px_0px_#00FF66]'
                }`}
              >
                {/* Card Title & Icon */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-black">
                  <div className="flex items-center gap-2">
                    {diag.resolved ? (
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    ) : isThreat ? (
                      <Bug className="w-4 h-4 text-[#FF3366] animate-pulse" />
                    ) : (
                      <Zap className="w-4 h-4 text-black" />
                    )}

                    <span
                      className={`text-xs font-black tracking-wider uppercase font-['Space_Grotesk'] ${
                        diag.resolved
                          ? 'text-black bg-[#00FF66] px-1.5 py-0.5 border border-black'
                          : isThreat
                          ? 'text-white bg-[#FF3366] px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]'
                          : 'text-black bg-[#00FF66] px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]'
                      }`}
                    >
                      {diag.resolved ? 'RESOLVED' : diag.title}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FFFF00] text-black border border-black shadow-[1px_1px_0px_0px_#000000]">
                    {diag.badgeText}
                  </span>
                </div>

                {/* Message */}
                <p className="text-xs text-black font-semibold leading-relaxed mb-2 font-mono">
                  {diag.message}
                </p>

                {/* Suggestion */}
                <div className="text-[11px] text-black/90 leading-relaxed mb-3 bg-[#F0F0F3] p-2.5 border-2 border-black">
                  <span className="text-black font-black block mb-0.5 uppercase">
                    SUGGESTION:
                  </span>
                  {diag.suggestion}
                </div>

                {/* Action Buttons */}
                {!diag.resolved ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id={`btn-patch-${diag.id}`}
                      onClick={() => {
                        onApplyPatch(diag);
                      }}
                      className={`flex-1 py-1.5 px-3 border-2 border-black text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                        isThreat
                          ? 'bg-[#FF3366] hover:bg-black text-white'
                          : 'bg-[#00FF66] hover:bg-black hover:text-[#00FF66] text-black'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isThreat ? 'APPLY FIX' : 'APPLY PATCH'}</span>
                    </button>

                    <button
                      onClick={() => {
                        soundManager.playBeep(750, 0.04);
                        onSelectDiagnostic(diag);
                      }}
                      className="py-1.5 px-3 text-xs font-bold text-black hover:bg-[#FFFF00] bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      title="Highlight Line in Code"
                    >
                      LOCATE
                    </button>
                    
                    <button
                      onClick={() => {
                        soundManager.playBeep(800, 0.04);
                        onOpenAIDiagnostic(diag);
                      }}
                      className="py-1.5 px-3 text-xs font-bold text-white bg-black border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:text-[#00FF66] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      title="AI Deep Dive"
                    >
                      AI
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-black font-bold flex items-center gap-1.5 font-mono pt-1 bg-[#00FF66]/20 p-1.5 border border-black">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                    <span>Issue resolved.</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
