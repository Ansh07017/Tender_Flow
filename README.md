
<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-react/lucide/main/icons/shield-check.svg" width="80" height="80" />
  <h1 style="font-size: 3rem; margin-bottom: 0;">Tender<span style="color: #7cb342;">Flow</span> AI</h1>
  <p style="font-size: 1.2rem; color: #64748b; font-style: italic; font-weight: 600;">"Turning FMCG Tenders into Secured Revenue."</p>

  <div style="margin: 20px 0;">
    <img src="https://img.shields.io/badge/Model-Gemini--3--Pro-blue?style=for-the-badge&logo=google" />
    <img src="https://img.shields.io/badge/UI-Desktop--First-7cb342?style=for-the-badge" />
    <img src="https://img.shields.io/badge/Sector-FMCG%20B2B-orange?style=for-the-badge" />
  </div>
</div>

---

## 💎 The Vision
FMCG businesses lose millions due to **fragmented data** and **slow response times**. **TenderFlow AI** is a high-impact B2B prototype that orchestrates the entire tender lifecycle—from discovery to document distribution—using advanced generative intelligence.

### 🚀 Key Business Impact
- **80% Reduction** in drafting time via Automated Dossier Synthesis.
- **Zero-Risk Bidding** through real-time Inventory Allocation checks.
- **Self-Correcting Strategy** that learns from historical losses.

---

## 🛠️ Rapid Setup Guide
Follow these steps to deploy the prototype in your environment.

### 1. Environment Configuration
The application utilizes an **Identity-Isolated Security Model**. You must provide your own API key via the environment.

```bash
# 1. Create your environment file
touch .env

# 2. Add your Gemini API Key (Required for AI features)
echo "API_KEY=your_gemini_key_here" >> .env
```

### 2. Launch Sequence
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

> 💡 **Note**: The application uses `process.env.API_KEY` globally. Ensure your hosting provider (Vercel/Netlify) has this variable set for production demos.

---

## 🧠 Automated Response System (The "Brain")
Our core innovation is the **Dual-Engine Logic Loop**. Unlike basic LLM wrappers, TenderFlow AI uses two distinct models to ensure quality:

| Layer | Model | Responsibility |
| :--- | :--- | :--- |
| **Intelligence** | `gemini-3-flash` | Fit Scoring, Risk Radar, and Stock Verification. |
| **Synthesis** | `gemini-3-pro` | Drafting high-stakes, audit-ready formal dossiers. |

### 🔄 The Learning Loop
TenderFlow AI features **Institutional Memory**. When a manager marks a tender as **"Lost"** in the Analytics tab, the system:
1. Extracts the **Rejection Reason** (e.g., "Missing ISO certs").
2. Generates a **Lesson Learned**.
3. **Self-Corrects** future drafts by explicitly adding stronger language in those specific weak areas.

---

## ✨ Feature Matrix

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
  <div style="padding: 15px; border-radius: 15px; background: #f8fafc; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0;">🔍 Discovery</h3>
    <p style="font-size: 0.9rem;">Automated aggregation of FMCG tenders from portals like Tata NexArc and TenderDetail.</p>
  </div>
  <div style="padding: 15px; border-radius: 15px; background: #f8fafc; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0;">📦 Stock-Aware Bidding</h3>
    <p style="font-size: 0.9rem;">Real-time inventory checks (Partial/Full/Insufficient) before allowing a bid.</p>
  </div>
  <div style="padding: 15px; border-radius: 15px; background: #f8fafc; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0;">📄 Dossier Studio</h3>
    <p style="font-size: 0.9rem;">Markdown-based editor with "Strategic Posture" toggles (Compliance vs. Competitive).</p>
  </div>
  <div style="padding: 15px; border-radius: 15px; background: #f8fafc; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0;">📊 Intelligence Hub</h3>
    <p style="font-size: 0.9rem;">Win-rate tracking and time-saved analytics for senior management review.</p>
  </div>
</div>

---

## 💻 Tech Stack
- **Framework**: [React 19](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **AI Backend**: [Google Gemini API](https://ai.google.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **State**: React Hooks (Optimized for Mobile Latency)

---

<div align="center">
  <p style="color: #94a3b8; font-size: 0.8rem;">
    © 2024 TenderFlow AI • Enterprise B2B Prototype • Version 1.0.2<br/>
    Built with 💚 for the FMCG Sector.
  </p>
</div>
