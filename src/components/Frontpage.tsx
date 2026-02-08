import React, { useState, useEffect } from 'react';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, XAxis,LabelList, } from 'recharts';
import { Tender } from '../../types';


interface FrontPageProps {
  onNavigateToDiscovery: () => void;
  onDirectUpload: () => void;
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
  onDirectUpload,
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
              TenderFlow
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
<div className="h-[50%] flex gap-4">
  
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
    {(isScanning ? [1, 2, 3] : tenders.slice(0, 3)).map((bid, i) => (
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
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                  ● VERIFIED
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

{/* 2. PIPELINE CHART (35%) - Labeled & High-Visibility */}
<div className="flex-[3.5] bg-slate-900/20 border border-slate-800 rounded-3xl p-6 flex flex-col">
  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 text-center">System Velocity</h3>
  <div className="flex-1">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 'bold'}} 
          interval={0}
        />
        <Tooltip 
          cursor={{fill: 'rgba(255,255,255,0.03)'}} 
          contentStyle={{backgroundColor: '#0f172a', border: '1px solid #D4AF37', borderRadius: '12px'}} 
          itemStyle={{color: '#f8fafc', fontSize: '13px', fontWeight: 'bold'}} 
        />
        <Bar dataKey="val" radius={[6, 6, 0, 0]} barSize={35} isAnimationActive={false}>
          {/* LabelList puts the numbers directly on the bars */}
          <LabelList 
            dataKey="val" 
            position="top" 
            fill="#f8fafc" 
            fontSize={13} 
            fontWeight="bold"
            offset={10}
          />
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
  </div>
</div>

        {/* BOTTOM: STRATEGIC INGESTION HUB */}
        <div className="h-[30%] grid grid-cols-2 gap-4">
          <div 
            onClick={onNavigateToDiscovery} 
            className="group cursor-pointer bg-slate-900/60 border border-gold-500/20 rounded-3xl p-8 transition-all hover:bg-blue-900/20 relative overflow-hidden flex flex-col justify-center"
          >
            <div className="text-2xl mb-2">📡</div>
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Automated Discovery</h2>
            <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-bold">Portal Scan Agent (GeM)</p>
            <div className="absolute -right-6 -bottom-6 text-[8rem] text-blue-500/5 font-black group-hover:text-blue-500/10 transition-all">SCAN</div>
          </div>

          <div 
            onClick={onDirectUpload} 
            className="group cursor-pointer bg-slate-900/60 border border-gold-500/20 rounded-3xl p-8 transition-all hover:bg-blue-900/20 relative overflow-hidden flex flex-col justify-center"
          >
            <div className="text-2xl mb-2">📄</div>
            <h2 className="text-2xl font-black uppercase italic text-white-500 tracking-tighter">Direct Ingestion</h2>
            <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-bold">URL / PDF Deep Parser</p>
            <div className="absolute -right-6 -bottom-6 text-[8rem] text-blue-500/5 font-black group-hover:text-blue-500/10 transition-all">DEEP</div>
          </div>
        </div>
      </div>

       {/* --- RIGHT HUD: VERTICAL AGENTIC ORCHESTRATION --- */}
<div className="flex-[1.5] bg-slate-900/20 border border-slate-800 rounded-3xl p-8 relative flex flex-col shadow-2xl overflow-hidden min-h-full">
  <div className="text-[13px] font-white uppercase tracking-widest text-center mb-8 border-b border-slate-800 pb-4 shrink-0">
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
        className="w-full bg-[#FFD700] text-slate-950 py-4 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] 
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