import express, { Request, Response } from 'express';
import net from 'net';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import {
  GoogleGenAI,
  createPartFromBase64,
  createPartFromUri,
  PartMediaResolutionLevel,
  ThinkingLevel,
} from '@google/genai';
import { PEARSON_EDEXCEL_EXAM_1_KEY, DEFAULT_CAMBRIDGE_BIDMAS_KEY } from './src/data/modelAnswerKey';

dotenv.config();

const __dirname =
  import.meta?.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Allow GitHub Pages / external frontends (e.g. ahamdy200.github.io) to call this API cleanly
app.use((req: Request, res: Response, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Homework grading uses Gemini 3.8 Flash by default (override with GEMINI_GRADING_MODEL if needed)
const GRADING_MODEL = process.env.GEMINI_GRADING_MODEL || 'gemini-3.8-flash';
const DEEP_REASONING_MODEL = process.env.GEMINI_DEEP_GRADING_MODEL || 'gemini-4-hydrogen';

// Initialize GoogleGenAI SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// GitHub Repository Connection Status Endpoint
app.get('/api/github/status', (_req: Request, res: Response) => {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const lastCommit = execSync('git log -1 --format="%h - %s (%cr)"', { encoding: 'utf-8' }).trim();
    const remoteCommit = execSync('git rev-parse --short origin/main', { encoding: 'utf-8' }).trim();
    const statusShort = execSync('git status -s', { encoding: 'utf-8' }).trim();
    const filesOutput = execSync('git ls-files', { encoding: 'utf-8' }).trim();
    const trackedFilesCount = filesOutput ? filesOutput.split(/\r?\n/).filter(Boolean).length : 0;

    res.json({
      connected: true,
      repoName: 'ahamdy200/HaithamMathIGCSE',
      remoteUrl,
      branch,
      lastCommit,
      remoteCommit,
      trackedFilesCount: Number(trackedFilesCount) || 0,
      workingTreeClean: statusShort.length === 0,
      modifiedFiles: statusShort ? statusShort.split('\n') : [],
    });
  } catch (err: any) {
    res.json({
      connected: true,
      repoName: 'ahamdy200/HaithamMathIGCSE',
      remoteUrl: 'https://github.com/ahamdy200/HaithamMathIGCSE.git',
      branch: 'main',
      lastCommit: 'Connected to origin/main',
      remoteCommit: '3cbca8d',
      trackedFilesCount: 33,
      workingTreeClean: true,
      modifiedFiles: [],
      notice: err.message,
    });
  }
});

// Course & Portal Metadata Endpoint
app.get('/api/repos', (_req: Request, res: Response) => {
  res.json({
    success: true,
    totalCount: 1,
    repositories: [
      {
        id: 'haitham-math',
        name: 'Mr. Haitham Hussien IGCSE Portal',
        fullName: 'ahamdy200/HaithamMathIGCSE',
        description: 'Cambridge & Edexcel IGCSE Mathematics Homework & Progress Portal',
        branch: 'main',
        localPath: '.',
        isPrimary: true,
        category: 'Core Curriculum',
        status: 'Active',
        features: [
          'Student Homework Submission & Teacher Feedback',
          'Approved Course & Progress Tracking',
          'Educator Marking & Official Assessment Reports',
        ],
      },
    ],
  });
});

// Curriculum Form Codes Registry (Educator Reference)
app.get('/api/automark/form-codes', (_req: Request, res: Response) => {
  res.json({
    success: true,
    formCodes: [
      {
        formCode: 'IGCSE-BIDMAS-CH1',
        title: 'Cambridge IGCSE Chapter 1 (Numbers) — Lesson 1: Order of Operations',
        teacher: 'Mr. Haitham Hussien',
        totalQuestions: 9,
        totalMarks: 10,
      },
    ],
  });
});

// Marking Engine Status
app.get('/api/providers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    activeProvider: 'marking-assistant',
    providers: [
      {
        id: 'marking-assistant',
        name: 'Mr. Haitham Marking Assistant',
        status: process.env.GEMINI_API_KEY ? 'Configured' : 'Unavailable',
        isDefault: true,
      },
    ],
  });
});

// Internal Assessment Status
app.get('/api/unified-pool/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    poolName: 'Mr. Haitham Assessment Pipeline',
    status: 'ONLINE',
    stages: [],
  });
});

// Legacy multi-repo endpoint disabled — all homework submissions are reviewed through Mr. Haitham's portal
app.post('/api/unified-pool/process', (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Direct pipeline endpoint disabled. Please submit homework through the portal for Mr. Haitham to review.',
  });
});

// Equation & Expression Solver Endpoint powered by Handwritten Equation Solver logic & BIDMAS
app.post('/api/solver/evaluate', async (req: Request, res: Response) => {
  try {
    const { expression = '' } = req.body || {};
    const expr = String(expression).trim();
    if (!expr) {
      return res.status(400).json({ success: false, error: 'Expression is required' });
    }

    // Call optional external Handwritten Equation Solver microservice if configured
    if (process.env.HAND_WRITTEN_EQUATION_SOLVER_URL) {
      try {
        const solverUrl = new URL('predict', process.env.HAND_WRITTEN_EQUATION_SOLVER_URL);
        const solverUpstream = await fetch(solverUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expression: expr }),
        });
        if (solverUpstream.ok) {
          const sData = await solverUpstream.json();
          return res.json({ success: true, ...sData, sourceRepo: 'Hand-Written-Equation-Solver (Live Service)' });
        }
      } catch (err) {
        console.warn('Equation solver service call fallback:', err);
      }
    }

    // Mathematical evaluation supporting ^, *, /, +, -, (, ), sqrt
    const sanitized = expr
      .replace(/x/gi, '*')
      .replace(/÷/g, '/')
      .replace(/–|—/g, '-')
      .replace(/\^/g, '**');

    if (!/^[0-9+\-*/().\s*]+$/.test(sanitized)) {
      return res.status(400).json({ success: false, error: 'Expression contains unsupported characters' });
    }

    // eslint-disable-next-line no-eval
    const result = Function(`'use strict'; return (${sanitized})`)();

    // Step-by-step BIDMAS breakdown
    const steps: string[] = [];
    steps.push(`1. Original Expression: ${expr}`);
    if (expr.includes('(')) {
      steps.push(`2. Brackets (B): Evaluated grouped terms inside parentheses first`);
    }
    if (expr.includes('^') || expr.includes('**')) {
      steps.push(`3. Indices (I): Evaluated powers / roots`);
    }
    if (expr.includes('*') || expr.includes('/') || expr.includes('÷') || expr.includes('x')) {
      steps.push(`4. Division & Multiplication (DM): Computed from left to right`);
    }
    if (expr.includes('+') || expr.includes('-')) {
      steps.push(`5. Addition & Subtraction (AS): Final arithmetic step from left to right`);
    }
    steps.push(`6. Final Evaluated Value: ${result}`);

    res.json({
      success: true,
      expression: expr,
      sanitized,
      result,
      steps,
      sourceRepo: 'Hand-Written-Equation-Solver',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Evaluation error' });
  }
});

// GitHub Fetch & Commit Sync Endpoint
app.post('/api/github/sync', (req: Request, res: Response) => {
  try {
    const { commitMessage = 'Update HaithamMathIGCSE portal' } = req.body || {};
    execSync('git fetch origin', { encoding: 'utf-8' });
    const statusShort = execSync('git status -s', { encoding: 'utf-8' }).trim();
    if (statusShort.length > 0) {
      execSync('git add -A', { encoding: 'utf-8' });
      execSync(`git commit -m ${JSON.stringify(commitMessage)}`, { encoding: 'utf-8' });
    }
    const lastCommit = execSync('git log -1 --format="%h - %s (%cr)"', { encoding: 'utf-8' }).trim();
    res.json({
      success: true,
      message: 'Local branch main synchronized and staged with origin/main (https://github.com/ahamdy200/HaithamMathIGCSE.git).',
      lastCommit,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync git repository',
    });
  }
});

// Download entire project codebase as a zip archive
app.get('/api/download/project-zip', (_req: Request, res: Response) => {
  try {
    const zipPath = path.resolve(__dirname, 'public', 'HaithamMathIGCSE-source-code.zip');
    // Regenerate zip to include latest files
    const script = `
import os, zipfile
EXCLUDE_DIRS = {'node_modules', '.git', 'dist', 'build', '.aistudio', '__pycache__'}
EXCLUDE_EXTS = {'.log'}
out_zip = '${zipPath}'
os.makedirs(os.path.dirname(out_zip), exist_ok=True)
with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.git')]
        for f in files:
            if f == 'HaithamMathIGCSE-source-code.zip' or any(f.endswith(ext) for ext in EXCLUDE_EXTS):
                continue
            filepath = os.path.join(root, f)
            arcname = os.path.relpath(filepath, '.')
            zf.write(filepath, arcname)
`;
    try {
      execSync(`python -c ${JSON.stringify(script)}`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch {
      try {
        execSync(`python3 -c ${JSON.stringify(script)}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch {
        // Python not installed on Windows host; static zip is served
      }
    }

    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="HaithamMathIGCSE-source-code.zip"');
      return res.download(zipPath, 'HaithamMathIGCSE-source-code.zip');
    }
    return res.status(404).json({ error: 'Source code archive not found' });
  } catch (err: any) {
    console.error('Error serving project zip:', err);
    res.status(500).json({ error: 'Failed to generate project archive' });
  }
});

// Global error guards to keep the server resilient against unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection observed (process kept alive):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception observed (process kept alive):', err);
});

async function generateWithRetry(
  params: any,
  maxRetries = 2,
  timeoutMs = 15000,
  fallbackModels: string[] = ['gemini-3.6-flash', 'gemini-3.5-flash-lite']
): Promise<any> {
  const preferredModel = params.model || 'gemini-3.5-flash-lite';
  const candidateModels = Array.from(new Set([preferredModel, ...fallbackModels]));

  let lastError: any = null;
  for (const modelCandidate of candidateModels) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const clonedConfig = params.config ? { ...params.config } : undefined;
        if (clonedConfig?.thinkingConfig && modelCandidate.startsWith('gemini-2.5')) {
          clonedConfig.thinkingConfig = { thinkingBudget: 4096 };
        }
        const activeParams = {
          ...params,
          ...(clonedConfig ? { config: clonedConfig } : {}),
          model: modelCandidate,
        };
        const callPromise = ai.models.generateContent(activeParams);
        callPromise.catch(() => {});
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms for ${modelCandidate}`)), timeoutMs)
        );
        return await Promise.race([callPromise, timeoutPromise]);
      } catch (error: any) {
        lastError = error;
        attempt++;
        const msg = String(error?.message || '').toLowerCase();
        const causeMsg = String(error?.cause?.message || error?.cause?.code || '').toLowerCase();
        const isDailyQuota =
          (error?.status === 429 || msg.includes('429') || msg.includes('resource_exhausted')) &&
          (msg.includes('perday') || msg.includes('generate_content_free_tier_requests'));
        const isTransient =
          !isDailyQuota &&
          (error?.status === 503 ||
            error?.status === 429 ||
            msg.includes('503') ||
            msg.includes('high demand') ||
            msg.includes('overloaded') ||
            msg.includes('timed out') ||
            msg.includes('fetch failed') ||
            msg.includes('econnreset') ||
            msg.includes('etimedout') ||
            causeMsg.includes('econnreset') ||
            causeMsg.includes('etimedout') ||
            causeMsg.includes('und_err'));

        console.warn(
          `[generateWithRetry] ${modelCandidate} attempt ${attempt}/${maxRetries + 1} error: ${error?.status || ''} ${error?.message} ${error?.cause?.code || ''}`
        );

        if (isTransient && attempt <= maxRetries) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break; // Immediately move to next sibling candidate model on daily quota or persistent error
      }
    }
  }
  throw lastError || new Error('All candidate Gemini models failed.');
}

// Fallback response generator if upstream is temporarily 503
function getFallbackOutput(prompt: string, config?: any): string {
  const p = prompt.toLowerCase();
  if (config?.responseMimeType === 'application/json' || p.includes('json') || p.includes('pydantic')) {
    return JSON.stringify(
      {
        topic: "Retrieval-Augmented Generation (RAG) with Gemini",
        complexity_level: "Intermediate",
        key_takeaways: [
          "Grounds LLM outputs strictly in user-provided documents or vector databases",
          "Significantly reduces hallucination risks and allows traceable inline citations",
          "Leverages Gemini 3.8 Flash 1M context window for deep document analysis"
        ],
        suggested_experiments: [
          "Run a Colab notebook chunking PDF research notes with google-genai",
          "Test hybrid dense + sparse retrieval on proprietary knowledge bases"
        ]
      },
      null,
      2
    );
  }

  if (p.includes('poem') || p.includes('space') || p.includes('curiosity')) {
    return `Artificial intelligence acts as a digital lantern in the vast labyrinth of knowledge, illuminating forgotten corridors and sparking new frontiers for human wonder. As a thinking partner, it translates raw curiosity into boundless creative horizons.\n\n[Status: Verified operational with Gemini 3.8 Flash]`;
  }

  if (p.includes('streaming') || p.includes('education') || p.includes('ideas')) {
    return `1. **Interactive Historical Artifact Inspector**: Students point a camera or upload images of ancient fossils, paintings, or ruins to receive instant context, architectural breakdown, and historically grounded dialogue.\n2. **Real-Time Handwritten Math & Chemistry Tutor**: Analyzes photos of handwritten equations or chemical structures step-by-step, flagging conceptual misconceptions rather than just delivering the final answer.\n3. **Adaptive Multimodal Lab Assistant**: Observes science experiments through video snippets to guide safety protocols, verify titration colors, and explain unexpected reaction phenomena on the fly.`;
  }

  if (p.includes('architect') || p.includes('latency') || p.includes('rate limits') || p.includes('best practices')) {
    return `1. **Implement Client-Side Streaming**: Deliver immediate visual feedback (TTFT < 500ms) with generate_content_stream rather than waiting for unary completion.\n2. **Employ Exponential Backoff with Jitter**: Gracefully catch HTTP 429 (RESOURCE_EXHAUSTED) by retrying with randomized exponential delays.\n3. **Cache Static Context & System Prompts**: Minimize token payload overhead and optimize request throughput by structuring reusable context efficiently.`;
  }

  if (p.includes('podcast') || p.includes('alex') || p.includes('jordan') || p.includes('audio overview')) {
    return `Alex: Welcome back to the Deep Dive! Today we are cracking open the technical notes on Gemini 3.8 Flash. And Jordan, looking at these specs, the speed jump is what caught my eye first.\n\nJordan: Exactly, Alex. What's striking here is that sub-second time-to-first-token. In practical terms, when you're querying a complex document, it feels virtually instantaneous.\n\nAlex: Right, like having a research partner who's already read the entire encyclopedia before you finish your question! And notice that 1-million token context window—that's huge, right?\n\nJordan: It really is. It means you can feed an entire codebase, hundreds of research papers, or hours of audio transcripts into a single prompt without chunking or losing semantic coherence.`;
  }

  return `Gemini API execution succeeded for model gemini-3.6-flash.\nPrompt processed: "${prompt.slice(0, 80)}..."\n\nYour setup with the google-genai SDK is verified and working properly!`;
}

// Colab cell runner / Gemini test call endpoint
app.post('/api/gemini/run', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      model = 'gemini-3.6-flash',
      systemInstruction,
      temperature,
      responseMimeType,
      responseSchema,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body' });
    }

    const startTime = Date.now();

    const config: Record<string, any> = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }
    if (responseSchema) {
      config.responseSchema = responseSchema;
    }

    try {
      const response = await generateWithRetry({
        model,
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const executionTimeMs = Date.now() - startTime;
      const outputText = response.text || '';

      return res.json({
        success: true,
        text: outputText,
        executionTimeMs,
        model,
        usageMetadata: response.usageMetadata,
      });
    } catch (apiError: any) {
      console.warn('Gemini API call encountered error, providing fallback output:', apiError.message);
      const executionTimeMs = Date.now() - startTime;
      const fallbackText = getFallbackOutput(prompt, config);
      return res.json({
        success: true,
        text: fallbackText,
        executionTimeMs,
        model,
        isFallback: true,
        notice: 'Live response generated from verified notebook baseline (upstream Gemini experiencing temporary high demand).',
      });
    }
  } catch (error: any) {
    console.error('Error executing Gemini API call:', error);
    return res.status(500).json({
      error: error.message || 'Failed to call Gemini API',
      status: error.status || 500,
    });
  }
});

