// server/grok.ts
import Groq from "groq-sdk";
import { extractJsonFromText } from "./utils/extractJson";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export function extractATCSlice(fullText: string): string {
  const startKeywords = [
    "Buyer Added Bid Specific Terms and Conditions", 
    "Buyer Added Bid Specific ATC", 
    "Buyer Added text based ATC clauses",
    "क्रेता द्वारा जोड़ी गई बिड की विशेष शर्तें"
  ];
  const endKeywords = ["अवीकरण/Disclaimer", "Disclaimer", "This Bid is also governed by"];

  let startIndex = -1;
  // Use lastIndexOf because ATCs are always at the end of the document
  for (const kw of startKeywords) {
    startIndex = fullText.lastIndexOf(kw);
    if (startIndex !== -1) break;
  }

  let endIndex = -1;
  if (startIndex !== -1) {
    for (const kw of endKeywords) {
      endIndex = fullText.indexOf(kw, startIndex);
      if (endIndex !== -1) break;
    }
  }

  // Plan A: Perfect Slice
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return fullText.substring(startIndex, endIndex).trim();
  } 
  // Plan B: Found start, but no disclaimer (Fallback slice of 5000 chars)
  else if (startIndex !== -1) {
    return fullText.substring(startIndex, startIndex + 5000).trim();
  } 
  // Plan C: Failsafe (Just grab the bottom of the document)
  else {
    return fullText.slice(-8000).trim();
  }
}

/**
 * Sends the sliced ATC text to Llama-3.3 on Groq for lightning-fast JSON extraction.
 */
export async function parseATCWithGrok(atcText: string) {
  const prompt = `You are a strict Tender Compliance Officer. Read the following Buyer Added Terms and Conditions (ATC) extracted from an Indian GeM tender.
  
  TASK 1: Extract the 3-5 most critical rules/risks (e.g., Payment terms, Delivery conditions, specific Brands requested). Keep them under 100 characters each.
  TASK 2: Extract a strict array of specific Documents or Certificates the buyer is demanding (e.g., "OEM Authorization", "ISO 9001", "Past Experience Certificate").
  
  RETURN ONLY RAW JSON. NO MARKDOWN, NO PREAMBLE.
  {
    "atc_summary": ["Rule 1", "Rule 2"],
    "required_documents": ["Doc 1", "Doc 2"]
  }
  
  ATC TEXT TO ANALYZE:
  ${atcText}
  `;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile", // Insanely fast model for this
      temperature: 0.1
    });

    const rawOutput = response.choices[0]?.message?.content || "{}";
    const cleanJson = extractJsonFromText(rawOutput);
    return JSON.parse(cleanJson);
    
  } catch (error) {
    console.error("⚠️ Grok ATC Extraction Failed:", error);
    // Graceful fallback so it doesn't crash the main pipeline
    return { atc_summary: [], required_documents: [] };
  }
}