import * as React from 'react';
import { useState, useEffect } from 'react';
import { Rfp, LogEntry } from '../../types';

interface ProcessingScreenProps {
  rfp: Rfp;
  logs: LogEntry[];
  onViewResults: () => void;
  onBack: () => void;
  priorPhasesDuration: number; 
  processingStartTime: Date | null;
}

const INDUSTRY_NEWS = [
  { cat: "Wires & Cables", title: "Copper Tariffs Surge", detail: "New 50% tariffs on copper imports are shifting 2026 procurement strategies toward domestic manufacturers." },
  { cat: "Lighting Poles", title: "Smart City Mandates", detail: "Government tender guidelines now mandate IoT-ready Smart Poles for all new urban infrastructure projects." },
  { cat: "High Mast", title: "Solar-Hybrid Innovation", detail: "New hybrid towers reducing fuel consumption by 30% are becoming the standard for coastal industrial zones." }
];

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  rfp,
  logs,
  onViewResults,
  onBack,
  priorPhasesDuration = 0,
}) => {
  const [totalElapsed, setTotalElapsed] = useState(priorPhasesDuration);
  const [newsIndex, setNewsIndex] = useState(0);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  
  const isProcessing = rfp.status !== 'Complete' && rfp.status !== 'Error';
  const isExtractionDone = rfp.status === 'Complete';

  // 1. CUMULATIVE TIMER
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isProcessing) {
      timer = setInterval(() => {
        setTotalElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isProcessing]);

  // 2. NEWS TICKER
  useEffect(() => {
    const newsTicker = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % INDUSTRY_NEWS.length);
    }, 6000);
    return () => clearInterval(newsTicker);
  }, []);

  return (
    // FIX 1: Removed 'fixed inset-0' to prevent hiding under global header
    <div className="h-full w-full bg-slate-950 text-slate-200 flex flex-col relative font-sans overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col">
        
        {/* LOCAL HEADER: Now respects global header positioning */}
        <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white mb-1 uppercase italic">
              Orchestrating <span className="text-gold-500">Analysis</span>
            </h1>
            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
              Authorization: Ansh Pratap Singh // ID: {rfp.id}
            </p>
          </div>
          <div className="text-right">
            <span className="block text-[9px] text-gold-500/60 uppercase font-black tracking-widest mb-1">
              {isProcessing ? "Cumulative Process Time" : "Total Time Taken"}
            </span>
            <span className={`text-4xl font-light tracking-tighter transition-colors ${isProcessing ? 'text-white' : 'text-gold-500'}`}>
              {totalElapsed}<span className="text-lg text-slate-600 ml-1 italic">s</span>
            </span>
          </div>
        </div>

        {/* MAIN COMMAND GRID */}
        <div className="grid grid-cols-12 gap-8 flex-grow overflow-hidden mb-6 min-h-0">
          
          {/* LEFT: LIVE LOG STREAM */}
          <div className="col-span-5 flex flex-col bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agent Live Stream</span>
              {!isProcessing && <span className="text-[8px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-black">STABLE</span>}
            </div>
            <div className="flex-grow p-6 font-mono text-[11px] overflow-y-auto space-y-3 scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className="animate-fade-in opacity-80 hover:opacity-100 transition-opacity flex gap-3">
                  <span className="text-gold-500/50 shrink-0">
                    [{log.timestamp instanceof Date ? log.timestamp.toLocaleTimeString() : log.timestamp}]
                  </span>
                  <div className="flex flex-col">
                    <span className="text-blue-400 uppercase font-black tracking-tighter text-[9px]">{log.agent}:</span>
                    <span className="text-slate-300 leading-relaxed italic">{log.message}</span>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="animate-pulse text-gold-500 text-[10px] font-black mt-2">_ EXECUTING_EXTRACTION_LOGIC...</div>
              )}
            </div>
          </div>

          {/* RIGHT: CONTENT PANEL */}
          <div className="col-span-7 flex flex-col min-h-0">
            {!isExtractionDone ? (
              <div className="h-full flex flex-col justify-center p-12 bg-slate-900/40 border border-slate-800 rounded-3xl shadow-inner relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                  <div className="h-full bg-gold-500 animate-[loading_6s_linear_infinite]" style={{width: '30%'}} />
                </div>
                <span className="text-gold-500 font-black text-[10px] tracking-[0.3em] uppercase mb-6 block">Industry Intelligence Feed</span>
                <h2 className="text-3xl font-bold text-white mb-4 leading-tight uppercase italic">{INDUSTRY_NEWS[newsIndex].title}</h2>
                <p className="text-lg text-slate-400 font-medium leading-relaxed italic">{INDUSTRY_NEWS[newsIndex].detail}</p>
              </div>
            ) : (
              <div 
                onClick={() => setIsSnapshotOpen(true)}
                className="h-full group cursor-pointer flex flex-col items-center justify-center p-12 bg-gold-500/5 border border-gold-500/20 rounded-3xl transition-all hover:bg-gold-500/10 hover:border-gold-500/40 backdrop-blur-md"
              >
                <div className="w-16 h-16 rounded-full bg-gold-500 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-transform group-hover:scale-110">
                  <svg className="w-8 h-8 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Phase Extraction Successful</h2>
                <p className="text-slate-400 mb-6 text-center italic">Data validated. Processing duration locked at {totalElapsed}s.</p>
                <span className="text-gold-500 text-[10px] font-black uppercase tracking-widest border-b-2 border-gold-500/30 pb-1">Review Technical Snapshot →</span>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER: Global Navigation Fix */}
        <div className="flex justify-between items-center py-6 border-t border-slate-900 shrink-0">
          <button onClick={onBack} className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">← Abort Pipeline</button>
          
          {/* FIX 2 & 3: Forward Navigation Button */}
          {isExtractionDone && (
            <button 
              onClick={onViewResults}
              className="group relative px-12 py-4 bg-white text-slate-950 font-black uppercase text-[10px] tracking-widest rounded-xl overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] shadow-lg"
            >
              <div className="absolute inset-0 bg-gold-500/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              <span className="relative z-10">Initiate Deep Analysis →</span>
            </button>
          )}
        </div>
      </div>

      {/* SNAPSHOT OVERLAY: Improved Exit and Direct Forward Path */}
      {isSnapshotOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-3xl flex flex-col p-8">
          <div className="max-w-6xl mx-auto w-full flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Extraction <span className="text-gold-500">Fragment</span></h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Raw Telemetry & Extracted Metadata</p>
              </div>
              {/* EXIT STRATEGY: Clear 'X' button */}
              <button 
                onClick={() => setIsSnapshotOpen(false)} 
                className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-white hover:border-gold-500 hover:text-gold-500 transition-all flex items-center justify-center text-xl font-black"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-12 scrollbar-hide">
              <pre className="text-[11px] text-blue-300 bg-slate-950/80 p-8 rounded-3xl border border-gold-500/10 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                {JSON.stringify(rfp.agentOutputs?.parsedData, null, 4)}
              </pre>
            </div>

            {/* SNAPSHOT FOOTER ACTIONS: Direct Forward Path */}
            <div className="p-8 border-t border-slate-800 bg-slate-900/40 flex justify-center gap-6">
              <button 
                onClick={() => setIsSnapshotOpen(false)}
                className="px-10 py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all shadow-md"
              >
                Close Fragment
              </button>
              <button 
                onClick={() => { setIsSnapshotOpen(false); onViewResults(); }}
                className="bg-white text-slate-950 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold-500 transition-all shadow-lg flex items-center gap-2"
              >
                Proceed to Analysis →
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};