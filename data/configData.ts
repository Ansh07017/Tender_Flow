import { AppConfig } from '../types';

export const initialConfig: AppConfig = {
  companyDetails: {
    companyName: 'TenderFlow Industrial Systems',
    companyAddress: 'Lovely Professional University, Phagwara, Jalandhar, Punjab - 144411, India',
    gstin: '03AAACT0000G1Z5',
    pan: 'AAACT0000G',
  },
  signingAuthorities: [
    {
      id: 'DIR-001',
      name: 'Ansh Pratap Singh',
      designation: 'Chief Executive Officer',
      din: '08945210',
    },
    {
      id: 'DIR-002',
      name: 'Operations Head',
      designation: 'Director of Logistics',
      din: '09124432',
    },
  ],
  // FIX: Added discoveryFilters to resolve ts(2741)
  discoveryFilters: {
    radius: 500,               // Search within 500km of Jalandhar
    minMatchThreshold: 20,     // Your "Hard Gate" for Technical Agent
    allowEMD: true,            // Allow tenders requiring Earnest Money Deposit
    categories: [
      "Wires and Cables", 
      "Lighting Pole or Post and Hardware", 
      "High Mast Lighting Tower"
    ]
  }
};