/* =========================
   AGENT & LOGGING TYPES
========================= */

export type AgentName =
  | 'MASTER_AGENT'
  | 'PARSING_ENGINE'
  | 'TECHNICAL_AGENT'
  | 'PRICING_AGENT'
  | 'FINALIZING_AGENT';

export type SystemAgent = 'SYSTEM';

export interface LogEntry {
  timestamp: Date;
  agent: AgentName | SystemAgent;
  message: string;
  /**
   * Always stored as stringified JSON or plain text.
   * Never raw objects → prevents React crashes.
   */
  data?: string;
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

  organisation: string;
  bidType: string;
  closingDate: Date;

  status: RfpStatus;
  rawDocument: string;

  source: 'URL' | 'File';
  fileName?: string;

  ingestionStatus?: {
    detected: boolean;
    encodingWarning: boolean;
    ocrFallback: boolean;
    extracted: boolean;
  };

  agentOutputs: {
    parsedData?: ParsedRfpData;

    eligibilityAnalysis?: {
      criterion: string;
      statusText: string;
      status: 'Pass' | 'Warn' | 'Info' | 'Fail';
    }[];

    technicalAnalysis?: {
      lineItemAnalyses: LineItemTechnicalAnalysis[];
    };

    pricing?: Record<string, number>;

    riskAnalysis?: {
      category: 'Logistics' | 'Compliance' | 'Financial' | 'Technical';
      statement: string;
      riskLevel: 'Low' | 'Medium' | 'High';
    }[];
  };

  activeAgent?: AgentName;
  processingDuration?: number;
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
}

/* =========================
   UI STATE
========================= */

export type View =
  | 'rfps'
  | 'store'
  | 'config'
  | 'logs'
  | 'processing'
  | 'discovery'
  | 'analysis';