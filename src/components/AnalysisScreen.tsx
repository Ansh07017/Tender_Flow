import React, { useState, useMemo } from 'react';
import { Rfp, LineItemTechnicalAnalysis } from '../../types';

interface AnalysisScreenProps {
  rfp: Rfp;
  onBack: () => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ rfp, onBack }) => {
  // 1. DYNAMIC AGENT OUTPUT EXTRACTION
  const technicalResults = rfp.agentOutputs?.technicalAnalysis?.itemAnalyses || [];
  
  const financialResults = rfp.agentOutputs?.pricing || { 
    pricing: {}, 
    summary: { 
      matchStatus: 'NONE', 
      confidenceScore: 0, 
      requiresManualInput: true, 
      recommendation: '' 
    }, 
    riskEntries: [] 
  };

  // 2. HUMAN-IN-THE-LOOP STATE
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [editingItem, setEditingItem] = useState<any | null>(null);

const adjustedFinalBid = useMemo(() => {
  const baseValue = (financialResults.summary as any)?.finalBidValue || 0;
  const overrideTotal = Object.entries(manualOverrides).reduce((acc, [name, humanPrice]) => {
    const originalAnalysis = technicalResults.find((t: any) => t.rfpLineItem.name === name);
    const agentPrice = originalAnalysis?.selectedSku?.unitSalesPrice || 0;
    const quantity = originalAnalysis?.rfpLineItem.quantity || 1;
    return acc + (humanPrice - (agentPrice * quantity));
  }, 0);

  return Math.max(0, baseValue + overrideTotal);
}, [financialResults, manualOverrides, technicalResults]);

  const handleSaveOverride = (itemName: string, unitPrice: number, quantity: number) => {
    const totalItemPrice = unitPrice * quantity;
    setManualOverrides(prev => ({
      ...prev,
      [itemName]: totalItemPrice
    }));
    setEditingItem(null);
  };
console.log("RFP Agent Outputs:", rfp.agentOutputs);
  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* --- HEADER: LIVE BID AUTHORIZATION HUB --- */}
      <div className="shrink-0 flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Bid <span className="text-gold-500">Analysis</span> & Review
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] italic">
            Project: {rfp.organisation} // Agent Match Confidence: {(financialResults.summary as any)?.confidenceScore}%
          </p>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-900 border border-slate-800 px-6 py-2 rounded-2xl text-right transition-all">
              <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest">Adjusted Final Bid [H-I-L]</span>
              <span className="text-2xl font-black text-gold-500">₹{adjustedFinalBid.toLocaleString()}</span>
           </div>
           <button className="bg-white text-slate-950 px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-gold-500 transition-all">Authorize Bid Submission</button>
        </div>
      </div>

      <div className="flex-grow grid grid-cols-12 gap-8 overflow-hidden min-h-0 pb-4">
        
        {/* --- LEFT: TECHNICAL AGENT AFTERMATH AUDIT --- */}
        <div className="col-span-8 flex flex-col bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Technical Readiness Audit</span>
            <div className="flex gap-2">
               <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black">STABLE_INVENTORY</span>
               <span className="text-[8px] bg-gold-500/10 text-gold-500 px-2 py-0.5 rounded font-black">PARTIAL_MATCH_DETECTED</span>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-hide">
  {/* Check if results exist; if not, show the fallback UI */}
  {technicalResults.length > 0 ? (
    technicalResults.map((analysis: any, idx: number) => (
      <div key={idx} className={`bg-slate-950/50 border p-5 rounded-2xl transition-all duration-300 ${
        manualOverrides[analysis.rfpLineItem.name] ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 hover:border-gold-500/30'
      }`}>
        <div className="flex justify-between items-start mb-4">
  <div className="space-y-1">
    <div className="flex items-center gap-3">
      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
        analysis.status === 'COMPLETE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gold-500/10 text-gold-500'
      }`}>
        {analysis.status} MATCH
      </span>
      <h4 className="font-bold text-white text-sm uppercase">{analysis.rfpLineItem.name}</h4>
    </div>
    {/* ADD: Display the required count clearly */}
    <p className="text-[10px] text-slate-500 font-bold uppercase">Required Qty: {analysis.rfpLineItem.quantity}</p>
  </div>
  <button 
    onClick={() => setEditingItem(analysis)}
    className="p-2 rounded-lg border bg-slate-900 border-slate-800 text-slate-500 hover:text-gold-500 transition-all"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  </button>
</div>

        {analysis.selectedSku ? (
  <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
    <div className="text-2xl animate-pulse">📦</div>
    <div className="flex-grow">
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{analysis.selectedSku.productName}</p>
      <p className="text-[9px] text-slate-500 italic mt-1 font-bold">
        JALANDHAR STOCK: {analysis.selectedSku.availableQuantity} // 
        <span className="text-gold-500 ml-1">UNIT PRICE: ₹{analysis.selectedSku.unitSalesPrice.toLocaleString()}</span>
      </p>
    </div>
  </div>
        ) : (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-400 uppercase tracking-widest text-center italic">
            ⚠ GeM Search Variance Detected: Manual Sourcing Required
          </div>
        )}
      </div>
    ))
  ) : (
    /* FALLBACK: Rendered when technicalResults is empty */
    <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-50">
      <div className="text-4xl mb-4 animate-bounce">🔍</div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        No Matching Inventory Found
      </p>
      <p className="text-[9px] text-slate-600 italic mt-2 leading-relaxed">
        The Agent found items on GeM (e.g. Chilli Powder) that do not match <br/>
        your Jalandhar Hub stock. Use Manual Override to fix this.
      </p>
    </div>
  )}
</div>
        </div>

        {/* --- RIGHT: COMMERCIAL SUMMARY & RISK REGISTRY --- */}
        <div className="col-span-4 flex flex-col gap-6 overflow-hidden">
          
          {/* PRICING BREAKDOWN */}
         {/* PRICING & STRATEGIC SUMMARY */}
<div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shrink-0">
  <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Commercial Summary</h3>
    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
      financialResults.summary?.matchStatus === 'COMPLETE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gold-500/10 text-gold-500'
    }`}>
      {financialResults.summary?.matchStatus} ANALYSIS
    </span>
  </div>

  {/* NEW: Strategic Recommendation Text */}
  <div className="mb-6 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Agent Recommendation</p>
    <p className="text-xs font-bold text-white italic leading-relaxed">
      "{financialResults.summary?.recommendation || 'Analyzing procurement viability...'}"
    </p>
  </div>

  <div className="space-y-4">
    {Object.entries((financialResults.pricing || {})).map(([label, value]) => (
      <div key={label} className="flex justify-between items-center">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{label}</span>
        <span className={`font-mono text-sm font-bold ${label.includes('Final') ? 'text-gold-500' : 'text-white'}`}>
          ₹{Number(value).toLocaleString()}
        </span>
      </div>
    ))}
  </div>
</div>

          {/* RISK REGISTRY */}
          <div className="flex-grow bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-md overflow-hidden flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2 italic">Active Risk Registry</h3>
            <div className="flex-grow overflow-y-auto space-y-3 scrollbar-hide">
              {financialResults.riskEntries?.map((risk: any, i: number) => (
                <div key={i} className={`p-3 border rounded-xl flex gap-3 transition-colors ${risk.riskLevel === 'High' ? 'bg-red-500/5 border-red-500/20' : 'bg-gold-500/5 border-gold-500/20'}`}>
                  <span className={`w-1 h-auto rounded-full ${risk.riskLevel === 'High' ? 'bg-red-500' : 'bg-gold-500'} shrink-0`} />
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{risk.category}</p>
                    <p className="text-[10px] font-bold text-slate-300 leading-tight italic">{risk.statement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onBack} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all shrink-0">← Back to Process Terminal</button>
        </div>
      </div>

      {/* --- HUMAN-IN-THE-LOOP OVERLAY --- */}
      {editingItem && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden">
             {/* Background Decoration */}
            <div className="absolute -right-10 -bottom-10 text-[8rem] text-gold-500/5 font-black uppercase italic pointer-events-none select-none">REVISE</div>
            
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2 relative z-10">
              Human <span className="text-gold-500">Intervention</span>
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-8 leading-relaxed relative z-10">
              Technical Matching Deficiency Detected. Please provide authorized procurement price for: <br/>
              <span className="text-white font-bold">{editingItem.rfpLineItem.name}</span>
            </p>
            
            <div className="space-y-3 mb-8 relative z-10">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Authorized Unit Rate (INR)</label>
               <input 
                type="number" 
                autoFocus
                placeholder="0.00"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-5 text-xl text-white outline-none focus:border-gold-500 font-mono transition-all shadow-inner"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveOverride(editingItem.rfpLineItem.name, Number(e.currentTarget.value), editingItem.rfpLineItem.quantity);
                  }
                }}
              />
               <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-2 ml-1">
                 Quantity: {editingItem.rfpLineItem.quantity} // Dynamic Recalculation Enabled
               </p>
            </div>
            
            <div className="flex gap-4 relative z-10">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all">Cancel</button>
              <button 
                onClick={() => {
                   const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                   handleSaveOverride(editingItem.rfpLineItem.name, Number(input.value), editingItem.rfpLineItem.quantity);
                }} 
                className="flex-1 py-4 bg-gold-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:bg-white transition-all"
              >
                Apply Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};