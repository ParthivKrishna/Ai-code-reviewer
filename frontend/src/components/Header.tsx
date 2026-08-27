import React from 'react';
import { Play, Volume2, VolumeX, Monitor, RotateCcw, Shield } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  onStartRun: () => void;
  isRunning: boolean;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetCode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onStartRun,
  isRunning,
  crtEnabled,
  onToggleCrt,
  soundEnabled,
  onToggleSound,
  onResetCode,
}) => {
  return (
    <header className="w-full bg-[#FFFFFF] border-b-4 border-black px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Left: Brand Identity with Neo-Pop Aesthetic */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-black border-2 border-black flex items-center justify-center text-[#00FF66] shadow-[2px_2px_0px_0px_#000000]">
            <Shield className="w-5 h-5 text-[#00FF66]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl md:text-3xl font-black italic tracking-tighter text-black uppercase font-['Space_Grotesk']">
              CODEGUARD
            </span>
            <span className="hidden sm:inline-block text-[10px] font-black uppercase bg-[#FFFF00] text-black px-2 py-0.5 border-2 border-black rotate-[-2deg] shadow-[2px_2px_0px_0px_#000000]">
              ANALYZER
            </span>
          </div>
        </div>
      </div>

      {/* Right: Controls and Action Button */}
      <div className="flex items-center gap-2.5">
        {/* Reset Code */}
        <button
          id="btn-reset-code"
          onClick={() => {
            soundManager.playBeep(500, 0.05);
            onResetCode();
          }}
          title="Reset Source Code"
          className="px-2.5 py-1.5 text-xs font-bold text-black bg-[#FFFFFF] hover:bg-[#FFFF00] border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 font-mono"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">RESET</span>
        </button>

        {/* CRT Scanline Toggle */}
        <button
          id="btn-toggle-crt"
          onClick={() => {
            soundManager.playBeep(850, 0.04);
            onToggleCrt();
          }}
          title="Toggle CRT Scanline Effect"
          className={`px-2.5 py-1.5 text-xs font-bold font-mono border-2 border-black transition-all flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 ${
            crtEnabled
              ? 'bg-[#FFFF00] text-black shadow-[2px_2px_0px_0px_#000000]'
              : 'bg-[#FFFFFF] text-black/60 shadow-[2px_2px_0px_0px_#000000]'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">CRT</span>
        </button>

        {/* Audio Toggle */}
        <button
          id="btn-toggle-sound"
          onClick={() => {
            onToggleSound();
          }}
          title="Toggle Tactile Terminal Audio FX"
          className={`px-2.5 py-1.5 text-xs font-bold font-mono border-2 border-black transition-all flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 ${
            soundEnabled
              ? 'bg-[#00FF66] text-black shadow-[2px_2px_0px_0px_#000000]'
              : 'bg-[#FFFFFF] text-black/60 shadow-[2px_2px_0px_0px_#000000]'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">SFX</span>
        </button>

        {/* START RUN - High Contrast Brutalist Primary Button */}
        <button
          id="btn-start-run"
          onClick={() => {
            soundManager.playBeep(1100, 0.08);
            onStartRun();
          }}
          disabled={isRunning}
          className={`group flex items-center gap-2 px-4 md:px-5 py-2 border-2 border-black text-xs md:text-sm font-black tracking-wider uppercase font-mono transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
            isRunning
              ? 'bg-black text-white cursor-wait shadow-[2px_2px_0px_0px_#FF3366]'
              : 'bg-[#FF3366] text-white hover:bg-black hover:text-[#00FF66] shadow-[4px_4px_0px_0px_#000000]'
          }`}
        >
          <Play className={`w-4 h-4 fill-current ${isRunning ? 'animate-spin' : 'group-hover:translate-x-0.5 transition-transform'}`} />
          <span>{isRunning ? 'EXECUTING...' : 'RUN'}</span>
        </button>
      </div>
    </header>
  );
};
