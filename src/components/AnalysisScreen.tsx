import React, { useState, useMemo } from 'react';
import { Rfp } from '../../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AnalysisScreenProps {
  rfp: Rfp;
  onBack: () => void; // Navigates to the previous screen (Processing/Snapshot)
  onCancel: () => void; // NEW: Navigates all the way back to FrontPage
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ rfp, onBack, onCancel }) => {
  // 1. EXTRACT DATA
  const technicalResults = rfp.agentOutputs?.technicalAnalysis?.itemAnalyses || [];
  const parsedMetadata = rfp.agentOutputs?.parsedData?.metadata || {};

  // 2. STATE
  const [logisticsParams, setLogisticsParams] = useState({
    kms: 400,
    rate: 55,
    bufferPercent: 10
  });
  const [profitMargin, setProfitMargin] = useState(15);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // 3. CALCULATION ENGINE
  const liveCalculations = useMemo(() => {
    let totalMaterialBase = 0;
    let totalGst = 0;

    technicalResults.forEach((analysis: any) => {
      const itemName = analysis.rfpLineItem.name;
      const qty = analysis.rfpLineItem.quantity;
      
      let unitPrice = 0;
      let gstRate = 18; 

      if (manualOverrides[itemName] !== undefined) {
        unitPrice = manualOverrides[itemName];
        gstRate = analysis.selectedSku?.gstRate || 18;
      } else if (analysis.selectedSku) {
        unitPrice = analysis.selectedSku.unitSalesPrice;
        gstRate = analysis.selectedSku.gstRate;
      }

      totalMaterialBase += (unitPrice * qty);
      totalGst += ((unitPrice * qty) * (gstRate / 100));
    });

    const baseLogistics = logisticsParams.kms * logisticsParams.rate;
    const logisticsWithBuffer = baseLogistics * (1 + (logisticsParams.bufferPercent / 100));

    let gemFee = 0;
    if (totalMaterialBase > 1000000 && totalMaterialBase <= 100000000) gemFee = totalMaterialBase * 0.0030;
    else if (totalMaterialBase > 100000000) gemFee = 300000;

    // --- FIX: REAL EMD/EPBG LOGIC ---
    // Check parsed metadata first. If EMD is a fixed amount, use it. If not, fallback to % calc.
    let emd = 0;
    if (parsedMetadata.emdAmount) {
      emd = parsedMetadata.emdAmount;
    } else if (rfp.agentOutputs?.parsedData?.financialConditions?.emd === "Required") {
      emd = totalMaterialBase * 0.02; // Fallback 2% only if required but no specific amount found
    }

    let epbg = 0;
    if (parsedMetadata.epbgPercent) {
      epbg = totalMaterialBase * (parsedMetadata.epbgPercent / 100);
    } else if (rfp.agentOutputs?.parsedData?.financialConditions?.epbg === "Required") {
      epbg = totalMaterialBase * 0.03; // Fallback 3%
    }

    const costBasis = totalMaterialBase + logisticsWithBuffer;
    const profitAmount = costBasis * (profitMargin / 100);

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
  }, [technicalResults, manualOverrides, logisticsParams, profitMargin, parsedMetadata]);

  // 4. PDF GENERATOR
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Bid Analysis Report", 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Organization: ${rfp.organisation}`, 14, 32);
    doc.text(`Bid No: ${parsedMetadata.bidNumber || 'N/A'}`, 14, 38);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 44);

    // Financial Summary Table
    const financials = [
      ["Material Base Cost", `Rs. ${Math.round(liveCalculations.materialBase).toLocaleString()}`],
      ["Total GST", `Rs. ${Math.round(liveCalculations.gst).toLocaleString()}`],
      ["Logistics Cost", `Rs. ${Math.round(liveCalculations.logistics).toLocaleString()}`],
      ["GeM Brokerage", `Rs. ${Math.round(liveCalculations.gemFee).toLocaleString()}`],
      ["EMD Provision", `Rs. ${Math.round(liveCalculations.emd).toLocaleString()}`],
      ["EPBG Provision", `Rs. ${Math.round(liveCalculations.epbg).toLocaleString()}`],
      ["Net Profit", `Rs. ${Math.round(liveCalculations.profit).toLocaleString()}`],
      ["FINAL BID VALUE", `Rs. ${Math.round(liveCalculations.finalTotal).toLocaleString()}`]
    ];

    (doc as any).autoTable({
      startY: 55,
      head: [['Cost Component', 'Amount']],
      body: financials,
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55] }, // Gold color
    });

    doc.save(`Bid_Analysis_${parsedMetadata.bidNumber || 'Draft'}.pdf`);
  };

  // 5. SHARE FUNCTIONALITY
  const handleShare = async () => {
    const shareData = {
      title: 'Bid Analysis Report',
      text: `Reviewing bid for ${rfp.organisation}. Final Value: Rs. ${Math.round(liveCalculations.finalTotal).toLocaleString()}`,
      url: window.location.href // Or link to the generated PDF if hosted
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      // Fallback for desktop
      const subject = encodeURIComponent(`Bid Analysis: ${rfp.organisation}`);
      const body = encodeURIComponent(`Here is the final authorized bid value: Rs. ${Math.round(liveCalculations.finalTotal).toLocaleString()}`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    }
  };

  const handleSaveOverride = (itemName: string, unitPrice: number) => {
    setManualOverrides(prev => ({ ...prev, [itemName]: unitPrice }));
    setEditingItem(null);
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* --- HEADER --- */}
      <div className="shrink-0 flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-xl font-bold">←</button>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Bid <span className="text-gold-500">Analysis</span> Console
            </h1>
          </div>
          <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
             <span>Client: {rfp.organisation}</span>
             <span>Dest: <span className="text-white">{parsedMetadata.consignee || parsedMetadata.officeName || "Unknown"}</span></span>
          </div>
        </div>
        <div className="flex gap-3 items-center">
           <div className="bg-slate-900 border border-slate-800 px-6 py-2 rounded-2xl text-right mr-4">
              <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest italic">Live Adjusted Bid</span>
              <span className="text-2xl font-black text-gold-500">₹{Math.round(liveCalculations.finalTotal).toLocaleString()}</span>
           </div>
           
           {/* ACTION BUTTONS */}
           <button onClick={onCancel} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">
             Cancel Bid
           </button>
           <button onClick={handleShare} className="bg-slate-800 text-slate-300 border border-slate-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 hover:text-white transition-all">
             Share 🔗
           </button>
           <button onClick={handleDownloadPDF} className="bg-white text-slate-950 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold-500 transition-all shadow-lg">
             Submit & Download PDF
           </button>
        </div>
      </div>

      <div className="flex-grow grid grid-cols-12 gap-6 overflow-hidden min-h-0 pb-2">
        
        {/* --- LEFT: INVENTORY MAPPING --- */}
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
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm uppercase">{analysis.rfpLineItem.name}</h4>
                      <div className="flex gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <span>Required: {analysis.rfpLineItem.quantity} Units</span>
                        {isOverridden && <span className="text-gold-500 ml-2">⚠️ MANUAL PRICE ACTIVE</span>}
                      </div>
                    </div>
                    <button onClick={() => setEditingItem(analysis)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-[9px] font-bold text-slate-300 uppercase hover:bg-white hover:text-slate-900 transition-all">
                      {isOverridden ? 'Edit Override' : 'Disqualify / Edit'}
                    </button>
                  </div>
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

        {/* --- RIGHT: FINANCIAL ENGINE --- */}
        <div className="col-span-5 flex flex-col bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Configuration</span>
          </div>
          <div className="flex-grow p-6 space-y-6 overflow-y-auto scrollbar-hide">
            
            {/* INPUTS CARD */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Avg Distance (KM)</label>
                    <input type="number" value={logisticsParams.kms} onChange={(e) => setLogisticsParams(p => ({...p, kms: Number(e.target.value)}))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-gold-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Rate / KM (₹)</label>
                    <input type="number" value={logisticsParams.rate} onChange={(e) => setLogisticsParams(p => ({...p, rate: Number(e.target.value)}))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-gold-500 outline-none" />
                  </div>
                  <div className="col-span-2 mt-2">
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Target Profit Margin (%)</label>
                    <div className="flex items-center gap-3">
                      <input type="number" value={profitMargin} onChange={(e) => setProfitMargin(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-gold-500 outline-none" />
                      <span className="text-xs font-bold text-emerald-500 font-mono whitespace-nowrap">
                         = ₹{Math.round(liveCalculations.profit).toLocaleString()}
                      </span>
                    </div>
                  </div>
               </div>
            </div>

            {/* LIVE BREAKDOWN */}
            <div className="space-y-3">
              <FinRow label="Total Material Base" value={liveCalculations.materialBase} />
              <FinRow label="Total GST" value={liveCalculations.gst} />
              <FinRow label="Logistics (w/ Buffer)" value={liveCalculations.logistics} />
              <FinRow label={`Net Profit (${profitMargin}%)`} value={liveCalculations.profit} color="text-emerald-500" />
              <FinRow label="GeM Brokerage" value={liveCalculations.gemFee} />
              <FinRow label={`EMD (${liveCalculations.emd === 0 ? 'Not Reqd' : 'Provision'})`} value={liveCalculations.emd} />
              <FinRow label={`EPBG (${liveCalculations.epbg === 0 ? 'Not Reqd' : 'Provision'})`} value={liveCalculations.epbg} />
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

      {/* --- OVERLAY --- */}
      {editingItem && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-slate-900 border border-slate-800 rounded-[30px] p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-black text-white uppercase italic mb-6">Manual <span className="text-gold-500">Override</span></h2>
            <div className="space-y-4">
               <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Set Manual Unit Rate (₹)</label>
                  <input type="number" autoFocus placeholder="0.00" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg text-white outline-none focus:border-gold-500 font-mono mt-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveOverride(editingItem.rfpLineItem.name, Number(e.currentTarget.value));
                    }}
                  />
               </div>
               <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditingItem(null)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                  <button onClick={() => {
                    const val = (document.querySelector('input[type="number"]') as HTMLInputElement).value;
                    handleSaveOverride(editingItem.rfpLineItem.name, Number(val));
                  }} className="flex-1 py-3 bg-gold-500 text-slate-950 rounded-xl text-[10px] font-black uppercase hover:bg-white transition-all">Confirm Override</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FinRow = ({ label, value, color = "text-white" }: { label: string, value: number, color?: string }) => (
  <div className="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
    <span className={`font-mono text-xs font-bold ${color}`}>₹{Math.round(value).toLocaleString()}</span>
  </div>
);