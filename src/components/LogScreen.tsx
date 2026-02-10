import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../../types';

export const LogScreen: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const endOfLogsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep the latest agent activity visible
  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden text-slate-200">
      
      {/* 1. TERMINAL HEADER */}
        

        <div className="h-[20%] bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex items-center justify-between backdrop-blur-xl">
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gold-500 uppercase">
              Execution <span className="text-gold-500">Logs</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed max-w-xs uppercase tracking-widest">
              Real-Time Agent Orchestration Stream
            </p>
          </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Active</span>
        </div>
      </div>

      {/* 2. MAIN LOG TERMINAL */}
      <div className="flex-grow bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col overflow-hidden relative">
        
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />

        <div className="relative z-10 flex-grow overflow-y-auto pr-4 scrollbar-hide font-mono text-xs space-y-3">
          {logs.map((log, index) => (
            <div key={index} className="group flex gap-6 py-2 border-b border-white/5 hover:bg-white/[0.02] transition-all">
              
              {/* Timestamp with high-visibility slate */}
              <div className="flex-shrink-0 text-slate-500 select-none w-20">
                {log.timestamp instanceof Date 
                  ? log.timestamp.toLocaleTimeString() 
                  : String(log.timestamp)}
              </div>

              {/* Agent Badge - Distinct colors for different agents */}
              <div className={`flex-shrink-0 w-44 font-black tracking-tighter uppercase ${
                log.agent === 'MASTER_AGENT' ? 'text-gold-500' : 
                log.agent === 'SYSTEM' ? 'text-red-500' : 'text-blue-400'
              }`}>
                [{log.agent}]
              </div>

              {/* Message Content */}
              <div className="flex-grow text-slate-300 leading-relaxed">
                <span className="group-hover:text-white transition-colors">
                  {log.message}
                </span>

                {/* Structured Data View (Redesigned Details) */}
                {log.data && (
                  <details className="mt-3 group/data">
                    <summary className="cursor-pointer text-[10px] font-black text-gold-500/50 hover:text-gold-500 uppercase tracking-widest transition-all outline-none">
                      ▸ INTERROGATE_DATA_PAYLOAD
                    </summary>
                    <div className="mt-2 relative">
                      <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-gold-500/20" />
                      <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[10px] text-blue-300 overflow-x-auto shadow-inner leading-normal">
                        {typeof log.data === 'object' 
                          ? JSON.stringify(log.data, null, 2) 
                          : log.data}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
          <div ref={endOfLogsRef} />
        </div>

        {/* 3. TERMINAL FOOTER STATS */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
          <div>Buffer Size: {logs.length} Operations</div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500" /> Matches Found
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Parsing Done
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};