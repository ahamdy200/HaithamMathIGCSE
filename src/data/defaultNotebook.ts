import { NotebookCell, SourceDocument } from '../types';

export const INITIAL_CELLS: NotebookCell[] = [
  {
    id: 'cell-1',
    type: 'markdown',
    content: `# 🌟 Interacting with the Gemini API in Google Colab

This notebook provides the complete starter workflow to connect to Google's Gemini models using the official modern **\`google-genai\`** SDK.

### What's included:
1. **Package Installation**: Install \`google-genai\`
2. **Colab Secrets Authentication**: Safely access \`GEMINI_API_KEY\` using \`google.colab.userdata\`
3. **Client Initialization**: Configure the \`genai.Client()\`
4. **Basic Test Call**: Verify your setup with a simple text generation call to \`gemini-3.8-flash\`
5. **Streaming & Configuration**: Fast streaming responses, system prompts, and structured JSON outputs
6. **NotebookLM Style Grounding**: Generate grounded analysis and Audio Overview podcast scripts
`,
  },
  {
    id: 'cell-2',
    type: 'code',
    content: `!pip install -q -U google-genai`,
    executionCount: 1,
    output: `Requirement already satisfied: google-genai in /usr/local/lib/python3.10/dist-packages (2.32.0)
Requirement already satisfied: pydantic>=2.0.0 in /usr/local/lib/python3.10/dist-packages
Requirement already satisfied: typing_extensions>=4.7.0 in /usr/local/lib/python3.10/dist-packages
Successfully checked and up to date: google-genai`,
  },
  {
    id: 'cell-3',
    type: 'markdown',
    content: `## 🔑 Step 1: Authentication with Google Colab Secrets

In Google Colab, never hardcode your API key in code cells! Instead:
1. Click the **Key icon (🔑 Secrets)** on the left sidebar of Google Colab.
2. Add a new secret named **\`GEMINI_API_KEY\`**.
3. Value: Paste your Gemini API key.
4. Toggle **Notebook access** to **ON**.
5. Use \`userdata.get('GEMINI_API_KEY')\` to securely read it.
`,
  },
  {
    id: 'cell-4',
    type: 'code',
    content: `import os
from google.colab import userdata

# 🔐 Retrieve the Gemini API key from Colab Secrets
try:
    api_key = userdata.get('GEMINI_API_KEY')
    os.environ["GEMINI_API_KEY"] = api_key
    print("✅ Authenticated successfully! 'GEMINI_API_KEY' loaded from Colab Secrets.")
except Exception as e:
    # If not running inside Colab or key is missing from Secrets
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key:
        print("✅ Found GEMINI_API_KEY in environment variables.")
    else:
        print("⚠️ Colab Secret 'GEMINI_API_KEY' not found.")
        print("👉 In Colab, click the Key (🔑) icon on the left sidebar to add GEMINI_API_KEY.")`,
    executionCount: 2,
    output: `✅ Authenticated successfully! 'GEMINI_API_KEY' loaded from Colab Secrets.
Ready to initialize client.`,
  },
  {
    id: 'cell-5',
    type: 'code',
    content: `from google import genai
from google.genai import types

# 🚀 Initialize the official Google GenAI Client
# Automatically uses os.environ["GEMINI_API_KEY"]
client = genai.Client()

print(f"✨ Client initialized successfully with modern google-genai SDK!")`,
    executionCount: 3,
    output: `✨ Client initialized successfully with modern google-genai SDK!`,
  },
  {
    id: 'cell-6',
    type: 'markdown',
    content: `## 🧪 Step 2: Making a Basic Test Call

Let's test connectivity with **\`gemini-3.8-flash\`**, Google's recommended high-efficiency model for general text, multimodal reasoning, and rapid responses.
`,
  },
  {
    id: 'cell-7',
    type: 'code',
    content: `# Basic Test Call: Simple text generation
response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="Hello Gemini! Write a 2-sentence poetic summary explaining how artificial intelligence assists human curiosity, and confirm your model status."
)

print("=== Gemini API Test Output ===")
print(response.text)`,
    executionCount: 4,
    output: `=== Gemini API Test Output ===
Artificial intelligence acts as a digital lantern in the vast labyrinth of knowledge, illuminating forgotten corridors and sparking new frontiers for human wonder. As a thinking partner, it translates raw curiosity into boundless creative horizons.

Status: Operational (gemini-3.8-flash)`,
  },
  {
    id: 'cell-8',
    type: 'markdown',
    content: `## ⚡ Step 3: Real-Time Streaming Test Call

For interactive assistants and quick feedback, streaming yields text token-by-token as it is generated.
`,
  },
  {
    id: 'cell-9',
    type: 'code',
    content: `# Streaming Test Call
response_stream = client.models.generate_content_stream(
    model="gemini-3.8-flash",
    contents="List 3 innovative ideas for using Gemini multimodal understanding in education."
)

print("=== Streaming Response ===")
for chunk in response_stream:
    print(chunk.text, end="", flush=True)`,
    executionCount: 5,
    output: `=== Streaming Response ===
1. **Interactive Historical Artifact Inspector**: Students point a camera or upload images of ancient fossils, paintings, or ruins to receive instant context, architectural breakdown, and historically grounded dialogue.
2. **Real-Time Handwritten Math & Chemistry Tutor**: Analyzes photos of handwritten equations or chemical structures step-by-step, flagging conceptual misconceptions rather than just delivering the final answer.
3. **Adaptive Multimodal Lab Assistant**: Observes science experiments through video snippets to guide safety protocols, verify titration colors, and explain unexpected reaction phenomena on the fly.`,
  },
  {
    id: 'cell-10',
    type: 'markdown',
    content: `## 🧠 Step 4: System Instructions & Thinking Control

Set a distinct persona or constraints using \`types.GenerateContentConfig(system_instruction=...)\`.
`,
  },
  {
    id: 'cell-11',
    type: 'code',
    content: `# Configure System Instructions
config = types.GenerateContentConfig(
    system_instruction="You are a senior Google Cloud AI Architect. Provide concise, production-ready developer advice with actionable bullets."
)

response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="What are 3 golden rules for handling API latency and rate limits when building Gemini-powered apps?",
    config=config
)

print(response.text)`,
    executionCount: 6,
    output: `1. Implement Client-Side Streaming: Deliver immediate visual feedback (TTFT < 500ms) with generate_content_stream rather than waiting for unary completion.
2. Employ Exponential Backoff with Jitter: Gracefully catch HTTP 429 (RESOURCE_EXHAUSTED) by retrying with randomized exponential delays.
3. Cache Static Context & System Prompts: Minimize token payload overhead and optimize request throughput by structuring reusable context efficiently.`,
  },
  {
    id: 'cell-12',
    type: 'markdown',
    content: `## 📋 Step 5: Structured JSON Output with Pydantic

You can force Gemini to return strictly typed, schema-validated JSON using Pydantic models.
`,
  },
  {
    id: 'cell-13',
    type: 'code',
    content: `from pydantic import BaseModel, Field

class NotebookTopicSummary(BaseModel):
    topic: str = Field(description="Name of the research topic")
    complexity_level: str = Field(description="Beginner, Intermediate, or Advanced")
    key_takeaways: list[str] = Field(description="3 essential insights")
    suggested_experiments: list[str] = Field(description="2 practical Colab experiments")

response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="Generate a structured summary for: Retrieval-Augmented Generation (RAG) with Gemini and Vector Databases.",
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=NotebookTopicSummary
    )
)

print(response.text)`,
    executionCount: 7,
    output: `{
  "topic": "Retrieval-Augmented Generation (RAG) with Gemini",
  "complexity_level": "Intermediate",
  "key_takeaways": [
    "Grounds LLM responses with proprietary or dynamic documents",
    "Drastically reduces hallucinations and allows citation tracking",
    "Combines dense vector embeddings with Gemini 3.8 Flash 1M context window"
  ],
  "suggested_experiments": [
    "Build a Colab notebook chunking PDF research papers and querying them with Gemini",
    "Benchmark retrieval precision using hybrid keyword + vector semantic search"
  ]
}`,
  },
  {
    id: 'cell-14',
    type: 'markdown',
    content: `## 🎙️ Step 6: NotebookLM Style Grounded Audio Overview Script

NotebookLM's signature feature is generating a conversational 2-host "Deep Dive" podcast from source documents. Here is how to create it via Python:
`,
  },
  {
    id: 'cell-15',
    type: 'code',
    content: `# Generate NotebookLM 2-Host Audio Overview Dialogue Script
research_source = """
Title: Gemini 3.8 Flash Technical Specifications
Key points:
- Sub-second time-to-first-token (TTFT)
- Native multimodal processing (text, code, image, audio, video)
- Massive 1M+ token context window
- Built-in thinking capability for math, reasoning, and code
"""

prompt = f"""
Act as NotebookLM's Audio Overview dialogue generator.
Create a lively, natural discussion between two podcast hosts:
- Host 1 (Alex): High energy, relatable analogies, asks intuitive questions.
- Host 2 (Jordan): Deep technical knowledge, grounds answers in the notes.

Source Notes:
{research_source}

Generate 4 conversational dialogue turns.
"""

response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents=prompt
)

print(response.text)`,
    executionCount: 8,
    output: `Alex: Welcome back to the Deep Dive! Today we are cracking open the technical notes on Gemini 3.8 Flash. And Jordan, looking at these specs, the speed jump is what caught my eye first.

Jordan: Exactly, Alex. What's striking here is that sub-second time-to-first-token. In practical terms, when you're querying a complex document, it feels virtually instantaneous.

Alex: Right, like having a research partner who's already read the entire encyclopedia before you finish your question! And notice that 1-million token context window—that's huge, right?

Jordan: It really is. It means you can feed an entire codebase, hundreds of research papers, or hours of audio transcripts into a single prompt without chunking or losing semantic coherence.`,
  },
];

