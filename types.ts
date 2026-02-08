/* =========================
   AGENT & LOGGING TYPES
========================= */

export type AgentName =
  | 'MASTER_AGENT'
  | 'PARSING_ENGINE'
  | 'TECHNICAL_AGENT'
  | 'PRICING_AGENT'
  | 'SALES_AGENT'      // Add this
  | 'DISCOVERY_AGENT'
  | 'FINALIZING_AGENT'
  | 'SYSTEM';

export type SystemAgent = 'SYSTEM';

export interface LogEntry {
  timestamp: Date;
  agent: AgentName | SystemAgent;
  message: string;
  data?: any;
}

/* =========================
   INVENTORY / SKU TYPES
========================= */

export type TruckType =
  | 'MINI_TRUCK'
  | 'LCV'
  | 'MEDIUM_TRUCK'
  | 'HEAVY_TRUCK';

export interface SKU {
  skuId: string;
  productName: string;
  productCategory: string;
  productSubCategory: string;
  oemBrand: string;

  /**
   * Key-value specs like:
   * { "Diameter": "20mm", "Grade": "SS304" }
   */
  specification: Record<string, string>;

  availableQuantity: number;

  warehouseLocation: string; // "City, State"
  warehouseCode: string;
  warehouseLat: number;
  warehouseLon: number;

  truckType: TruckType;
  leadTime: number; // days

  costPrice: number;
  unitSalesPrice: number;
  bulkSalesPrice: number;
  gstRate: number; // %

  brokerage?: number;
  minMarginPercent: number;

  isActive: boolean;
  isCustomMadePossible: boolean;
  isComplianceReady: boolean;

  /**
   * Used by TECHNICAL_AGENT for ranking
   */
  matchPercentage?: number;
}

/* =========================
   RFP PARSING TYPES
========================= */

export interface RfpProductLineItem {
  name: string;
  quantity: number;
  technicalSpecs: string[];

  requiredStandards?: string[];
  certifications?: CertificationCheck[];
}

export interface CertificationCheck {
  name: string;                      // ISO 9001, BIS, CE etc
  source: 'Technical Specs' | 'Buyer ATC' | 'Seller Docs' | 'Unknown';
  verified: boolean;                 // human verification
}



export interface ParsedRfpData {
  metadata: {
    bidNumber: string;
    issuingOrganization: string;
    bidType: string;
    bidEndDate: string; // ISO string
    offerValidity: number; // days
    deliveryDays?: number;
    itemCategory?: string;
    totalQuantity?: number;
    officeName?: string;
    isBidClosed?: boolean;
    epbgPercent?: number;
    emdAmount?: number;
  };

  products: RfpProductLineItem[];

  mandatoryDocuments: string[];

financialConditions: FinancialConditions;

  eligibilityCriteria?: {
    localSupplierClass?: string;
    turnoverRequirement?: string;
    qualityCertifications?: string[];
    sampleApprovalClause?: string;
    optionClause?: string;
  };

  consignee: string;
}

/* =========================
   TECHNICAL ANALYSIS TYPES
========================= */

export interface LineItemTechnicalAnalysis {
  rfpLineItem: RfpProductLineItem;

  top3Recommendations: SKU[];

  /**
   * Explicitly chosen SKU
   */
  selectedSku: SKU;

  complianceChecks: {
    standard: string;
    status: 'Found' | 'Referenced' | 'NotFound';
    source: string;
    verified: boolean;
  }[];
}
export interface DiscoveryFilters {
  manualAvgKms: number;
    manualRatePerKm: number;
  deliveryType: 'Pan India' | 'Intra State' | 'Zonal';
  allowEMD: boolean;
  categories: string[];
  minMatchThreshold: number; // The 20% rule implementation
}
export interface Tender {
  id: string;
  title: string;
  org: string;
  endDate: string;
  category: string;
  url: string;
  emdRequired: boolean;
  consigneeLocation: string;
  distance?: number;
  matchScore?: number;
  inStock?: boolean;
  isQualified?: boolean;
  risk: 'Low' | 'Medium' | 'High';
}
/* =========================
   CORE RFP ENTITY
========================= */

export type RfpStatus =
  | 'Pending'
  | 'Extracting'
  | 'Parsing'
  | 'Processing'
  | 'Complete'
  | 'Error';

export interface Rfp {
  id: string;

  // Tender-specific fields (often populated by Discovery Agent)
  organisation: string;
  bidType: string;
  closingDate: Date;
  
  // High-level metadata
  status: RfpStatus;
  rawDocument: string; // Original text or URL content

  // Source tracking
  source: 'URL' | 'File';
  fileName?: string; // Original filename or Tender ID
  
  // AGENTIC UPDATES: State tracking for processing
  activeAgent?: AgentName; 
  processingDuration?: number; // In seconds
  
  // Storage for the structured data returned by agents
  agentOutputs?: {
    parsedData?: any;      // Results from Parsing Engine
    technicalMatch?: any;  // Results from Technical Agent
    pricingAnalysis?: any; // Results from Pricing Agent
  };

  ingestionStatus?: {
    detected: boolean;
    encodingWarning: boolean;
    ocrFallback: boolean;
    extracted: boolean;
  };
}
/* =========================
   APP CONFIGURATION
========================= */

export interface CompanyConfig {
  companyName: string;
  companyAddress: string;
  gstin: string;
  pan: string;
}
export interface FinancialConditions {
  epbg: string;        // "Required" | "Not Required" | "No"
  emd: string;        // "Required" | "No"
  paymentTerms: string;
}

export interface SigningAuthority {
  id: string;
  name: string;
  designation: string;
  din: string;
}

export interface AppConfig {
  companyDetails: CompanyConfig;
  signingAuthorities: SigningAuthority[];
  discoveryFilters: {
    allowEMD: boolean;
    minMatchThreshold: number;
    categories: [string,string,string];
    manualAvgKms: number;
    manualRatePerKm: number;
  };
}

/* =========================
   UI STATE
========================= */

export type View =
  | 'frontpage'
  | 'rfps'
  | 'store'
  | 'config'
  | 'logs'
  | 'processing'
  | 'discovery'
  | 'analysis';