# 🎯 AI Math Grader: Automated Exam Assessment

> **A real-world AI solution providing high-accuracy grading for handwritten mathematics exams.**

## 📖 Introduction
This project was born at the intersection of professional growth and personal need. As a Full-Stack developer preparing for a role requiring hands-on experience with modern AI orchestration (OpenAI, LangChain, Vercel AI SDK), I decided to tackle a real-world problem: helping my daughter prepare for her competitive Hvitfeldska Spetsutbildning math entrance exam.

Built in just a few hours using **Claude 3.5 Sonnet** and **Gemini 2.0 Flash**, this platform automates the grading of handwritten Swedish math solutions, providing instant pedagogical feedback and reducing the burden of manual grading.

---

## ✨ Key Features

- **📸 iPhone Photo Processing**: Native support for HEIC/HEIF images with server-side optimization.
- **👁️ Multimodal Vision-AI**: Intelligent OCR and reasoning that interprets complex Swedish handwriting and mathematical notation.
- **📚 Multi-Page Context**: maintained across up to 10 pages, allowing for holistic grading of long-form solutions.
- **🛡️ Provider-Agnostic**: Modular architecture supporting Google Gemini, OpenAI GPT-4o, and Anthropic Claude.
- **📄 Professional PDF Reports**: Generates ink-efficient assessment reports for review and offline study.
- **🇸🇪 Localized Awareness**: Specifically tuned for Swedish mathematical terminology and the Hvitfeldska exam archive (2010–2025).

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router), [TypeScript](https://www.typescriptlang.org/) |
| **AI Orchestration** | [LangChain LCEL](https://js.langchain.com/), [Vercel AI SDK](https://sdk.vercel.ai/) |
| **LLMs** | Gemini 2.0 Flash, Claude 3.5 Sonnet, GPT-4o |
| **Utilities** | Sharp (Optimization), jsPDF (Report Generation), pdftotext (Data Extraction) |

---

## 🏗️ Architecture

The system utilizes a dual-engine approach:
1. **Streaming Engine**: Powered by Vercel AI SDK for immediate, live feedback during the grading process.
2. **Structured Analysis Engine**: Powered by LangChain LCEL for complex reasoning, schema validation, and structured data generation.

For a detailed technical deep-dive, please refer to our [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- `poppler-utils` (for PDF text extraction)
- API Keys for your preferred provider (Google, OpenAI, or Anthropic)

### Setup

```bash
# Clone the repository
git clone https://github.com/bluehawana/AI-Math-Grader-OpenAI.git
cd AI-Math-Grader-OpenAI

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in your API keys and set LLM_PROVIDER in .env

# Run development server
npm run dev
```

---

## 📁 Repository Structure
- `src/app/api/grade-image`: Vision-AI processing for handwriting and photos.
- `src/app/api/grade`: Text-based extraction and comparisons.
- `src/lib/providers.ts`: Global adapter for switching between AI models.
- `src/components/GradingResults.tsx`: PDF report construction and UI visualization.

---

## 📄 License
MIT License.

*Created to bridge the gap between AI concepts and real-world results.*
