// Add ParsedRfpData to your imports
import { LineItemTechnicalAnalysis, SKU, ParsedRfpData } from "../../types";

/* =========================
   CONFIG / CONSTANTS
========================= */

const BROKERAGE_PERCENT = 2; 
const DEFAULT_MARGIN_PERCENT = 12; 
const EPBG_PERCENT = 3; 
const EMD_PERCENT = 2; 
const TRANSPORT_BUFFER_PERCENT = 10; 

/* =========================
   TYPES
========================= */

export interface FinancialAgentResult {
  pricing: Record<string, number>;
  riskEntries: {
    category: "Financial" | "Logistics";
    statement: string;
    riskLevel: "Low" | "Medium" | "High";
  }[];
}

/* =========================
   CORE AGENT
========================= */

export default function runFinancialAgent(
  analyses: LineItemTechnicalAnalysis[],
  rfpData: ParsedRfpData // UPDATE: Added missing parameter
): FinancialAgentResult {
  let baseCost = 0;
  let transportCost = 0;
  let gstAmount = 0;
  let brokerageCost = 0;
  let epbgAmount = 0;
  let emdAmount = 0;

  const riskEntries: FinancialAgentResult["riskEntries"] = [];

  analyses.forEach((analysis, index) => {
    const sku: SKU = analysis.selectedSku;
    const requiredQty = analysis.rfpLineItem.quantity;
    const availableQty = sku.availableQuantity;

    /* -------------------------
        AVAILABILITY LOGIC
    ------------------------- */
    if (availableQty === 0) {
      riskEntries.push({
        category: "Logistics",
        statement: `Line item ${index + 1} (${sku.skuId}) has zero inventory. Fresh procurement required.`,
        riskLevel: "High",
      });
    } else if (availableQty < requiredQty) {
      riskEntries.push({
        category: "Logistics",
        statement: `Line item ${index + 1} (${sku.skuId}) only partially available (${availableQty}/${requiredQty}).`,
        riskLevel: "Medium",
      });
    }

    const effectiveQty = Math.min(requiredQty, availableQty || requiredQty);

    /* -------------------------
        COST CALCULATION
    ------------------------- */
    const itemCost = sku.unitSalesPrice * effectiveQty;
    baseCost += itemCost;

    // Transport cost approximation
    const itemTransport = itemCost * (TRANSPORT_BUFFER_PERCENT / 100);
    transportCost += itemTransport;

    // GST
    gstAmount += itemCost * (sku.gstRate / 100);

    // Brokerage
    brokerageCost += itemCost * (BROKERAGE_PERCENT / 100);

    // Margin sanity check
    if (sku.minMarginPercent > DEFAULT_MARGIN_PERCENT) {
      riskEntries.push({
        category: "Financial",
        statement: `SKU ${sku.skuId} requires higher minimum margin (${sku.minMarginPercent}%).`,
        riskLevel: "Medium",
      });
    }
  });

  /* -------------------------
      DYNAMIC EPBG & EMD 
      (Moved outside loop for correct totals)
  ------------------------- */

  // 1. EPBG Calculation
  const epbgStatus = rfpData.financialConditions.epbg;
  const isEpbgRequired = epbgStatus !== "Not Required" && epbgStatus !== "No"; 

  if (isEpbgRequired) {
    // Use extracted percentage (e.g., 4.00) or default constant
    const epbgPercent = rfpData.metadata.epbgPercent || EPBG_PERCENT; 
    epbgAmount = baseCost * (epbgPercent / 100);
  } else {
    epbgAmount = 0; // Set to zero if Munitions India says "No"
  }

  // 2. EMD Calculation
  const emdStatus = rfpData.financialConditions.emd;
  const isEmdRequired = emdStatus !== "Not Required" && emdStatus !== "No"; 

  if (isEmdRequired) {
    // Use extracted fixed amount or default percentage
    emdAmount = rfpData.metadata.emdAmount || (baseCost * (EMD_PERCENT / 100));
  } else {
    emdAmount = 0; // Set to zero if Munitions India says "No"
  }

  /* -------------------------
      FINAL BID VALUE
  ------------------------- */
  const finalBidValue =
    baseCost +
    transportCost +
    gstAmount +
    brokerageCost +
    epbgAmount +
    emdAmount;

  /* -------------------------
      RETURN STRUCTURE
  ------------------------- */
  return {
    pricing: {
      "Base Material Cost": round(baseCost),
      "Transport Cost (Buffered)": round(transportCost),
      "GST": round(gstAmount),
      "Brokerage Cost": round(brokerageCost),
      "EPBG Provision": round(epbgAmount),
      "EMD Provision": round(emdAmount),
      "Final Bid Value": round(finalBidValue),
    },
    riskEntries,
  };
}

/* =========================
   UTILS
========================= */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}