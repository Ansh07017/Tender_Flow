import { SKU, RfpProductLineItem, LineItemTechnicalAnalysis } from '../../types';

/* =====================================================
    CONFIG – Industrial Strategic Weights
===================================================== */
const WEIGHTS = {
  CATEGORY_MATCH: 1.0,  // Mandatory Gate
  IS_STANDARD: 0.60,    // 60% of technical score
  SPEC_DETAILS: 0.40,   // 40% of technical score
};

const AVAILABILITY = {
  FULL: 1.0,
  PARTIAL: 0.7,
  ZERO: 0.0,
  THRESHOLD: 0.4, // 50%
};

/* =====================================================
    CORE HELPERS
===================================================== */

/**
 * Advanced Industrial Matching: Prioritizes IS Standards over fuzzy keywords
 */
function calculateIndustrialMatch(
  rfpSpecs: string[],
  skuSpecs: Record<string, string>
): number {
  if (rfpSpecs.length === 0) return 50;

  let score = 0;
  const skuStandard = String(skuSpecs.Standard || "").toLowerCase();

  // 1. Mandatory IS Standard Check (60% Weight)
  if (skuStandard && rfpSpecs.some(s => s.toLowerCase().includes(skuStandard))) {
    score += (WEIGHTS.IS_STANDARD * 100);
  }

  // 2. Attribute Deep Dive (40% Weight)
  const skuValues = Object.values(skuSpecs).map(v => String(v).toLowerCase());
  let matchedAttributes = 0;
  
  rfpSpecs.forEach(spec => {
    if (skuValues.some(val => spec.toLowerCase().includes(val))) {
      matchedAttributes++;
    }
  });

  score += (matchedAttributes / Math.max(rfpSpecs.length, 1)) * (WEIGHTS.SPEC_DETAILS * 100);

  return Math.min(100, Math.round(score));
}

function evaluateStock(required: number, available: number) {
  if (available >= required) return { weight: AVAILABILITY.FULL, status: 'FULL' as const };
  if (available / required >= AVAILABILITY.THRESHOLD) return { weight: AVAILABILITY.PARTIAL, status: 'PARTIAL' as const };
  return { weight: AVAILABILITY.ZERO, status: 'ZERO' as const };
}

/* =====================================================
    MAIN TECHNICAL AGENT
===================================================== */

export function runTechnicalAgent(
  rfpItems: RfpProductLineItem[],
  skus: SKU[]
): {
  lineItemAnalyses: any[];
  riskEntries: any[];
} {
  const riskEntries: any[] = [];
  const THRESHOLD = 20;

  const lineItemAnalyses = rfpItems.map((item) => {
    const rfpCat = item.name.toLowerCase();

    // PHASE 1: THE CATEGORY GATE (Strict Skip Logic)
    const candidates = skus.filter(sku => {
      const sCat = sku.productCategory.toLowerCase();
      const sSub = sku.productSubCategory.toLowerCase();
      return sCat.includes(rfpCat) || rfpCat.includes(sCat) || sSub.includes(rfpCat);
    });

    // CASE 3: NOTHING MATCHES (NONE)
    if (candidates.length === 0) {
      return {
        rfpLineItem: item,
        status: 'NONE',
        selectedSku: null,
        matchPercentage: 0,
        technicalReasoning: "No category match in store. Requires manual sourcing/pricing.",
        top3Recommendations: []
      };
    }

    // PHASE 2: SCORING & AVAILABILITY
    const scoredSkus = candidates.map(sku => {
      const specScore = calculateIndustrialMatch(item.technicalSpecs, sku.specification);
      const stock = evaluateStock(item.quantity, sku.availableQuantity);
      
      // Final Score penalizes low stock for technical readiness
      const finalScore = Math.round(specScore * stock.weight);

      return {
        ...sku,
        matchPercentage: finalScore,
        __stockStatus: stock.status,
        __specScore: specScore
      };
    }).sort((a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0));

    const bestMatch = scoredSkus[0];
    const matchScore = bestMatch.matchPercentage ?? 0;

    // CASE 2: PARTIAL MATCH (Below 80% or below Threshold)
    let finalStatus: 'COMPLETE' | 'PARTIAL' | 'NONE' = 'PARTIAL';
    if (matchScore >= 80) finalStatus = 'COMPLETE';
    if (matchScore < THRESHOLD) finalStatus = 'NONE';

    /* ---------------- RISK LOGGING & REASONING ---------------- */
    let reasoning = `High confidence match (${matchScore}%) for ${item.name}.`;
    
    if (bestMatch.__stockStatus !== 'FULL') {
      riskEntries.push({
        category: 'Logistics',
        riskLevel: bestMatch.__stockStatus === 'ZERO' ? 'High' : 'Medium',
        statement: `Inventory gap for ${item.name}: ${bestMatch.availableQuantity}/${item.quantity} available.`
      });
      reasoning += " Inventory shortfall detected.";
    }

    if (matchScore < 80 && matchScore >= THRESHOLD) {
      riskEntries.push({
        category: 'Technical',
        riskLevel: 'Medium',
        statement: `Partial spec match for ${item.name}. Verify IS Standard compliance manually.`
      });
    }

    return {
      rfpLineItem: item,
      status: finalStatus,
      selectedSku: matchScore >= THRESHOLD ? bestMatch : null,
      matchPercentage: matchScore,
      technicalReasoning: reasoning,
      top3Recommendations: scoredSkus.slice(0, 3),
      complianceChecks: item.technicalSpecs.map(spec => ({
        spec,
        verified: bestMatch.__specScore > 50 && spec.includes("IS")
      }))
    };
  });

  return { lineItemAnalyses, riskEntries };
}

/* =====================================================
    🧪 DEV TESTS
===================================================== */
if (process.env.NODE_ENV === 'development') {
  // Test case for Polycab High Mast Tower
  const result = runTechnicalAgent([{
    name: 'High Mast Lighting Tower',
    quantity: 10,
    technicalSpecs: ['30 Meters', 'IS 875', 'LED Floodlights']
  }], []); 
  console.log('🧪 Industrial Agent Mode:', result.lineItemAnalyses[0]?.status);
}