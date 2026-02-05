import { SKU, RfpProductLineItem, LineItemTechnicalAnalysis } from '../../types';

/* =====================================================
   CONFIG – tweak safely without breaking logic
===================================================== */

const AVAILABILITY_WEIGHTS = {
  FULL: 1.0,        // 100% available
  PARTIAL: 0.7,     // partial stock
  ZERO: 0.0,        // no stock
};

const PARTIAL_AVAILABILITY_THRESHOLD = 0.5; // 50%

/* =====================================================
   CORE HELPERS
===================================================== */

function calculateSpecMatch(
  rfpSpecs: string[],
  skuSpecs: Record<string, string>
): number {
  if (rfpSpecs.length === 0) return 50; // neutral baseline

  let matched = 0;

  rfpSpecs.forEach(spec => {
    const normalized = spec.toLowerCase();
    Object.values(skuSpecs).forEach(v => {
      if (normalized.includes(String(v).toLowerCase())) {
        matched++;
      }
    });
  });

  return Math.min(100, Math.round((matched / rfpSpecs.length) * 100));
}

function evaluateAvailability(
  requiredQty: number,
  availableQty: number
): {
  weight: number;
  status: 'FULL' | 'PARTIAL' | 'ZERO';
} {
  if (availableQty <= 0) {
    return { weight: AVAILABILITY_WEIGHTS.ZERO, status: 'ZERO' };
  }

  if (availableQty >= requiredQty) {
    return { weight: AVAILABILITY_WEIGHTS.FULL, status: 'FULL' };
  }

  const ratio = availableQty / requiredQty;

  if (ratio >= PARTIAL_AVAILABILITY_THRESHOLD) {
    return { weight: AVAILABILITY_WEIGHTS.PARTIAL, status: 'PARTIAL' };
  }

  return { weight: AVAILABILITY_WEIGHTS.ZERO, status: 'ZERO' };
}

/* =====================================================
   MAIN TECHNICAL AGENT
===================================================== */

export function runTechnicalAgent(
  rfpItems: RfpProductLineItem[],
  skus: SKU[]
): {
  lineItemAnalyses: LineItemTechnicalAnalysis[];
  riskEntries: {
    category: 'Technical' | 'Logistics';
    statement: string;
    riskLevel: 'Low' | 'Medium' | 'High';
  }[];
} {
  if (!Array.isArray(rfpItems) || rfpItems.length === 0) {
    return {
      lineItemAnalyses: [],
      riskEntries: [
        {
          category: 'Technical',
          riskLevel: 'High',
          statement:
            'No valid line items found in RFP. Technical specifications missing or unstructured.',
        },
      ],
    };
  }
  const riskEntries: any[] = [];

  const lineItemAnalyses: LineItemTechnicalAnalysis[] = rfpItems.map(
    (item) => {
      const scoredSkus = skus.map(sku => {
        const specScore = calculateSpecMatch(
          item.technicalSpecs,
          sku.specification
        );

        const availability = evaluateAvailability(
          item.quantity,
          sku.availableQuantity
        );

        const finalScore = Math.round(
          specScore * availability.weight
        );

        return {
          ...sku,
          matchPercentage: finalScore,
          __availabilityStatus: availability.status,
        };
      });

      scoredSkus.sort(
        (a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0)
      );

      const selectedSku = scoredSkus[0];

      /* ---------------- RISK LOGGING ---------------- */

      if (selectedSku.__availabilityStatus === 'PARTIAL') {
        riskEntries.push({
          category: 'Logistics',
          riskLevel: 'Medium',
          statement: `Partial availability for "${item.name}". ${selectedSku.availableQuantity}/${item.quantity} units available.`
        });
      }

      if (selectedSku.__availabilityStatus === 'ZERO') {
        riskEntries.push({
          category: 'Logistics',
          riskLevel: 'High',
          statement: `No immediate stock for "${item.name}". Custom manufacturing or alternate sourcing required.`
        });
      }

      /* ---------------- COMPLIANCE PLACEHOLDER ---------------- */

      const complianceChecks = item.requiredStandards?.map(std => ({
        standard: std,
        status: 'Referenced' as const,
        source: 'RFP',
        verified: false
      })) ?? [];

      return {
        rfpLineItem: item,
        top3Recommendations: scoredSkus.slice(0, 3),
        selectedSku,
        complianceChecks,
      };
    }
  );

  return {
    lineItemAnalyses,
    riskEntries
  };
}

/* =====================================================
   🔬 BASIC UNIT TESTS (DEV ONLY)
===================================================== */

if (process.env.NODE_ENV === 'development') {
  const mockItem: RfpProductLineItem = {
    name: 'Steel Bolt',
    quantity: 100,
    technicalSpecs: ['ISO 9001', 'M10', 'SS304'],
  };

  const skuFull: SKU = {
    skuId: 'SKU_FULL',
    productName: 'Steel Bolt A',
    productCategory: 'Fasteners',
    productSubCategory: 'Bolts',
    oemBrand: 'OEM',
    specification: { Grade: 'SS304', Size: 'M10' },
    availableQuantity: 200,
    warehouseLocation: 'Delhi',
    warehouseCode: 'DL1',
    warehouseLat: 0,
    warehouseLon: 0,
    truckType: 'LCV',
    leadTime: 2,
    costPrice: 10,
    unitSalesPrice: 15,
    bulkSalesPrice: 14,
    gstRate: 18,
    minMarginPercent: 10,
    isActive: true,
    isCustomMadePossible: false,
    isComplianceReady: true,
  };

  const skuPartial = { ...skuFull, skuId: 'SKU_PARTIAL', availableQuantity: 60 };
  const skuZero = { ...skuFull, skuId: 'SKU_ZERO', availableQuantity: 0 };

  const result = runTechnicalAgent(
    [mockItem],
    [skuZero, skuPartial, skuFull]
  );

  console.log('🧪 Technical Agent Test Result:', result);
}
