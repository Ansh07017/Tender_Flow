import { SKU, RfpProductLineItem} from '../../types';

/* =====================================================
    CONFIG – Industrial Strategic Weights
===================================================== */
const WEIGHTS = {
  CATEGORY_MATCH: 1.0,
  IS_STANDARD: 0.60,    // 60% of technical score
  SPEC_DETAILS: 0.40,   // 40% of technical score
};

const AVAILABILITY = {
  FULL: 1.0,
  PARTIAL: 0.8,
  ZERO: 0.4, // Keep visible for manual sourcing
  THRESHOLD: 0.4, 
};

/* =====================================================
    CORE HELPERS
===================================================== */

function calculateIndustrialMatch(
  rfpSpecs: string[],
  skuSpecs: Record<string, string>
): number {
  if (!rfpSpecs || rfpSpecs.length === 0) return 60;

  let score = 0;
  const skuValues = Object.values(skuSpecs).map(v => String(v).toLowerCase());
  
  // 1. IS Standard Check (60% Weight)
  const hasStandardMatch = rfpSpecs.some(spec => 
    skuValues.some(val => val.includes("is") && spec.toLowerCase().includes(val))
  );
  if (hasStandardMatch) score += (WEIGHTS.IS_STANDARD * 100);

  // 2. Attribute Deep Dive (40% Weight)
  let matchedAttributes = 0;
  rfpSpecs.forEach(spec => {
    if (skuValues.some(val => val.length > 2 && spec.toLowerCase().includes(val))) {
      matchedAttributes++;
    }
  });

  score += (matchedAttributes / Math.max(rfpSpecs.length, 1)) * (WEIGHTS.SPEC_DETAILS * 100);
  return Math.min(100, Math.max(30, Math.round(score)));
}

/* =====================================================
    MAIN TECHNICAL AGENT
===================================================== */

export function runTechnicalAgent(
  rfpItems: RfpProductLineItem[],
  skus: SKU[]
): { itemAnalyses: any[]; riskEntries: any[] } {
  console.log(`\n[TECHNICAL_AGENT] 🔍 Initiating Audit for ${rfpItems.length} line items...`);
  const riskEntries: any[] = [];
  const THRESHOLD = 15;

  const itemAnalyses = rfpItems.map((item, index) => {
    const rfpCat = item.name.toLowerCase();
    const rfpKeywords = rfpCat.split(/[\s,/-]+/).filter(k => k.length >= 2);

    console.log(`[TECHNICAL_AGENT] 📦 Item ${index + 1}: "${item.name}" | Keywords: [${rfpKeywords.join(', ')}]`);

    // PHASE 1: KEYWORD DISCOVERY
    const candidates = skus.filter(sku => {
      const skuText = `${sku.productCategory} ${sku.productSubCategory} ${sku.productName}`.toLowerCase();
      return rfpKeywords.some(kw => skuText.includes(kw));
    });

    if (candidates.length === 0) {
      console.warn(`[TECHNICAL_AGENT] ⚠️ ZERO candidates found for "${item.name}" in Hub Inventory.`);
      return {
        rfpLineItem: item,
        status: 'NONE',
        selectedSku: null,
        matchPercentage: 0,
        technicalReasoning: "No keyword overlap found in Jalandhar Hub inventory.",
        top3Recommendations: []
      };
    }

    console.log(`[TECHNICAL_AGENT] Found ${candidates.length} potential SKU candidates.`);

    // PHASE 2: SCORING
    const scoredCandidates = candidates.map(sku => {
      const specScore = calculateIndustrialMatch(item.technicalSpecs, sku.specification);
      const stockWeight = sku.availableQuantity >= item.quantity ? AVAILABILITY.FULL : 
                         sku.availableQuantity > 0 ? AVAILABILITY.PARTIAL : AVAILABILITY.ZERO;
      
      const finalScore = Math.round(specScore * stockWeight);

      return {
        ...sku,
        matchPercentage: finalScore,
        __stockStatus: stockWeight === 1.0 ? 'FULL' : stockWeight === 0.8 ? 'PARTIAL' : 'ZERO',
        __specScore: specScore
      };
    }).sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));

    const bestMatch = scoredCandidates[0];
    const matchScore = bestMatch.matchPercentage || 0;

    console.log(`[TECHNICAL_AGENT] ✅ Best Match: ${bestMatch.skuId} | Score: ${matchScore}% | Stock: ${bestMatch.__stockStatus}`);

    // PHASE 3: STATUS & RISK
    let status: 'COMPLETE' | 'PARTIAL' | 'NONE' = 'PARTIAL';
    if (matchScore >= 75) status = 'COMPLETE';
    if (matchScore < THRESHOLD) status = 'NONE';

    if (bestMatch.availableQuantity < item.quantity) {
      riskEntries.push({
        category: 'Logistics',
        riskLevel: bestMatch.availableQuantity === 0 ? 'High' : 'Medium',
        statement: `Line Item ${index + 1}: Inventory shortfall (${bestMatch.availableQuantity}/${item.quantity}).`
      });
    }

    return {
      rfpLineItem: item,
      status,
      selectedSku: bestMatch,
      matchPercentage: matchScore,
      technicalReasoning: `Matched via ${matchScore}% spec alignment with ${bestMatch.productName}.`,
      top3Recommendations: scoredCandidates.slice(0, 3),
      complianceChecks: (item.technicalSpecs || []).map(spec => ({
        standard: spec,
        status: bestMatch.__specScore > 50 ? 'Found' : 'Referenced',
        verified: true
      }))
    };
  });

  console.log(`[TECHNICAL_AGENT] 🏁 Audit Complete. Generated ${riskEntries.length} risk alerts.\n`);

  return { 
    itemAnalyses, 
    riskEntries 
  };
}