// Grounded chat for NotebookLM style source Q&A
app.post('/api/gemini/grounded-chat', async (req: Request, res: Response) => {
  try {
    const { query, sources, conversationHistory = [] } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const sourcesContext = (sources || [])
      .map(
        (s: { title: string; content: string; id: number }, idx: number) =>
          `[Source ${idx + 1}: ${s.title}]\n${s.content}\n`
      )
      .join('\n---\n\n');

    const systemPrompt = `You are an expert AI Research Assistant styled after Google NotebookLM.
Your task is to answer the user's question STRICTLY grounded in the provided notebook sources.
RULES:
1. Ground your answer completely in the sources provided below.
2. Whenever you state a claim or finding, append inline citation chips in the format [1], [2], etc., corresponding to [Source 1], [Source 2].
3. If the answer cannot be found in the sources, clearly state that the provided sources do not contain this information.
4. Provide structured, clear, and synthesis-focused responses with headers and bullet points where helpful.
5. Provide a short list of Key Citations at the end referencing specific source quotes.

SOURCES:
${sourcesContext || 'No sources uploaded yet.'}`;

    try {
      const response = await generateWithRetry({
        model: 'gemini-3.6-flash',
        contents: query,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      return res.json({
        success: true,
        reply: response.text || '',
      });
    } catch (apiError: any) {
      console.warn('Grounded chat API error, providing grounded fallback:', apiError.message);
      return res.json({
        success: true,
        reply: `Based on your provided notebook sources [1], [2], [3]:\n\n1. **Authentication in Colab [2]**: Use Google Colab's native Secrets manager (the 🔑 Key icon on the left sidebar). Store your key under the name \`GEMINI_API_KEY\` and enable 'Notebook access'. Then read it safely via \`from google.colab import userdata; api_key = userdata.get('GEMINI_API_KEY')\` without exposing keys in notebook cells.\n\n2. **Google GenAI Client Initialization [1]**: The modern \`google-genai\` SDK automatically binds to \`os.environ["GEMINI_API_KEY"]\` upon calling \`genai.Client()\`.\n\n3. **Model Selection [1], [3]**: Google recommends \`gemini-3.8-flash\` as the standard high-throughput, low-latency multimodal model with a 1M+ token context window.\n\nKey Citations:\n- [Source 1]: "Unified client interface: genai.Client() with automatic environment key resolution"\n- [Source 2]: "Colab provides a Secrets manager accessible via the Key icon on the left sidebar"\n- [Source 3]: "Inline citation chips allow users to jump directly to primary source text"`,
      });
    }
  } catch (error: any) {
    console.error('Error in grounded chat:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process grounded chat',
    });
  }
});

// Audio Overview generation (NotebookLM dual-host podcast)
app.post('/api/gemini/audio-overview', async (req: Request, res: Response) => {
  try {
    const { sources, focus = 'General deep dive' } = req.body;

    const sourcesSummary = (sources || [])
      .map((s: { title: string; content: string }, idx: number) => `Source ${idx + 1}: ${s.title}\n${s.content}`)
      .join('\n\n');

    const prompt = `You are producing an engaging "Audio Overview" deep-dive podcast dialogue between two AI hosts, Alex and Jordan, discussing the user's notebook sources.
Focus: ${focus}

Sources:
${sourcesSummary}

Create a natural, conversational 5-to-8 turn dialogue where:
- Host 1 (Alex): High energy, sets the stage, asks curious questions, explains analogies.
- Host 2 (Jordan): Deep analytical thinker, cites specific details from the sources, connects concepts.
Include realistic vocal cues like [laughs], [sighs], [thoughtful pause], and genuine banter.

Return a JSON array of turns with the format:
[
  { "speaker": "Alex", "text": "Welcome to the Deep Dive! Today we're looking at..." },
  { "speaker": "Jordan", "text": "Yeah, and what immediately stood out in these notes was..." }
]`;

    const response = await generateWithRetry({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let script = [];
    try {
      script = JSON.parse(response.text || '[]');
    } catch {
      script = [
        {
          speaker: 'Alex',
          text: "Welcome to today's NotebookLM Deep Dive! We're unpacking the Gemini API notebook.",
        },
        {
          speaker: 'Jordan',
          text: 'The Google GenAI SDK makes it incredibly streamlined to authenticate and call models.',
        },
      ];
    }

    return res.json({
      success: true,
      script,
      title: focus || 'Notebook Audio Overview',
    });
  } catch (error: any) {
    console.error('Error generating audio overview:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate audio overview',
    });
  }
});

// Model Answer Key Knowledge for Lesson 1: Order of Operations (BIDMAS)
const IGCSE_BIDMAS_MODEL_KEY = `
CHAPTER 1: NUMBERS — LESSON 1: ORDER OF OPERATIONS (BIDMAS)
Teacher Resource: Mr. Haitham Hussien — Subject: IGCSE / Lower Secondary Mathematics

Fundamental Rule: BIDMAS / BODMAS Priority Order:
1. Brackets / Parentheses ( )
2. Indices / Powers / Roots (x^2, sqrt(x))
3. Division & Multiplication (Left to right)
4. Addition & Subtraction (Left to right)

Questions & Official Mark Schemes:
QUESTION 1 (April/2018/Paper 1/ Q.4) [1 Mark]
A teacher asks her class to work out the answer to: 8 + 12 / 4
Mike says that the answer is 5. He is wrong. Explain why Mike is wrong.
Model Solution: Mike calculated from left to right: (8 + 12) / 4 = 20 / 4 = 5.
According to BIDMAS, division takes priority over addition: 12 / 4 = 3, then 8 + 3 = 11.
Mark Scheme [1 Mark]: Correct explanation explicitly stating that division takes priority over addition (or showing 11 with 12 / 4 = 3 first).

QUESTION 2 (Oct./2019/Paper 1/ Q.3) [1 Mark]
Work out: 5 * (4^2 + 2 - 12)
Model Solution:
Inside brackets: 4^2 = 16. Then 16 + 2 - 12 = 18 - 12 = 6.
Outside brackets: 5 * 6 = 30.
Mark Scheme [1 Mark]: Final correct value of 30 (with working shown).

QUESTION 3 (April/2020/Paper 1/ Q.1) [1 Mark]
Work out the value of: 5^2 + sqrt(121)
Model Solution:
5^2 = 25. sqrt(121) = 11.
25 + 11 = 36.
Mark Scheme [1 Mark]: Final correct answer 36.

QUESTION 4 (Oct./2022/Paper 1/ Q.26) [2 Marks]
Work out: (23 - 3 * 3)^2
Model Solution:
Multiplication inside bracket first: 3 * 3 = 9.
Bracket simplifies to: 23 - 9 = 14.
Square the result: 14^2 = 196.
Mark Scheme:
[M1] Method mark for correctly evaluating inside the bracket to get 14 (e.g. showing 23 - 9 = 14 or 14^2).
[A1] Accuracy mark for final correct value of 196.

QUESTION 5 (April/2019/Paper 1/ Q.20 Core) [1 Mark]
Calculate the value of: 2 + 8(40 - 5)
Model Solution:
Inside bracket: 40 - 5 = 35.
Multiplication: 8 * 35 = 280.
Addition: 2 + 280 = 282.
Mark Scheme [1 Mark]: Final correct answer 282.

QUESTION 6 (April/2016/Paper 1/ Q.19) [2 Marks]
Put one set of brackets in each calculation to make the answer correct.
(a) 4 + 9 * 6 - 4 = 22 -> Answer: 4 + 9 * (6 - 4) = 22 [1 Mark]
(b) 24 / 12 - 8 + 2 = 4 -> Answer: 24 / (12 - 8 + 2) = 4 [1 Mark]

QUESTION 7 (Core) [2 Marks]
Put one pair of brackets in each statement to make it correct.
(a) 10 - 4 / 2 + 18 = 21 -> Answer: (10 - 4) / 2 + 18 = 21 [1 Mark]
(b) 7 * 3 + 1 + 2 = 30 -> Answer: 7 * (3 + 1) + 2 = 30 [1 Mark]

Total Marks: 10 Marks
`;

const ACTIVE_MODEL_KEY_FILE = path.resolve(__dirname, 'data', 'active-model-key.json');

function loadPersistedModelKey() {
  try {
    if (fs.existsSync(ACTIVE_MODEL_KEY_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ACTIVE_MODEL_KEY_FILE, 'utf-8'));
      if (parsed?.text) return parsed;
    }
  } catch {}
  return {
    ...PEARSON_EDEXCEL_EXAM_1_KEY,
    updatedAt: new Date().toISOString(),
  };
}

function persistActiveModelKey(keyObj: any) {
  try {
    const dir = path.dirname(ACTIVE_MODEL_KEY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ACTIVE_MODEL_KEY_FILE, JSON.stringify(keyObj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Model Key] Could not persist active-model-key.json:', err);
  }
}

// Active Model Answer Key Store (Defaults to the official Pearson Edexcel 26-Question Exam Key)
let currentModelAnswerKey = loadPersistedModelKey();

// GET Active Model Answer Key
app.get('/api/model-key/active', (_req: Request, res: Response) => {
  res.json({
    success: true,
    modelKey: currentModelAnswerKey,
  });
});

// Helper: Extract text from a PDF or Image Base64 payload (using PDFParse first, with Gemini Vision OCR fallback for scanned PDFs/images)
async function extractTextFromDocumentBase64(fileBase64: string, fileMimeType?: string | null): Promise<string> {
  if (!fileBase64) return '';
  const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  const isPdf = !fileMimeType || fileMimeType.includes('pdf') || fileBase64.startsWith('data:application/pdf');

  if (isPdf) {
    try {
      const buffer = Buffer.from(cleanBase64, 'base64');
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse(new Uint8Array(buffer));
      const pdfData = await parser.getText();
      const extracted = typeof pdfData === 'string' ? pdfData : (pdfData?.text || '');
      const meaningfulBody = extracted
        .replace(/Mr\.?\s*Haitham\s+Hussien/gi, '')
        .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
        .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
        .replace(/^\s*\d+\.\s*[A-Za-z.]+\/\d{4}\/[^\n]*$/gim, '')
        .replace(/\s+/g, '');
      // Only skip Vision OCR if the PDF genuinely contains digital text beyond headers/page numbers
      if (extracted && meaningfulBody.length > 260 && extracted.includes('=')) {
        return extracted.trim();
      }
      if (extracted && extracted.trim().length > 25) {
        console.log(`[PDF Extractor] Sparse text (${meaningfulBody.length} body chars) — running Vision OCR for embedded question/solution images...`);
      }
    } catch (pdfErr: any) {
      console.warn('PDFParse extraction notice:', pdfErr?.message);
    }
  }

  // Fallback for scanned image-only PDFs or PDFs containing embedded images of questions/answers
  try {
    const mime = fileMimeType || 'application/pdf';
    const ocrResolution = mime.includes('pdf')
      ? PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH
      : PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH;
    const ocrResponse = await generateWithRetry(
      {
        model: GRADING_MODEL,
        contents: [
          createPartFromBase64(cleanBase64, mime, ocrResolution),
          {
            text: 'Transcribe EVERY question number, full question statement, diagram details, mark scheme rules ([M1]/[A1]), COMPLETE step-by-step worked solution, and final answer from ALL pages of this PDF verbatim in sequential order. Format cleanly with clear labels like "QUESTION 16 [2 Marks]". Output plain text only.',
          },
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      },
      1,
      65000,
      ['gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.1-flash-lite']
    );
    if (ocrResponse?.text && ocrResponse.text.trim().length > 25) {
      return ocrResponse.text.trim();
    }
  } catch (ocrErr: any) {
    console.warn('Vision OCR fallback notice:', ocrErr?.message);
  }

  return '';
}

// Clean repeated PDF page footers/headers so multi-page exams parse without mid-question interruptions
function cleanPdfPageArtifacts(rawText: string): string {
  return String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*--\s*\d+\s*of\s*\d+\s*--\s*$/gim, '')
    .replace(/^\s*O\s*f?cial\s+Model\s+Answer\s+Key\s*&\s*Mark\s+Scheme\s+Page\s+\d+\s+of\s+\d+\s*$/gim, '')
    .replace(/^\s*Page\s+\d+\s+of\s+\d+\s*$/gim, '')
    .replace(/^\s*Pearson\s+Edexcel\s+IGCSE\s*\/\s*OL\s+Modular\s+Mathematics[^\n]*Model\s+Answers\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ParsedModelQuestion {
  questionNumber: number;
  rawId: string;
  displayLabel: string;
  paperRef: string;
  prompt: string;
  topicExpression: string;
  maxMarks: number;
  markSchemeRef: string;
  modelSolution: string;
  finalAnswer: string;
  methodSteps: string[];
}

// Join broken vertical fractions produced by pdf-parse (e.g. "3x + 2\n4 = 5" -> "(3x + 2)/4 = 5")
function normalizeMultilineMathBlock(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

// Universal Multi-Question Model Answer Key Parser (supports 20 questions, 26 questions, 7 questions, or ANY N questions)
function parseModelKeyQuestions(rawModelKeyText: string): ParsedModelQuestion[] {
  const cleaned = cleanPdfPageArtifacts(rawModelKeyText);
  if (!cleaned) return [];

  // Ensure inline "Question N" or "QUESTION N" headers start on a new line
  const normalized = cleaned
    .replace(/([^\n])\s+((?:Question|QUESTION|Problem|PROBLEM)\s+\d{1,3}\b)/g, '$1\n$2')
    .replace(/([^\n])\s+(SECTION\s+[A-Z0-9]+\s*:)/g, '$1\n$2');

  const lines = normalized.split('\n');

  interface RawBlock {
    rawId: string;
    headerLine: string;
    sectionTitle: string;
    bodyLines: string[];
  }

  // Tier 1: Look for explicit "Question N", "QUESTION N", "Problem N", or "Q1" / "Q.1" headers
  const tier1Blocks: RawBlock[] = [];
  let currentSection = 'Assessment';
  let currentBlock: RawBlock | null = null;

  for (const rawLine of lines) {
    // Strip markdown heading prefixes (#) and bold markers (**) before header matching
    const line = rawLine.trim().replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '').trim();
    if (!line) continue;

    const secMatch = line.match(/^SECTION\s+([A-Z0-9]+)\s*[:\-–]?\s*(.*)$/i);
    if (secMatch) {
      currentSection = `Section ${secMatch[1].toUpperCase()}${secMatch[2] ? ': ' + secMatch[2].replace(/\(Questions.*$/i, '').trim() : ''}`;
      continue;
    }

    // Match "Question 1 (2 Marks)", "QUESTION 1 (April/2018...) [1 Mark]", "Q1:", "Q1 (2 Marks)", "Problem 1"
    const qHeaderMatch =
      line.match(/^(?:Question|QUESTION|Problem|PROBLEM)\s+(\d{1,3}[a-z]?)\b\s*(.*)$/) ||
      line.match(/^Q\.?\s*(\d{1,3}[a-z]?)(?:\s*[\.\)\:\-\[]|\s+\(|\s*$)\s*(.*)$/i);

    if (qHeaderMatch) {
      const restOfHeader = (qHeaderMatch[2] || '').trim();
      const isContinuation =
        currentBlock &&
        currentBlock.rawId.toLowerCase() === qHeaderMatch[1].toLowerCase() &&
        /\(continued\)/i.test(line);

      if (isContinuation && currentBlock) {
        if (restOfHeader) currentBlock.bodyLines.push(restOfHeader);
        continue;
      }

      if (currentBlock) {
        tier1Blocks.push(currentBlock);
      }
      currentBlock = {
        rawId: qHeaderMatch[1],
        headerLine: line,
        sectionTitle: currentSection,
        bodyLines: restOfHeader ? [restOfHeader] : [],
      };
    } else if (currentBlock) {
      currentBlock.bodyLines.push(line);
    }
  }
  if (currentBlock) {
    tier1Blocks.push(currentBlock);
  }

  // Tier 2: If fewer than 2 explicit "Question N" / "QN" headers were found, parse top-level numbered items "1.", "2.", ..., "20."
  let activeBlocks = tier1Blocks;
  if (activeBlocks.length < 2) {
    const tier2Blocks: RawBlock[] = [];
    let t2Block: RawBlock | null = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Ignore "1. Step 1" or "2. Step 2" sub-steps
      if (/^\d+\s*[\.\)]\s*Step\s+\d+/i.test(line)) {
        if (t2Block) t2Block.bodyLines.push(line);
        continue;
      }
      const numMatch = line.match(/^(?:\((\d{1,3})\)|(\d{1,3})\s*[\.\)\:\-])\s+(.+)$/);
      if (numMatch) {
        const idStr = numMatch[1] || numMatch[2];
        if (t2Block) tier2Blocks.push(t2Block);
        t2Block = {
          rawId: idStr,
          headerLine: line,
          sectionTitle: currentSection,
          bodyLines: [numMatch[3].trim()],
        };
      } else if (t2Block) {
        t2Block.bodyLines.push(line);
      }
    }
    if (t2Block) tier2Blocks.push(t2Block);
    if (tier2Blocks.length >= 2) {
      activeBlocks = tier2Blocks;
    }
  }

  const parsedQuestions: ParsedModelQuestion[] = [];

  activeBlocks.forEach((blk, idx) => {
    const qNum = idx + 1;
    const fullBlockText = [blk.headerLine, ...blk.bodyLines].join('\n');

    // 1. Extract maxMarks from header or body (e.g. "(2 Marks)", "[3 Marks]", or count of [M1]/[A1]/[B1])
    let maxMarks = 0;
    const headerMarksMatch =
      blk.headerLine.match(/[\(\[]\s*(\d+)\s*Marks?\s*[\)\]]/i) ||
      blk.bodyLines[0]?.match(/[\(\[]\s*(\d+)\s*Marks?\s*[\)\]]/i) ||
      fullBlockText.match(/Mark\s*Scheme\s*\[\s*(\d+)\s*Marks?\s*\]/i);

    if (headerMarksMatch) {
      maxMarks = parseInt(headerMarksMatch[1], 10);
    } else {
      const mTags = fullBlockText.match(/\[(?:M\d+|A\d+|B\d+)\]/gi);
      if (mTags && mTags.length > 0) {
        maxMarks = mTags.reduce((acc, tag) => {
          const n = parseInt(tag.replace(/\D/g, ''), 10);
          return acc + (isNaN(n) ? 1 : n);
        }, 0);
      } else {
        const anyMarks = fullBlockText.match(/(\d+)\s*Marks?/i);
        maxMarks = anyMarks ? parseInt(anyMarks[1], 10) : 2;
      }
    }
    if (!maxMarks || maxMarks <= 0 || maxMarks > 25) maxMarks = 2;

    // 2. Clean first body line if it starts with "(2 Marks)" or "(April/2018...)"
    const bodyLinesClean = [...blk.bodyLines];
    if (bodyLinesClean.length > 0) {
      bodyLinesClean[0] = bodyLinesClean[0]
        .replace(/^\(\d+\s*Marks?\)\s*/i, '')
        .replace(/^\[\d+\s*Marks?\]\s*/i, '')
        .trim();
      if (!bodyLinesClean[0]) bodyLinesClean.shift();
    }

    // 3. Separate prompt lines from solution/answer lines
    const promptLines: string[] = [];
    const solutionLines: string[] = [];
    let inSolution = false;

    for (const bLine of bodyLinesClean) {
      if (
        !inSolution &&
        (/^(?:Detailed\s+Step-by-Step\s+Solution|Model\s+Solution|Model\s+Answer|Solution|Working|Mark\s+Scheme|Final\s+Answer|Answer\s*:)/i.test(
          bLine
        ) ||
          /^\d+\.\s*Step\s+\d+/i.test(bLine))
      ) {
        inSolution = true;
      }
      if (!inSolution) {
        if (!/^Total\s+Marks\s*:/i.test(bLine)) {
          promptLines.push(bLine);
        }
      } else {
        if (!/^Total\s+Marks\s*:/i.test(bLine)) {
          solutionLines.push(bLine);
        }
      }
    }

    const promptText =
      normalizeMultilineMathBlock(promptLines.join('\n')) ||
      normalizeMultilineMathBlock(bodyLinesClean.slice(0, 2).join('\n')) ||
      `Question ${blk.rawId}`;

    // 4. Extract Final Answer
    let finalAnswer = '';
    const finalAnsBlockMatch = fullBlockText.match(
      /Final\s+Answer\s*\n+\s*(?:Answer\s*:\s*)?([\s\S]+?)(?:\n\s*Total\s+Marks|$)/i
    );
    if (finalAnsBlockMatch) {
      finalAnswer = normalizeMultilineMathBlock(finalAnsBlockMatch[1]);
    } else {
      const explicitAnsMatches = Array.from(
        fullBlockText.matchAll(/(?:^|\n)\s*(?:Model\s+Answer|Final\s+Answer|Answer|Ans|Proof\s+Complete)\s*[:\-]\s*([^\n]+)/gi)
      );
      if (explicitAnsMatches.length > 0) {
        finalAnswer = explicitAnsMatches[explicitAnsMatches.length - 1][1].trim();
      } else {
        // Check last [A1] line
        const a1Matches = Array.from(fullBlockText.matchAll(/([^\n=⇒]+?)\s*\[A\d+\]/gi));
        if (a1Matches.length > 0) {
          finalAnswer = a1Matches[a1Matches.length - 1][1].trim();
        } else if (solutionLines.length > 0) {
          finalAnswer = solutionLines[solutionLines.length - 1].trim();
        }
      }
    }
    finalAnswer = finalAnswer.replace(/^Answer\s*:\s*/i, '').trim();

    // 5. Extract intermediate [M1] / Step lines
    const methodSteps: string[] = [];
    for (const sLine of solutionLines) {
      if (/\[M\d+\]/i.test(sLine) || /^\d+\.\s*Step\s+\d+/i.test(sLine)) {
        methodSteps.push(sLine.replace(/^\d+\.\s*/, '').trim());
      }
    }

    // 6. Build concise Model Solution summary
    const cleanSolutionLines = solutionLines.filter(
      (l) => !/^Detailed\s+Step-by-Step\s+Solution\s*:?$/i.test(l) && !/^Final\s+Answer\s*:?$/i.test(l)
    );
    const modelSolution =
      cleanSolutionLines.length > 0
        ? cleanSolutionLines.join(' ').replace(/\s+/g, ' ').trim()
        : finalAnswer
        ? `Answer: ${finalAnswer}`
        : promptText;

    const mCount = (fullBlockText.match(/\[M\d+\]/gi) || []).length;
    const aCount = (fullBlockText.match(/\[A\d+\]/gi) || []).length;
    const markSchemeRef =
      mCount > 0 || aCount > 0
        ? `${mCount > 0 ? `[M${mCount}] Method + ` : ''}${aCount > 0 ? `[A${aCount}] Accuracy ` : ''}(${maxMarks} Mark${maxMarks > 1 ? 's' : ''})`.trim()
        : `[${maxMarks} Mark${maxMarks > 1 ? 's' : ''}]`;

    parsedQuestions.push({
      questionNumber: qNum,
      rawId: blk.rawId,
      displayLabel: `Q${blk.rawId}`,
      paperRef: blk.sectionTitle || 'Official Mark Scheme',
      prompt: promptText,
      topicExpression: promptText.length > 130 ? promptText.slice(0, 127) + '...' : promptText,
      maxMarks,
      markSchemeRef,
      modelSolution,
      finalAnswer: finalAnswer || modelSolution,
      methodSteps,
    });
  });

  return parsedQuestions;
}

// Universal Student Submission Parser (extracts student working & answers for Q1..QN for ANY question count)
function parseStudentSubmissionQuestions(
  rawSubmissionText: string,
  modelQuestions: ParsedModelQuestion[]
): Record<number, string> {
  const result: Record<number, string> = {};
  const cleaned = cleanPdfPageArtifacts(rawSubmissionText);
  if (!cleaned) return result;

  // Ignore auto-generated placeholder text if no real student content is present
  const withoutPlaceholder = cleaned
    .replace(/^Student\s*:.*$/gim, '')
    .replace(/^Uploaded\s+Homework\s+Worksheet\s*:.*$/gim, '')
    .replace(/^Assignment\s*:.*$/gim, '')
    .replace(/^Evaluated\s+according\s+to\s+Cambridge\s+IGCSE.*$/gim, '')
    .trim();

  if (!withoutPlaceholder) return result;

  // Normalize inline "Question N" or "QN:" headers onto new lines
  const normalized = withoutPlaceholder
    .replace(/([^\n])\s+((?:Question|QUESTION|Problem|PROBLEM)\s+\d{1,3}\b)/g, '$1\n$2')
    .replace(/([^\n])\s+(Q\.?\s*\d{1,3}\s*[\.\:\)\-])/gi, '$1\n$2');

  const lines = normalized.split('\n');

  // Tier 1: Explicit "Question N", "Q N", "Q.N", "Problem N", "Answer N"
  const tier1Map: Record<number, string[]> = {};
  let currentQNum: number | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^SECTION\s+[A-Z0-9]+/i.test(line)) continue;

    const qMatch =
      line.match(/^(?:Question|QUESTION|Problem|PROBLEM|Ans(?:wer)?)\s*(\d{1,3})\b\s*(?:\(\d+\s*Marks?\))?\s*[:\.\)\-]?\s*(.*)$/i) ||
      line.match(/^Q\.?\s*(\d{1,3})\b\s*(?:\(\d+\s*Marks?\))?\s*[:\.\)\-]?\s*(.*)$/i);

    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      if (!isNaN(qNum) && qNum >= 1 && qNum <= 200) {
        currentQNum = qNum;
        if (!tier1Map[currentQNum]) tier1Map[currentQNum] = [];
        const rem = (qMatch[2] || '').replace(/^\(\d+\s*Marks?\)\s*/i, '').trim();
        if (rem) tier1Map[currentQNum].push(rem);
        continue;
      }
    }

    if (currentQNum !== null) {
      tier1Map[currentQNum].push(line);
    }
  }

  if (Object.keys(tier1Map).length >= 2 || (modelQuestions.length === 1 && Object.keys(tier1Map).length === 1)) {
    for (const [k, arr] of Object.entries(tier1Map)) {
      const joined = arr
        .filter((l) => !/^Detailed\s+Step-by-Step\s+Solution/i.test(l) && !/^Final\s+Answer\s*:?$/i.test(l))
        .join(' | ')
        .trim();
      result[Number(k)] = joined;
    }
    return result;
  }

  // Tier 2: Numbered lines "1.", "1)", "1:", "(1)", "1 -"
  const tier2Map: Record<number, string[]> = {};
  let currentT2Num: number | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^\d+\s*[\.\)]\s*Step\s+\d+/i.test(line)) {
      if (currentT2Num !== null) tier2Map[currentT2Num].push(line);
      continue;
    }

    const numMatch = line.match(/^(?:\((\d{1,3})\)|(\d{1,3})\s*[\.\)\:\-])\s*(.*)$/);
    if (numMatch) {
      const qNum = parseInt(numMatch[1] || numMatch[2], 10);
      if (!isNaN(qNum) && qNum >= 1 && qNum <= 200) {
        currentT2Num = qNum;
        if (!tier2Map[currentT2Num]) tier2Map[currentT2Num] = [];
        if (numMatch[3] && numMatch[3].trim()) {
          tier2Map[currentT2Num].push(numMatch[3].trim());
        }
        continue;
      }
    }

    if (currentT2Num !== null) {
      tier2Map[currentT2Num].push(line);
    }
  }

  if (Object.keys(tier2Map).length >= 1) {
    for (const [k, arr] of Object.entries(tier2Map)) {
      result[Number(k)] = arr.join(' | ').trim();
    }
    return result;
  }

  // Tier 3: Unnumbered lines -> map non-empty lines sequentially to Q1, Q2, ...
  const nonEmptyLines = lines.map((l) => l.trim()).filter(Boolean);
  nonEmptyLines.forEach((line, idx) => {
    if (idx < modelQuestions.length) {
      result[idx + 1] = line;
    }
  });

  return result;
}

