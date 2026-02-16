// server/index.ts
import 'dotenv/config';
import { pool } from './db';
import express, { Request, Response } from "express";
import cors from "cors";
import axios from 'axios';
import { parseRFP} from "./gemini.js";
import { runTechnicalAgent } from "../src/agents/technicalagent";
import runFinancialAgent from "../src/agents/financialagent";
import { productInventory } from "../data/storeData";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { DiscoveryCoordinator } from "./discovery/DiscoveryCoord";
import { getHelperBotResponse } from "./chatbot.js";
import { login, setupPin, setup2FA, verify2FA, verifyVaultAccess,checkEmail,sendAuthOtp,verifyAuthOtp } from './auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});


async function extractTextFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  
  let fullText = "";
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    let pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    pageText = pageText.replace(/\*{7,}/g, (match) => "Location not visible due to security reasons");
    pageText = pageText.replace(/\*{5,}([A-Z\s,]+)/g, "$1");
    fullText += pageText + "\n";
  }
  return fullText;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.post("/api/auth/login", login);           
app.post("/api/vault/setup-pin", setupPin);   
app.post("/api/vault/setup-2fa", setup2FA);
app.post("/api/vault/verify-2fa", verify2FA);
app.post("/api/vault/verify-pin", verifyVaultAccess);
app.post("/api/auth/check-email", checkEmail);
app.post("/api/auth/send-otp", sendAuthOtp);
app.post("/api/auth/verify-otp", verifyAuthOtp);

app.post("/api/discover", async (req: Request, res: Response) => {
  try {
    const { portal, category, filters, inventory } = req.body;

    if (!category || !inventory) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required discovery parameters (category or inventory)." 
      });
    }

    // Initialize Coordinator with a server-side console logger
    const coordinator = new DiscoveryCoordinator(inventory, (agent, message, data) => {
      console.log(`[${agent}] ${message}`, data || "");
    });

    addLogToConsole('MASTER_AGENT', `Starting discovery for: ${category}`);
    
    const qualifiedBids = await coordinator.runDiscovery(
      portal || 'gem', 
      category, 
      filters
    );

    res.json({ 
      success: true, 
      data: qualifiedBids 
    });

  } catch (err: any) {
    console.error("Discovery Route Error:", err.message);
    res.status(500).json({ 
      success: false, 
      error: "Discovery Agent failed to scan portals",
      message: err.message 
    });
  }
});

const vaultDir = path.join(process.cwd(), 'vault_storage'); 

if (!fs.existsSync(vaultDir)){
    fs.mkdirSync(vaultDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, vaultDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// Upload Document
app.post('/api/vault/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const { docId } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "No file uploaded" });

        await pool.query(
            "UPDATE compliance_vault SET file_path = $1, is_valid = true, expiry_date = $2 WHERE id = $3",
            [file.path, '2026-12-31', docId]
        );

        res.json({ success: true, filePath: file.path });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

// Secure Download
app.get('/api/vault/download/:filename', (req, res) => {
    const filePath = path.join(vaultDir, req.params.filename);
    res.download(filePath);
});

app.post("/api/copilot-chat", async (req: Request, res: Response) => {
  try {
    const { query, context, history } = req.body;

    // Use the specialized Groq service (to be created in Step 2)
    const reply = await getHelperBotResponse(query, context, history);
    
    res.json({ reply });

  } catch (err: any) {
    console.error("Copilot Error:", err);
    res.status(500).json({ reply: "I encountered a processing error. Please try again." });
  }
});


// Helper for server-side logging visibility
function addLogToConsole(agent: string, message: string) {
  console.log(`\x1b[35m%s\x1b[0m`, `[${agent}]`, message); 
}

app.post("/api/fetch-rfp-url", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    // Download the PDF buffer with a real User-Agent to avoid blocks
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const extractedText = await extractTextFromBuffer(response.data);
    res.json({ content: extractedText }); 
  } catch (err: any) {
    console.error("URL Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch or parse GeM PDF" });
  }
});

