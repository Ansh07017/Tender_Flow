import *  as React from 'react';
import { useState, useEffect } from 'react';
import { RfpInput } from './RfpInput'; 
import { Tender} from '../../types';


interface FrontPageProps {
  onNavigateToDiscovery: () => void;
  onProcessRfp: (data: { source: 'URL' | 'File'; content: string; fileName?: string; }) => void;
  tenders: Tender[];
  isScanning: boolean;           // Add this to fix the ts(2322) error
  onProcessDiscovery: (url: string) => void;
  onRefreshDiscovery: () => void;
}

interface AgentNodeProps {
  icon: string;
  label: string;
  status: string;
  isActive: boolean;
  isCompleted: boolean;
}

export const FrontPage: React.FC<FrontPageProps> = ({
  onNavigateToDiscovery,
  onRefreshDiscovery,
  onProcessRfp,
  tenders = [],
  isScanning,        // Use the live state from App.tsx
  onProcessDiscovery // Use the real ingestion function
  
}) => {

  const [activeStep, setActiveStep] = useState(0);
  const totalSteps = 6;

  // Orchestration Sequence: Advances the "Glow" every 3 seconds
  useEffect(() => {
  if (isScanning) {
    setActiveStep(0);
    return;
  }

  // Once scanning is done, start the loop from Step 1 (Review)
  const interval = setInterval(() => {
    setActiveStep((prev) => (prev < totalSteps ? prev + 1 : 1));
  }, 3000);
  
  return () => clearInterval(interval);
}, [isScanning]);
  const chartData = [
    { name: 'SEARCHED', val: 42, color: '#1E40AF' },
    { name: 'ANALYZED', val: 19, color: '#7C3AED' },  
    { name: 'BIDDED', val: 9, color: '#D4AF37' },    
    { name: 'SUCCESS', val: 6, color: '#10B981' },    
  ];

  return (
    <div className="w-full h-[calc(100vh-100px)] flex gap-4 overflow-hidden text-slate-50">
      
      {/* --- LEFT & CENTER OPERATIONS HUB (80% Area) --- */}
      <div className="flex-[8.5] flex flex-col gap-4 h-full">
        
        {/* TOP: EXECUTIVE HEADER & KPIS */}
        <div className="h-[20%] bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex items-center justify-between backdrop-blur-xl">
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gold-500 uppercase">
              Bidding <span className="text-gold-500">Dashboard</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed max-w-xs uppercase tracking-widest">
              Autonomous B2B Procurement Intelligence. Streamlining Discovery to Response.
            </p>
          </div>
          
          <div className="flex gap-4">
            {[
              { label: 'Success Rate', val: '67%', color: 'text-emerald-400' },
              { label: 'Bid Rate', val: '48%', color: 'text-blue-400' },
              { label: 'Avg Match', val: '83%', color: 'text-gold-500' }
            ].map((kpi, i) => (
              <div key={i} className="bg-slate-950/50 border border-slate-800 px-6 py-2 rounded-2xl text-center min-w-[120px]">
                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">{kpi.label}</div>
                <div className={`text-xl font-black ${kpi.color}`}>{kpi.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* --- MIDDLE SECTION: URGENCY HEATMAP (65%) & CHART (35%) --- */}
<div className="h-[70%] flex gap-4">
  
  {/* 1. BID URGENCY HEATMAP (65%) */}
<div className="flex-[6.5] bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col">
  <div className="flex justify-between items-center mb-4">
    <div className="flex items-center gap-4">
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isScanning ? 'bg-gold-400' : 'bg-red-400'} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isScanning ? 'bg-gold-500' : 'bg-red-500'}`}></span>
      </span>
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
        {isScanning ? "Agentic Search in Progress..." : "High-Urgency Discovery"}
      </h3>
    </div>
    <button 
      onClick={onRefreshDiscovery}
      disabled={isScanning}
      className={`text-[9px] font-black px-2 py-1 rounded border border-slate-800 transition-all
        ${isScanning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 hover:text-gold-500 text-slate-500'}`}
    >
      {isScanning ? 'SCANNING...' : '↻ REFRESH SCAN'}
    </button>
  </div>
    <span className="text-[9px] font-mono text-gold-500/50 uppercase">
      {isScanning ? "Scanning GeM Portal..." : `Live Matches: ${tenders.length}`}
    </span>
  </div>

  <div className="flex-1 flex flex-col gap-3">
    {/* Map the top 3 most urgent tenders found by the GeMWorker */}
    {(isScanning ? [1, 2, 3, 4] : tenders.slice(0, 4)).map((bid, i) => (
      <div 
        key={i} 
        className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 
          ${isScanning 
            ? 'border-slate-800 bg-slate-800/20 animate-pulse' 
            : 'border-red-500/20 bg-red-500/5 hover:scale-[1.01] group'
          }`}
      >
        {isScanning ? (
          <div className="flex items-center justify-between w-full">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
              <div className="h-2 w-32 bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-slate-800 rounded-lg animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400">{(bid as Tender).id}</span>
                <span className="ml-3 px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md text-[7px] font-black uppercase tracking-widest">
                  Sales Agent: Due ≤ 90 Days
                </span>
                <span className="text-sm font-bold text-white group-hover:text-gold-400 transition-colors uppercase italic">
                  {(bid as Tender).title}
                </span>
              </div>
              <div className="flex gap-4 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                <span>Category: {(bid as Tender).category}</span>
                <span className="text-red-400 font-black">Ends In: {(bid as Tender).endDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Match Score</div>
                <div className="text-lg font-black text-white">{(bid as Tender).matchScore}%</div>
              </div>
              <button 
                onClick={() => onProcessDiscovery((bid as Tender).url)} // Passes real GeM URL to App.tsx pipeline
                className="bg-white/10 border border-white/5 hover:bg-gold-500 hover:text-slate-950 px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg"
              >
                Analyze
              </button>
            </div>
          </>
        )}
      </div>
    ))}
  </div>
</div>

{/* 2. DIRECT INGESTION HUB (Right - 40%) */}
  <div className="flex-[4] bg-slate-900/40 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl flex flex-col">
    {/* Background Watermark */}
    <div className="absolute -right-4 -bottom-4 text-[6rem] text-blue-500/5 font-black pointer-events-none italic select-none">
      INGEST
    </div>

    <div className="relative z-10 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-black uppercase italic text-white tracking-tighter">Direct <span className="text-gold-500">Parser</span></h2>
          <p className="text-slate-500 text-[8px] uppercase tracking-[0.2em] font-bold mt-1">Manual Document Ingestion</p>
        </div>
        <button 
          onClick={onNavigateToDiscovery}
          className="text-[8px] font-black text-gold-500/60 hover:text-gold-500 border border-gold-500/20 px-2 py-1 rounded-lg uppercase tracking-widest transition-all"
        >
          Discover →
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-center">
        {/* The RfpInput component is now the centerpiece of this block */}
        <div className="bg-slate-950/40 rounded-2xl p-2 border border-slate-800/50 shadow-inner">
          <RfpInput onSubmit={onProcessRfp} />
        </div>
      </div>
    </div>
  </div>
</div>

</div>
       {/* --- RIGHT HUD: VERTICAL AGENTIC ORCHESTRATION --- */}
<div className="flex-[1.5] bg-slate-900/20 border border-slate-800 rounded-3xl p-8 relative flex flex-col shadow-2xl overflow-hidden min-h-full">
  <div className="text-[12px] font-white uppercase tracking-widest text-center mb-8 border-b border-slate-800 pb-4 shrink-0">
    Orchestration Pipeline
  </div>
  
  <div className="flex-1 flex flex-col justify-between py-4 relative">

    <AgentNode icon="📡" label="Sales" status="Scanning Portals" isActive={activeStep === 0} isCompleted={activeStep > 0} />
    <AgentNode icon="👤" label="Review" status="Filtering Bids" isActive={activeStep === 1} isCompleted={activeStep > 1} />
    <AgentNode icon="⚙️" label="Technical" status="SKU Matching" isActive={activeStep === 2} isCompleted={activeStep > 2} />
    <AgentNode icon="💰" label="Financial" status="Pricing Logic" isActive={activeStep === 3} isCompleted={activeStep > 3} />
    <AgentNode icon="🤖" label="Master" status="Strategic Planning" isActive={activeStep === 4} isCompleted={activeStep > 4} />
    <AgentNode icon="👤" label="Feedback" status="Finalizing Report" isActive={activeStep === 5} isCompleted={activeStep > 5} />
      <AgentNode icon="🏆" label="Win" status="Bid Authorized" isActive={activeStep === 6} isCompleted={activeStep > 6} />
  </div>

  {/* HIGH-VISIBILITY ACTION BUTTON */}
  {activeStep >= 6 && (
    <div className="mt-8 animate-in zoom-in-95 fade-in slide-in-from-bottom-2 duration-700">
      <button 
        onClick={onNavigateToDiscovery} 
        className="w-full bg-[#FFD700] text-slate-950 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] 
                   hover:bg-white hover:scale-[1.02] active:scale-95
                   shadow-[0_0_30px_rgba(255,215,0,0.5)] border border-white/40
                   transition-all duration-300 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10 flex items-center justify-center gap-2">
          Initiate Final Bid <span className="animate-bounce">→</span>
        </span>
      </button>
      <p className="text-center text-[8px] text-gold-500/60 font-black uppercase mt-3 tracking-widest animate-pulse">
        Master AI Authorization Confirmed
      </p>
    </div>
  )}
</div>
    </div>
  );
};

const AgentNode: React.FC<AgentNodeProps> = ({ icon, label, status, isActive, isCompleted }) => (
  <div className={`z-10 flex items-center gap-6 w-full transition-all duration-500 ${isActive ? 'translate-x-4 scale-110' : 'opacity-30'}`}>
    <div className={`w-14 h-13 rounded-2xl flex items-center justify-center border-2 transition-all shrink-0 ${
      isActive ? 'bg-slate-900 border-gold-500 shadow-[0_0_20px_#D4AF37]' : 
      isCompleted ? 'bg-gold-500 border-gold-500' : 'bg-slate-950 border-slate-800'
    }`}>
      {isCompleted && !isActive ? <span className="font-white text-2xl">✓</span> : <span className="text-2xl">{icon}</span>}
    </div>
    
    <div className="flex flex-col justify-center">
      <div className={`text-sm font-black uppercase tracking-widest ${isActive ? 'text-gold-500' : 'text-white'}`}>{label}</div>
      <div className="text-[10px] text-slate-500 uppercase font-bold leading-none mt-1">{status}</div>
    </div>
  </div>
);