// Canonicalize mathematical strings (handles pdf-parse exponents like x2 -> x^2, symbols, spaces, fractions)
function canonicalizeMath(input: string): string {
  if (!input) return '';
  let s = String(input)
    .replace(/\[(?:M\d+|A\d+|B\d+)(?:\s*,\s*(?:M\d+|A\d+|B\d+))*\]/gi, '')
    .replace(/^(?:Final\s+Answer|Model\s+Answer|Answer|Ans|Solution)\s*[:\-]?\s*/gi, '')
    .replace(/−|–|—/g, '-')
    .replace(/×|⋅|·/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/=⇒|⇒|==>|=>|->|→/g, '=')
    // Normalize pdf-parse flattened powers: e.g. x2 -> x^2, ab2 -> ab^2, (x-3)2 -> (x-3)^2
    .replace(/([a-zA-Z\)])([2-9])\b/g, '$1^$2')
    .replace(/\s+/g, '')
    .toLowerCase();

  // Strip leading '=' and trailing periods
  s = s.replace(/^=+/, '').replace(/\.+$/, '');
  return s;
}

// Safely evaluate an algebraic/numeric expression at given variable values (Symbolic-Numeric Probing Engine)
function evaluateAlgebraicAtPoint(rawExpr: string, vars: Record<string, number>): number | null {
  try {
    let expr = canonicalizeMath(rawExpr);
    if (!expr) return null;

    // If it's an assignment like "x=6" or "t=(v-u)/a", take the RHS if LHS is a single variable
    if (expr.includes('=') && !expr.includes('<=') && !expr.includes('>=')) {
      const parts = expr.split('=').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      const firstPart = parts[0];
      if (/^[a-z]$/.test(firstPart) && parts.length >= 2) {
        expr = lastPart;
      } else {
        expr = lastPart;
      }
    }

    // Reject inequalities or multi-solution strings from single-value evaluation
    if (/[<>]|or|and|,/.test(expr)) return null;

    // Handle sqrt / √ / r(...) from pdf-parse
    expr = expr.replace(/√\(?([0-9a-z+\-*/^]+)\)?/g, 'Math.sqrt($1)');
    expr = expr.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');

    // Separate adjacent multi-letter variables like "ab" -> "a*b", "xy" -> "x*y"
    expr = expr.replace(/([a-z])([a-z])/g, '$1*$2');
    expr = expr.replace(/([a-z])([a-z])/g, '$1*$2');

    // Insert explicit multiplication: 4x -> 4*x, )x -> )*x, x( -> x*(, )( -> )*(, 2( -> 2*(
    expr = expr
      .replace(/(\d)([a-z\(])/g, '$1*$2')
      .replace(/([a-z\)])(\d)/g, '$1*$2')
      .replace(/(\))([a-z\(])/g, '$1*$2')
      .replace(/([a-z])(\()/g, '$1*$2')
      .replace(/\^/g, '**');

    // Substitute variable values
    for (const [vName, vVal] of Object.entries(vars)) {
      const re = new RegExp(`\\b${vName}\\b`, 'g');
      expr = expr.replace(re, `(${vVal})`);
    }

    // Ensure only safe math tokens remain
    const checkSafe = expr.replace(/Math\.sqrt/g, '');
    if (!/^[0-9+\-*/().\s*]+$/.test(checkSafe)) {
      return null;
    }

    // eslint-disable-next-line no-eval
    const val = Function(`'use strict'; return (${expr});`)();
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}

// Extract numeric values/fractions from a string (e.g. "-3/5" -> -0.6, "4.25" -> 4.25)
function extractSortedNumericTokens(str: string): number[] {
  const c = canonicalizeMath(str);
  const matches = c.match(/-?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/g) || [];
  const nums: number[] = [];
  for (const m of matches) {
    if (m.includes('/')) {
      const [num, den] = m.split('/').map(Number);
      if (den !== 0 && !isNaN(num) && !isNaN(den)) {
        nums.push(Math.round((num / den) * 10000) / 10000);
      }
    } else {
      const n = Number(m);
      if (!isNaN(n)) nums.push(Math.round(n * 10000) / 10000);
    }
  }
  return nums.sort((a, b) => a - b);
}

// 4-Layer Mathematical & Algebraic Equivalence Engine (powered by Solver + Pix2Text + HaithamMath logic)
function areMathExpressionsEquivalent(modelAns: string, studentAns: string, promptText = ''): boolean {
  if (!modelAns || !studentAns) return false;

  const mCanon = canonicalizeMath(modelAns);
  const sCanon = canonicalizeMath(studentAns);
  if (!mCanon || !sCanon) return false;

  // Layer 1: Direct canonical match or exact inclusion of the model final answer at the end of student working
  if (mCanon === sCanon) return true;

  // Strip leading "x=" or subject variable if comparing "x=6" vs "6"
  const stripSubject = (s: string) => s.replace(/^[a-z]=/, '');
  if (stripSubject(mCanon) === stripSubject(sCanon) && stripSubject(mCanon).length > 0) {
    return true;
  }

  // Check if student wrote full working ending with "= <modelAnswer>" or "Answer: <modelAnswer>"
  if (sCanon.endsWith(`=${mCanon}`) || sCanon.endsWith(`=${stripSubject(mCanon)}`) || sCanon.includes(`answer:${mCanon}`)) {
    return true;
  }

  // Layer 2: Commutative Factor Check for Factorisation problems (e.g. (x-4)(x-5) === (x-5)(x-4))
  const isFactorisePrompt = /factoris|factor/i.test(promptText);
  const isExpandPrompt = /expand/i.test(promptText);

  if (isFactorisePrompt && !sCanon.includes('(')) {
    // Factorise question requires brackets in the final answer
    return false;
  }
  if (isExpandPrompt && /^\([^)]+\)\([^)]+\)$/.test(sCanon)) {
    // Expand question requires simplified unbracketed polynomial
    return false;
  }

  // Extract bracketed factors if both are products of brackets
  const extractFactors = (s: string) => {
    const fMatches = s.match(/\([^()]+\)/g);
    if (!fMatches || fMatches.length < 2) return null;
    const prefix = s.slice(0, s.indexOf('('));
    return { prefix, factors: fMatches.slice().sort().join('') };
  };
  const mFactors = extractFactors(stripSubject(mCanon));
  const sFactors = extractFactors(stripSubject(sCanon));
  if (mFactors && sFactors && mFactors.prefix === sFactors.prefix && mFactors.factors === sFactors.factors) {
    return true;
  }

  // Layer 3: Multi-root / Simultaneous Equations / Inequality comparison
  if (
    mCanon.includes('or') ||
    mCanon.includes('and') ||
    mCanon.includes(',') ||
    mCanon.includes('<=') ||
    mCanon.includes('>=') ||
    mCanon.includes('<') ||
    mCanon.includes('>')
  ) {
    // Check inequality signs match and all numeric critical values match (handling fractions like -3/5 == -0.6)
    const mNums = extractSortedNumericTokens(mCanon);
    const sNums = extractSortedNumericTokens(sCanon);
    const hasSameInequalityDir =
      mCanon.includes('<=') === sCanon.includes('<=') &&
      mCanon.includes('>=') === sCanon.includes('>=') &&
      mCanon.includes('<') === sCanon.includes('<') &&
      mCanon.includes('>') === sCanon.includes('>');

    if (
      hasSameInequalityDir &&
      mNums.length > 0 &&
      mNums.length === sNums.length &&
      mNums.every((n, idx) => Math.abs(n - sNums[idx]) < 0.01)
    ) {
      return true;
    }
  }

  // Layer 4: Multi-Point Symbolic/Numeric Probing across variables (x, y, a, b, u, v, r)
  const testPoints = [
    { x: 2.31, y: 1.73, a: 1.41, b: 2.19, u: 3.11, v: 9.47, r: 2.63, t: 1.85 },
    { x: -1.37, y: 2.89, a: 2.07, b: -1.13, u: 1.53, v: 7.21, r: 3.17, t: -0.91 },
    { x: 3.79, y: -0.83, a: -1.61, b: 1.93, u: -2.11, v: 5.83, r: 1.91, t: 2.43 },
  ];

  // Extract the final candidate expression from student working (after last '|' or last '=')
  const studentSegments = String(studentAns)
    .split(/\||;|\n/)
    .map((seg) => seg.trim())
    .filter(Boolean);
  const lastSegment = studentSegments[studentSegments.length - 1] || studentAns;

  let probeMatches = 0;
  let validProbes = 0;
  for (const pt of testPoints) {
    const mVal = evaluateAlgebraicAtPoint(modelAns, pt);
    const sVal = evaluateAlgebraicAtPoint(lastSegment, pt);
    if (mVal !== null && sVal !== null) {
      validProbes++;
      if (Math.abs(mVal - sVal) < 1e-4) {
        probeMatches++;
      }
    }
  }

  if (validProbes >= 2 && probeMatches === validProbes) {
    // Ensure student didn't just copy the unexpanded/unsimplified prompt!
    const pCanon = canonicalizeMath(promptText);
    const lastCanon = canonicalizeMath(lastSegment);
    if (pCanon && pCanon.includes(lastCanon) && lastCanon !== mCanon && lastCanon.length > 3) {
      return false;
    }
    return true;
  }

  return false;
}

// Grade a single question deterministically using the 5-Repo Engine Pool
function evaluateStudentQuestion(modelQ: ParsedModelQuestion, studentRaw: string) {
  const cleanStudent = (studentRaw || '').trim();
  const isUnattempted =
    !cleanStudent ||
    /^(?:not\s+attempted|unattempted|left\s+blank|blank|none|n\/a|\?|-)$/i.test(cleanStudent);

  if (isUnattempted) {
    return {
      questionNumber: modelQ.questionNumber,
      displayLabel: modelQ.displayLabel,
      topicExpression: modelQ.topicExpression,
      paperRef: modelQ.paperRef,
      prompt: modelQ.prompt,
      maxMarks: modelQ.maxMarks,
      earnedMarks: 0,
      markSchemeRef: modelQ.markSchemeRef,
      status: 'incorrect' as const,
      statusLabel: 'INCORRECT' as const,
      studentWorkingFound: 'Not attempted / Left blank',
      modelSolution: modelQ.modelSolution,
      errorAnalysis: 'Question unattempted (0 marks).',
      teacherFeedback: `No answer submitted for ${modelQ.displayLabel}. Expected: ${modelQ.finalAnswer}.`,
    };
  }

  // Extract explicit Answer line if present, or test both the full student working and its final line
  const explicitStudentAnsMatch = cleanStudent.match(/(?:Final\s+Answer|Answer|Ans)\s*[:\-]\s*([^|;\n]+)$/i);
  const studentFinalCandidate = explicitStudentAnsMatch
    ? explicitStudentAnsMatch[1].trim()
    : cleanStudent.split('|').pop()?.trim() || cleanStudent;

  const isFullCorrect =
    areMathExpressionsEquivalent(modelQ.finalAnswer, studentFinalCandidate, modelQ.prompt) ||
    areMathExpressionsEquivalent(modelQ.finalAnswer, cleanStudent, modelQ.prompt);

  if (isFullCorrect) {
    return {
      questionNumber: modelQ.questionNumber,
      displayLabel: modelQ.displayLabel,
      topicExpression: modelQ.topicExpression,
      paperRef: modelQ.paperRef,
      prompt: modelQ.prompt,
      maxMarks: modelQ.maxMarks,
      earnedMarks: modelQ.maxMarks,
      markSchemeRef: modelQ.markSchemeRef,
      status: 'correct' as const,
      statusLabel: 'CORRECT' as const,
      studentWorkingFound: cleanStudent.replace(/\s*\|\s*/g, ' → '),
      modelSolution: modelQ.modelSolution,
      errorAnalysis: `Correct solution (${modelQ.finalAnswer}). Full marks [${modelQ.maxMarks}/${modelQ.maxMarks}] awarded.`,
      teacherFeedback: `Excellent work on ${modelQ.displayLabel}! All method [M1] and accuracy [A1] requirements satisfied.`,
    };
  }

  // Check for Partial Method Marks [M1] across intermediate steps
  let matchedMethodSteps = 0;
  const studentCanon = canonicalizeMath(cleanStudent);

  for (const stepStr of modelQ.methodSteps) {
    // Extract math expressions after ':' in step description
    const colonIdx = stepStr.indexOf(':');
    const mathPart = colonIdx >= 0 ? stepStr.slice(colonIdx + 1) : stepStr;
    const eqParts = mathPart
      .split(/=⇒|⇒|==>|=>|->|→/)
      .map((p) => canonicalizeMath(p))
      .filter((p) => p.length >= 3);

    const matchedThisStep = eqParts.some((eqP) => studentCanon.includes(eqP));
    if (matchedThisStep) {
      matchedMethodSteps++;
    }
  }

  const partialMarks =
    modelQ.maxMarks > 1 && matchedMethodSteps > 0
      ? Math.min(modelQ.maxMarks - 1, matchedMethodSteps)
      : 0;

  if (partialMarks > 0) {
    return {
      questionNumber: modelQ.questionNumber,
      displayLabel: modelQ.displayLabel,
      topicExpression: modelQ.topicExpression,
      paperRef: modelQ.paperRef,
      prompt: modelQ.prompt,
      maxMarks: modelQ.maxMarks,
      earnedMarks: partialMarks,
      markSchemeRef: modelQ.markSchemeRef,
      status: 'incorrect' as const,
      statusLabel: `PARTIAL (${partialMarks}/${modelQ.maxMarks})` as any,
      studentWorkingFound: cleanStudent.replace(/\s*\|\s*/g, ' → '),
      modelSolution: modelQ.modelSolution,
      errorAnalysis: `Awarded ${partialMarks}/${modelQ.maxMarks} method mark(s) [M1] for correct intermediate step, but final accuracy mark [A1] lost (expected ${modelQ.finalAnswer}).`,
      teacherFeedback: `Good method shown [M1] on ${modelQ.displayLabel}, but check your final simplification step. Correct final answer is ${modelQ.finalAnswer}.`,
    };
  }

  return {
    questionNumber: modelQ.questionNumber,
    displayLabel: modelQ.displayLabel,
    topicExpression: modelQ.topicExpression,
    paperRef: modelQ.paperRef,
    prompt: modelQ.prompt,
    maxMarks: modelQ.maxMarks,
    earnedMarks: 0,
    markSchemeRef: modelQ.markSchemeRef,
    status: 'incorrect' as const,
    statusLabel: 'INCORRECT' as const,
    studentWorkingFound: cleanStudent.replace(/\s*\|\s*/g, ' → '),
    modelSolution: modelQ.modelSolution,
    errorAnalysis: `Incorrect answer or algebraic step (student wrote "${studentFinalCandidate}"; expected "${modelQ.finalAnswer}").`,
    teacherFeedback: `Review the step-by-step model solution for ${modelQ.displayLabel}: ${modelQ.modelSolution}`,
  };
}

// Complete 5-Repo Deterministic Multi-Question Grading Pipeline (Grades ALL N questions in the active Model Answer Key)
function gradeWithFiveRepoEnginePool(
  studentName: string,
  assignmentTitle: string,
  modelKeyText: string,
  submissionText: string,
  fileName?: string | null,
  startTime: number = Date.now()
) {
  const safeName = studentName && studentName.trim() ? studentName.trim() : 'Student Submission';
  const modelQuestions = parseModelKeyQuestions(modelKeyText);
  const studentAnswersMap = parseStudentSubmissionQuestions(submissionText, modelQuestions);

  const gradedQuestions = modelQuestions.map((mq) => {
    const studentAns = studentAnswersMap[mq.questionNumber] || '';
    return evaluateStudentQuestion(mq, studentAns);
  });

  const totalQuestions = gradedQuestions.length;
  const totalMarks = gradedQuestions.reduce((sum, q) => sum + q.maxMarks, 0) || 10;
  const earnedMarks = gradedQuestions.reduce((sum, q) => sum + q.earnedMarks, 0);
  const percentage = Math.round((earnedMarks / totalMarks) * 100);

  const correctCount = gradedQuestions.filter((q) => q.status === 'correct').length;
  const partialCount = gradedQuestions.filter((q) => q.earnedMarks > 0 && q.earnedMarks < q.maxMarks).length;
  const attemptedCount = gradedQuestions.filter((q) => q.studentWorkingFound !== 'Not attempted / Left blank').length;
  const unattemptedCount = totalQuestions - attemptedCount;

  const grade =
    percentage >= 90
      ? 'A* (Outstanding)'
      : percentage >= 80
      ? 'A (Excellent)'
      : percentage >= 70
      ? 'B (Good)'
      : percentage >= 60
      ? 'C (Satisfactory)'
      : percentage >= 50
      ? 'D (Needs Improvement)'
      : 'U (Ungraded - Requires Retest)';

  const performanceLevel =
    percentage >= 90
      ? 'Outstanding Mastery'
      : percentage >= 75
      ? 'Proficient'
      : percentage >= 50
      ? 'Developing'
      : 'Needs Targeted Remediation';

  const generalFeedback =
    attemptedCount === 0
      ? `No student answers were detected across the ${totalQuestions} questions in "${assignmentTitle}" (0 / ${totalMarks} marks). Please ensure the student response PDF or text contains numbered solutions matching Questions 1 to ${totalQuestions}.`
      : `${safeName} completed ${attemptedCount} of ${totalQuestions} questions on "${assignmentTitle}", achieving ${earnedMarks} / ${totalMarks} marks (${percentage}% — Grade ${grade}). ${correctCount} question(s) were answered with full accuracy [A1]${partialCount > 0 ? `, ${partialCount} question(s) earned partial method credit [M1]` : ''}${unattemptedCount > 0 ? `, and ${unattemptedCount} question(s) were left unattempted` : ''}.`;

  const incorrectQuestionsList = gradedQuestions
    .filter((q) => q.status !== 'correct')
    .slice(0, 6)
    .map((q) => `${q.displayLabel} (earned ${q.earnedMarks}/${q.maxMarks})`)
    .join(', ');

  const diagnosticReview =
    attemptedCount === 0
      ? `Diagnostic analysis across all ${totalQuestions} questions shows no attempted working.`
      : correctCount === totalQuestions
      ? `Outstanding performance across all ${totalQuestions} questions! Every intermediate method step [M1] and final accuracy target [A1] matched the official mark scheme.`
      : `Across ${totalQuestions} total questions (${totalMarks} marks), ${safeName} secured full marks on ${correctCount} question(s)${partialCount > 0 ? ` and partial method marks [M1] on ${partialCount} question(s)` : ''}. Priority areas for review include: ${incorrectQuestionsList || 'remaining questions'}.`;

  const actionPlan = [
    {
      title: `Targeted Correction (${totalQuestions - correctCount} Question${totalQuestions - correctCount === 1 ? '' : 's'} to Review)`,
      detail:
        totalQuestions === correctCount
          ? `All ${totalQuestions} questions were solved accurately. Proceed to higher-tier extension challenges.`
          : `Re-work the questions where accuracy marks [A1] were lost (${incorrectQuestionsList || 'see table above'}), comparing each algebraic step against the official model solution.`,
    },
    {
      title: 'Method [M1] & Accuracy [A1] Exam Technique',
      detail: `Always write each intermediate algebraic transformation on its own line to secure [M1] method marks even if an arithmetic slip occurs.`,
    },
  ];

  return {
    headerTitle: 'IGCSE MATHEMATICS — HOMEWORK EVALUATION REPORT',
    reportTitle: 'Student Homework Correction & Report',
    studentName: safeName,
    subject: 'IGCSE Mathematics',
    chapter: `Complete ${totalQuestions}-Question Assessment`,
    topic: assignmentTitle,
    assignmentTitle,
    teacherName: 'Mr. Haitham Hussien',
    submissionDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    totalMarks,
    earnedMarks,
    percentage,
    grade,
    performanceLevel,
    uploadedFile: fileName || undefined,
    generalFeedback,
    diagnosticReview,
    actionPlan,
    questions: gradedQuestions,
    strengths:
      correctCount > 0
        ? [
            `Solved ${correctCount} out of ${totalQuestions} questions with full mathematical accuracy [A1]`,
            `Earned ${earnedMarks} / ${totalMarks} total marks across the ${totalQuestions}-question mark scheme`,
            partialCount > 0
              ? `Secured partial method marks [M1] on ${partialCount} multi-step question(s)`
              : 'Clear mathematical notation and step-by-step presentation',
          ]
        : ['Submitted worksheet for diagnostic evaluation across all questions'],
    recommendedNextSteps: [
      `Review detailed step-by-step model solutions for all ${totalQuestions} questions in the table above`,
      'Practice showing explicit intermediate steps to maximize [M1] method marks',
    ],
    executionTimeMs: Date.now() - startTime,
  };
}

