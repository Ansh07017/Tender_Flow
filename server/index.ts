// server/index.ts
import 'dotenv/config';
import express, { Request, Response } from "express";
import cors from "cors";
import axios from 'axios';
import { parseRFP } from "./gemini.js";
import { runTechnicalAgent } from "../src/agents/technicalagent";
import runFinancialAgent from "../src/agents/financialagent";
import { productInventory } from "../data/storeData";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { DiscoveryCoordinator } from "./discovery/DiscoveryCoord";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { GoogleGenerativeAI } from "@google/generative-ai";


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
  // Iterate through all pages
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    // Join items with spaces to maintain readable text
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

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

app.post("/api/copilot-chat", async (req: Request, res: Response) => {
  try {
    const { query, context, history } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Construct a context-aware prompt
    const systemInstruction = `
      You are the TenderFlow Copilot, an expert AI assistant for Government Tenders (GeM).
      
      CURRENT CONTEXT:
      ${context ? `
      - Organization: ${context.org}
      - Bid ID: ${context.id}
      - Parsed Data: ${JSON.stringify(context.parsedData).slice(0, 3000)}... (truncated)
      - Financials: ${JSON.stringify(context.financials)}
      ` : "User is on the dashboard. No specific RFP selected."}

      USER HISTORY:
      ${JSON.stringify(history.slice(-5))} 

      YOUR GOAL:
      Answer the user's query briefly and professionally. 
      If they ask about the RFP, use the context provided.
      If they ask about general GeM rules, use your internal knowledge.
      Keep answers under 3 sentences unless asked for details.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });
    const result = await model.generateContent(systemInstruction + "\n\nUser Query: " + query);
    
    res.json({ reply: result.response.text() });

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