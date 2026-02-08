import { Rfp } from '../types';

const today = new Date();
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// 1. CPWD - Tubular Street Light Poles (Matches PLB-LGT-TUB-9M-V2)
export const rfpDoc_CPWD_Poles = `
Central Public Works Department - Notice Inviting Tender

--- BID DETAILS ---
Bid Number: GEM/2026/B/987654
Dated: 02-01-2026
Bid End Date/Time: 28-02-2026 17:00:00
Bid Offer Validity: 180 (Days)
Type of Bid: Two Packet Bid

--- ORGANIZATION DETAILS ---
Ministry: Ministry of Housing and Urban Affairs
Department: Central Public Works Department (CPWD)
Organisation: CPWD, Gurgaon Division

--- ITEM DETAILS ---
Total Quantity: 100
Item Category: Lighting Pole or Post and Hardware - Tubular Street Light Poles (V2) (Q3)
Make: Polycab / Havells / Finolex or equivalent

--- TECHNICAL SPECIFICATIONS ---
- Type: Swaged Steel Tubular Pole
- Overall Length: 9 Meters
- Standard: Must comply with IS 2713
- Finish: Hot Dip Galvanized
`;

// 2. NHAI - High Mast Lighting (Matches PLB-HMT-30M-V2Q3)
export const rfpDoc_NHAI_HighMast = `
National Highways Authority of India - NHAI E-Tender

Bid Number: NHAI/PUNJAB/2026/B/112233
Item Description: High Mast Lighting Tower for large area with LED Flood Lighting System (Q3)
Quantity: 15
Bid End Date: 15-03-2026 18:00:00
Consignee: Project Director, NHAI PIU Jalandhar

Technical Specs:
- Height: 30 Meters
- Mechanism: Raising and Lowering type
- Standards: IS 875 Part-3 (Wind Loading)
- Luminaires: High power LED Flood Lights included
`;

// 3. Ministry of Power - Armoured Cables (Matches PLB-MCCB-125A-4P-36K or similar)
export const rfpDoc_PowerGrid_Cables = `
Power Grid Corporation of India - Request for Quotation

RFQ Number: PGCIL/WR1/2026/CABLE/101
Item Description: PVC Insulated Unsheathed Flexible Cable
Quantity: 2000 Meters
Bid End Date: 22-03-2026 15:00:00
Consignee: PGCIL Substation, Nagpur, Maharashtra

Technical Specs:
- Standard: IS 694
- Voltage Grade: 1100V
- Size: 1.5 sq.mm
- Conductor: Flexible Copper
`;

// 4. NIC - Networking Infrastructure (Matches CIS-L3S-C9300-48T)
export const rfpDoc_NIC_Switches = `
National Informatics Centre - Vendor Enquiry

Enquiry No: NIC/DATA-CENTER/2026/045
Item: Layer - 3 Distribution Switch (Managed Ethernet Switches)
Quantity: 10
Closing Date: 05-04-2026 17:00:00

Technical Specs:
- Type: Layer-3 Distribution
- Ports: 48-port Data Only
- Stacking Bandwidth: 480 Gbps
- Service: Supply, Installation, Testing, Commissioning (SITC)
`;

// 5. Port Trust - Industrial Protection (Matches PLB-MCCB-125A-4P-36K)
export const rfpDoc_PortTrust_MCCB = `
Visakhapatnam Port Trust - Material Procurement Tender

Tender ID: VPT/ELECT/2026/78
Item: Molded Case Circuit Breakers (MCCB) - 125A 4-Pole
Quantity: 25
Bid End Date: 12-03-2026 14:00:00

Technical Specs:
- Standard: IS/IEC 60947
- Rating: 125 Ampere
- Breaking Capacity: 36kA
- Poles: 4-Pole
`;

export const rfpDocumentContent = rfpDoc_CPWD_Poles;

export const initialRfpList: Rfp[] = [
  {
    id: 'GEM/2026/B/987654',
    organisation: 'CPWD, Gurgaon Division',
    bidType: 'Two Packet Bid',
    closingDate: new Date('2026-02-28T17:00:00'),
    status: 'Pending',
    rawDocument: rfpDoc_CPWD_Poles,
    source: 'File',
    fileName: 'CPWD-Tubular-Poles.pdf',
    agentOutputs: {},
  },
  {
    id: 'NHAI/PUNJAB/2026/B/112233',
    organisation: 'NHAI, PIU Jalandhar',
    bidType: 'Single Packet Bid',
    closingDate: addDays(today, 25),
    status: 'Pending',
    rawDocument: rfpDoc_NHAI_HighMast,
    source: 'URL',
    fileName: 'https://nhai.gov.in/tenders/high-mast-112233',
    agentOutputs: {},
  },
  {
    id: 'PGCIL/WR1/2026/CABLE/101',
    organisation: 'Power Grid Corporation',
    bidType: 'Two Packet Bid',
    closingDate: addDays(today, 32),
    status: 'Pending',
    rawDocument: rfpDoc_PowerGrid_Cables,
    source: 'File',
    fileName: 'PGCIL-Cable-RFQ.pdf',
    agentOutputs: {},
  },
  {
    id: 'NIC/DATA-CENTER/2026/045',
    organisation: 'NIC Data Center',
    bidType: 'Single Packet Bid',
    closingDate: addDays(today, 45),
    status: 'Pending',
    rawDocument: rfpDoc_NIC_Switches,
    source: 'URL',
    fileName: 'https://nic.gov.in/vendor/switches-045',
    agentOutputs: {},
  },
  {
    id: 'VPT/ELECT/2026/78',
    organisation: 'Visakhapatnam Port Trust',
    bidType: 'Two Packet Bid',
    closingDate: addDays(today, 22),
    status: 'Pending',
    rawDocument: rfpDoc_PortTrust_MCCB,
    source: 'File',
    fileName: 'VPT-MCCB-Tender.pdf',
    agentOutputs: {},
  },
];