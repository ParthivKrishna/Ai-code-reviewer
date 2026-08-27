import React, { useState, useRef } from 'react';
import { Minus, Copy, Check, Bug, Zap, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { DiagnosticItem } from '../types';

interface CodeEditorProps {
  filename: string;
  code: string;
  onChangeCode: (newCode: string) => void;
  diagnostics: DiagnosticItem[];
  highlightedLine: number | null;
  onSelectDiagnostic: (diag: DiagnosticItem) => void;
  onApplyPatch: (diag: DiagnosticItem) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  filename,
  code,
  onChangeCode,
  diagnostics,
  highlightedLine,
  onApplyPatch,
}) => {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = code.split('\n');

  // Syntax highlighting tokenizer for Python in Artistic Flair style
  const renderHighlightedLine = (lineText: string, lineIndex: number) => {
    const lineNum = lineIndex + 1;
    const isThreat = diagnostics.some((d) => d.line === lineNum && d.type === 'threat' && !d.resolved);
    const isPowerup = diagnostics.some((d) => d.line === lineNum && d.type === 'powerup' && !d.resolved);
    const isHighlighted = highlightedLine === lineNum;

    const tokens = tokenizePythonLine(lineText);

    return (
      <div
        key={lineIndex}
        className={`group flex items-start leading-6 font-mono text-[13px] md:text-[14px] px-2 py-0.5 transition-colors ${
          isHighlighted
            ? 'bg-[#FFFF00]/40 border-l-4 border-black'
            : isThreat
            ? 'bg-[#FF3366]/15 border-l-4 border-[#FF3366]'
            : isPowerup
            ? 'bg-[#00FF66]/20 border-l-4 border-[#00CC55]'
            : 'hover:bg-black/5 border-l-4 border-transparent'
        }`}
      >
        {/* Line Number in 2-digit zero padded format */}
        <div className="w-10 shrink-0 select-none text-right pr-3 text-black/40 font-mono text-xs md:text-sm font-bold flex items-center justify-end gap-1.5">
          {isThreat && (
            <Bug className="w-3 h-3 text-[#FF3366] animate-pulse" title="Threat detected on this line" />
          )}
          {isPowerup && (
            <Zap className="w-3 h-3 text-[#00A344]" title="Power-up optimization available" />
          )}
          <span>{String(lineNum).padStart(2, '0')}</span>
        </div>

        {/* Code Content */}
        <div className="flex-1 whitespace-pre break-all font-mono font-medium text-black">
          {tokens.map((token, tIdx) => (
            <span key={tIdx} className={token.colorClass}>
              {token.text}
            </span>
          ))}
          {lineIndex === lines.length - 1 && (
            <span className="inline-block w-2 h-4 bg-black ml-0.5 align-middle animate-blink"></span>
          )}
        </div>

        {/* Quick Action Button on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-2 select-none shrink-0">
          {isThreat && (
            <button
              onClick={() => {
                const threat = diagnostics.find((d) => d.line === lineNum);
                if (threat) onApplyPatch(threat);
              }}
              className="text-[10px] bg-[#FF3366] hover:bg-black text-white px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_#000000] flex items-center gap-1 font-bold font-mono active:translate-x-0.5 active:translate-y-0.5"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>PATCH</span>
            </button>
          )}
          {isPowerup && (
            <button
              onClick={() => {
                const power = diagnostics.find((d) => d.line === lineNum);
                if (power) onApplyPatch(power);
              }}
              className="text-[10px] bg-[#00FF66] hover:bg-black hover:text-[#00FF66] text-black px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_#000000] flex items-center gap-1 font-bold font-mono active:translate-x-0.5 active:translate-y-0.5"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>BOOST</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleCopyCode = () => {
    soundManager.playBeep(900, 0.05);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#FFFFFF] border-4 border-black shadow-[6px_6px_0px_0px_#000000] overflow-hidden relative">
      {/* Editor Header Tab Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black border-b-2 border-black text-white text-xs font-mono select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 bg-[#00FF66]"></div>
          <span className="text-[#FFFFFF] font-black uppercase tracking-wider font-['Space_Grotesk'] text-sm">
            {filename}
          </span>
          <span className="text-black bg-[#FFFF00] px-1.5 py-0.5 text-[10px] font-bold">
            PYTHON 3.12
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="hover:text-[#00FF66] transition-colors p-1.5 bg-black hover:bg-white/10 border border-white/20"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00FF66]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <div className="w-4 h-4 flex items-center justify-center text-white/70 hover:text-white cursor-pointer">
            <Minus className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="relative flex-1 p-3 bg-[#FFFFFF] overflow-y-auto overflow-x-auto min-h-[380px]">
        {/* Hidden overlay textarea for typing */}
        <textarea
          ref={textareaRef}
          id="tactile-code-textarea"
          value={code}
          onChange={(e) => {
            soundManager.playKeyClick();
            onChangeCode(e.target.value);
          }}
          spellCheck={false}
          className="absolute inset-0 w-full h-full p-3 font-mono text-[13px] md:text-[14px] leading-6 bg-transparent text-transparent caret-black resize-none outline-none z-10 selection:bg-[#FFFF00] selection:text-black pl-12"
        />

        {/* Highlighted Visual Code Layout */}
        <div className="select-text pointer-events-auto">
          {lines.map((line, idx) => renderHighlightedLine(line, idx))}
        </div>
      </div>

      {/* Status footer bar */}
      <div className="px-4 py-2 bg-[#F5F5F5] border-t-2 border-black flex items-center justify-between text-[11px] font-mono text-black font-bold select-none">
        <div className="flex items-center gap-4">
          <span className="bg-black text-white px-2 py-0.5 text-[10px]">LINES: {lines.length}</span>
          <span>CHARS: {code.length}</span>
          <span className="text-black/60">ENCODING: UTF-8</span>
        </div>
        <div className="flex items-center gap-2 text-black">
          <span className="inline-block w-2 h-2 bg-[#00FF66] border border-black animate-pulse"></span>
          <span className="font-bold">LSP_ONLINE</span>
        </div>
      </div>
    </div>
  );
};

// Helper: Python Syntax Tokenizer
interface Token {
  text: string;
  colorClass: string;
}

function tokenizePythonLine(line: string): Token[] {
  if (!line) return [{ text: ' ', colorClass: 'text-transparent' }];

  const tokens: Token[] = [];
  const regex = /(#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:import|class|def|if|elif|else|return|super|pass|while|for|in|from|as|and|or|not|is)\b)|(\b(?:self|True|False|None|Enemy)\b)|(\b\d+\b)|([a-zA-Z_]\w*)|([^\s\w'"]+|\s+)/g;

  let match;
  while ((match = regex.exec(line)) !== null) {
    const [
      full,
      comment,
      stringLit,
      keyword,
      builtin,
      number,
      identifier,
      symbolsOrSpace
    ] = match;

    if (comment) {
      tokens.push({ text: comment, colorClass: 'text-[#6B7280] italic' });
    } else if (stringLit) {
      tokens.push({ text: stringLit, colorClass: 'text-[#B45309] font-bold' });
    } else if (keyword) {
      tokens.push({ text: keyword, colorClass: 'text-[#FF3366] font-black' });
    } else if (builtin) {
      tokens.push({ text: builtin, colorClass: 'text-[#008844] font-bold' });
    } else if (number) {
      tokens.push({ text: number, colorClass: 'text-[#7C3AED] font-bold' });
    } else if (identifier) {
      if (identifier === 'CyberDemon' || identifier === 'Enemy') {
        tokens.push({ text: identifier, colorClass: 'text-black font-black underline decoration-[#00FF66] decoration-2' });
      } else {
        tokens.push({ text: identifier, colorClass: 'text-black' });
      }
    } else if (symbolsOrSpace) {
      tokens.push({ text: symbolsOrSpace, colorClass: 'text-black/80 font-bold' });
    } else {
      tokens.push({ text: full, colorClass: 'text-black' });
    }
  }

  return tokens.length > 0 ? tokens : [{ text: line, colorClass: 'text-black' }];
}
