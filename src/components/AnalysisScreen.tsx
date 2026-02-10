import React, { useState, useMemo } from 'react';
import { Rfp, LineItemTechnicalAnalysis, SKU } from '../../types';
import { ImpactSummary } from './ImpactSummary';
import { FinalRecommendation } from './FinalRecommendation';

/* =====================================================
    LEGACY FEATURE COMPONENTS (Restored & Re-styled)
   ===================================================== */

const CertificationBadge: React.FC<{ cert: string }> = ({ cert }) => (
  <span className="bg-gold-500/10 text-gold-500 text-[9px] px-2 py-0.5 rounded-full border border-gold-500/20 font-black uppercase tracking-tighter">
    {cert}
  </span>
);

const getRiskIcon = (level: string) => {
  if (level === 'High') return <span className="text-red-500 animate-pulse text-xl">●</span>;
  if (level === 'Medium') return <span className="text-gold-500 text-xl">●</span>;
  return <span className="text-blue-500 text-xl">●</span>;
};

const AgentSection: React.FC<{ title: string; agentName: string; children: React.ReactNode }> = ({ title, agentName, children }) => (
  <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-xl mb-6 relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-1 h-full bg-gold-500/20 group-hover:bg-gold-500 transition-colors" />
    <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
      <div>
        <h3 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h3>
        <p className="text-[10px] font-black text-gold-500/60 uppercase tracking-[0.2em] mt-1">
          Authorized Agent: {agentName}
        </p>
      </div>
    </div>
    <div className="space-y-4 text-sm text-slate-300">{children}</div>
  </div>
);

/* =====================================================
    MAIN ANALYSIS SCREEN
   ===================================================== */

export const AnalysisScreen: React.FC<{ rfp: Rfp; onBack: () => void }> = ({ rfp, onBack }) => {
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});

  // 1. DEFENSIVE DATA GUARD: Resolves ts(18048)
  const outputs = rfp.agentOutputs;
  const techAnalysis = outputs?.technicalAnalysis;
  const pricingData = outputs?.pricing;
  const isBidClosed = outputs?.parsedData?.metadata?.isBidClosed === true;

  const handlePriceChange = (itemName: string, value: string) => {
    setManualPrices(prev => ({ ...prev, [itemName]: parseFloat(value) || 0 }));
  };

  // 2. CUMULATIVE VALIDATION LOGIC
  const allItemsValidated = useMemo(() => {
    return techAnalysis?.itemAnalyses.every(a => 
      a.status === 'COMPLETE' || (manualPrices[a.rfpLineItem.name] > 0)
    ) ?? false;
  }, [techAnalysis, manualPrices]);

  if (!outputs || !techAnalysis) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
        <p className="text-gold-500 font-mono text-xs uppercase tracking-widest">Compiling Technical Snapshot...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 overflow-hidden flex flex-col font-sans">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* 3. HEADER SECTION */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6 relative z-10">
        <div>
          <button onClick={onBack} className="text-gold-500 text-xs font-black uppercase tracking-widest mb-2 hover:opacity-70 transition-all flex items-center gap-2">
            <span>←</span> Return to Inventory Control
          </button>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
            Master Analysis <span className="text-gold-500">Workspace</span>
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">GeM Reference</p>
          <p className="text-lg font-mono text-white/80">{rfp.id}</p>
        </div>
      </div>

      {/* 4. SCROLLABLE CONTENT AREA */}
      <div className="flex-grow overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-800 relative z-10">
        
        {/* Impact Summary Integration */}
        <ImpactSummary rfp={rfp} />

        <div className="grid grid-cols-12 gap-8 mt-8">
          
          {/* LEFT: TECHNICAL GATE (High-Touch Validation) */}
          <div className="col-span-12 lg:col-span-8">
            <AgentSection title="Technical Compliance Audit" agentName="TECH_MATCH_BOT_V2">
              {techAnalysis.itemAnalyses.map((analysis, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 mb-4 relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-white font-bold text-lg mb-2">{analysis.rfpLineItem.name}</h4>
                      <div className="flex gap-2">
                        {analysis.rfpLineItem.requiredStandards?.map(s => <CertificationBadge key={s} cert={s} />)}
                      </div>
                    </div>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border ${
                      analysis.status === 'COMPLETE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gold-500/10 text-gold-500 border-gold-500/20'
                    }`}>
                      {analysis.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    {/* IS Standard Compliance List */}
                    <div className="space-y-2">
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-3">Compliance Matrix</p>
                      {analysis.complianceChecks.map((check, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px] p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                          <span className="text-slate-400">{check.standard}</span>
                          <span className={`font-black uppercase text-[9px] ${check.verified ? 'text-green-500' : 'text-slate-600'}`}>
                            {check.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Pricing Intervention */}
                    <div className="space-y-2">
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-3">Procurement Price</p>
                      {analysis.status === 'COMPLETE' && analysis.selectedSku ? (
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                          <p className="text-xs font-bold text-white mb-1">{analysis.selectedSku.productName}</p>
                          <p className="text-[10px] text-gold-500 font-mono">₹{analysis.selectedSku.unitSalesPrice.toLocaleString()} (Stock)</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-gold-500/5 border border-gold-500/20 rounded-xl">
                          <p className="text-[9px] text-gold-500 font-black mb-3 uppercase tracking-widest">Manual Entry Required</p>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-600 text-xs">₹</span>
                            <input 
                              type="number" 
                              placeholder="Set Unit Price" 
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 pl-7 text-white text-xs outline-none focus:border-gold-500 transition-all"
                              onChange={(e) => handlePriceChange(analysis.rfpLineItem.name, e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </AgentSection>
          </div>

          {/* RIGHT: FINANCIALS & RISK (Legacy Feature Restoration) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <AgentSection title="Project Financials" agentName="FINANCIAL_ORCHESTRATOR">
              <div className="space-y-3">
                {pricingData && Object.entries(pricingData.pricing).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800 group hover:border-gold-500/30 transition-all">
                    <span className="text-xs text-slate-500 font-medium">{key}</span>
                    <span className="text-white font-mono font-bold">₹{value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </AgentSection>

            {/* Strategic Risk Guard - RESTORED FEATURE */}
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 relative">
              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-6">Strategic Risk Assessment</h3>
              <div className="space-y-4">
                {pricingData?.riskEntries.map((risk, i) => (
                  <div key={i} className="flex gap-4 items-start bg-slate-950/80 p-4 rounded-xl border border-slate-800/50">
                    <span className="mt-0.5">{getRiskIcon(risk.riskLevel)}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-200 uppercase tracking-tighter">{risk.category}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{risk.statement}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. FINAL RECOMMENDATION ENGINE */}
        <div className="mt-8">
          <FinalRecommendation rfp={rfp} />
        </div>
      </div>

      {/* 6. AUTHORIZATION FOOTER */}
      <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center">
        <button
          disabled={!allItemsValidated || isBidClosed}
          className={`group relative px-20 py-4 rounded-xl font-black uppercase tracking-[0.4em] transition-all overflow-hidden ${
            allItemsValidated && !isBidClosed
              ? "bg-gold-500 text-slate-950 shadow-[0_0_50px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95" 
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          <span className="relative z-10 flex items-center gap-3">
            {isBidClosed ? "Bid Window Inactive" : "Authorize Final Bid"}
          </span>
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </button>
        {isBidClosed && (
          <p className="text-red-500 text-[10px] mt-4 font-black uppercase tracking-[0.2em] animate-pulse">
            Locked by GeM Timeline Management
          </p>
        )}
      </div>
    </div>
  );
};