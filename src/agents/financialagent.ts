import { LineItemTechnicalAnalysis, SKU, ParsedRfpData,FinancialAgentResult} from "../../types";

/* =====================================================
    CONFIG – Strategic Financial Buffers
===================================================== */
const BROKERAGE_PERCENT = 2; 
const DEFAULT_MARGIN_PERCENT = 12; 
const EPBG_PERCENT = 3; 
const EMD_PERCENT = 2; 
const TRANSPORT_BUFFER_PERCENT = 10; 


/* =====================================================
    CORE AGENT
===================================================== */
export default function runFinancialAgent(
  analyses: LineItemTechnicalAnalysis[],
  rfpData: ParsedRfpData,
  manualPriceOverrides?: Record<string, { unitPrice: number }>
): FinancialAgentResult {
  let baseCost = 0;
  let transportCost = 0;
  let gstAmount = 0;
  let brokerageCost = 0;
  
  const riskEntries: FinancialAgentResult["riskEntries"] = [];

  // Iterate through technical analyses to aggregate costs
  analyses.forEach((analysis, index) => {
    const item = analysis.rfpLineItem;
    const sku: SKU | null = analysis.selectedSku; 
    
    let unitPriceToUse = 0;
    let currentGstRate = 18;

    /* -------------------------
        1. NULL GUARD & MANUAL OVERRIDES
    ------------------------- */
    // Prioritize manual human intervention for the demo
    if (manualPriceOverrides?.[item.name]) {
      unitPriceToUse = manualPriceOverrides[item.name].unitPrice;
      riskEntries.push({
        category: "Financial",
        statement: `Line item ${index + 1}: Using verified manual price override.`,
        riskLevel: "Low",
        
      });
    } else if (sku) {
      // Logic for matched SKUs from Jalandhar Hub
      unitPriceToUse = sku.unitSalesPrice;
      currentGstRate = sku.gstRate;

      // 2. AVAILABILITY LOGIC
      if (sku.availableQuantity === 0) {
        riskEntries.push({
          category: "Logistics",
          statement: `Line item ${index + 1}: ${sku.skuId} is OUT OF STOCK. Sourcing required.`,
          riskLevel: "High",
        });
      } else if (sku.availableQuantity < item.quantity) {
        riskEntries.push({
          category: "Logistics",
          statement: `Line item ${index + 1}: Partial stock (${sku.availableQuantity}/${item.quantity}).`,
          riskLevel: "Medium",
        });
      }
    } else {
      // No match and no override
      riskEntries.push({
        category: "Financial",
        statement: `Line item ${index + 1} (${item.name}) has no matched SKU or price.`,
        riskLevel: "High",
      });
      return; 
    }

    /* -------------------------
        3. AGGREGATE COSTS
    ------------------------- */
    const itemSubtotal = unitPriceToUse * item.quantity;
    baseCost += itemSubtotal;
    gstAmount += (itemSubtotal * (currentGstRate / 100));
    brokerageCost += (itemSubtotal * (BROKERAGE_PERCENT / 100));
    transportCost += (itemSubtotal * (TRANSPORT_BUFFER_PERCENT / 100));
  });

  /* -------------------------
      4. GeM COMPLIANCE: EPBG & EMD
  ------------------------- */
  const epbgAmount = calculateSecurityDeposit(rfpData, 'epbg', baseCost, EPBG_PERCENT);
  const emdAmount = calculateSecurityDeposit(rfpData, 'emd', baseCost, EMD_PERCENT);

  const finalBidValue = baseCost + transportCost + gstAmount + brokerageCost + epbgAmount + emdAmount;

  // Return structure optimized for frontend consumption
  return {
    pricing: {
      "Base Material Cost": round(baseCost),
      "Freight & Logistics": round(transportCost),
      "GST (Tax)": round(gstAmount),
      "Brokerage Cost": round(brokerageCost),
      "EPBG Provision": round(epbgAmount),
      "EMD Provision": round(emdAmount),
      "Final Bid Value": round(finalBidValue),
    },
    summary: {
      matchStatus: determineOverallStatus(analyses),
      confidenceScore: calculateConfidence(analyses),
      requiresManualInput: baseCost === 0 && analyses.length > 0,
      recommendation: finalBidValue > 0 ? "Proceed with bid." : "Manual sourcing required.",
      finalBidValue: round(finalBidValue), 
    },
    riskEntries,
  };
}

/* =========================
    HELPERS (Intact)
========================= */
function calculateSecurityDeposit(rfp: ParsedRfpData, type: 'epbg' | 'emd', base: number, def: number): number {
  const status = rfp.financialConditions?.[type];
  if (status === "Not Required" || status === "No") return 0;
  const percent = (type === 'epbg' ? rfp.metadata.epbgPercent : null) || def;
  return base * (percent / 100);
}

function determineOverallStatus(analyses: any[]): 'COMPLETE' | 'PARTIAL' | 'NONE' {
  if (analyses.length === 0) return 'NONE';
  if (analyses.every(a => a.status === 'COMPLETE')) return 'COMPLETE';
  if (analyses.some(a => a.status === 'PARTIAL' || a.status === 'COMPLETE')) return 'PARTIAL';
  return 'NONE';
}

function calculateConfidence(analyses: any[]): number {
  if (analyses.length === 0) return 0;
  const sum = analyses.reduce((acc, curr) => acc + (curr.matchPercentage || 0), 0);
  return Math.round(sum / analyses.length);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}