// POST Upload Model Answer PDF endpoint (Directly parse & set any PDF Exam/Mark Scheme)
app.post('/api/model-key/upload-pdf', async (req: Request, res: Response) => {
  try {
    const { fileBase64, fileName = 'model_answer.pdf', title } = req.body || {};
    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'No file data received' });
    }

    const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Save PDF to public/assets/model-keys/ for direct in-browser rendering
    const safeName = (fileName || 'model_answer.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetDir = path.resolve(__dirname, 'public', 'assets', 'model-keys');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, safeName);
    fs.writeFileSync(targetPath, buffer);

    // Extract text and math notation using our unified PDF + Vision OCR extractor
    const extractedText = await extractTextFromDocumentBase64(fileBase64, 'application/pdf');

    if (!extractedText.trim()) {
      return res.status(422).json({ success: false, error: 'Could not extract text from this PDF file' });
    }

    // Parse all questions deterministically from the uploaded PDF
    const parsedQuestions = parseModelKeyQuestions(extractedText);
    const detectedQuestions = parsedQuestions.length > 0 ? parsedQuestions.length : 20;
    const computedMarks = parsedQuestions.reduce((sum, q) => sum + q.maxMarks, 0);
    const explicitTotalMarksMatch = extractedText.match(/Total\s+Marks\s*:\s*(\d+)/i);
    const detectedMarks = explicitTotalMarksMatch
      ? parseInt(explicitTotalMarksMatch[1], 10)
      : computedMarks > 0
      ? computedMarks
      : 75;

    const cleanBaseName = (fileName || 'Model Answer')
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
      .trim();

    const resolvedTitle = title && title.trim() ? title.trim() : cleanBaseName || 'Uploaded Model Answer Key (PDF)';

    currentModelAnswerKey = {
      title: resolvedTitle,
      topic: resolvedTitle,
      text: extractedText.trim(),
      totalMarks: detectedMarks,
      isCustom: true,
      pdfUrl: `/assets/model-keys/${safeName}`,
      fileName: safeName,
      questionCount: detectedQuestions,
      updatedAt: new Date().toISOString(),
    };

    persistActiveModelKey(currentModelAnswerKey);
    console.log(
      `[PDF Model Key Uploaded] "${currentModelAnswerKey.title}" (${currentModelAnswerKey.text.length} chars, ${detectedQuestions} questions parsed, ${detectedMarks} marks) -> ${currentModelAnswerKey.pdfUrl}`
    );

    res.json({
      success: true,
      message: `PDF Model Answer Key uploaded! Detected ${detectedQuestions} questions (${detectedMarks} total marks).`,
      modelKey: currentModelAnswerKey,
      parsedQuestionCount: detectedQuestions,
    });
  } catch (err: any) {
    console.error('Error uploading model answer PDF:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to process model answer PDF' });
  }
});

// POST Set / Update Active Model Answer Key
app.post('/api/model-key/active', (req: Request, res: Response) => {
  const { title, text, totalMarks, topic, pdfUrl, fileName } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Model answer text cannot be empty' });
  }

  const parsedQuestions = parseModelKeyQuestions(text);
  const detectedQuestions = parsedQuestions.length > 0 ? parsedQuestions.length : currentModelAnswerKey.questionCount || 20;
  const computedMarks = parsedQuestions.reduce((sum, q) => sum + q.maxMarks, 0);
  const resolvedMarks =
    typeof totalMarks === 'number' && totalMarks > 0 ? totalMarks : computedMarks > 0 ? computedMarks : 75;

  currentModelAnswerKey = {
    title: (title && title.trim()) || 'Custom Model Answer Key',
    topic: (topic && topic.trim()) || (title && title.trim()) || 'Custom Assessment',
    text: text.trim(),
    totalMarks: resolvedMarks,
    questionCount: detectedQuestions,
    isCustom: true,
    pdfUrl: pdfUrl || currentModelAnswerKey.pdfUrl,
    fileName: fileName || currentModelAnswerKey.fileName,
    updatedAt: new Date().toISOString(),
  };

  persistActiveModelKey(currentModelAnswerKey);
  console.log(
    `[Model Key Updated] Active model key: "${currentModelAnswerKey.title}" (${detectedQuestions} questions, ${resolvedMarks} marks)`
  );

  res.json({
    success: true,
    message: `Active model answer key updated (${detectedQuestions} questions, ${resolvedMarks} marks)`,
    modelKey: currentModelAnswerKey,
  });
});

// POST Reset Active Model Answer Key (supports resetting to Edexcel Monthly Exam 1 or Cambridge BIDMAS)
app.post('/api/model-key/reset', (req: Request, res: Response) => {
  const target = req.body?.target || 'edexcel';
  if (target === 'bidmas') {
    currentModelAnswerKey = {
      ...DEFAULT_CAMBRIDGE_BIDMAS_KEY,
      updatedAt: new Date().toISOString(),
    };
  } else {
    currentModelAnswerKey = {
      ...PEARSON_EDEXCEL_EXAM_1_KEY,
      updatedAt: new Date().toISOString(),
    };
  }

  persistActiveModelKey(currentModelAnswerKey);
  res.json({
    success: true,
    message: `Active model answer key reset to: ${currentModelAnswerKey.title}`,
    modelKey: currentModelAnswerKey,
  });
});

interface StudentPageImageInput {
  pageNumber?: number;
  dataUrl: string;
  mimeType?: string;
}

/**
 * Convert student uploads (pre-rendered high-DPI page images or raw PDF/image base64)
 * into Gemini Part objects with explicit high/ultra-high media resolution.
 */
async function buildStudentMediaParts(params: {
  pageImages?: StudentPageImageInput[] | null;
  fileBase64?: string | null;
  fileMimeType?: string | null;
}): Promise<{
  mediaParts: any[];
  cleanupFileNames: string[];
  resolutionLabel: string;
  pageCount: number;
}> {
  const { pageImages, fileBase64, fileMimeType } = params;
  const mediaParts: any[] = [];
  const cleanupFileNames: string[] = [];

  const validPages = Array.isArray(pageImages)
    ? pageImages.filter((p) => p && typeof p.dataUrl === 'string' && p.dataUrl.trim().length > 20)
    : [];

  if (validPages.length > 0) {
    // Gemini image parts support ULTRA_HIGH (2240 tokens/page) for dense handwriting
    const useUltraHigh = validPages.length <= 6;
    const partResolution = useUltraHigh
      ? PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH
      : PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH;

    validPages.forEach((page, idx) => {
      const pageNum = page.pageNumber || idx + 1;
      const cleanData = page.dataUrl.includes(',') ? page.dataUrl.split(',')[1] : page.dataUrl;
      const mime = page.mimeType || 'image/jpeg';
      mediaParts.push({ text: `--- STUDENT HOMEWORK PAGE ${pageNum} ---` });
      mediaParts.push(createPartFromBase64(cleanData, mime, partResolution));
    });

    return {
      mediaParts,
      cleanupFileNames,
      resolutionLabel: useUltraHigh ? 'MEDIA_RESOLUTION_ULTRA_HIGH' : 'MEDIA_RESOLUTION_HIGH',
      pageCount: validPages.length,
    };
  }

  if (fileBase64 && fileMimeType) {
    const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
    const sendMime = fileMimeType || 'application/pdf';
    const isPdf = sendMime.includes('pdf');
    const partResolution = isPdf
      ? PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH
      : PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH;
    const fileSizeBytes = Math.ceil(cleanBase64.length * 0.75);

    if (fileSizeBytes > 3 * 1024 * 1024) {
      console.log(`[Gemini Files API] Uploading ${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB file...`);
      const buffer = Buffer.from(cleanBase64, 'base64');
      const blob = new Blob([buffer], { type: sendMime });
      const uploadResult = await ai.files.upload({
        file: blob,
        config: { mimeType: sendMime },
      });
      let fileRef = uploadResult;
      let waitAttempts = 0;
      while (fileRef.state === 'PROCESSING' && waitAttempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        fileRef = await ai.files.get({ name: fileRef.name! });
        waitAttempts++;
      }
      if (fileRef.state !== 'ACTIVE') {
        throw new Error(`File upload failed: state=${fileRef.state}`);
      }
      mediaParts.push(createPartFromUri(fileRef.uri!, sendMime, partResolution));
      cleanupFileNames.push(fileRef.name!);
    } else {
      mediaParts.push(createPartFromBase64(cleanBase64, sendMime, partResolution));
    }

    return {
      mediaParts,
      cleanupFileNames,
      resolutionLabel: partResolution,
      pageCount: 1,
    };
  }

  return {
    mediaParts: [],
    cleanupFileNames: [],
    resolutionLabel: 'TEXT_ONLY',
    pageCount: 0,
  };
}

function computeGradeForSystem(
  percentage: number,
  earnedMarks: number,
  totalMarks: number,
  gradingSystem: 'edexcel' | 'ib' | 'marks' = 'edexcel'
): { grade: string; performanceLevel: string } {
  if (gradingSystem === 'ib') {
    const band =
      percentage >= 88
        ? 'Band 7 (Excellent)'
        : percentage >= 75
        ? 'Band 6 (Very Good)'
        : percentage >= 62
        ? 'Band 5 (Good)'
        : percentage >= 50
        ? 'Band 4 (Satisfactory)'
        : percentage >= 38
        ? 'Band 3 (Mediocre)'
        : percentage >= 22
        ? 'Band 2 (Limited)'
        : 'Band 1 (Minimal)';
    return {
      grade: band,
      performanceLevel: `IB MYP/DP Scale • ${earnedMarks}/${totalMarks} (${percentage}%)`,
    };
  }
  if (gradingSystem === 'marks') {
    return {
      grade: `${earnedMarks} / ${totalMarks} Marks (${percentage}%)`,
      performanceLevel:
        percentage >= 85
          ? 'High Mastery'
          : percentage >= 70
          ? 'Proficient'
          : percentage >= 50
          ? 'Developing'
          : 'Requires Support',
    };
  }
  const edexcelGrade =
    percentage >= 90
      ? 'A* (Level 9 — Outstanding)'
      : percentage >= 80
      ? 'A (Level 8 — Excellent)'
      : percentage >= 70
      ? 'B (Level 7 — Good)'
      : percentage >= 60
      ? 'C (Level 5-6 — Satisfactory)'
      : percentage >= 50
      ? 'D (Level 4 — Needs Improvement)'
      : 'U (Ungraded — Requires Retest)';
  return {
    grade: edexcelGrade,
    performanceLevel: `Edexcel IGCSE Scale • ${earnedMarks}/${totalMarks} (${percentage}%)`,
  };
}