export const INITIAL_SOURCES: SourceDocument[] = [
  {
    id: 'source-1',
    title: 'Mr. Haitham Hussien — BIDMAS Solution Key & Mark Guide',
    type: 'pdf',
    snippet: 'Official Cambridge IGCSE marking breakdown for Chapter 1: Numbers — Lesson 1: Order of Operations (BIDMAS)...',
    content: `CHAPTER 1: NUMBERS — LESSON 1: ORDER OF OPERATIONS (BIDMAS)
Teacher Resource: Mr. Haitham Hussien — Subject: IGCSE / Lower Secondary Mathematics
Fundamental Rule: BIDMAS Priority Hierarchy
1. Brackets / Parentheses ( ) first
2. Indices / Powers / Roots (x^2, sqrt(x))
3. Division & Multiplication (Left to right)
4. Addition & Subtraction (Left to right)

Question Mark Schemes:
- Q1 [1 Mark]: Mike added before dividing. Division takes priority (12 / 4 = 3, so 8 + 3 = 11).
- Q2 [1 Mark]: 5 * (4^2 + 2 - 12) = 5 * (16 + 2 - 12) = 5 * 6 = 30.
- Q3 [1 Mark]: 5^2 + sqrt(121) = 25 + 11 = 36.
- Q4 [2 Marks]: (23 - 3*3)^2 => [M1] method 23 - 9 = 14, [A1] accuracy 14^2 = 196.
- Q5 [1 Mark]: 2 + 8(40 - 5) => 2 + 8(35) = 2 + 280 = 282.
- Q6 [2 Marks]: (a) 4 + 9 * (6 - 4) = 22  (b) 24 / (12 - 8 + 2) = 4.
- Q7 [2 Marks]: (a) (10 - 4) / 2 + 18 = 21  (b) 7 * (3 + 1) + 2 = 30.`,
    tokenCount: 460,
  },
  {
    id: 'source-2',
    title: 'Student Submission — Ahmed Moghazy (IGCSE Math Homework)',
    type: 'doc',
    snippet: 'Handwritten CamScanner worksheet submitted by Ahmed Moghazy for Lesson 1: Order of operations...',
    content: `Student: Ahmed Moghazy
Lesson 1: Order of operations
Q1: "because he added first instead of dividing" [1 Mark earned]
Q2: 5 * (16 + 2 - 12) -> 5 * 6 = 30 [1 Mark earned]
Q3: 25 + 11 = 36 [1 Mark earned]
Q4: 23 - 9 = 14^2 = 196 [2 Marks earned: M1 + A1]
Q5: 2 + 8(35) = 2 + 280 = 282 [1 Mark earned]
Q6: (a) 4 + 9 * (6 - 4) = 22  (b) 24 / (12 - 8 + 2) = 4 [2 Marks earned]
Q7: (a) (10 - 4) / 2 + 18 = 21  (b) 7 * (3 + 1) + 2 = 30 [2 Marks earned]
Total score: 10 / 10 (100% Grade A*)`,
    tokenCount: 380,
  },
  {
    id: 'source-3',
    title: 'Google GenAI SDK & Colab Secrets API',
    type: 'note',
    snippet: 'The official google-genai SDK provides unified access to Gemini models with Client-based syntax and Colab Secrets...',
    content: `Google GenAI SDK (v2+) & Colab Secrets:
- Unified client interface: genai.Client()
- Automatic environment key resolution: Reads GEMINI_API_KEY from environment or Colab Secrets.
- Accessing secret in Python:
  from google.colab import userdata
  api_key = userdata.get('GEMINI_API_KEY')`,
    tokenCount: 290,
  },
];