app.post("/api/parse-rfp", async (req: Request, res: Response) => {
  try {
    const { content, filters } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({
        error: "INVALID_REQUEST",
        message: "RFP content is missing or invalid"
      });
    }

  // 1. API to Fetch Compliance Data for Analysis
app.get("/api/compliance-check", async (req: Request, res: Response) => {
  try {
    const profile = await pool.query("SELECT * FROM company_profile LIMIT 1");
    const certs = await pool.query("SELECT cert_name, is_valid, expiry_date FROM compliance_vault");
    
    res.json({
      profile: profile.rows[0],
      certificates: certs.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch compliance data" });
  }
});


// 2. Secure API to Update Vault (Used by ConfigScreen)
app.post("/api/update-config", async (req: Request, res: Response) => {
  const { password, companyDetails } = req.body;
  
  if (password !== "TF-Admin-2026") {
    return res.status(401).json({ error: "Unauthorized Vault Access" });
  }

  try {
    await pool.query(
      "UPDATE company_profile SET company_name = $1, address = $2, gstin = $3, pan = $4",
      [companyDetails.companyName, companyDetails.companyAddress, companyDetails.gstin, companyDetails.pan]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database update failed" });
  }
});
// server/index.ts

app.get("/api/inventory", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM product_inventory ORDER BY product_name ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Inventory Retrieval Error");
  }
});

app.post("/api/inventory/update-stock", async (req, res) => {
  const { skuId, newQty } = req.body;
  await pool.query("UPDATE product_inventory SET available_qty = $1 WHERE sku_id = $2", [newQty, skuId]);
  res.json({ success: true });
});
    /* -------------------------------
       1️⃣ Parse + Normalize RFP
    -------------------------------- */
    const parsedData = await parseRFP(content);

    const products = Array.isArray(parsedData?.products)
      ? parsedData.products
      : [];

    /* -------------------------------
       2️⃣ Handle PARTIAL / EMPTY RFP
    -------------------------------- */
    if (products.length === 0) {
      return res.json({
        data: {
          parsedData,

          technicalAnalysis: {
            itemAnalyses: [],
          },

          pricing: {},

          riskAnalysis: [
            {
              category: "Technical",
              riskLevel: "High",
              statement:
                "No structured line items found in RFP. Specifications may be unstructured or present in annexures."
            }
          ],
        },
      });
    }


    /* -------------------------------
       3️⃣ Technical Agent
    -------------------------------- */
    const technicalResult = runTechnicalAgent(
      products,
      productInventory
    );

    /* -------------------------------
       4️⃣ Financial Agent (guarded)
    -------------------------------- */
    const hasLineItems =
  technicalResult?.itemAnalyses &&
  technicalResult.itemAnalyses.length > 0;


  const defaultFilters = {
  manualAvgKms: 0,
  manualRatePerKm: 55, // Your standard rate
  allowEMD: true,
  minMatchThreshold: 20
};

const financialResult = hasLineItems
  ? runFinancialAgent(
      technicalResult.itemAnalyses, 
      parsedData,
      filters||defaultFilters,
    )
  : { pricing: {}, riskEntries: [] ,summary: {}};

    /* -------------------------------
       5️⃣ Unified Response
    -------------------------------- */
    res.json({
      data: {
        parsedData,
        technicalAnalysis: {
          itemAnalyses: technicalResult.itemAnalyses ?? [],
        },
        pricing: financialResult || { pricing: {}, riskEntries: [], summary: {} },
        riskAnalysis: [
          ...(technicalResult.riskEntries ?? []),
          ...(financialResult.riskEntries ?? []),
        ],
      },
    });
    
  } catch (err: any) {
    console.error("🔥 BACKEND CRITICAL ERROR:", err);

    return res.status(500).json({
      error: "BACKEND_LIVE_ERROR",
      message:
        err?.message ||
        "Processing failed at " + new Date().toISOString(),
      stack:
        process.env.NODE_ENV === "development"
          ? err?.stack
          : undefined,
    });
  }
});

/* -------------------------------
   Server bootstrap
-------------------------------- */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Agent backend running on http://localhost:${PORT}`);
});