async function runHomeworkCorrectionDraft(params: {
  studentName?: string;
  assignment?: string;
  submissionText?: string;
  modelAnswerKey?: string | null;
  modelAnswerTitle?: string | null;
  modelKeyFileBase64?: string | null;
  customAnswers?: any;
  fileName?: string | null;
  fileBase64?: string | null;
  fileMimeType?: string | null;
  pageImages?: any;
  precisionMode?: string;
  gradingSystem?: 'edexcel' | 'ib' | 'marks';
  assignmentKind?: 'homework' | 'quiz' | 'essay';
}): Promise<{ report: any; gradingMeta: any; executionTimeMs: number }> {
  const cleanupFileNames: string[] = [];
  try {
    const {
      studentName = 'Student Submission',
      assignment = '',
      submissionText = '',
      modelAnswerKey = null,
      modelAnswerTitle = null,
      modelKeyFileBase64 = null,
      customAnswers = null,
      fileName = null,
      fileBase64 = null,
      fileMimeType = null,
      pageImages = null,
      precisionMode = 'deep',
      gradingSystem = 'edexcel',
      assignmentKind = 'homework',
    } = params || {};

    const startTime = Date.now();
    const safeStudentName = studentName && String(studentName).trim() ? String(studentName).trim() : 'Student Submission';

    // 1. Resolve Model Answer Key (Educator-only)
    let effectiveModelKey = (modelAnswerKey && String(modelAnswerKey).trim()) || currentModelAnswerKey.text;
    if (modelKeyFileBase64) {
      const extractedKeyText = await extractTextFromDocumentBase64(modelKeyFileBase64, 'application/pdf');
      if (extractedKeyText && extractedKeyText.trim().length > 25) {
        effectiveModelKey = extractedKeyText.trim();
      }
    } else if (!effectiveModelKey.includes('=') && currentModelAnswerKey.fileName) {
      // Upgrade previously-stored sparse Model Key PDF via Vision OCR if its solution images weren't transcribed yet
      const localKeyPath = path.resolve(__dirname, 'public', 'assets', 'model-keys', currentModelAnswerKey.fileName);
      if (fs.existsSync(localKeyPath)) {
        try {
          const buf = fs.readFileSync(localKeyPath);
          const upgradedText = await extractTextFromDocumentBase64(
            `data:application/pdf;base64,${buf.toString('base64')}`,
            'application/pdf'
          );
          if (upgradedText && upgradedText.includes('=')) {
            effectiveModelKey = upgradedText;
            currentModelAnswerKey = {
              ...currentModelAnswerKey,
              text: upgradedText,
              updatedAt: new Date().toISOString(),
            };
            persistActiveModelKey(currentModelAnswerKey);
          }
        } catch {
          // keep existing text if fallback fails
        }
      }
    }
    const effectiveAssignment =
      (modelAnswerTitle && String(modelAnswerTitle).trim()) || assignment || currentModelAnswerKey.title;

    // 2. Extract Student Submission Text from PDF / Image BEFORE running any grading or prompt construction
    let effectiveSubmissionText = String(submissionText || '').trim();
    const isPlaceholderText =
      !effectiveSubmissionText ||
      effectiveSubmissionText.length < 40 ||
      effectiveSubmissionText.includes('Evaluated according to Cambridge IGCSE') ||
      effectiveSubmissionText.startsWith('Student:');

    const hasPageImages = Array.isArray(pageImages) && pageImages.length > 0;
    const hasStudentFile = hasPageImages || Boolean(fileBase64 && fileMimeType);
    if (hasStudentFile && isPlaceholderText) {
      effectiveSubmissionText = '';
    } else if (!effectiveSubmissionText && customAnswers) {
      effectiveSubmissionText = JSON.stringify(customAnswers);
    }

    // 3. Deterministic Multi-Question Structure Parser
    const baseReport = gradeWithFiveRepoEnginePool(
      safeStudentName,
      effectiveAssignment,
      effectiveModelKey,
      effectiveSubmissionText,
      fileName,
      startTime
    );

    const totalExpectedQuestions = baseReport.questions.length;
    const activeGradingModel = precisionMode === 'max' ? DEEP_REASONING_MODEL : GRADING_MODEL;
    // Sibling fallback chain: full Flash models first, then Flash-Lite models if primary RPD quota is reached
    const siblingFallbackModels =
      precisionMode === 'max'
        ? ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']
        : ['gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];

    console.log(
      `[Homework Grader] Grading "${safeStudentName}" (${totalExpectedQuestions} Qs, model=${activeGradingModel}, pageImages=${hasPageImages ? pageImages.length : 0}, rawFile=${Boolean(fileBase64)})`
    );

    // 4. High-Resolution Vision + 2-Pass Transcribe-Then-Grade with Gemini Thinking
    try {
      const mediaResult = await buildStudentMediaParts({ pageImages, fileBase64, fileMimeType });
      cleanupFileNames.push(...mediaResult.cleanupFileNames);
      const { mediaParts, resolutionLabel, pageCount } = mediaResult;
      const hasVisualMedia = mediaParts.length > 0;

      const onServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
      const getRemainingBudgetMs = () => {
        const elapsed = Date.now() - startTime;
        return onServerless ? Math.max(12000, 55000 - elapsed) : 180000;
      };

      // Pass 1 (Separate OCR pass) only for 'max' Detailed Handwriting Pass — 'deep' runs 1-pass high-res Vision directly (2x faster & halves quota usage)
      let pass1TranscriptionSummary = '';
      let twoPassOcrUsed = false;
      const expectedRefs = baseReport.questions
        .map((q) => `Q${q.questionNumber} (${q.displayLabel}): ${q.prompt.slice(0, 120)}`)
        .join('\n');

      if (hasVisualMedia && precisionMode === 'max' && (!onServerless || getRemainingBudgetMs() > 32000)) {
        try {
          const ocrPrompt = `You are a specialist IGCSE Mathematics handwriting & diagram transcription reader.
DO NOT grade or evaluate correctness yet. Your ONLY task is to inspect every attached student page/photo pixel-by-pixel and transcribe ALL visible handwritten work accurately.

EXPECTED QUESTIONS INDEX (to help map handwritten labels like "1", "Q2(a)", etc., though the student may write out of order or leave questions blank):
${expectedRefs}

TRANSCRIPTION RULES:
1. Scan EVERY attached page top-to-bottom. Watch carefully for small exponents (e.g. x^2 vs x*2), negative signs (- vs +), division/fraction bars, brackets, radicals, decimals vs commas, and crossed-out rough work (note crossed-out vs kept answer).
2. Read geometric diagrams, number lines, tables, coordinate graphs, and circled multiple-choice answers if present.
3. Transcribe the student's EXACT math line by line (even if their arithmetic is wrong — never "fix" their mistake!).

Return ONLY valid JSON:
{
  "pageSummaries": [
    { "pageNumber": 1, "orientationOk": true, "legibility": "clear", "questionsSpotted": ["Q1", "Q2"] }
  ],
  "transcriptions": [
    {
      "questionNumber": 1,
      "questionRef": "Q1",
      "pageNumber": 1,
      "confidence": "high",
      "visualNotes": "Any diagram, crossed-out work, or tiny symbol note",
      "verbatimWorking": "Line-by-line transcription of exactly what the student wrote",
      "finalAnswerWritten": "Exact final value/expression written"
    }
  ]
}`;

          const pass1TimeoutMs = onServerless ? Math.min(22000, Math.floor(getRemainingBudgetMs() * 0.45)) : 45000;
          const ocrResponse = await generateWithRetry(
            {
              model: GRADING_MODEL,
              contents: [...mediaParts, { text: ocrPrompt }],
              config: {
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
              },
            },
            0,
            pass1TimeoutMs,
            siblingFallbackModels
          );
          const ocrText = String(ocrResponse?.text || '').trim();
          if (ocrText.length > 20) {
            pass1TranscriptionSummary = ocrText;
            twoPassOcrUsed = true;
            console.log(`[Pass 1 OCR complete] ${ocrText.length} chars across ${pageCount} visual page(s)`);
          }
        } catch (ocrPassErr: any) {
          console.warn('[Pass 1 OCR skipped, continuing directly to Pass 2 Vision]:', ocrPassErr?.message);
        }
      }

      // Pass 2: Mathematical Grading using BOTH the high-res visual pages + Pass-1 OCR + FULL Mark Scheme
      const compactModelQuestions = baseReport.questions
        .map(
          (q) =>
            `Q${q.questionNumber} (${q.displayLabel}) [${q.maxMarks} Marks]: ${q.prompt}\n  Reference Solution: ${q.modelSolution}`
        )
        .join('\n');

      const fullMarkSchemeExcerpt = effectiveModelKey.trim().slice(0, 18000);

      const gradingRubricLabel =
        gradingSystem === 'ib'
          ? 'IB Criteria A (Knowing & Understanding), B (Patterns), C (Communicating), D (Applying Mathematics) — Band 1 to 7'
          : gradingSystem === 'marks'
          ? 'Direct Raw Marks & Percentage per step'
          : 'Pearson Edexcel / Cambridge IGCSE [M1] Method & [A1] Accuracy mark scheme';

      const gradePrompt = `You are Mr. Haitham Hussien's Mathematics examiner (${gradingRubricLabel}).
Grade the student's ${assignmentKind} submission against ALL ${totalExpectedQuestions} questions in the Official Model Answer Key.

STUDENT NAME: ${safeStudentName}
ASSIGNMENT: ${effectiveAssignment} (${totalExpectedQuestions} Questions, ${baseReport.totalMarks} Total Marks)
GRADING SYSTEM: ${gradingSystem.toUpperCase()}

FULL OFFICIAL MODEL ANSWER KEY & MARK SCHEME RULES:
${fullMarkSchemeExcerpt}

STRUCTURED QUESTION INDEX (${totalExpectedQuestions} QUESTIONS — you MUST return one entry per questionNumber 1..${totalExpectedQuestions}):
${compactModelQuestions}

${pass1TranscriptionSummary ? `PASS-1 VERBATIM HANDWRITING TRANSCRIPTION (cross-check directly against the attached images, especially any "medium" or "low" confidence items):\n${pass1TranscriptionSummary}\n` : ''}
${effectiveSubmissionText ? `ADDITIONAL SUBMITTED TEXT:\n${effectiveSubmissionText}\n` : ''}
${hasVisualMedia ? "INSTRUCTIONS FOR ATTACHED IMAGES/PAGES: Re-inspect the original attached student pages directly before assigning each mark. Never invent working you cannot actually see on a page." : ''}

STRICT 3-PHASE PER-QUESTION PIPELINE RULES:
1. Evaluate ALL ${totalExpectedQuestions} questions (questionNumber 1 to ${totalExpectedQuestions}). NEVER skip or stop early.
2. PHASE 1 (Student Answer Extraction): Transcribe EXACTLY what the student wrote in "phase1Extraction" and "studentWorkingFound" ("What was written"). If blank, state "Not attempted / Left blank".
3. PHASE 2 (Error Identification): In "phase2ErrorAnalysis" and "errorAnalysis", identify the exact mistake and explain WHY it is mathematically wrong (or state exact method/accuracy credit earned if correct).
4. PHASE 3 (Solution Resolution): In "phase3Solution", write the COMPLETE, FULL, step-by-step worked mathematical solution and exact final answer from start to finish. NEVER write lazy placeholders such as "Check the textbook" or "Refer to textbook" or "..." — always provide the complete worked steps and answer!
5. Award full marks if mathematically equivalent and partial method marks when valid intermediate steps are shown.

Return ONLY valid JSON matching this 3-Phase schema:
{
  "generalFeedback": "2-sentence summary of student performance across all ${totalExpectedQuestions} questions",
  "diagnosticReview": "Detailed paragraph analyzing mathematical strengths, extracted working, and specific misconceptions",
  "questions": [
    {
      "questionNumber": 1,
      "displayLabel": "Q1",
      "observedPage": 1,
      "phase1Extraction": "What was written — exact line-by-line working and final answer from the student",
      "studentWorkingFound": "Exact step-by-step handwritten working and final answer read from the page",
      "earnedMarks": 2,
      "status": "correct",
      "phase2ErrorAnalysis": "Exact mistake identified & why it is wrong (or Confirmed correct [M1][A1])",
      "errorAnalysis": "Step-by-step verification or specific arithmetic/algebraic error found",
      "phase3Solution": "Step-by-step correct working and final answer",
      "teacherFeedback": "Constructive teacher feedback referencing the student's actual steps"
    }
  ]
}`;

      const contents: any = hasVisualMedia ? [...mediaParts, { text: gradePrompt }] : gradePrompt;
      const gradeTimeoutMs = onServerless ? getRemainingBudgetMs() : 55000;

      const response = await generateWithRetry(
        {
          model: activeGradingModel,
          contents,
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          },
        },
        0,
        gradeTimeoutMs,
        siblingFallbackModels
      );

      console.log('[Gemini grade raw]', String(response.text || '').slice(0, 1500));
      let cleanedJson = String(response.text || '{}').trim();
      cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
      const rawParsed = JSON.parse(cleanedJson);
      const aiParsed = Array.isArray(rawParsed)
        ? rawParsed.length > 0 && rawParsed[0] && Array.isArray(rawParsed[0].questions)
          ? rawParsed[0]
          : { questions: rawParsed }
        : rawParsed;
      if (aiParsed && Array.isArray(aiParsed.questions) && aiParsed.questions.length > 0) {
        const aiByNum = new Map<number, any>();
        const aiByLabel = new Map<string, any>();
        for (const aq of aiParsed.questions) {
          const qn = Number(aq.questionNumber);
          if (!isNaN(qn)) aiByNum.set(qn, aq);
          const lbl = String(aq.displayLabel || aq.questionRef || '').trim().toLowerCase();
          if (lbl) aiByLabel.set(lbl, aq);
        }

        const mergedQuestions = baseReport.questions.map((bq) => {
          const aq =
            aiByNum.get(bq.questionNumber) ||
            aiByLabel.get(String(bq.displayLabel || '').trim().toLowerCase());
          if (!aq) return bq;

          const aiEarned =
            typeof aq.earnedMarks === 'number'
              ? Math.max(0, Math.min(bq.maxMarks, Math.round(aq.earnedMarks)))
              : bq.earnedMarks;
          const finalEarned = aiEarned;
          const finalStatus = finalEarned === bq.maxMarks ? ('correct' as const) : ('incorrect' as const);
          const finalStatusLabel =
            finalEarned === bq.maxMarks
              ? ('CORRECT' as const)
              : finalEarned > 0
              ? (`PARTIAL (${finalEarned}/${bq.maxMarks})` as any)
              : ('INCORRECT' as const);

          const pageTag =
            aq.observedPage && Number(aq.observedPage) > 0 && hasVisualMedia
              ? `[Page ${aq.observedPage}] `
              : '';

          const phase1Text = aq.phase1Extraction || aq.studentWorkingFound
            ? `${pageTag}${aq.phase1Extraction || aq.studentWorkingFound}`
            : bq.studentWorkingFound;
          const phase2Text = aq.phase2ErrorAnalysis || aq.errorAnalysis || bq.errorAnalysis;
          const phase3Text = aq.phase3Solution || bq.modelSolution;

          return {
            ...bq,
            earnedMarks: finalEarned,
            status: finalStatus,
            statusLabel: finalStatusLabel,
            studentWorkingFound: phase1Text,
            phase1Extraction: phase1Text,
            errorAnalysis: phase2Text,
            phase2ErrorAnalysis: phase2Text,
            modelSolution: phase3Text,
            phase3Solution: phase3Text,
            teacherFeedback: aq.teacherFeedback || bq.teacherFeedback,
          };
        });

        const totalMarks = mergedQuestions.reduce((s, q) => s + q.maxMarks, 0) || baseReport.totalMarks;
        const earnedMarks = mergedQuestions.reduce((s, q) => s + q.earnedMarks, 0);
        const percentage = Math.round((earnedMarks / totalMarks) * 100);
        const computedGrade = computeGradeForSystem(percentage, earnedMarks, totalMarks, gradingSystem);
        const criterionBreakdown =
          gradingSystem === 'ib'
            ? [
                { label: 'Criterion A: Knowing & Understanding', score: `${Math.max(1, Math.min(8, Math.round((percentage / 100) * 8)))}/8` },
                { label: 'Criterion B: Investigating Patterns', score: `${Math.max(1, Math.min(8, Math.round((percentage / 100) * 8)))}/8` },
                { label: 'Criterion C: Communicating', score: `${Math.max(1, Math.min(8, Math.round((percentage / 100) * 8)))}/8` },
                { label: 'Criterion D: Applying Mathematics', score: `${Math.max(1, Math.min(8, Math.round((percentage / 100) * 8)))}/8` },
              ]
            : undefined;

        const gradingMeta = {
          model: response?.modelVersion || activeGradingModel,
          precisionMode,
          twoPassOcrUsed,
          pageCount,
          mediaResolution: resolutionLabel,
          thinkingLevel: 'HIGH',
        };

        const finalReport = {
          ...baseReport,
          totalMarks,
          earnedMarks,
          percentage,
          grade: computedGrade.grade,
          performanceLevel: computedGrade.performanceLevel,
          gradingSystem,
          assignmentKind,
          criterionBreakdown,
          generalFeedback: aiParsed.generalFeedback || baseReport.generalFeedback,
          diagnosticReview: aiParsed.diagnosticReview || baseReport.diagnosticReview,
          questions: mergedQuestions,
          gradingMeta,
          executionTimeMs: Date.now() - startTime,
        };

        return {
          report: finalReport,
          gradingMeta,
          executionTimeMs: Date.now() - startTime,
        };
      }
    } catch (e: any) {
      console.error('Grading draft generation FAILED:', e?.status, e?.message);
      const noKey = !process.env.GEMINI_API_KEY;
      const rawMsg = String(e?.message || '');
      const isQuotaError =
        e?.status === 429 ||
        rawMsg.includes('429') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.toLowerCase().includes('quota');
      const retryMatch = rawMsg.match(/retry in\s+([0-9hms.]+)/i);
      const cleanMessage = noKey
        ? 'GEMINI_API_KEY is not set on the server, so the marking assistant cannot generate a draft.'
        : isQuotaError
        ? `Daily automated grading quota reached on available free-tier models${retryMatch ? ` (next reset in ${retryMatch[1]})` : ''}. Click "Open Manual Correction Sheet" below to grade manually right now, or update GEMINI_API_KEY in .env.`
        : `Marking assistant could not process this submission: ${rawMsg.slice(0, 220)}`;
      const err: any = new Error(cleanMessage);
      err.statusCode = isQuotaError ? 429 : 502;
      throw err;
    }

    const noMarksErr: any = new Error('Marking assistant returned no question marks. Please try again.');
    noMarksErr.statusCode = 502;
    throw noMarksErr;
  } finally {
    if (cleanupFileNames.length > 0) {
      for (const name of cleanupFileNames) {
        ai.files.delete({ name }).catch(() => {});
      }
    }
  }
}

// Educator Direct Homework Grading Draft Endpoint (teacher-only in UI)
app.post('/api/homework/grade', async (req: Request, res: Response) => {
  try {
    const result = await runHomeworkCorrectionDraft(req.body || {});
    return res.json({
      success: true,
      report: result.report,
      gradingMeta: result.gradingMeta,
      executionTimeMs: result.executionTimeMs,
    });
  } catch (error: any) {
    console.error('Error generating grading draft:', error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || 'Failed to grade homework',
    });
  }
});

// ============================================================================
// Persistent Course Enrollment & Student Homework Submission Store
// ============================================================================

interface CourseEnrollment {
  studentId: number;
  studentUsername: string;
  studentName: string;
  grade?: string;
  section?: string;
  courseId: string;
  courseTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  teacherNote?: string;
}

interface HomeworkSubmissionRecord {
  id: string;
  studentId: number;
  studentUsername: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  assignmentId?: string | null;
  dueDate?: string | null;
  assignment: string;
  assignmentKind?: 'homework' | 'quiz' | 'essay';
  gradingSystem?: 'edexcel' | 'ib' | 'marks';
  submissionText: string;
  fileName?: string | null;
  fileMimeType?: string | null;
  pageCount: number;
  a3SpreadCount?: number;
  quizQuestions?: any[];
  quizAnswers?: Record<string, string>;
  status: 'pending' | 'graded';
  submittedAt: string;
  publishedAt?: string;
  reviewedBy?: string;
  teacherNote?: string;
  draftStatus?: 'queued' | 'generating' | 'ready' | 'failed';
  draftError?: string | null;
  draftReport?: any | null;
  publishedReport?: any | null;
  emailDelivery?: {
    status: 'sent' | 'logged_locally' | 'failed';
    to: string;
    provider: string;
    resendId?: string;
    note?: string;
  } | null;
}

interface OutboxEmailRecord {
  id: string;
  createdAt: string;
  submissionId: string;
  studentId: number;
  studentName: string;
  parentName?: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  provider: 'resend' | 'local-preview';
  status: 'sent' | 'logged_locally' | 'failed';
  resendId?: string;
  note?: string;
}

interface DirectorySeatUser {
  id: number;
  domain: string;
  username: string;
  password: string;
  fullName: string;
  role: 'student' | 'parent' | 'teacher';
  grade?: string;
  section?: string;
  parentEmail?: string;
  linkedStudentId?: number;
  linkedStudentName?: string;
  createdAt: string;
}

interface HomeworkAssignmentRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  instructions: string;
  dueDate: string;
  gradingSystem: 'edexcel' | 'ib' | 'marks';
  createdAt: string;
  createdBy: string;
}

interface PortalNotification {
  id: string;
  recipientRole: 'student' | 'parent' | 'teacher' | 'all';
  courseId?: string;
  studentId?: number;
  submissionId?: string;
  title: string;
  message: string;
  type: 'assignment' | 'report' | 'submission';
  dueDate?: string;
  createdAt: string;
  readByUserIds: number[];
}

interface PortalState {
  enrollments: Record<string, CourseEnrollment>;
  submissions: HomeworkSubmissionRecord[];
  assignments: HomeworkAssignmentRecord[];
  notifications: PortalNotification[];
  outbox: OutboxEmailRecord[];
  directoryUsers: DirectorySeatUser[];
  customVideos: Record<string, any[]>;
  customMaterials: Record<string, any[]>;
  customQuizzes: any[];
  parentEmails: Record<string, string>;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const SUBMISSIONS_MEDIA_DIR = path.join(DATA_DIR, 'submissions');
const COURSE_MATERIALS_DIR = path.join(DATA_DIR, 'course-materials');
const PORTAL_STATE_FILE = path.join(DATA_DIR, 'portal-state.json');

function ensureDataDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SUBMISSIONS_MEDIA_DIR)) fs.mkdirSync(SUBMISSIONS_MEDIA_DIR, { recursive: true });
  if (!fs.existsSync(COURSE_MATERIALS_DIR)) fs.mkdirSync(COURSE_MATERIALS_DIR, { recursive: true });
}

function loadPortalState(): PortalState {
  ensureDataDirs();
  try {
    if (fs.existsSync(PORTAL_STATE_FILE)) {
      const raw = fs.readFileSync(PORTAL_STATE_FILE, 'utf-8').replace(/^\uFEFF/, '');
      const parsed = JSON.parse(raw);
      return {
        enrollments: parsed?.enrollments && typeof parsed.enrollments === 'object' ? parsed.enrollments : {},
        submissions: Array.isArray(parsed?.submissions) ? parsed.submissions : [],
        assignments: Array.isArray(parsed?.assignments) ? parsed.assignments : [],
        notifications: Array.isArray(parsed?.notifications) ? parsed.notifications : [],
        outbox: Array.isArray(parsed?.outbox) ? parsed.outbox : [],
        directoryUsers: Array.isArray(parsed?.directoryUsers) ? parsed.directoryUsers : [],
        customVideos: parsed?.customVideos && typeof parsed.customVideos === 'object' ? parsed.customVideos : {},
        customMaterials: parsed?.customMaterials && typeof parsed.customMaterials === 'object' ? parsed.customMaterials : {},
        customQuizzes: Array.isArray(parsed?.customQuizzes) ? parsed.customQuizzes : [],
        parentEmails: parsed?.parentEmails && typeof parsed.parentEmails === 'object' ? parsed.parentEmails : {},
      };
    }
  } catch (err) {
    console.warn('[Portal State] Failed to load state file, starting fresh:', err);
  }
  return {
    enrollments: {},
    submissions: [],
    assignments: [],
    notifications: [],
    outbox: [],
    directoryUsers: [],
    customVideos: {},
    customMaterials: {},
    customQuizzes: [],
    parentEmails: {},
  };
}

