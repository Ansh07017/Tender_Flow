import React, { useState, useMemo } from 'react';
import { Rfp } from '../../types';

interface AnalysisScreenProps {
  rfp: Rfp;
  onBack: () => void; // This will now serve as "Cancel/Return"
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ rfp, onBack }) => {
  // 1. EXTRACT INITIAL DATA
  const technicalResults = rfp.agentOutputs?.technicalAnalysis?.itemAnalyses || [];
  const financialAgentRaw = rfp.agentOutputs?.pricing || { pricing: {}, summary: {}, riskEntries: [] };

  // 2. STATE FOR USER INPUTS (Logistics & Manual Overrides)
  // We initialize these with defaults, but allow the user to change them instantly.
  const [logisticsParams, setLogisticsParams] = useState({
    kms: 400,          // Default, or could come from config
    rate: 55,          // Default rate per KM
    bufferPercent: 10
  });
  const [profitMargin, setProfitMargin] = useState(15);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // 3. THE "REAL-TIME" CALCULATION ENGINE
  // Instead of relying on the static agent output, we recalculate everything here
  // so that when you change a price, the GeM Fees and Taxes update instantly.
  const liveCalculations = useMemo(() => {
    let totalMaterialBase = 0;
    let totalGst = 0;

    // A. Re-sum all line items (Agent Match vs. Manual Override)
    technicalResults.forEach((analysis: any) => {
      const itemName = analysis.rfpLineItem.name;
      const qty = analysis.rfpLineItem.quantity;
      
      let unitPrice = 0;
      let gstRate = 18; // Default fallback

      if (manualOverrides[itemName] !== undefined) {
        // Use Human Input
        unitPrice = manualOverrides[itemName];
        gstRate = analysis.selectedSku?.gstRate || 18;
      } else if (analysis.selectedSku) {
        // Use Agent Match
        unitPrice = analysis.selectedSku.unitSalesPrice;
        gstRate = analysis.selectedSku.gstRate;
      }

      totalMaterialBase += (unitPrice * qty);
      totalGst += ((unitPrice * qty) * (gstRate / 100));
    });

    // B. Calculate Logistics (User Input * Rate * Buffer)
    const baseLogistics = logisticsParams.kms * logisticsParams.rate;
    const logisticsWithBuffer = baseLogistics * (1 + (logisticsParams.bufferPercent / 100));

    // C. Calculate GeM Brokerage (Sept '24 Logic)
    let gemFee = 0;
    if (totalMaterialBase > 1000000 && totalMaterialBase <= 100000000) {
      gemFee = totalMaterialBase * 0.0030;
    } else if (totalMaterialBase > 100000000) {
      gemFee = 300000;
    }

    // D. Security Deposits
    const epbg = totalMaterialBase * 0.03; // Default 3%
    const emd = totalMaterialBase * 0.02;  // Default 2%'
    const profitAmount = (totalMaterialBase+totalGst+logisticsWithBuffer) * (profitMargin / 100);

    return {
      materialBase: totalMaterialBase,
      gst: totalGst,
      logistics: logisticsWithBuffer,
      gemFee: gemFee,
      epbg: epbg,
      emd: emd,
      profit: profitAmount,
      finalTotal: totalMaterialBase + totalGst + logisticsWithBuffer + gemFee + epbg + emd + profitAmount
    };
  }, [technicalResults, manualOverrides, logisticsParams]);

  const handleSaveOverride = (itemName: string, unitPrice: number) => {
    setManualOverrides(prev => ({ ...prev, [itemName]: unitPrice }));
    setEditingItem(null);
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* --- HEADER --- */}
      <div className="shrink-0 flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Bid <span className="text-gold-500">Analysis</span> Console
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Client: {rfp.organisation} // Status: {rfp.status}
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
      {/* NEW: Display Consignee */}
      Client: {rfp.organisation} // Dest: <span className="text-white">{rfp.agentOutputs?.parsedData?.consignee || "Unknown Location"}</span>
    </p>
        </div>
        <div className="flex gap-4 items-center">
           <div className="bg-slate-900 border border-slate-800 px-6 py-2 rounded-2xl text-right">
              <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest italic">Live Adjusted Bid</span>
              <span className="text-2xl font-black text-gold-500">₹{Math.round(liveCalculations.finalTotal).toLocaleString()}</span>
           </div>
           
           {/* CANCEL BID BUTTON */}
           <button 
             onClick={onBack}
             className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
           >
             Cancel Bid
           </button>
           
           <button className="bg-white text-slate-950 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold-500 transition-all shadow-lg">
             Submit Final Quote
           </button>
        </div>
      </div>

      <div className="flex-grow grid grid-cols-12 gap-6 overflow-hidden min-h-0 pb-2">
        
        {/* --- LEFT: INVENTORY MAPPING (EDITABLE) --- */}
        <div className="col-span-7 flex flex-col bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Line Items</span>
          </div>
          
          <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {technicalResults.map((analysis: any, idx: number) => {
              const isOverridden = manualOverrides[analysis.rfpLineItem.name] !== undefined;
              const currentPrice = isOverridden ? manualOverrides[analysis.rfpLineItem.name] : (analysis.selectedSku?.unitSalesPrice || 0);

              return (
                <div key={idx} className={`border p-5 rounded-2xl transition-all ${isOverridden ? 'bg-gold-500/5 border-gold-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
                  {/* Header & Edit Button */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm uppercase">{analysis.rfpLineItem.name}</h4>
                      <div className="flex gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <span>Required: {analysis.rfpLineItem.quantity} Units</span>
                        {isOverridden && <span className="text-gold-500 ml-2">⚠️ MANUAL PRICE ACTIVE</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingItem(analysis)} 
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-[9px] font-bold text-slate-300 uppercase hover:bg-white hover:text-slate-900 transition-all"
                    >
                      {isOverridden ? 'Edit Override' : 'Disqualify / Edit'}
                    </button>
                  </div>

                  {/* Stock & Price Logic */}
                  <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                     <div className="flex items-center gap-3">
                       <span className="text-xl">📦</span>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{analysis.selectedSku?.productName || 'No Match'}</p>
                         <p className="text-[9px] text-slate-500 font-bold uppercase">Stock: {analysis.selectedSku?.availableQuantity || 0}</p>
                       </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] text-slate-500 font-black uppercase">Unit Rate</p>
                        <p className={`font-mono text-sm font-bold ${isOverridden ? 'text-gold-500' : 'text-emerald-400'}`}>
                          ₹{currentPrice.toLocaleString()}
                        </p>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- RIGHT: DYNAMIC FINANCIAL ENGINE (INPUTS ENABLED) --- */}
        <div className="col-span-5 flex flex-col bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logistics & Financials</span>
          </div>

          <div className="flex-grow p-6 space-y-6 overflow-y-auto scrollbar-hide">
            
            {/* 1. EDITABLE LOGISTICS CARD */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner">
               <p className="text-[9px] text-slate-500 font-black uppercase mb-3">Logistics Configuration (User Input)</p>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Avg Distance (KM)</label>
                    <input 
                      type="number" 
                      value={logisticsParams.kms}
                      onChange={(e) => setLogisticsParams(p => ({...p, kms: Number(e.target.value)}))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-gold-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Rate / KM (₹)</label>
                    <input 
                      type="number" 
                      value={logisticsParams.rate}
                      onChange={(e) => setLogisticsParams(p => ({...p, rate: Number(e.target.value)}))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-gold-500 outline-none"
                    />
                  </div>
                  <div className="mt-4">
  <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Target Profit Margin (%)</label>
  <div className="flex items-center gap-3">
    <input 
      type="number" 
      value={profitMargin}
      onChange={(e) => setProfitMargin(Number(e.target.value))}
      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-gold-500 outline-none"
    />
    <span className="text-xs font-bold text-gold-500 font-mono whitespace-nowrap">
      = ₹{Math.round(liveCalculations.profit).toLocaleString()}
    </span>
  </div>
</div>
               </div>
               <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
                 <span className="text-[9px] text-slate-500 font-bold uppercase">Calculated Logistics (+10% Buffer)</span>
                 <span className="text-xs font-bold text-white font-mono">₹{Math.round(liveCalculations.logistics).toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">Net Profit ({profitMargin}%)</span>
                <span className="font-mono text-xs font-bold text-emerald-400">₹{Math.round(liveCalculations.profit).toLocaleString()}</span>
              </div>
            </div>

            {/* 2. LIVE BREAKDOWN */}
            <div className="space-y-3">
              <FinRow label="Total Material Base" value={liveCalculations.materialBase} />
              <FinRow label="Total GST" value={liveCalculations.gst} />
              <FinRow label="Logistics (w/ Buffer)" value={liveCalculations.logistics} />
              <FinRow label={`Net Profit (${profitMargin}%)`} value={liveCalculations.profit}/>
              <FinRow label="GeM Brokerage" value={liveCalculations.gemFee} />
              <FinRow label="EMD Provision" value={liveCalculations.emd} />
              <FinRow label="EPBG Provision" value={liveCalculations.epbg} />
            </div>

            <div className="pt-6 border-t border-slate-800 mt-auto">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Total Bid Value</span>
                  <span className="text-3xl font-black text-white italic tracking-tighter">₹{Math.round(liveCalculations.finalTotal).toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- OVERLAY: DISQUALIFY / MANUAL PRICE --- */}
      {editingItem && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-slate-900 border border-slate-800 rounded-[30px] p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-black text-white uppercase italic mb-6">Manual <span className="text-gold-500">Override</span></h2>
            
            <div className="space-y-4">
               <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Set Manual Unit Rate (₹)</label>
                  <input 
                    type="number" 
                    autoFocus
                    placeholder="0.00" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg text-white outline-none focus:border-gold-500 font-mono mt-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveOverride(editingItem.rfpLineItem.name, Number(e.currentTarget.value));
                    }}
                  />
                  <p className="text-[9px] text-slate-600 mt-2 italic">Entering a value here will disqualify the agent's matched SKU price and use this value instead.</p>
               </div>
               
               <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditingItem(null)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                  <button 
                    onClick={() => {
                       const val = (document.querySelector('input[type="number"]') as HTMLInputElement).value;
                       handleSaveOverride(editingItem.rfpLineItem.name, Number(val));
                    }} 
                    className="flex-1 py-3 bg-gold-500 text-slate-950 rounded-xl text-[10px] font-black uppercase hover:bg-white transition-all"
                  >
                    Confirm Override
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FinRow = ({ label, value }: { label: string, value: number }) => (
  <div className="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
    <span className="font-mono text-xs font-bold text-white">₹{Math.round(value).toLocaleString()}</span>
  </div>
);