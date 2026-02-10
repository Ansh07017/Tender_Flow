import React, { useEffect, useState, useRef } from 'react';
import { Rfp, LogEntry } from '../../types';

interface ProcessingScreenProps {
  rfp: Rfp;
  logs: LogEntry[];
  onViewResults: () => void;
  onBack: () => void;
  // This should now represent the total time already spent in previous phases
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
  // 1. STATE: Start with time inherited from previous phases (e.g., Discovery)
  const [totalElapsed, setTotalElapsed] = useState(priorPhasesDuration);
  const [newsIndex, setNewsIndex] = useState(0);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  
  // Ref to track if the process is currently active on this screen
  const isProcessing = rfp.status !== 'Complete' && rfp.status !== 'Error';

  // 2. CUMULATIVE TIMER LOGIC
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isProcessing) {
      timer = setInterval(() => {
        setTotalElapsed(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isProcessing]); // Pauses automatically when status hits 'Complete'

  // 3. NEWS TICKER
  useEffect(() => {
    const newsTicker = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % INDUSTRY_NEWS.length);
    }, 6000);
    return () => clearInterval(newsTicker);
  }, []);

  const isExtractionDone = rfp.status === 'Complete';

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Background Glows (Matching Frontpage) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col p-8 max-w-7xl mx-auto">
        
        {/* Header Section with Pausable Cumulative Timer */}
        <div className="flex justify-between items-end mb-12 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
              ORCHESTRATING <span className="text-gold-500">ANALYSIS</span>
            </h1>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.2em]">
              Authorization: Ansh Pratap Singh // ID: {rfp.id}
            </p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] text-gold-500/60 uppercase font-black tracking-widest mb-1">
              {isProcessing ? "Cumulative Process Time" : "Total Time Taken"}
            </span>
            
            <span className={`text-5xl font-light tracking-tighter transition-colors ${isProcessing ? 'text-white' : 'text-gold-500'}`}>
              {totalElapsed}<span className="text-xl text-slate-600 ml-1">s</span>
            </span>
          </div>
        </div>

        {/* Main Command Center Grid */}
        <div className="grid grid-cols-12 gap-8 flex-grow overflow-hidden mb-8">
          
          {/* Left Column: Agent Thought Stream (The Log Terminal) */}
          <div className="col-span-5 flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agent Live Stream</span>
              {!isProcessing && <span className="text-[8px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded">STREAM_PAUSED</span>}
            </div>
            <div className="flex-grow p-6 font-mono text-xs overflow-y-auto space-y-4 scrollbar-hide">
             {logs.map((log, i) => (
  <div key={i} className="animate-fade-in opacity-80 hover:opacity-100 transition-opacity">
    {/* Convert Date to String using toLocaleTimeString() */}
    <span className="text-gold-500/50 mr-2">
      [{log.timestamp instanceof Date 
        ? log.timestamp.toLocaleTimeString() 
        : log.timestamp}]
    </span>
    <span className="text-blue-400 uppercase mr-2">{log.agent}:</span>
    <span className="text-slate-300">{log.message}</span>
  </div>
))}
              {isProcessing && (
                <div className="animate-pulse text-gold-500">_ EXECUTING_EXTRACTION_LOGIC...</div>
              )}
            </div>
          </div>

          {/* Right Column: Industry News (The 70% Wait Time Solution) */}
          <div className="col-span-7 relative">
            {!isExtractionDone ? (
              <div className="h-full flex flex-col justify-center p-12 bg-gradient-to-br from-slate-900/60 to-slate-950 border border-slate-800 rounded-2xl shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                  <div className="h-full bg-gold-500 animate-[loading_6s_linear_infinite]" style={{width: '30%'}} />
                </div>
                <span className="text-gold-500 font-black text-[10px] tracking-[0.3em] uppercase mb-6 block">Industry Intelligence Feed</span>
                <h2 className="text-3xl font-bold text-white mb-4 leading-tight">{INDUSTRY_NEWS[newsIndex].title}</h2>
                <p className="text-lg text-slate-400 font-light leading-relaxed mb-8">{INDUSTRY_NEWS[newsIndex].detail}</p>
              </div>
            ) : (
              /* Extraction Snapshot Preview */
              <div 
                onClick={() => setIsSnapshotOpen(true)}
                className="h-full group cursor-pointer flex flex-col items-center justify-center p-12 bg-gold-500/5 border border-gold-500/20 rounded-2xl transition-all hover:bg-gold-500/10 hover:border-gold-500/40"
              >
                <div className="w-20 h-20 rounded-full bg-gold-500 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(212,175,55,0.3)]">
                  <svg className="w-10 h-10 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">Phase Extraction Successful</h2>
                <p className="text-slate-400 mb-6 text-center">Data validated. Total processing time locked at {totalElapsed}s.</p>
                <span className="text-gold-500 text-[10px] font-black uppercase tracking-widest border-b border-gold-500/30 pb-1">Review Technical Snapshot →</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer: The Gateway to the next phase */}
        <div className="flex justify-between items-center py-6 border-t border-slate-900">
          <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">← Abort</button>
          
          {isExtractionDone && (
            <button 
              onClick={onViewResults}
              className="group relative px-12 py-4 bg-gold-500 text-slate-950 font-black uppercase tracking-widest rounded-xl overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              <span className="relative z-10">Initiate Analysis Results →</span>
            </button>
          )}
        </div>
      </div>

      {/* SNAPSHOT OVERLAY */}
      {isSnapshotOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl animate-fade-in flex flex-col">
          <div className="p-8 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-black text-white uppercase tracking-widest">RFP Raw Data Fragment</h2>
            <button onClick={() => setIsSnapshotOpen(false)} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 text-white">✕</button>
          </div>
          <div className="flex-grow overflow-y-auto p-12">
            <pre className="text-xs text-blue-300 bg-slate-900/50 p-8 rounded-2xl border border-blue-500/20 font-mono whitespace-pre-wrap">
              {JSON.stringify(rfp.agentOutputs?.parsedData, null, 2)}
            </pre>
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