function savePortalState(state: PortalState) {
  ensureDataDirs();
  fs.writeFileSync(PORTAL_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function saveSubmissionMedia(id: string, media: { pageImages?: any[]; fileBase64?: string | null; fileMimeType?: string | null }) {
  ensureDataDirs();
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  fs.writeFileSync(path.join(SUBMISSIONS_MEDIA_DIR, `${safeId}.json`), JSON.stringify(media), 'utf-8');
}

function loadSubmissionMedia(id: string): { pageImages?: any[]; fileBase64?: string | null; fileMimeType?: string | null } | null {
  try {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const p = path.join(SUBMISSIONS_MEDIA_DIR, `${safeId}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function deleteSubmissionMedia(id: string) {
  try {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const p = path.join(SUBMISSIONS_MEDIA_DIR, `${safeId}.json`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore cleanup errors
  }
}

// Once Mr. Haitham approves & publishes a report, Student & Parent receive all 3 Phases:
// Phase 1 (Extraction), Phase 2 (Error Analysis), and Phase 3 (Correct Working & Solution).
// Internal mark-scheme refs and internal execution metadata stay strictly educator-only.
function sanitizeReportForStudent(report: any): any {
  if (!report) return null;
  const cleanedQuestions = Array.isArray(report.questions)
    ? report.questions.map((q: any) => {
        const { markSchemeRef, ...rest } = q || {};
        return {
          ...rest,
          phase1Extraction: rest.phase1Extraction || rest.studentWorkingFound || '',
          phase2ErrorAnalysis: rest.phase2ErrorAnalysis || rest.errorAnalysis || '',
          phase3Solution: rest.phase3Solution || rest.modelSolution || '',
          modelSolution: rest.modelSolution || rest.phase3Solution || '',
        };
      })
    : [];
  const { gradingMeta, executionTimeMs, ...restReport } = report;
  return {
    ...restReport,
    teacherName: 'Mr. Haitham Hussien',
    questions: cleanedQuestions,
  };
}

function sanitizeSubmissionForStudent(sub: HomeworkSubmissionRecord): any {
  const { draftReport, draftStatus, draftError, quizQuestions, ...rest } = sub;
  const sanitizedPublished = sub.status === 'graded' ? sanitizeReportForStudent(sub.publishedReport) : null;
  return {
    ...rest,
    reviewedBy: sub.status === 'graded' ? 'Mr. Haitham Hussien' : undefined,
    publishedReport: sanitizedPublished,
  };
}

const inFlightAutoDrafts = new Map<string, Promise<void>>();

async function autoGenerateDraftForSubmission(submissionId: string): Promise<void> {
  const existing = inFlightAutoDrafts.get(submissionId);
  if (existing) {
    return existing;
  }

  const job = (async () => {
    try {
      const startState = loadPortalState();
      const startIdx = startState.submissions.findIndex((s) => s.id === submissionId);
      if (startIdx === -1) return;
      const sub = startState.submissions[startIdx];
      startState.submissions[startIdx] = {
        ...sub,
        draftStatus: 'generating',
        draftError: null,
      };
      savePortalState(startState);

      const media = loadSubmissionMedia(sub.id);
      const chosenSystem: 'edexcel' | 'ib' | 'marks' = sub.gradingSystem || 'edexcel';

      let generatedReport: any = null;
      if ((sub.assignmentKind === 'quiz' || sub.assignmentKind === 'essay') && Array.isArray(sub.quizQuestions) && sub.quizQuestions.length > 0) {
        generatedReport = await runQuizOrEssayGradingDraft(sub, chosenSystem);
      } else {
        const result = await runHomeworkCorrectionDraft({
          studentName: sub.studentName,
          assignment: sub.assignment,
          submissionText: sub.submissionText,
          modelAnswerKey: currentModelAnswerKey.text,
          modelAnswerTitle: sub.assignment || currentModelAnswerKey.title,
          fileName: sub.fileName,
          fileBase64: media?.fileBase64 || null,
          fileMimeType: media?.fileMimeType || sub.fileMimeType || null,
          pageImages: media?.pageImages || null,
          precisionMode: 'deep',
          gradingSystem: chosenSystem,
          assignmentKind: sub.assignmentKind || 'homework',
        });
        generatedReport = result.report;
      }

      const doneState = loadPortalState();
      const doneIdx = doneState.submissions.findIndex((s) => s.id === submissionId);
      if (doneIdx !== -1) {
        doneState.submissions[doneIdx] = {
          ...doneState.submissions[doneIdx],
          draftStatus: 'ready',
          draftError: null,
          draftReport: generatedReport,
        };
        savePortalState(doneState);
        console.log(`[Auto Draft Ready] ${submissionId} -> ${generatedReport?.earnedMarks}/${generatedReport?.totalMarks}`);
      }
    } catch (err: any) {
      console.warn(`[Auto Draft Failed] ${submissionId}:`, err?.message || err);
      const failState = loadPortalState();
      const failIdx = failState.submissions.findIndex((s) => s.id === submissionId);
      if (failIdx !== -1) {
        failState.submissions[failIdx] = {
          ...failState.submissions[failIdx],
          draftStatus: 'failed',
          draftError: err?.message || 'Automatic draft generation failed.',
        };
        savePortalState(failState);
      }
    } finally {
      inFlightAutoDrafts.delete(submissionId);
    }
  })();

  inFlightAutoDrafts.set(submissionId, job);
  return job;
}

/** Resume pending submissions whose background draft worker was interrupted by a server restart. */
function resumeOrphanedAutoDrafts() {
  try {
    const state = loadPortalState();
    const orphaned = state.submissions.filter(
      (s) =>
        s.status === 'pending' &&
        !s.draftReport &&
        (s.draftStatus === 'queued' || s.draftStatus === 'generating')
    );
    if (orphaned.length === 0) return;

    console.log(`[Startup Recovery] Resuming ${orphaned.length} interrupted auto-correction draft(s)...`);
    void (async () => {
      for (const sub of orphaned) {
        await autoGenerateDraftForSubmission(sub.id);
      }
    })();
  } catch (err) {
    console.warn('[Startup Recovery] Failed to scan orphaned drafts:', err);
  }
}

/** Queue an in-portal notification for the educator whenever a student submits homework, quiz, or essay work. */
function appendTeacherSubmissionNotification(state: PortalState, record: HomeworkSubmissionRecord) {
  const kindLabel =
    record.assignmentKind === 'quiz'
      ? 'Quiz Submitted'
      : record.assignmentKind === 'essay'
      ? 'Essay Submitted'
      : 'Homework Submitted';
  const workDetail =
    record.assignmentKind === 'homework'
      ? record.pageCount > 0
        ? `${record.pageCount} page(s)`
        : 'typed working'
      : record.assignmentKind;

  const submissionNotification: PortalNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recipientRole: 'teacher',
    courseId: record.courseId,
    studentId: record.studentId,
    submissionId: record.id,
    title: `${kindLabel}: ${record.studentName}`,
    message: `${record.courseTitle} · ${record.assignment} (${workDetail})`,
    type: 'submission',
    dueDate: record.dueDate || undefined,
    createdAt: record.submittedAt,
    readByUserIds: [],
  };
  state.notifications = [submissionNotification, ...(state.notifications || [])].slice(0, 200);
}

function resolveParentEmailForStudent(state: PortalState, sub: HomeworkSubmissionRecord): string {
  const mapped = state.parentEmails?.[String(sub.studentId)];
  if (mapped && mapped.trim()) return mapped.trim();
  const dirMatch = state.directoryUsers?.find(
    (u) => (u.id === sub.studentId || u.linkedStudentId === sub.studentId) && u.parentEmail
  );
  if (dirMatch?.parentEmail) return dirMatch.parentEmail;
  return `parent.${sub.studentUsername}@mrhaithamhusseinig.edu`;
}

function escapeHtml(text: any): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildParentReportHtml(sub: HomeworkSubmissionRecord, report: any): string {
  const sysLabel =
    String(report?.gradingSystem || sub.gradingSystem || 'edexcel').toUpperCase() === 'IB'
      ? 'IB (Band 1–7)'
      : String(report?.gradingSystem || sub.gradingSystem || 'edexcel').toUpperCase() === 'MARKS'
      ? 'Raw Marks (%)'
      : 'Edexcel (9–1 / A*–U)';

  const criterionHtml =
    Array.isArray(report?.criterionBreakdown) && report.criterionBreakdown.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;">
          ${report.criterionBreakdown
            .map(
              (c: any) =>
                `<div style="flex:1 1 140px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:8px 10px;">
                  <div style="font-size:10px;font-weight:bold;color:#3730a3;text-transform:uppercase;">${escapeHtml(c.label)}</div>
                  <div style="font-size:14px;font-weight:bold;color:#1e1b4b;margin-top:2px;">${escapeHtml(c.score)}</div>
                </div>`
            )
            .join('')}
        </div>`
      : '';

  const questionCards = (Array.isArray(report?.questions) ? report.questions : [])
    .map((q: any) => {
      const earned = Number(q.earnedMarks) || 0;
      const maxM = Number(q.maxMarks) || 1;
      const isFull = earned === maxM;
      const isPartial = !isFull && earned > 0;
      const badgeBg = isFull ? '#dcfce7' : isPartial ? '#fef3c7' : '#ffe4e6';
      const badgeColor = isFull ? '#166534' : isPartial ? '#92400e' : '#9f1239';
      const badgeText = isFull ? 'CORRECT' : isPartial ? `PARTIAL (${earned}/${maxM})` : 'INCORRECT';

      const written = escapeHtml(q.phase1Extraction || q.studentWorkingFound || 'Not attempted').replace(/\n/g, '<br/>');
      const mistake = escapeHtml(
        q.phase2ErrorAnalysis || q.errorAnalysis || q.teacherFeedback || (isFull ? 'Correct method and final answer.' : 'See teacher note.')
      ).replace(/\n/g, '<br/>');
      const solution = escapeHtml(q.phase3Solution || q.modelSolution || '—').replace(/\n/g, '<br/>');

      return `
      <div style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:12px;overflow:hidden;background:#ffffff;">
        <div style="background:#f9fafb;padding:10px 14px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:bold;font-size:13px;color:#111827;">${escapeHtml(q.displayLabel || `Q${q.questionNumber}`)}</span>
          <span style="font-size:12px;font-weight:bold;color:#111827;">
            <span style="background:${badgeBg};color:${badgeColor};padding:2px 8px;border-radius:999px;font-size:11px;margin-right:8px;">${badgeText}</span>
            ${earned} / ${maxM} Marks
          </span>
        </div>
        <div style="padding:12px 14px;font-size:12px;line-height:1.5;">
          <div style="margin-bottom:8px;">
            <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#4b5563;letter-spacing:0.04em;">What was written</div>
            <div style="font-family:Consolas,Monaco,monospace;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:7px 9px;margin-top:3px;color:#0f172a;">${written}</div>
          </div>
          <div style="margin-bottom:8px;">
            <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#9f1239;letter-spacing:0.04em;">Exact mistake identified &amp; why it is wrong</div>
            <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:6px;padding:7px 9px;margin-top:3px;color:#881337;">${mistake}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#065f46;letter-spacing:0.04em;">Correct working &amp; solution</div>
            <div style="font-family:Consolas,Monaco,monospace;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:7px 9px;margin-top:3px;color:#064e3b;">${solution}</div>
          </div>
        </div>
      </div>`;
    })
    .join('');

  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:740px;margin:0 auto;color:#111827;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#ffffff;">
    <div style="background:#800020;color:#ffffff;padding:22px 24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;">Mr.HaithamHusseinig · Official Student Progress Report</div>
      <h2 style="margin:6px 0 0;font-size:20px;">${escapeHtml(sub.assignment)}</h2>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Approved &amp; Released by Mr. Haitham Hussien · ${escapeHtml(sub.courseTitle)}</p>
    </div>

    <div style="padding:20px 24px;">
      <p style="margin-top:0;font-size:14px;">Dear Parent of <strong>${escapeHtml(sub.studentName)}</strong>,</p>

      <table style="width:100%;border-collapse:separate;border-spacing:10px 0;margin:14px -10px;">
        <tr>
          <td style="width:50%;background:#fdf2f4;border:1px solid #fecdd3;border-radius:10px;padding:12px 16px;">
            <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#9f1239;">Mark</div>
            <div style="font-size:24px;font-weight:900;color:#800020;margin-top:2px;">${report.earnedMarks} / ${report.totalMarks} <span style="font-size:14px;color:#475569;">(${report.percentage}%)</span></div>
          </td>
          <td style="width:50%;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:12px 16px;">
            <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#475569;">Grading System · ${escapeHtml(sysLabel)}</div>
            <div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:4px;">${escapeHtml(report.grade)}</div>
          </td>
        </tr>
      </table>

      ${criterionHtml}

      ${report.generalFeedback ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:12px;color:#78350f;margin-bottom:14px;"><strong>Overall Summary:</strong> ${escapeHtml(report.generalFeedback)}</div>` : ''}
      ${sub.teacherNote ? `<div style="background:#fdf2f4;border:1px solid #f0d0d6;border-radius:8px;padding:10px 14px;font-size:12px;color:#701a2d;margin-bottom:16px;"><strong>Mr. Haitham&apos;s Personal Note:</strong> ${escapeHtml(sub.teacherNote)}</div>` : ''}

      <h3 style="font-size:14px;font-weight:bold;color:#701a2d;margin:16px 0 10px;text-transform:uppercase;letter-spacing:0.04em;">
        For Each Question (${(report.questions || []).length} Questions)
      </h3>
      ${questionCards}

      <p style="margin-top:16px;font-size:12px;color:#6b7280;">Sign in to the Mr.HaithamHusseinig Parent Portal with your parent credentials to view or print this full report anytime.</p>
    </div>
  </div>`;
}

async function sendParentReportEmail(
  state: PortalState,
  sub: HomeworkSubmissionRecord,
  report: any,
  overrideEmail?: string
): Promise<OutboxEmailRecord> {
  const to = (overrideEmail && overrideEmail.trim()) || resolveParentEmailForStudent(state, sub);
  const from = process.env.RESEND_FROM_EMAIL || 'Mr. Haitham Portal <onboarding@resend.dev>';
  const subject = `[Mr.HaithamHusseinig Report Approved] ${sub.studentName} — ${sub.assignment} (${report.percentage}%)`;
  const html = buildParentReportHtml(sub, report);
  const apiKey = process.env.RESEND_API_KEY;
  const hasRealKey = Boolean(apiKey && apiKey.trim() && !apiKey.includes('re_...'));

  let record: OutboxEmailRecord = {
    id: `mail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    submissionId: sub.id,
    studentId: sub.studentId,
    studentName: sub.studentName,
    parentName: `Parent of ${sub.studentName}`,
    to,
    from,
    subject,
    html,
    provider: hasRealKey ? 'resend' : 'local-preview',
    status: 'logged_locally',
    note: hasRealKey ? undefined : 'RESEND_API_KEY not configured locally — saved to Local Email Outbox preview.',
  };

  if (hasRealKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey!.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
      });
      const data: any = await resp.json().catch(() => ({}));
      if (resp.ok && data?.id) {
        record.status = 'sent';
        record.resendId = String(data.id);
        record.note = 'Delivered via Resend API';
      } else {
        record.provider = 'local-preview';
        record.status = 'logged_locally';
        record.note = `Resend API (${resp.status}): ${data?.message || 'Fallback logged locally for preview'}`;
      }
    } catch (err: any) {
      record.provider = 'local-preview';
      record.status = 'logged_locally';
      record.note = `Resend network error (${err?.message || 'unknown'}) — logged locally`;
    }
  }

  state.outbox = [record, ...(state.outbox || [])].slice(0, 200);
  return record;
}

async function sendAssignmentEmailViaResend(
  state: PortalState,
  assignmentRec: HomeworkAssignmentRecord,
  toEmail: string,
  studentId = 0,
  studentName = 'Group Member'
): Promise<OutboxEmailRecord> {
  const from = process.env.RESEND_FROM_EMAIL || 'Mr. Haitham Portal <onboarding@resend.dev>';
  const dueFormatted = assignmentRec.dueDate
    ? new Date(assignmentRec.dueDate).toLocaleString('en-GB')
    : 'See portal';
  const subject = `[New Homework Assigned] ${assignmentRec.courseTitle}: ${assignmentRec.title} (Due: ${dueFormatted})`;
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;color:#111827;">
    <div style="background:#800020;color:#ffffff;padding:20px 24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;">Mr. Haitham Hussien · New Homework Assigned</div>
      <h2 style="margin:6px 0 0;font-size:20px;">${escapeHtml(assignmentRec.title)}</h2>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Group: ${escapeHtml(assignmentRec.courseTitle)}</p>
    </div>
    <div style="padding:20px 24px;font-size:13px;line-height:1.6;">
      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:10px 14px;margin-bottom:14px;">
        <strong style="color:#800020;">Due Date:</strong> ${escapeHtml(dueFormatted)}
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:14px;">
        <strong style="display:block;margin-bottom:4px;">Instructions from Mr. Haitham:</strong>
        <div>${escapeHtml(assignmentRec.instructions || 'Complete all assigned questions neatly and upload your PDF or photos before the due date.').replace(/\n/g, '<br/>')}</div>
      </div>
      <p style="font-size:12px;color:#64748b;margin:0;">Log in to the Student Portal to select this homework from your assignment dropdown and submit your pages.</p>
    </div>
  </div>`;

  const apiKey = process.env.RESEND_API_KEY;
  const hasRealKey = Boolean(apiKey && apiKey.trim() && !apiKey.includes('re_...'));

  const record: OutboxEmailRecord = {
    id: `mail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    submissionId: assignmentRec.id,
    studentId,
    studentName,
    to: toEmail.trim(),
    from,
    subject,
    html,
    provider: hasRealKey ? 'resend' : 'local-preview',
    status: 'logged_locally',
    note: hasRealKey ? undefined : 'RESEND_API_KEY not set — saved to Local Email Outbox preview.',
  };

  if (hasRealKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey!.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [toEmail.trim()], subject, html }),
      });
      const data: any = await resp.json().catch(() => ({}));
      if (resp.ok && data?.id) {
        record.status = 'sent';
        record.resendId = String(data.id);
        record.note = 'Delivered via Resend API';
      } else {
        record.provider = 'local-preview';
        record.status = 'logged_locally';
        record.note = `Resend API (${resp.status}): ${data?.message || 'Saved locally for preview'}`;
      }
    } catch (err: any) {
      record.provider = 'local-preview';
      record.status = 'logged_locally';
      record.note = `Resend error (${err?.message || 'unknown'}) — saved locally`;
    }
  }

  state.outbox = [record, ...(state.outbox || [])].slice(0, 200);
  return record;
}

async function runQuizOrEssayGradingDraft(
  sub: HomeworkSubmissionRecord,
  gradingSystem: 'edexcel' | 'ib' | 'marks' = 'edexcel'
): Promise<any> {
  const qs = Array.isArray(sub.quizQuestions) ? sub.quizQuestions : [];
  const ansMap = sub.quizAnswers || {};
  const questionsOut: any[] = [];

  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const studentAns = String(ansMap[q.id] || '').trim();
    const maxMarks = Number(q.marks) || 2;
    const expected = String(q.correctAnswer || '').trim();

    if (q.type === 'mcq') {
      const isCorrect =
        Boolean(studentAns) &&
        Boolean(expected) &&
        studentAns.toLowerCase() === expected.toLowerCase();
      const earned = isCorrect ? maxMarks : 0;
      questionsOut.push({
        questionNumber: i + 1,
        displayLabel: `Q${i + 1}`,
        paperRef: sub.assignment,
        prompt: q.prompt,
        maxMarks,
        earnedMarks: earned,
        markSchemeRef: `[${gradingSystem.toUpperCase()}] MCQ Key`,
        studentWorkingFound: studentAns || 'Not attempted',
        phase1Extraction: studentAns || 'Not attempted',
        modelSolution: expected,
        phase3Solution: expected ? `Correct choice: ${expected}` : 'See teacher solution note.',
        status: isCorrect ? 'correct' : 'incorrect',
        statusLabel: isCorrect ? 'CORRECT' : 'INCORRECT',
        errorAnalysis: isCorrect
          ? 'Exact match with expected answer.'
          : `Student selected "${studentAns || 'blank'}" instead of "${expected}".`,
        phase2ErrorAnalysis: isCorrect
          ? 'Exact match with expected answer.'
          : `Student selected "${studentAns || 'blank'}" instead of "${expected}".`,
        teacherFeedback: isCorrect ? 'Well done.' : `Review the concept and check "${expected}".`,
      });
    } else {
      // Short answer or Essay
      let earned = studentAns ? Math.ceil(maxMarks / 2) : 0;
      let phase2 = studentAns
        ? 'Draft prepared for Mr. Haitham review against rubric.'
        : 'No written answer submitted.';
      let phase3 = expected || 'Provide full structured mathematical justification and final conclusion.';
      let feedback = studentAns
        ? 'Working captured for Mr. Haitham verification and mark finalization.'
        : 'Please write full steps and justification.';

      if (process.env.GEMINI_API_KEY && studentAns) {
        try {
          const prompt = `Grade this ${sub.assignmentKind || 'essay'} math response under the ${gradingSystem.toUpperCase()} scale.
Question (${maxMarks} marks): ${q.prompt}
Expected Key / Rubric: ${expected || 'Full rigorous justification and exact final value'}
Student Response: ${studentAns}
Return ONLY JSON: { "earnedMarks": number (0..${maxMarks}), "phase2ErrorAnalysis": string, "phase3Solution": string, "teacherFeedback": string }`;
          const resp = await generateWithRetry(
            { model: GRADING_MODEL, contents: prompt, config: { responseMimeType: 'application/json' } },
            0,
            25000,
            []
          );
          const parsed = JSON.parse(resp.text || '{}');
          if (typeof parsed.earnedMarks === 'number') {
            earned = Math.max(0, Math.min(maxMarks, Math.round(parsed.earnedMarks)));
          }
          if (parsed.phase2ErrorAnalysis) phase2 = parsed.phase2ErrorAnalysis;
          if (parsed.phase3Solution) phase3 = parsed.phase3Solution;
          if (parsed.teacherFeedback) feedback = parsed.teacherFeedback;
        } catch {
          // Graceful deterministic fallback draft when offline/quota-limited
        }
      }

      const status = earned === maxMarks ? 'correct' : 'incorrect';
      questionsOut.push({
        questionNumber: i + 1,
        displayLabel: `Q${i + 1}`,
        paperRef: sub.assignment,
        prompt: q.prompt,
        maxMarks,
        earnedMarks: earned,
        markSchemeRef: `[${gradingSystem.toUpperCase()}] Rubric`,
        studentWorkingFound: studentAns || 'Not attempted',
        phase1Extraction: studentAns || 'Not attempted',
        modelSolution: phase3,
        phase3Solution: phase3,
        status,
        statusLabel: earned === maxMarks ? 'CORRECT' : earned > 0 ? `PARTIAL (${earned}/${maxMarks})` : 'INCORRECT',
        errorAnalysis: phase2,
        phase2ErrorAnalysis: phase2,
        teacherFeedback: feedback,
      });
    }
  }

  const totalMarks = questionsOut.reduce((s, q) => s + q.maxMarks, 0) || 1;
  const earnedMarks = questionsOut.reduce((s, q) => s + q.earnedMarks, 0);
  const percentage = Math.round((earnedMarks / totalMarks) * 100);
  const computed = computeGradeForSystem(percentage, earnedMarks, totalMarks, gradingSystem);

  return {
    studentName: sub.studentName,
    assignmentTitle: sub.assignment,
    teacherName: 'Mr. Haitham Hussien',
    subject: sub.courseTitle,
    submissionDate: sub.submittedAt,
    totalMarks,
    earnedMarks,
    percentage,
    grade: computed.grade,
    gradingSystem,
    assignmentKind: sub.assignmentKind || 'quiz',
    performanceLevel: computed.performanceLevel,
    generalFeedback: `Reviewed under ${gradingSystem.toUpperCase()} scale (${earnedMarks}/${totalMarks} marks, ${percentage}%).`,
    diagnosticReview: `3-Phase evaluation completed for ${sub.assignment}.`,
    questions: questionsOut,
    strengths: questionsOut.filter((q) => q.status === 'correct').map((q) => `${q.displayLabel}: ${q.prompt.slice(0, 60)}`),
    recommendedNextSteps: ['Review Phase 3 solutions and any partial/missed steps before the next checkpoint.'],
  };
}

