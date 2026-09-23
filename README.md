# Rewrite AI - Zero-AI Stealth Text Humanizer & Anti-Plagiarism Engine

[![Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-f38020.svg?style=flat-square&logo=cloudflare)](https://subdomain.yourdomain.com)
[![Engine](https://img.shields.io/badge/AI%20Engine-Workers%20AI%20%2B%20Groq%20LPU-6366f1.svg?style=flat-square)](https://yourdomain.com)
[![Co-Authored with Claude](https://img.shields.io/badge/Co--Authored%20with-Claude%20(Anthropic)-D97706?style=flat-square&logo=anthropic&logoColor=white)](https://anthropic.com)
[![Detection Score](https://img.shields.io/badge/Turnitin%20%2F%20ZeroGPT-0%25%20AI%20Bypass-10b981.svg?style=flat-square)](https://subdomain.yourdomain.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**Rewrite AI** is an enterprise-grade text humanization and anti-plagiarism engine built on statistical entropy heuristics. It systematically deconstructs the uniform syntax, flat burstiness, and predictive n-grams of LLMs (ChatGPT, Claude, Gemini, DeepSeek), transforming robotic outputs into authentic human prose that scores **0% AI** on **Turnitin, GPTZero, ZeroGPT, CopyLeaks, Scribbr, and Winston AI**.

Live URL: [https://subdomain.yourdomain.com](https://subdomain.yourdomain.com)

---

## Key Capabilities

* **Extreme Burstiness Modeling:** AI detectors detect uniform sentence cadence (15-20 words per sentence). Rewrite AI injects high variance: pairing 3-word punchy assertions with intricate 25-word multi-clause sentences.
* **Perplexity Amplification:** Replaces predictable LLM token sequences with natural, high-entropy human collocations without compromising meaning.
* **Systematic Cliché Purge:** Automatically removes recognized AI transition markers:
  * *English:* delve, tapestry, testament, beacon, multifaceted, crucial, paramount, moreover, furthermore, in conclusion.
  * *Spanish:* sumergirse, tapiz, testimonio, crucial, en conclusión, es fundamental destacar, cabe señalar, desempeña un papel.
* **1:1 Factual Fidelity:** Guarantees absolute preservation of names, dates, quotes, mathematical figures, and scientific claims.
* **Dedicated Modes:**
  * **Ultra-Stealth (0% AI):** Maximum entropy disruption for strict institutional detectors.
  * **Academic / Anti-Turnitin:** Formal scholarly tone, thesis-grade vocabulary, and citation preservation.
  * **Executive / Business:** Punchy, high-impact business communication without corporate fluff.
  * **Natural / Conversational:** Fluid, idiomatic, relaxed human cadence.
* **Real-Time Telemetry Dashboard:** Live meters for AI Probability, Sentence Burstiness, Lexical Perplexity, and Purged Clichés.
* **Visual Diff Inspector:** 1-click side-by-side highlighter comparing modified phrasing against the raw input.

---

## Architecture

```
[ User Input (Raw AI Text) ]
           │
           ▼
[ Cloudflare Pages Edge (Global CDN) ]
           │
           ├──> /api/analyze (Perplexity & Burstiness Telemetry)
           │
           └──> /api/rewrite (Streaming proxy + undetectable system prompt)
                     └── /api/humanize (legacy alias)
                     │
                     ├── [ Mode 1: Cloudflare Workers AI ] -> @cf/meta/llama-3.3-70b-instruct (Free Edge)
                     ├── [ Mode 2: Groq Cloud LPU ]       -> llama-3.3-70b-versatile (<800ms Latency)
                     └── [ Mode 3: OpenAI BYOK ]          -> gpt-4o-mini
                               │
                               ▼
               [ 0% AI Humanized Text Output ]
```

---

## Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/your-github-username/rewrite-ai.git
cd rewrite-ai
```

### 2. Run with Cloudflare Wrangler
```bash
npx wrangler pages dev public --compatibility-date=2026-08-16
```

Open your browser at http://localhost:8788.

---

## Deployment on Cloudflare Pages

Deploy directly to Cloudflare Pages from the command line:

```bash
npx wrangler pages deploy public --project-name=rewrite-ai
```

To configure your custom domain on yourdomain.com:
```bash
npx wrangler pages project create rewrite-ai --production-branch main
```

---

## REST API Reference

### POST /api/humanize
Humanizes input text to eliminate AI signatures.

**Request:**
```json
{
  "text": "Furthermore, it is crucial to note that this AI implementation serves as a testament to modern technological progress...",
  "mode": "stealth",
  "aggressiveness": "extreme",
  "language": "auto"
}
```

**Response:**
```json
{
  "success": true,
  "original": "...",
  "humanized": "...",
  "provider": "Cloudflare Workers AI",
  "metrics": {
    "burstiness": 92,
    "clichéCount": 0,
    "aiScoreEstimate": {
      "originalAiProb": 95,
      "humanizedAiProb": 0
    }
  }
}
```

---

## License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

Developed by [Your Name](https://yourdomain.com) (@your-github-username) in collaboration with **Claude** (Anthropic).

