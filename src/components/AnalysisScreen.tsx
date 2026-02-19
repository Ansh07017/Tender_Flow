import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Rfp, AppConfig } from '../../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  ArrowRight, ShieldCheck, Factory, BrainCircuit, 
  FileCog, Download, CheckCircle2, RefreshCw, 
  MapPin, Scale
} from 'lucide-react';

interface AnalysisScreenProps {
  rfp: Rfp;
  config?: AppConfig; 
  onBack: () => void;
  onCancel: () => void;
  onProceed: () => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ rfp, config, onBack, onCancel, onProceed }) => {
  // --- 1. DYNAMIC DATA EXTRACTION ---
  const technicalResults = rfp.agentOutputs?.technicalAnalysis?.itemAnalyses || [];
  const parsedData = rfp.agentOutputs?.parsedData || {};
  const parsedMetadata = parsedData.metadata || {};
  const financialCond = parsedData.financialConditions || {};
  const buyerTerms = parsedData.buyer_added_terms || [];
  const mandatoryDocs = parsedData.mandatoryDocuments || [];
  const companyName = config?.companyDetails?.companyName || "Our Company";

  // --- 2. STATE ---
  const [activeTab, setActiveTab] = useState<'COMMERCIALS' | 'COMPLIANCE'>('COMMERCIALS');
  const [logisticsParams, setLogisticsParams] = useState({
    kms: config?.discoveryFilters?.manualAvgKms || 400,
    rate: config?.discoveryFilters?.manualRatePerKm || 55,
    bufferPercent: 10
  });
  const [profitMargin, setProfitMargin] = useState(15);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Dynamic document converter list based on Grok's extraction
  const initialBlankDocs = useMemo(() => {
    const docs = [];
    const techSpecs = parsedData.technical_specifications;
    
    if (techSpecs?.specification_document && techSpecs.specification_document !== "N/A") {
      docs.push({ id: 'TECH_SPEC', name: `Specification: ${techSpecs.specification_document}`, status: 'DETECTED' });
    }
    if (techSpecs?.boq_detail_document && techSpecs.boq_detail_document !== "N/A") {
      docs.push({ id: 'BOQ_DOC', name: `BOQ Detail: ${techSpecs.boq_detail_document}`, status: 'DETECTED' });
    }
    
    docs.push({ id: 'MII_DECL', name: 'Form 1: Local Content Declaration (MII)', status: 'DETECTED' });
    return docs;
  }, [parsedData]);

  const [blankDocs, setBlankDocs] = useState(initialBlankDocs);

  useEffect(() => {
    setBlankDocs(initialBlankDocs);
  }, [initialBlankDocs]);

  // --- 3. FINANCIAL CALCULATIONS ---
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

    let emd = 0;
    if (parsedMetadata.emdAmount) {
      emd = parsedMetadata.emdAmount;
    } else if (financialCond?.emd === "Required") {
      emd = totalMaterialBase * 0.02; 
    }

    let epbg = 0;
    if (parsedMetadata.epbgPercent) {
      epbg = totalMaterialBase * (parsedMetadata.epbgPercent / 100);
    } else if (financialCond?.epbg === "Required") {
      epbg = totalMaterialBase * 0.03; 
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
  }, [technicalResults, manualOverrides, logisticsParams, profitMargin, parsedMetadata, financialCond]);

  // --- 4. ACTION HANDLERS ---
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Bid Analysis Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Organization: ${rfp.organisation}`, 14, 32);
    doc.text(`Bid No: ${parsedMetadata.bidNumber || 'N/A'}`, 14, 38);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 44);

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
      headStyles: { fillColor: [212, 175, 55] }, 
    });

    doc.save(`Bid_Analysis_${parsedMetadata.bidNumber || 'Draft'}.pdf`);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Bid Analysis Report',
      text: `Reviewing bid for ${rfp.organisation}. Final Value: Rs. ${Math.round(liveCalculations.finalTotal).toLocaleString()}`,
      url: window.location.href 
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log('Share canceled'); }
    } else {
      const subject = encodeURIComponent(`Bid Analysis: ${rfp.organisation}`);
      const body = encodeURIComponent(`Here is the final authorized bid value: Rs. ${Math.round(liveCalculations.finalTotal).toLocaleString()}`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    }
  };

  const handleSaveOverride = (itemName: string, unitPrice: number) => {
    setManualOverrides(prev => ({ ...prev, [itemName]: unitPrice }));
    setEditingItem(null);
  };

  const handleConvertDoc = (docId: string) => {
    setBlankDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'CONVERTING' } : d));
    setTimeout(() => {
      setBlankDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'CONVERTED_TO_DOCX' } : d));
    }, 2000);
  };

  // --- 5. RENDERERS ---
  const renderCommercials = () => (
    <div className="flex flex-col h-full gap-6 pb-20">
      
      {/* TOP: CONSIGNEE LOCATION */}
      <div className="shrink-0 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Consignee Location</h3>
            <p className="text-lg font-bold text-white">{parsedData.consignee || parsedMetadata.officeName || "Multiple Locations"}</p>
          </div>
        </div>
        <div className="text-right">
          <label className="text-[10px] uppercase text-slate-400 font-bold block mb-2">Distance Buffer (Km)</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" min="0" max="2000" 
              value={logisticsParams.kms} 
              onChange={(e) => setLogisticsParams(prev => ({ ...prev, kms: Number(e.target.value) }))}
              className="w-48 accent-gold-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-mono text-gold-500 w-12 text-right">{logisticsParams.kms}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-grow min-h-0">
        {/* LEFT: TECHNICAL SKU MATCHING */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 overflow-y-auto flex flex-col">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Scale className="w-4 h-4" /> Technical SKU Matching
          </h3>
          <div className="space-y-4">
            {technicalResults.map((analysis: any, idx: number) => {
               const isOverridden = manualOverrides[analysis.rfpLineItem.name] !== undefined;
               const currentPrice = isOverridden ? manualOverrides[analysis.rfpLineItem.name] : (analysis.selectedSku?.unitSalesPrice || 0);

               return (
                  <div key={idx} className={`border p-5 rounded-2xl transition-all ${isOverridden ? 'bg-gold-500/5 border-gold-500/30' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-sm uppercase">{analysis.rfpLineItem.name}</h4>
                        <div className="flex gap-2 text-[10px] font-bold text-slate-500 uppercase">
                          <span>Req Qty: {analysis.rfpLineItem.quantity} | Spec: {analysis.rfpLineItem.technicalSpecs?.[0] || "Standard"}</span>
                        </div>
                      </div>
                      <button onClick={() => setEditingItem(analysis)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-[9px] font-bold text-slate-300 uppercase hover:bg-white hover:text-slate-900 transition-all">
                        {isOverridden ? 'Edit Override' : 'Disqualify / Edit'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 mt-2">
                      <div className="flex items-center gap-3">
                        <div className="text-emerald-500"><CheckCircle2 className="w-4 h-4" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SKU: {analysis.selectedSku?.skuId || 'No Match'}</p>
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

        {/* RIGHT: FINANCIAL CALCULATOR */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block mb-2">Profit Margin (%)</label>
              <input 
                type="range" min="5" max="50" 
                value={profitMargin} 
                onChange={(e) => setProfitMargin(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-right mt-1 text-[10px] font-mono text-emerald-400">{profitMargin}% Margin Applied</div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <FinRow label="Total Material Base" value={liveCalculations.materialBase} />
              <FinRow label="Total GST" value={liveCalculations.gst} />
              <FinRow label="Logistics (w/ Buffer)" value={liveCalculations.logistics} />
              <FinRow label={`Net Profit (${profitMargin}%)`} value={liveCalculations.profit} color="text-emerald-500" />
              <FinRow label="GeM Brokerage" value={liveCalculations.gemFee} />
              <FinRow label={`EMD (${liveCalculations.emd === 0 ? 'Not Reqd' : 'Provision'})`} value={liveCalculations.emd} />
              <FinRow label={`EPBG (${liveCalculations.epbg === 0 ? 'Not Reqd' : 'Provision'})`} value={liveCalculations.epbg} />
            </div>
            
            <div className="h-px bg-slate-800 my-4" />
            
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs font-black uppercase text-gold-500 tracking-widest block">Final Bid Value</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">(Inclusive of Taxes)</span>
              </div>
              <span className="text-4xl font-mono font-bold text-white">₹{Math.round(liveCalculations.finalTotal).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div className="grid grid-cols-2 gap-6 h-full pb-20 overflow-y-auto">
      
      {/* LEFT COLUMN: MII, Vault & ATC */}
      <div className="space-y-6">
        
        {/* 1. MII STRATEGY BANNER */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-4">
             <Factory className="w-8 h-8 text-emerald-500 shrink-0" />
             <div>
                <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                   Class-1 Local Supplier Detected <CheckCircle2 className="w-4 h-4" />
                </h3>
                <p className="text-xs text-emerald-100/70 mt-1 leading-relaxed">
                   <strong>Benefit Active:</strong> As an MII Class-1 OEM ({companyName}), you are eligible for Purchase Preference. 
                   If your bid is within 20% of the L1 price, you will be given an option to match L1 and win 50% of the tender quantity.
                </p>
             </div>
          </div>
        </div>

        {/* 2. VAULT DOCUMENT MATCHING */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Required Docs vs. Vault
          </h3>
          <div className="space-y-3">
             <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
               <span className="text-xs font-bold text-white">GST / PAN / Incorporation</span>
               <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">Verified in Vault</span>
             </div>
             
             {/* Render Docs Extracted by Grok. Added strict typings. */}
             {mandatoryDocs.map((doc: string, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-white">{doc}</span>
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-slate-800 text-slate-400">Check Vault</span>
                </div>
             ))}

             {/* Dynamic EMD Logic */}
             <div className={`flex justify-between items-center p-3 bg-slate-950 rounded-xl border ${liveCalculations.emd > 0 ? 'border-red-500/30' : 'border-slate-800'}`}>
               <div>
                 <span className="text-xs font-bold text-white block">EMD Payment Proof</span>
                 <span className="text-[9px] text-slate-500">Not MSE - Exemption Not Applicable</span>
               </div>
               {liveCalculations.emd > 0 ? (
                 <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-amber-500/10 text-amber-400">Action Required: Pay ₹{Math.round(liveCalculations.emd).toLocaleString()}</span>
               ) : (
                 <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-slate-800 text-slate-500">Exempted by Buyer</span>
               )}
             </div>
          </div>
        </div>

        {/* 3. DYNAMIC ATC SUMMARY (AI) */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-500" /> AI Summarized T&C (ATC)
          </h3>
          <ul className="space-y-2">
            {buyerTerms.length > 0 ? (
              buyerTerms.map((term: string, idx: number) => (
                <li key={idx} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-purple-500 font-bold mt-0.5">•</span> 
                  <span className="leading-snug">{term}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-500 italic">No specific Buyer Added Terms detected by AI.</li>
            )}
          </ul>
        </div>
      </div>

      {/* RIGHT COLUMN: DYNAMIC DOCUMENT EXTRACTION & CONVERSION */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col relative overflow-hidden">
         <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <FileCog className="w-32 h-32 text-gold-500" />
         </div>
         
         <div className="relative z-10">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
               Blank Format Converter
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-6">
               The AI has detected blank annexure formats inside the original RFP PDF. Convert them to editable Word/Doc formats now, 
               so they can be auto-filled in the final step.
            </p>

            <div className="space-y-4">
               {blankDocs.map((doc, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group">
                     <div>
                        <p className="text-xs font-bold text-white">{doc.name}</p>
                        <p className="text-[9px] font-black uppercase text-slate-500 mt-1">
                           Status: <span className={doc.status === 'CONVERTED_TO_DOCX' ? 'text-emerald-500' : 'text-amber-500'}>{doc.status.replace(/_/g, ' ')}</span>
                        </p>
                     </div>
                     
                     {doc.status === 'DETECTED' && (
                        <button 
                           onClick={() => handleConvertDoc(doc.id)}
                           className="px-4 py-2 bg-slate-800 hover:bg-gold-500 hover:text-slate-950 text-white text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2"
                        >
                           <FileCog className="w-3 h-3" /> Extract to Doc
                        </button>
                     )}
                     
                     {doc.status === 'CONVERTING' && (
                        <span className="px-4 py-2 text-[10px] font-black uppercase text-blue-400 flex items-center gap-2">
                           <RefreshCw className="w-3 h-3 animate-spin" /> Processing...
                        </span>
                     )}

                     {doc.status === 'CONVERTED_TO_DOCX' && (
                        <button className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2 hover:bg-emerald-500 hover:text-white">
                           <Download className="w-3 h-3" /> Download Doc
                        </button>
                     )}
                  </div>
               ))}
            </div>

            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
               <p className="text-[10px] text-blue-300 leading-relaxed text-center">
                  Once converted, these templates will be automatically forwarded to the Final Recommendation engine for data injection.
               </p>
            </div>
         </div>
      </div>

    </div>
  );

  return (
    <div className="h-full flex flex-col relative">
      {/* HEADER WITH RESTORED ACTIONS */}
      <div className="shrink-0 flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-xl font-bold">←</button>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Bid <span className="text-gold-500">Analysis</span> Console
            </h1>
          </div>
          <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] ml-8">
             <span className="text-gold-500">Bid Number: <span className="text-white">{parsedMetadata.bidNumber || "Draft RFP"}</span></span>
             <span className="text-white bg-slate-800 px-2 py-0.5 rounded">{parsedMetadata.type_of_bid || parsedMetadata.bidType || "Standard Bid"}</span>
          </div>
        </div>
        
        {/* RESTORED: SHARE, PDF EXPORT, AND LIVE TOTAL */}
        <div className="flex gap-3 items-center">
           <div className="bg-slate-900 border border-slate-800 px-6 py-2 rounded-2xl text-right mr-4">
              <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest italic">Live Adjusted Bid</span>
              <span className="text-2xl font-black text-gold-500">₹{Math.round(liveCalculations.finalTotal).toLocaleString()}</span>
           </div>
           
           <button onClick={handleShare} className="bg-slate-800 text-slate-300 border border-slate-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 hover:text-white transition-all">
             Share 🔗
           </button>
           <button onClick={handleDownloadPDF} className="bg-white text-slate-950 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold-500 transition-all shadow-lg">
             Export PDF
           </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4 shrink-0 px-2">
        <button 
            onClick={() => setActiveTab('COMMERCIALS')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'COMMERCIALS' ? 'bg-gold-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-white'}`}
        >
            Commercials
        </button>
        <button 
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'COMPLIANCE' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-white'}`}
        >
            Compliance & Docs
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-grow overflow-hidden min-h-0 relative z-0">
         {activeTab === 'COMMERCIALS' && renderCommercials()}
         {activeTab === 'COMPLIANCE' && renderCompliance()}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
         <button onClick={onCancel} className="text-[10px] font-bold text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors">
            Abort Analysis
         </button>
         
         <div className="flex gap-4">
            <button 
               onClick={onProceed}
               className="px-8 py-2 bg-gold-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
               Proceed to Final Approval <ArrowRight className="w-4 h-4" />
            </button>
         </div>
      </div>

      {/* OVERLAY: EDIT MANUAL PRICE */}
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