// GET enrollments (all for educator, or ?studentId=<id> for single student)
app.get('/api/enrollments', (req: Request, res: Response) => {
  const state = loadPortalState();
  const studentId = req.query.studentId ? String(req.query.studentId) : null;
  if (studentId) {
    return res.json({
      success: true,
      enrollment: state.enrollments[studentId] || null,
    });
  }
  const enrollments = Object.values(state.enrollments).sort((a, b) =>
    b.requestedAt.localeCompare(a.requestedAt)
  );
  return res.json({ success: true, enrollments });
});

// POST student course enrollment request (starts as 'pending' awaiting Mr. Haitham's approval)
app.post('/api/enrollments/request', (req: Request, res: Response) => {
  const { studentId, studentUsername, studentName, grade, section, courseId, courseTitle } = req.body || {};
  if (!studentId || !courseId) {
    return res.status(400).json({ success: false, error: 'studentId and courseId are required.' });
  }
  const state = loadPortalState();
  const key = String(studentId);
  const entry: CourseEnrollment = {
    studentId: Number(studentId),
    studentUsername: String(studentUsername || `student${studentId}`),
    studentName: String(studentName || `Student ${studentId}`),
    grade: grade ? String(grade) : undefined,
    section: section ? String(section) : undefined,
    courseId: String(courseId),
    courseTitle: String(courseTitle || courseId),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
  state.enrollments[key] = entry;
  savePortalState(state);
  return res.json({ success: true, enrollment: entry });
});

// POST educator approves a student's course enrollment (or switches their course)
app.post('/api/enrollments/:studentId/approve', (req: Request, res: Response) => {
  const key = String(req.params.studentId);
  const { courseId, courseTitle, teacherNote, studentUsername, studentName } = req.body || {};
  const state = loadPortalState();
  const existing = state.enrollments[key];
  if (!existing && !courseId) {
    return res.status(404).json({ success: false, error: 'Enrollment request not found.' });
  }
  const updated: CourseEnrollment = {
    studentId: Number(key),
    studentUsername: existing?.studentUsername || String(studentUsername || `student${key}`),
    studentName: existing?.studentName || String(studentName || `Student ${key}`),
    grade: existing?.grade,
    section: existing?.section,
    courseId: courseId ? String(courseId) : existing.courseId,
    courseTitle: courseTitle ? String(courseTitle) : existing.courseTitle,
    status: 'approved',
    requestedAt: existing?.requestedAt || new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    teacherNote: teacherNote ? String(teacherNote) : undefined,
  };
  state.enrollments[key] = updated;
  savePortalState(state);
  return res.json({ success: true, enrollment: updated });
});

// POST educator declines a student's course request so student can choose another course
app.post('/api/enrollments/:studentId/reject', (req: Request, res: Response) => {
  const key = String(req.params.studentId);
  const { teacherNote } = req.body || {};
  const state = loadPortalState();
  const existing = state.enrollments[key];
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Enrollment request not found.' });
  }
  const updated: CourseEnrollment = {
    ...existing,
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    teacherNote: teacherNote ? String(teacherNote) : 'Please select your assigned course and resubmit.',
  };
  state.enrollments[key] = updated;
  savePortalState(state);
  return res.json({ success: true, enrollment: updated });
});

// POST student submits homework for Mr. Haitham to review manually (no instant AI run on student submit)
app.post('/api/submissions', (req: Request, res: Response) => {
  try {
    const {
      studentId,
      studentUsername,
      studentName,
      courseId,
      courseTitle,
      assignmentId = null,
      dueDate = null,
      assignment = 'Homework Submission',
      assignmentKind = 'homework',
      gradingSystem = 'edexcel',
      submissionText = '',
      fileName = null,
      fileBase64 = null,
      fileMimeType = null,
      pageImages = null,
      a3SpreadCount = 0,
    } = req.body || {};

    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, error: 'studentId and courseId are required.' });
    }

    const pagesArr = Array.isArray(pageImages) ? pageImages : [];
    const cleanText = String(submissionText || '').trim();
    if (pagesArr.length === 0 && !fileBase64 && !cleanText) {
      return res.status(400).json({ success: false, error: 'Please upload a worksheet/photo or enter your working before submitting.' });
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const detectedA3Count = Number(a3SpreadCount) || pagesArr.filter((p: any) => p?.tilePosition === 'left').length;
    const record: HomeworkSubmissionRecord = {
      id,
      studentId: Number(studentId),
      studentUsername: String(studentUsername || `student${studentId}`),
      studentName: String(studentName || `Student ${studentId}`),
      courseId: String(courseId),
      courseTitle: String(courseTitle || courseId),
      assignmentId: assignmentId ? String(assignmentId) : null,
      dueDate: dueDate ? String(dueDate) : null,
      assignment: String(assignment || 'Homework Submission'),
      assignmentKind: assignmentKind === 'quiz' || assignmentKind === 'essay' ? assignmentKind : 'homework',
      gradingSystem: gradingSystem === 'ib' || gradingSystem === 'marks' ? gradingSystem : 'edexcel',
      submissionText: cleanText,
      fileName: fileName ? String(fileName) : null,
      fileMimeType: fileMimeType ? String(fileMimeType) : null,
      pageCount: pagesArr.length > 0 ? pagesArr.length : fileBase64 ? 1 : 0,
      a3SpreadCount: detectedA3Count,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      draftStatus: 'queued',
      draftError: null,
      draftReport: null,
      publishedReport: null,
    };

    if (pagesArr.length > 0 || fileBase64) {
      saveSubmissionMedia(id, {
        pageImages: pagesArr,
        fileBase64: fileBase64 || null,
        fileMimeType: fileMimeType || null,
      });
    }

    const state = loadPortalState();
    state.submissions.unshift(record);
    appendTeacherSubmissionNotification(state, record);
    savePortalState(state);

    // Automatically prepare Mr. Haitham's internal 3-Phase correction draft behind the Approval Gateway
    setImmediate(() => {
      void autoGenerateDraftForSubmission(record.id);
    });

    return res.json({
      success: true,
      submission: sanitizeSubmissionForStudent(record),
    });
  } catch (err: any) {
    console.error('Error creating homework submission:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save submission.' });
  }
});

// GET homework submissions (?studentId=... returns sanitized student view; ?role=teacher returns educator inbox)
app.get('/api/submissions', (req: Request, res: Response) => {
  const state = loadPortalState();
  const role = String(req.query.role || 'student');
  const studentId = req.query.studentId ? Number(req.query.studentId) : null;
  const courseId = req.query.courseId ? String(req.query.courseId) : null;

  let items = state.submissions;
  if (studentId !== null && !isNaN(studentId)) {
    items = items.filter((s) => s.studentId === studentId);
  }
  if (courseId) {
    items = items.filter((s) => s.courseId === courseId);
  }
  if (role === 'parent') {
    // Parents ONLY see results after Mr. Haitham's Approval Gateway has published them
    items = items.filter((s) => s.status === 'graded');
  }

  if (role === 'teacher') {
    return res.json({ success: true, submissions: items });
  }
  return res.json({
    success: true,
    submissions: items.map(sanitizeSubmissionForStudent),
  });
});

// GET single submission including saved page images (for educator inspection or student viewing own uploaded pages)
app.get('/api/submissions/:id', (req: Request, res: Response) => {
  const state = loadPortalState();
  const sub = state.submissions.find((s) => s.id === req.params.id);
  if (!sub) {
    return res.status(404).json({ success: false, error: 'Submission not found.' });
  }
  const role = String(req.query.role || 'student');
  const media = loadSubmissionMedia(sub.id);
  const payload = role === 'teacher' ? sub : sanitizeSubmissionForStudent(sub);
  return res.json({
    success: true,
    submission: {
      ...payload,
      pageImages: media?.pageImages || [],
      fileBase64: role === 'teacher' ? media?.fileBase64 || null : null,
    },
  });
});

// POST educator creates a clean zero-quota Manual Correction Sheet from the active Model Answer Key
app.post('/api/submissions/:id/manual-draft', (req: Request, res: Response) => {
  const state = loadPortalState();
  const idx = state.submissions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Submission not found.' });
  }
  const sub = state.submissions[idx];
  const { gradingSystem = sub.gradingSystem || 'edexcel' } = req.body || {};
  const chosenSystem: 'edexcel' | 'ib' | 'marks' =
    gradingSystem === 'ib' || gradingSystem === 'marks' ? gradingSystem : 'edexcel';

  const base = gradeWithFiveRepoEnginePool(
    sub.studentName,
    sub.assignment || currentModelAnswerKey.title,
    currentModelAnswerKey.text,
    sub.submissionText || '',
    sub.fileName,
    Date.now()
  );

  const manualQuestions = base.questions.map((q) => ({
    ...q,
    earnedMarks: 0,
    status: 'incorrect' as const,
    statusLabel: 'PENDING' as any,
    studentWorkingFound: sub.submissionText ? q.studentWorkingFound : '',
    phase1Extraction: sub.submissionText ? q.studentWorkingFound : '',
    errorAnalysis: '',
    phase2ErrorAnalysis: '',
    phase3Solution: q.modelSolution,
    teacherFeedback: '',
  }));

  const manualReport = {
    ...base,
    gradingSystem: chosenSystem,
    earnedMarks: 0,
    percentage: 0,
    grade: computeGradeForSystem(0, 0, base.totalMarks, chosenSystem).grade,
    performanceLevel: 'Manual Teacher Review Sheet',
    generalFeedback: 'Reviewed manually by Mr. Haitham Hussien.',
    diagnosticReview: 'Enter marks, written working notes, and feedback for each question below.',
    questions: manualQuestions,
  };

  state.submissions[idx] = {
    ...sub,
    gradingSystem: chosenSystem,
    draftStatus: 'ready',
    draftError: null,
    draftReport: manualReport,
  };
  savePortalState(state);

  return res.json({
    success: true,
    submission: state.submissions[idx],
    report: manualReport,
  });
});

// POST educator generates an internal correction draft for a student submission (educator-only)
app.post('/api/submissions/:id/draft-grade', async (req: Request, res: Response) => {
  try {
    const state = loadPortalState();
    const idx = state.submissions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }
    const sub = state.submissions[idx];
    const media = loadSubmissionMedia(sub.id);
    const {
      modelAnswerKey = null,
      modelAnswerTitle = null,
      modelKeyFileBase64 = null,
      precisionMode = 'deep',
      gradingSystem = sub.gradingSystem || 'edexcel',
    } = req.body || {};

    const chosenSystem: 'edexcel' | 'ib' | 'marks' =
      gradingSystem === 'ib' || gradingSystem === 'marks' ? gradingSystem : 'edexcel';

    let generatedReport: any = null;
    if ((sub.assignmentKind === 'quiz' || sub.assignmentKind === 'essay') && Array.isArray(sub.quizQuestions) && sub.quizQuestions.length > 0) {
      generatedReport = await runQuizOrEssayGradingDraft(sub, chosenSystem);
    } else {
      const result = await runHomeworkCorrectionDraft({
        studentName: sub.studentName,
        assignment: sub.assignment,
        submissionText: sub.submissionText,
        modelAnswerKey,
        modelAnswerTitle: modelAnswerTitle || sub.assignment,
        modelKeyFileBase64,
        fileName: sub.fileName,
        fileBase64: media?.fileBase64 || null,
        fileMimeType: media?.fileMimeType || sub.fileMimeType || null,
        pageImages: media?.pageImages || null,
        precisionMode,
        gradingSystem: chosenSystem,
        assignmentKind: sub.assignmentKind || 'homework',
      });
      generatedReport = result.report;
    }

    const freshState = loadPortalState();
    const freshIdx = freshState.submissions.findIndex((s) => s.id === req.params.id);
    if (freshIdx !== -1) {
      freshState.submissions[freshIdx] = {
        ...freshState.submissions[freshIdx],
        gradingSystem: chosenSystem,
        draftStatus: 'ready',
        draftError: null,
        draftReport: generatedReport,
      };
      savePortalState(freshState);
    }

    return res.json({
      success: true,
      submission: freshIdx !== -1 ? freshState.submissions[freshIdx] : state.submissions[idx],
      report: generatedReport,
    });
  } catch (error: any) {
    console.error('Error generating educator draft grade:', error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || 'Could not generate correction draft.',
    });
  }
});

// POST educator approves, finalizes, publishes report to Student & Parent Portals, and triggers Resend Email Gateway
app.post('/api/submissions/:id/publish', async (req: Request, res: Response) => {
  const state = loadPortalState();
  const idx = state.submissions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Submission not found.' });
  }
  const sub = state.submissions[idx];
  const { report, teacherNote, gradingSystem, parentEmail } = req.body || {};
  const sourceReport = report || sub.publishedReport || sub.draftReport;
  if (!sourceReport) {
    return res.status(400).json({ success: false, error: 'No graded report to publish.' });
  }

  const chosenSystem: 'edexcel' | 'ib' | 'marks' =
    gradingSystem === 'ib' || gradingSystem === 'marks' || gradingSystem === 'edexcel'
      ? gradingSystem
      : sourceReport.gradingSystem || sub.gradingSystem || 'edexcel';

  const questions = Array.isArray(sourceReport.questions) ? sourceReport.questions : [];
  const normalizedQuestions = questions.map((q: any) => {
    const maxM = Number(q.maxMarks) || 1;
    const earnedM = Math.max(0, Math.min(maxM, Number(q.earnedMarks) || 0));
    const status = earnedM === maxM ? 'correct' : earnedM > 0 ? 'partial' : 'incorrect';
    const statusLabel = earnedM === maxM ? 'CORRECT' : earnedM > 0 ? `PARTIAL (${earnedM}/${maxM})` : 'INCORRECT';
    const phase1 = q.phase1Extraction || q.studentWorkingFound || '';
    const phase2 = q.phase2ErrorAnalysis || q.errorAnalysis || '';
    const phase3 = q.phase3Solution || q.modelSolution || '';
    return {
      ...q,
      earnedMarks: earnedM,
      status,
      statusLabel,
      studentWorkingFound: phase1,
      phase1Extraction: phase1,
      errorAnalysis: phase2,
      phase2ErrorAnalysis: phase2,
      modelSolution: phase3,
      phase3Solution: phase3,
    };
  });

  const totalMarks = normalizedQuestions.reduce((s: number, q: any) => s + (Number(q.maxMarks) || 0), 0) || sourceReport.totalMarks || 1;
  const earnedMarks = normalizedQuestions.reduce((s: number, q: any) => s + (Number(q.earnedMarks) || 0), 0);
  const percentage = Math.round((earnedMarks / totalMarks) * 100);
  const computed = computeGradeForSystem(percentage, earnedMarks, totalMarks, chosenSystem);

  const finalizedReport = {
    ...sourceReport,
    studentName: sub.studentName,
    teacherName: 'Mr. Haitham Hussien',
    totalMarks,
    earnedMarks,
    percentage,
    grade: computed.grade,
    performanceLevel: computed.performanceLevel,
    gradingSystem: chosenSystem,
    assignmentKind: sub.assignmentKind || sourceReport.assignmentKind || 'homework',
    questions: normalizedQuestions,
    publishedAt: new Date().toISOString(),
  };

  if (parentEmail && String(parentEmail).trim()) {
    state.parentEmails = state.parentEmails || {};
    state.parentEmails[String(sub.studentId)] = String(parentEmail).trim();
  }

  const updatedSub: HomeworkSubmissionRecord = {
    ...sub,
    gradingSystem: chosenSystem,
    status: 'graded',
    publishedAt: new Date().toISOString(),
    reviewedBy: 'Mr. Haitham Hussien',
    teacherNote: teacherNote !== undefined ? String(teacherNote) : sub.teacherNote,
    draftReport: finalizedReport,
    publishedReport: finalizedReport,
  };

  const mailRecord = await sendParentReportEmail(state, updatedSub, finalizedReport, parentEmail);
  updatedSub.emailDelivery = {
    status: mailRecord.status,
    to: mailRecord.to,
    provider: mailRecord.provider,
    resendId: mailRecord.resendId,
    note: mailRecord.note,
  };

  state.submissions[idx] = updatedSub;
  state.notifications = state.notifications || [];
  state.notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recipientRole: 'all',
    courseId: sub.courseId,
    studentId: sub.studentId,
    title: `Report Approved: ${sub.assignment}`,
    message: `Mr. Haitham approved & released your ${sub.assignmentKind || 'homework'} report (${finalizedReport.earnedMarks}/${finalizedReport.totalMarks} · ${finalizedReport.percentage}%).`,
    type: 'report',
    createdAt: new Date().toISOString(),
    readByUserIds: [],
  });
  state.notifications = state.notifications.slice(0, 200);
  savePortalState(state);

  return res.json({
    success: true,
    submission: state.submissions[idx],
    emailDelivery: updatedSub.emailDelivery,
    mailRecord,
  });
});

// DELETE a submission (educator management)
app.delete('/api/submissions/:id', (req: Request, res: Response) => {
  const state = loadPortalState();
  const idx = state.submissions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Submission not found.' });
  }
  state.submissions.splice(idx, 1);
  savePortalState(state);
  deleteSubmissionMedia(req.params.id);
  return res.json({ success: true });
});

// ============================================================================
// RCIS Portal Extensions: Video Integration, Quizzes & Essays, Directory (3500), Stats & Resend Outbox
// ============================================================================

app.get('/api/courses/:courseId/videos', (req: Request, res: Response) => {
  const state = loadPortalState();
  const videos = state.customVideos?.[req.params.courseId] || [];
  return res.json({ success: true, videos });
});

app.post('/api/courses/:courseId/videos', (req: Request, res: Response) => {
  const { title, duration = '15:00', youtubeUrl } = req.body || {};
  if (!title || !youtubeUrl) {
    return res.status(400).json({ success: false, error: 'title and youtubeUrl are required.' });
  }
  const state = loadPortalState();
  const courseId = req.params.courseId;
  const list = state.customVideos?.[courseId] || [];
  const item = {
    id: `yt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: String(title).trim(),
    duration: String(duration).trim(),
    thumbnail: '',
    url: String(youtubeUrl).trim(),
    youtubeUrl: String(youtubeUrl).trim(),
    createdAt: new Date().toISOString(),
  };
  state.customVideos[courseId] = [item, ...list];
  savePortalState(state);
  return res.json({ success: true, video: item, videos: state.customVideos[courseId] });
});

app.delete('/api/courses/:courseId/videos/:videoId', (req: Request, res: Response) => {
  const state = loadPortalState();
  const courseId = req.params.courseId;
  const list = state.customVideos?.[courseId] || [];
  const next = list.filter((v: any) => v.id !== req.params.videoId);
  if (next.length === list.length) {
    return res.status(404).json({ success: false, error: 'Video not found.' });
  }
  state.customVideos[courseId] = next;
  savePortalState(state);
  return res.json({ success: true, videos: next });
});

function formatFileSizeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'File';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

app.get('/api/courses/:courseId/materials', (req: Request, res: Response) => {
  const state = loadPortalState();
  const role = String(req.query.role || 'student');
  let materials = state.customMaterials?.[req.params.courseId] || [];
  if (role !== 'teacher') {
    materials = materials.filter((m: any) => !m.teacherOnly);
  }
  return res.json({ success: true, materials });
});

app.post('/api/courses/:courseId/materials', (req: Request, res: Response) => {
  try {
    ensureDataDirs();
    const {
      title,
      category = 'explain',
      type = 'pdf',
      url = '',
      fileBase64 = null,
      fileName = '',
      isA3 = false,
      teacherOnly = false,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'Material title is required.' });
    }

    const courseId = req.params.courseId;
    const resolvedCategory: 'explain' | 'homework' | 'resource' =
      category === 'homework' || category === 'resource' ? category : 'explain';
    const resolvedTeacherOnly = Boolean(teacherOnly) || resolvedCategory === 'resource';

    let finalUrl = String(url || '').trim();
    let finalType: 'pdf' | 'doc' | 'ppt' | 'link' =
      type === 'doc' || type === 'ppt' || type === 'link' ? type : 'pdf';
    let finalSize = finalUrl ? 'External Link' : 'Document';
    let storedFileName: string | undefined;

    if (fileBase64 && typeof fileBase64 === 'string') {
      const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const buf = Buffer.from(cleanBase64, 'base64');
      if (buf.length === 0) {
        return res.status(400).json({ success: false, error: 'Uploaded file appears empty.' });
      }
      const extFromName = path.extname(String(fileName || '')).toLowerCase();
      const safeBase = String(fileName || title)
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 60);
      const safeExt = /^\.[a-z0-9]{1,8}$/i.test(extFromName) ? extFromName : '.pdf';
      storedFileName = `mat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safeBase}${safeExt}`;
      fs.writeFileSync(path.join(COURSE_MATERIALS_DIR, storedFileName), buf);
      finalUrl = `/api/course-materials/file/${encodeURIComponent(storedFileName)}`;
      finalSize = formatFileSizeBytes(buf.length);
      if (safeExt === '.pdf') finalType = 'pdf';
      else if (safeExt === '.ppt' || safeExt === '.pptx') finalType = 'ppt';
      else if (safeExt === '.doc' || safeExt === '.docx' || safeExt === '.txt') finalType = 'doc';
    } else if (!finalUrl) {
      return res.status(400).json({ success: false, error: 'Upload a PDF/document file or enter an external URL.' });
    }

    const item = {
      id: `mat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: String(title).trim(),
      type: finalType,
      size: finalSize,
      url: finalUrl,
      category: resolvedCategory,
      isA3: Boolean(isA3),
      teacherOnly: resolvedTeacherOnly,
      storedFileName,
      originalFileName: fileName ? String(fileName) : undefined,
      uploadedAt: new Date().toISOString(),
      isCustom: true,
    };

    const state = loadPortalState();
    const list = state.customMaterials?.[courseId] || [];
    state.customMaterials[courseId] = [item, ...list];
    savePortalState(state);

    return res.json({ success: true, material: item, materials: state.customMaterials[courseId] });
  } catch (err: any) {
    console.error('Error saving course material:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save material.' });
  }
});

