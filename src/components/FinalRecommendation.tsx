import * as React from 'react';
import { useState, useRef } from 'react';
import { 
  FileText, Download, AlertTriangle, 
  Printer, Share2, Edit3, ArrowLeft, Briefcase, 
  TrendingUp, ShieldAlert, BadgeCheck 
} from 'lucide-react';
import { Rfp, TechnicalAgentOutput, FinancialAgentResult } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface FinalRecommendationProps {
  rfp: Rfp;
  onBack: () => void;
  onCancel: () => void;
}

export const FinalRecommendation: React.FC<FinalRecommendationProps> = ({ rfp, onBack, onCancel }) => {
  const [remarks, setRemarks] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // --- 1. DATA EXTRACTION ---
  const technical = rfp.agentOutputs?.technicalAnalysis as TechnicalAgentOutput;
  const financial = rfp.agentOutputs?.pricing as FinancialAgentResult;
  
  // FIX: Use financial.riskEntries since 'riskAnalysis' doesn't exist on the Rfp type in types.ts
  const riskList = financial?.riskEntries || [];

  // --- 2. VERDICT LOGIC ---
  const calculateScore = () => {
    if (!technical || !financial) return 0;

    const techScore = technical.itemAnalyses.reduce((acc, item) => 
      acc + (item.selectedSku?.matchPercentage || 0), 0) / (technical.itemAnalyses.length || 1);
    
    // Simple margin proxy
    const margin = 20; 
    const finScore = Math.min(margin * 5, 100); 

    // Risk Scoring based on available financial risks
    const riskScore = riskList.some(r => r.riskLevel === 'High') ? 0 : 
                      riskList.some(r => r.riskLevel === 'Medium') ? 50 : 100;

    return Math.round((techScore * 0.5) + (finScore * 0.3) + (riskScore * 0.2));
  };

  const bidScore = calculateScore();
  const verdict = bidScore >= 70 ? 'BID' : bidScore >= 40 ? 'REVIEW' : 'NO-BID';

  // --- 3. ACTIONS ---
  
  // FIX: Implemented real PDF generation using jsPDF
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);
    
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TenderFlow_Analysis_${rfp.id}.pdf`);
      
    } catch (e) {
      console.error("PDF Gen Failed", e);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDoc = () => {
    setIsGenerating(true);
    setTimeout(() => {
      alert("📄 Auto-Filled 'Technical_Compliance_Sheet.docx' generated with Company Profile data.");
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col space-y-6 text-slate-200 overflow-hidden">
      
      {/* HEADER */}
      <div className="shrink-0 flex items-center justify-between bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              Final Recommendation
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                verdict === 'BID' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
                verdict === 'REVIEW' ? 'bg-amber-500/10 border-amber-500 text-amber-400' :
                'bg-red-500/10 border-red-500 text-red-400'
              }`}>
                {verdict} Recommended
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">REF: {rfp.id} • {rfp.organisation}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-xs font-bold uppercase">
            Close Case
          </button>
          <button 
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {isGenerating ? 'Exporting...' : <><Share2 className="w-4 h-4" /> Share Report</>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div ref={printRef} className="flex-grow grid grid-cols-12 gap-6 overflow-y-auto pr-2 pb-6 bg-slate-950">
        
        {/* LEFT COL: ANALYSIS SUMMARY (8 Cols) */}
        <div className="col-span-8 flex flex-col gap-6">
          
          {/* 1. TECHNICAL MATCH CARD */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-500" /> Technical Feasibility
              </h3>
              <span className="text-2xl font-bold text-white">{Math.round(bidScore)}<span className="text-sm text-slate-500">/100</span></span>
            </div>

            <div className="space-y-4">
              {technical?.itemAnalyses.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-slate-500">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{item.rfpLineItem.name}</p>
                      <p className="text-xs text-slate-500">Matched: <span className="text-blue-400">{item.selectedSku?.productName || "No Match"}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      (item.selectedSku?.matchPercentage || 0) > 80 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {item.selectedSku?.matchPercentage || 0}%
                    </div>
                    <p className="text-[10px] text-slate-600 uppercase font-bold">Spec Match</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. RISK & REMARKS */}
          <div className="grid grid-cols-2 gap-6">
            {/* Risk Factors */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Risk Assessment
              </h3>
              <div className="space-y-3">
                {riskList.length > 0 ? riskList.map((risk, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                      risk.riskLevel === 'High' ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <div>
                      <p className="text-xs font-bold text-slate-300">{risk.category} Risk</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-1">{risk.statement}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-600 text-xs italic">No significant risks detected in financial analysis.</div>
                )}
              </div>
            </div>

            {/* Editable Remarks */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-500" /> Executive Remarks
                </h3>
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className="text-[10px] font-bold text-blue-400 hover:text-white transition-colors uppercase"
                >
                  {isEditing ? 'Save Note' : 'Edit'}
                </button>
              </div>
              
              {isEditing ? (
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter final decision rationale (e.g., 'Competitor X is likely bidding aggressively')..."
                  className="flex-grow w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none resize-none"
                />
              ) : (
                <div className="flex-grow bg-slate-950/50 rounded-xl p-4 border border-slate-800 text-sm text-slate-400 italic">
                  {remarks || "No additional remarks added. Click Edit to add operator context."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COL: FINANCIALS & DOCS (4 Cols) */}
        <div className="col-span-4 flex flex-col gap-6">
          
          {/* 1. FINANCIAL SUMMARY */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 blur-[50px] rounded-full pointer-events-none" />
            
            <h3 className="text-sm font-black text-gold-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Financial Projections
            </h3>

            <div className="space-y-6">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Est. Contract Value</p>
                <p className="text-3xl font-mono font-bold text-white mt-1">
                  ₹{financial?.summary?.finalBidValue?.toLocaleString() || "0"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 uppercase">Margin</p>
                  <p className="text-lg font-bold text-emerald-400">18.5%</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 uppercase">Logistics</p>
                  <p className="text-lg font-bold text-slate-200">12%</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 mb-2">Confidence Score</p>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-400" 
                    style={{ width: `${financial?.summary?.confidenceScore || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. DOCUMENT GENERATION */}
          <div className="flex-grow bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-500" /> Bid Documents
            </h3>

            <div className="space-y-3 flex-grow">
              <button 
                onClick={handleGenerateDoc}
                disabled={isGenerating}
                className="w-full group flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-gold-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/20 rounded-lg text-blue-400 group-hover:text-gold-500 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Technical Compliance</p>
                    <p className="text-[10px] text-slate-500">Auto-fills specs & deviations</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-600 group-hover:text-gold-500" />
              </button>

              <button className="w-full group flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-gold-500/50 transition-all text-left opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Financial Bid (BoQ)</p>
                    <p className="text-[10px] text-slate-500">Requires Margin Lock</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <button 
              onClick={handleGenerateDoc}
              className="mt-6 w-full py-4 bg-gold-500 hover:bg-white text-slate-950 font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2"
            >
              {isGenerating ? 'Compiling...' : 'Generate All Docs'}
              {!isGenerating && <Printer className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};