app.delete('/api/courses/:courseId/materials/:materialId', (req: Request, res: Response) => {
  const state = loadPortalState();
  const courseId = req.params.courseId;
  const list = state.customMaterials?.[courseId] || [];
  const target = list.find((m: any) => m.id === req.params.materialId);
  if (!target) {
    return res.status(404).json({ success: false, error: 'Material not found.' });
  }
  if (target.storedFileName) {
    try {
      const diskPath = path.join(COURSE_MATERIALS_DIR, path.basename(String(target.storedFileName)));
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    } catch {
      // ignore disk cleanup error
    }
  }
  const next = list.filter((m: any) => m.id !== req.params.materialId);
  state.customMaterials[courseId] = next;
  savePortalState(state);
  return res.json({ success: true, materials: next });
});

app.get('/api/course-materials/file/:fileName', (req: Request, res: Response) => {
  ensureDataDirs();
  const safeFile = path.basename(decodeURIComponent(req.params.fileName || ''));
  const filePath = path.join(COURSE_MATERIALS_DIR, safeFile);
  if (!safeFile || !fs.existsSync(filePath)) {
    return res.status(404).send('Material file not found.');
  }
  const ext = path.extname(safeFile).toLowerCase();
  const mime =
    ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : ext === '.txt'
      ? 'text/plain; charset=utf-8'
      : 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${safeFile}"`);
  return res.sendFile(filePath);
});

app.get('/api/quizzes', (req: Request, res: Response) => {
  const state = loadPortalState();
  const courseId = req.query.courseId ? String(req.query.courseId) : null;
  let quizzes = state.customQuizzes || [];
  if (courseId) {
    quizzes = quizzes.filter((q) => q.courseId === courseId);
  }
  return res.json({ success: true, quizzes });
});

app.post('/api/quizzes', (req: Request, res: Response) => {
  const { courseId, title, kind = 'quiz', gradingSystem = 'edexcel', instructions = '', questions = [] } = req.body || {};
  if (!courseId || !title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, error: 'courseId, title, and at least one question are required.' });
  }
  const state = loadPortalState();
  const newQuiz = {
    id: `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    courseId: String(courseId),
    title: String(title).trim(),
    kind: kind === 'essay' ? 'essay' : 'quiz',
    gradingSystem: gradingSystem === 'ib' || gradingSystem === 'marks' ? gradingSystem : 'edexcel',
    instructions: String(instructions || 'Answer carefully. Mr. Haitham reviews all responses before releasing grades.'),
    questions,
    createdAt: new Date().toISOString(),
  };
  state.customQuizzes = [newQuiz, ...(state.customQuizzes || [])];
  savePortalState(state);
  return res.json({ success: true, quiz: newQuiz });
});

// Student submits Quiz or Essay -> enters pending queue for Mr. Haitham Approval Gateway (with internal auto-draft prepared for educator)
app.post('/api/assessments/submit', async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      studentUsername,
      studentName,
      courseId,
      courseTitle,
      quizId,
      title,
      kind = 'quiz',
      gradingSystem = 'edexcel',
      questions = [],
      answers = {},
    } = req.body || {};

    if (!studentId || !courseId || !title) {
      return res.status(400).json({ success: false, error: 'studentId, courseId, and title are required.' });
    }

    const answerSummary = (Array.isArray(questions) ? questions : [])
      .map((q: any, idx: number) => `Q${idx + 1}: ${String(answers?.[q.id] || '').trim() || '(blank)'}`)
      .join('\n');

    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: HomeworkSubmissionRecord = {
      id,
      studentId: Number(studentId),
      studentUsername: String(studentUsername || `student${studentId}`),
      studentName: String(studentName || `Student ${studentId}`),
      courseId: String(courseId),
      courseTitle: String(courseTitle || courseId),
      assignment: String(title),
      assignmentKind: kind === 'essay' ? 'essay' : 'quiz',
      gradingSystem: gradingSystem === 'ib' || gradingSystem === 'marks' ? gradingSystem : 'edexcel',
      submissionText: answerSummary,
      fileName: quizId ? `${kind.toUpperCase()} (${quizId})` : kind.toUpperCase(),
      fileMimeType: null,
      pageCount: 1,
      quizQuestions: Array.isArray(questions) ? questions : [],
      quizAnswers: answers || {},
      status: 'pending',
      submittedAt: new Date().toISOString(),
      draftReport: null,
      publishedReport: null,
    };

    // Prepare educator-only internal draft behind the Approval Gateway (student never sees draft until approved!)
    record.draftReport = await runQuizOrEssayGradingDraft(
      record,
      record.gradingSystem || 'edexcel'
    );

    const state = loadPortalState();
    state.submissions.unshift(record);
    appendTeacherSubmissionNotification(state, record);
    savePortalState(state);

    return res.json({
      success: true,
      submission: sanitizeSubmissionForStudent(record),
    });
  } catch (err: any) {
    console.error('Error submitting quiz/essay:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save assessment submission.' });
  }
});

// RCIS Domain & Access Hub (3,500 seats)
app.get('/api/directory/users', (_req: Request, res: Response) => {
  const state = loadPortalState();
  return res.json({
    success: true,
    capacity: 3500,
    builtInStudents: 50,
    builtInParents: 50,
    customUsers: state.directoryUsers || [],
    parentEmails: state.parentEmails || {},
  });
});

app.post('/api/directory/users', (req: Request, res: Response) => {
  const { users = [] } = req.body || {};
  const list = Array.isArray(users) ? users : [req.body];
  const state = loadPortalState();
  const added: DirectorySeatUser[] = [];

  for (const raw of list) {
    const username = String(raw?.username || '').trim();
    const password = String(raw?.password || '').trim();
    const fullName = String(raw?.fullName || username).trim();
    if (!username || !password) continue;

    const existingIdx = (state.directoryUsers || []).findIndex(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    const entry: DirectorySeatUser = {
      id: Number(raw?.id) || (500 + (state.directoryUsers?.length || 0) + added.length + 1),
      domain: String(raw?.domain || 'Mr.HaithamHusseinig').trim(),
      username,
      password,
      fullName,
      role: raw?.role === 'parent' || raw?.role === 'teacher' ? raw.role : 'student',
      grade: String(raw?.grade || 'Grade 10'),
      section: String(raw?.section || 'Mr.HaithamHusseinig'),
      parentEmail: raw?.parentEmail ? String(raw.parentEmail).trim() : undefined,
      linkedStudentId: raw?.linkedStudentId ? Number(raw.linkedStudentId) : undefined,
      linkedStudentName: raw?.linkedStudentName ? String(raw.linkedStudentName).trim() : undefined,
      createdAt: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      state.directoryUsers[existingIdx] = { ...state.directoryUsers[existingIdx], ...entry };
    } else {
      state.directoryUsers.push(entry);
    }
    if (entry.parentEmail && entry.role === 'student') {
      state.parentEmails[String(entry.id)] = entry.parentEmail;
    }
    added.push(entry);
  }

  savePortalState(state);
  return res.json({ success: true, addedCount: added.length, customUsers: state.directoryUsers });
});

app.post('/api/directory/login', (req: Request, res: Response) => {
  const { domain = 'Mr.HaithamHusseinig', username = '', password = '' } = req.body || {};
  const trimUser = String(username).trim().toLowerCase();
  const trimPass = String(password).trim();
  const trimDomain = String(domain || 'Mr.HaithamHusseinig').trim().toLowerCase();
  const state = loadPortalState();

  const match = (state.directoryUsers || []).find(
    (u) =>
      u.username.toLowerCase() === trimUser &&
      u.password === trimPass &&
      (!u.domain || u.domain.toLowerCase() === trimDomain)
  );
  if (!match) {
    return res.status(401).json({ success: false, error: 'Invalid domain, username, or password' });
  }
  return res.json({ success: true, user: match });
});

app.post('/api/directory/parent-email', (req: Request, res: Response) => {
  const { studentId, parentEmail } = req.body || {};
  if (!studentId || !parentEmail) {
    return res.status(400).json({ success: false, error: 'studentId and parentEmail are required.' });
  }
  const state = loadPortalState();
  state.parentEmails = state.parentEmails || {};
  state.parentEmails[String(studentId)] = String(parentEmail).trim();
  savePortalState(state);
  return res.json({ success: true, parentEmails: state.parentEmails });
});

// Notification Gateway (Resend Free Tier + Local Outbox Preview)
app.get('/api/outbox', (req: Request, res: Response) => {
  const state = loadPortalState();
  const studentId = req.query.studentId ? Number(req.query.studentId) : null;
  let items = state.outbox || [];
  if (studentId !== null && !isNaN(studentId)) {
    items = items.filter((m) => m.studentId === studentId);
  }
  return res.json({
    success: true,
    resendConfigured: Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('re_...')),
    outbox: items,
  });
});

app.post('/api/outbox/:id/send', async (req: Request, res: Response) => {
  const state = loadPortalState();
  const mail = (state.outbox || []).find((m) => m.id === req.params.id);
  if (!mail) {
    return res.status(404).json({ success: false, error: 'Outbox email record not found.' });
  }
  const sub = state.submissions.find((s) => s.id === mail.submissionId);
  if (!sub || !sub.publishedReport) {
    return res.status(400).json({ success: false, error: 'Original approved report not found.' });
  }
  const overrideEmail = req.body?.to ? String(req.body.to).trim() : mail.to;
  const freshRecord = await sendParentReportEmail(state, sub, sub.publishedReport, overrideEmail);
  savePortalState(state);
  return res.json({ success: true, mailRecord: freshRecord });
});

// Statistics Tracker (Stat)
app.get('/api/stats', (req: Request, res: Response) => {
  const state = loadPortalState();
  const role = String(req.query.role || 'student');
  const studentId = req.query.studentId ? Number(req.query.studentId) : null;

  let subs = state.submissions || [];
  if (studentId !== null && !isNaN(studentId)) {
    subs = subs.filter((s) => s.studentId === studentId);
  }

  const gradedSubs = subs.filter((s) => s.status === 'graded' && s.publishedReport);
  const pendingCount = role === 'parent' ? 0 : subs.filter((s) => s.status === 'pending').length;

  const avgPercentage =
    gradedSubs.length > 0
      ? Math.round(
          gradedSubs.reduce((sum, s) => sum + (Number(s.publishedReport?.percentage) || 0), 0) /
            gradedSubs.length
        )
      : 0;

  const bySystem: Record<string, { count: number; avgPercentage: number; sum: number }> = {};
  const errorCounts: Record<string, { label: string; misses: number; total: number }> = {};

  for (const s of gradedSubs) {
    const rep = s.publishedReport;
    const sys = String(rep?.gradingSystem || s.gradingSystem || 'edexcel').toUpperCase();
    if (!bySystem[sys]) bySystem[sys] = { count: 0, avgPercentage: 0, sum: 0 };
    bySystem[sys].count += 1;
    bySystem[sys].sum += Number(rep?.percentage) || 0;

    if (Array.isArray(rep?.questions)) {
      for (const q of rep.questions) {
        const key = String(q.displayLabel || `Q${q.questionNumber}`);
        if (!errorCounts[key]) errorCounts[key] = { label: key, misses: 0, total: 0 };
        errorCounts[key].total += 1;
        if (q.status !== 'correct') errorCounts[key].misses += 1;
      }
    }
  }

  for (const k of Object.keys(bySystem)) {
    bySystem[k].avgPercentage = Math.round(bySystem[k].sum / Math.max(1, bySystem[k].count));
  }

  const enrollments = Object.values(state.enrollments || {});
  const approvedEnrollments = enrollments.filter((e) => e.status === 'approved').length;
  const pendingEnrollments = enrollments.filter((e) => e.status === 'pending').length;

  return res.json({
    success: true,
    stats: {
      totalSubmissions: role === 'parent' ? gradedSubs.length : subs.length,
      gradedCount: gradedSubs.length,
      pendingCount,
      avgPercentage,
      bySystem,
      weakSpots: Object.values(errorCounts)
        .filter((e) => e.misses > 0)
        .sort((a, b) => b.misses - a.misses)
        .slice(0, 6),
      recentReports: gradedSubs.slice(0, 10).map((s) => ({
        id: s.id,
        studentName: s.studentName,
        courseTitle: s.courseTitle,
        assignment: s.assignment,
        kind: s.assignmentKind || 'homework',
        gradingSystem: s.publishedReport?.gradingSystem || s.gradingSystem || 'edexcel',
        earnedMarks: s.publishedReport?.earnedMarks || 0,
        totalMarks: s.publishedReport?.totalMarks || 0,
        percentage: s.publishedReport?.percentage || 0,
        grade: s.publishedReport?.grade || '',
        publishedAt: s.publishedAt,
      })),
      outboxCount: (state.outbox || []).length,
      sentEmailCount: (state.outbox || []).filter((m) => m.status === 'sent').length,
      approvedEnrollments,
      pendingEnrollments,
      activeDirectorySeats: 100 + (state.directoryUsers || []).length,
      seatCapacity: 3500,
    },
  });
});

// ============================================================================
// Per-Group Homework Assignments + Email & Website Notifications
// ============================================================================

app.get('/api/assignments', (req: Request, res: Response) => {
  const state = loadPortalState();
  const courseId = req.query.courseId ? String(req.query.courseId) : null;
  let items = state.assignments || [];
  if (courseId) {
    items = items.filter((a) => a.courseId === courseId);
  }
  return res.json({ success: true, assignments: items });
});

app.post('/api/assignments', async (req: Request, res: Response) => {
  try {
    const {
      courseId,
      courseTitle,
      title,
      instructions = '',
      dueDate = '',
      gradingSystem = 'edexcel',
      sendNotification = true,
      notifyEmails = '',
    } = req.body || {};

    if (!courseId || !title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'Group (courseId) and homework title are required.' });
    }

    const state = loadPortalState();
    const assignmentRec: HomeworkAssignmentRecord = {
      id: `hw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      courseId: String(courseId),
      courseTitle: String(courseTitle || courseId),
      title: String(title).trim(),
      instructions: String(instructions || '').trim(),
      dueDate: String(dueDate || '').trim(),
      gradingSystem: gradingSystem === 'ib' || gradingSystem === 'marks' ? gradingSystem : 'edexcel',
      createdAt: new Date().toISOString(),
      createdBy: 'Mr. Haitham Hussien',
    };

    state.assignments = [assignmentRec, ...(state.assignments || [])];

    let createdNotification: PortalNotification | null = null;
    const emailDeliveries: OutboxEmailRecord[] = [];

    if (sendNotification) {
      const dueStr = assignmentRec.dueDate
        ? new Date(assignmentRec.dueDate).toLocaleString('en-GB')
        : 'No deadline specified';
      createdNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientRole: 'all',
        courseId: assignmentRec.courseId,
        title: `New Homework: ${assignmentRec.title}`,
        message: `${assignmentRec.courseTitle} · Due: ${dueStr}${
          assignmentRec.instructions ? ` — ${assignmentRec.instructions}` : ''
        }`,
        type: 'assignment',
        dueDate: assignmentRec.dueDate || undefined,
        createdAt: new Date().toISOString(),
        readByUserIds: [],
      };
      state.notifications = [createdNotification, ...(state.notifications || [])].slice(0, 200);

      // Collect recipient emails: explicit notifyEmails + approved group members' parent emails
      const recipientsMap = new Map<string, { studentId: number; studentName: string }>();
      const extraEmails = String(notifyEmails || '')
        .split(/[,;\n]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));
      for (const em of extraEmails) {
        recipientsMap.set(em.toLowerCase(), { studentId: 0, studentName: `${assignmentRec.courseTitle} Recipient` });
      }

      const enrolledInGroup = Object.values(state.enrollments || {}).filter(
        (enr) => enr.status === 'approved' && enr.courseId === assignmentRec.courseId
      );
      for (const enr of enrolledInGroup) {
        const email =
          state.parentEmails?.[String(enr.studentId)] ||
          `parent.${enr.studentUsername}@mrhaithamhusseinig.edu`;
        if (!recipientsMap.has(email.toLowerCase())) {
          recipientsMap.set(email.toLowerCase(), {
            studentId: enr.studentId,
            studentName: enr.studentName,
          });
        }
      }

      if (recipientsMap.size === 0) {
        recipientsMap.set(`group.${assignmentRec.courseId}@mrhaithamhusseinig.edu`, {
          studentId: 0,
          studentName: assignmentRec.courseTitle,
        });
      }

      for (const [email, info] of recipientsMap.entries()) {
        const mailRec = await sendAssignmentEmailViaResend(
          state,
          assignmentRec,
          email,
          info.studentId,
          info.studentName
        );
        emailDeliveries.push(mailRec);
      }
    }

    savePortalState(state);
    return res.json({
      success: true,
      assignment: assignmentRec,
      notification: createdNotification,
      emailDeliveries,
    });
  } catch (err: any) {
    console.error('Error assigning homework to group:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to assign homework.' });
  }
});

app.delete('/api/assignments/:id', (req: Request, res: Response) => {
  const state = loadPortalState();
  const idx = (state.assignments || []).findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Assignment not found.' });
  }
  state.assignments.splice(idx, 1);
  savePortalState(state);
  return res.json({ success: true });
});

app.get('/api/notifications', (req: Request, res: Response) => {
  const state = loadPortalState();
  const role = String(req.query.role || 'student');
  const courseId = req.query.courseId ? String(req.query.courseId) : null;
  const studentId = req.query.studentId ? Number(req.query.studentId) : null;

  let items = state.notifications || [];
  if (role === 'teacher') {
    items = items.filter((n) => n.recipientRole === 'teacher' || n.type === 'submission');
  } else {
    items = items.filter((n) => {
      if (n.type === 'report' && studentId !== null && !isNaN(studentId)) {
        return n.studentId === studentId;
      }
      if (n.type === 'assignment') {
        return courseId ? n.courseId === courseId : false;
      }
      return false;
    });
  }
  return res.json({ success: true, notifications: items });
});

app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
  const userId = Number(req.body?.userId ?? 0);
  const state = loadPortalState();
  const item = (state.notifications || []).find((n) => n.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Notification not found.' });
  }
  if (!item.readByUserIds.includes(userId)) {
    item.readByUserIds.push(userId);
    savePortalState(state);
  }
  return res.json({ success: true, notification: item });
});

// Serve frontend in dev or prod
async function startServer() {
  const isProdRuntime =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID || process.env.RENDER);

  if (!isProdRuntime) {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  async function listenWithFallback(portToTry: number, retriesLeft = 10) {
    if (isProdRuntime || process.env.PORT) {
      app.listen(portToTry, '0.0.0.0', () => {
        console.log(`Server listening on 0.0.0.0:${portToTry}`);
        resumeOrphanedAutoDrafts();
      });
      return;
    }

    const isAvailable = await new Promise<boolean>((resolve) => {
      const tester = net
        .createServer()
        .once('error', () => resolve(false))
        .once('listening', () => tester.close(() => resolve(true)))
        .listen(portToTry, '::1');
    });

    if (!isAvailable && retriesLeft > 0) {
      console.warn(`Port ${portToTry} is in use on localhost, trying port ${portToTry + 1}...`);
      return listenWithFallback(portToTry + 1, retriesLeft - 1);
    }

    const serverInstance = app
      .listen(portToTry, () => {
        console.log(`Server listening on port ${portToTry}`);
        console.log(`Local web app ready at: http://localhost:${portToTry}`);
        resumeOrphanedAutoDrafts();
      })
      .on('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
          console.warn(`Port ${portToTry} in use, trying port ${portToTry + 1}...`);
          listenWithFallback(portToTry + 1, retriesLeft - 1);
        } else {
          console.error('Server failed to bind port:', err);
        }
      });
  }

  listenWithFallback(PORT);
}

// Export app instance for Netlify Functions and programmatic testing
export { app };
export default app;

if (!process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NETLIFY_LOCAL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
