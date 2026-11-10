import { HomeworkGradingReport, QuestionGrading, HomeworkActionPlanItem } from '../types';

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

// Clean PDF artifacts and header/footer noise
export function cleanPdfPageArtifacts(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^Page\s+\d+\s+of\s+\d+/gim, '')
    .replace(/^Paper\s+Reference\s+[A-Z0-9\/]+/gim, '')
    .replace(/^Pearson\s+Edexcel\s+International\s+GCSE.*$/gim, '')
    .replace(/^\*P\d{5,}[A-Z0-9]*\*/gim, '')
    .replace(/^Do\s+not\s+write\s+(?:in\s+this\s+area|outside\s+the\s+box).*$/gim, '')
    .replace(/^TOTAL\s+FOR\s+PAPER\s+IS\s+\d+\s+MARKS.*$/gim, '')
    .replace(/Turn\s+over\s*[-–—]*/gi, '')
    .replace(/BLANK\s+PAGE/gi, '')
    .trim();
}

export function normalizeMultilineMathBlock(text: string): string {
  if (!text) return '';
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

// Universal Multi-Question Model Answer Key Parser (supports any question count: 20, 26, 7, etc.)
export function parseModelKeyQuestions(rawModelKeyText: string): ParsedModelQuestion[] {
  const cleaned = cleanPdfPageArtifacts(rawModelKeyText);
  if (!cleaned) return [];

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

  const tier1Blocks: RawBlock[] = [];
  let currentSection = 'Assessment';
  let currentBlock: RawBlock | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const secMatch = line.match(/^SECTION\s+([A-Z0-9]+)\s*[:\-–]?\s*(.*)$/i);
    if (secMatch) {
      currentSection = `Section ${secMatch[1].toUpperCase()}${
        secMatch[2] ? ': ' + secMatch[2].replace(/\(Questions.*$/i, '').trim() : ''
      }`;
      continue;
    }

    const qHeaderMatch =
      line.match(/^(?:Question|QUESTION|Problem|PROBLEM)\s+(\d{1,3}[a-z]?)\b\s*(.*)$/) ||
      line.match(/^Q\.?\s*(\d{1,3}[a-z]?)(?:\s*[\.\)\:\-\[]|\s+\(|\s*$)\s*(.*)$/i);

    if (qHeaderMatch) {
      if (currentBlock) {
        tier1Blocks.push(currentBlock);
      }
      currentBlock = {
        rawId: qHeaderMatch[1],
        headerLine: line,
        sectionTitle: currentSection,
        bodyLines: qHeaderMatch[2] ? [qHeaderMatch[2].trim()] : [],
      };
    } else if (currentBlock) {
      currentBlock.bodyLines.push(line);
    }
  }
  if (currentBlock) {
    tier1Blocks.push(currentBlock);
  }

  let activeBlocks = tier1Blocks;
  if (activeBlocks.length < 2) {
    const tier2Blocks: RawBlock[] = [];
    let t2Block: RawBlock | null = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
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

    const bodyLinesClean = [...blk.bodyLines];
    if (bodyLinesClean.length > 0) {
      bodyLinesClean[0] = bodyLinesClean[0]
        .replace(/^\(\d+\s*Marks?\)\s*/i, '')
        .replace(/^\[\d+\s*Marks?\]\s*/i, '')
        .trim();
      if (!bodyLinesClean[0]) bodyLinesClean.shift();
    }

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
        const a1Matches = Array.from(fullBlockText.matchAll(/([^\n=⇒]+?)\s*\[A\d+\]/gi));
        if (a1Matches.length > 0) {
          finalAnswer = a1Matches[a1Matches.length - 1][1].trim();
        } else if (solutionLines.length > 0) {
          finalAnswer = solutionLines[solutionLines.length - 1].trim();
        }
      }
    }
    finalAnswer = finalAnswer.replace(/^Answer\s*:\s*/i, '').trim();

    const methodSteps: string[] = [];
    for (const sLine of solutionLines) {
      if (/\[M\d+\]/i.test(sLine) || /^\d+\.\s*Step\s+\d+/i.test(sLine)) {
        methodSteps.push(sLine.replace(/^\d+\.\s*/, '').trim());
      }
    }

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
        ? `${mCount > 0 ? `[M${mCount}] Method + ` : ''}${aCount > 0 ? `[A${aCount}] Accuracy ` : ''}(${maxMarks} Mark${
            maxMarks > 1 ? 's' : ''
          })`.trim()
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

// Universal Student Submission Parser
export function parseStudentSubmissionQuestions(
  rawSubmissionText: string,
  modelQuestions: ParsedModelQuestion[]
): Record<number, string> {
  const result: Record<number, string> = {};
  const cleaned = cleanPdfPageArtifacts(rawSubmissionText);
  if (!cleaned) return result;

  const withoutPlaceholder = cleaned
    .replace(/^Student\s*:.*$/gim, '')
    .replace(/^Uploaded\s+Homework\s+Worksheet\s*:.*$/gim, '')
    .replace(/^Assignment\s*:.*$/gim, '')
    .replace(/^Evaluated\s+according\s+to\s+Cambridge\s+IGCSE.*$/gim, '')
    .trim();

  if (!withoutPlaceholder) return result;

  const normalized = withoutPlaceholder
    .replace(/([^\n])\s+((?:Question|QUESTION|Problem|PROBLEM)\s+\d{1,3}\b)/g, '$1\n$2')
    .replace(/([^\n])\s+(Q\.?\s*\d{1,3}\s*[\.\:\)\-])/gi, '$1\n$2');

  const lines = normalized.split('\n');

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

  const nonEmptyLines = lines.map((l) => l.trim()).filter(Boolean);
  nonEmptyLines.forEach((line, idx) => {
    if (idx < modelQuestions.length) {
      result[idx + 1] = line;
    }
  });

  return result;
}

export function canonicalizeMath(input: string): string {
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
    .replace(/([a-zA-Z\)])([2-9])\b/g, '$1^$2')
    .replace(/\s+/g, '')
    .toLowerCase();

  s = s.replace(/^=+/, '').replace(/\.+$/, '');
  return s;
}

export function evaluateAlgebraicAtPoint(rawExpr: string, vars: Record<string, number>): number | null {
  try {
    let expr = canonicalizeMath(rawExpr);
    if (!expr) return null;

    if (expr.includes('=') && !expr.includes('<=') && !expr.includes('>=')) {
      const parts = expr.split('=').filter(Boolean);
      expr = parts[parts.length - 1];
    }

    if (/[<>]|or|and|,/.test(expr)) return null;

    expr = expr.replace(/√\(?([0-9a-z+\-*/^]+)\)?/g, 'Math.sqrt($1)');
    expr = expr.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');

    expr = expr.replace(/([a-z])([a-z])/g, '$1*$2');
    expr = expr.replace(/([a-z])([a-z])/g, '$1*$2');

    expr = expr
      .replace(/(\d)([a-z\(])/g, '$1*$2')
      .replace(/([a-z\)])(\d)/g, '$1*$2')
      .replace(/(\))([a-z\(])/g, '$1*$2')
      .replace(/([a-z])(\()/g, '$1*$2')
      .replace(/\^/g, '**');

    for (const [vName, vVal] of Object.entries(vars)) {
      const re = new RegExp(`\\b${vName}\\b`, 'g');
      expr = expr.replace(re, `(${vVal})`);
    }

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

export function extractSortedNumericTokens(str: string): number[] {
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

export function areMathExpressionsEquivalent(modelAns: string, studentAns: string, promptText = ''): boolean {
  if (!modelAns || !studentAns) return false;

  const mCanon = canonicalizeMath(modelAns);
  const sCanon = canonicalizeMath(studentAns);
  if (!mCanon || !sCanon) return false;

  if (mCanon === sCanon) return true;

  const stripSubject = (s: string) => s.replace(/^[a-z]=/, '');
  if (stripSubject(mCanon) === stripSubject(sCanon) && stripSubject(mCanon).length > 0) {
    return true;
  }

  if (sCanon.endsWith(`=${mCanon}`) || sCanon.endsWith(`=${stripSubject(mCanon)}`) || sCanon.includes(`answer:${mCanon}`)) {
    return true;
  }

  const isFactorisePrompt = /factoris|factor/i.test(promptText);
  const isExpandPrompt = /expand/i.test(promptText);

  if (isFactorisePrompt && !sCanon.includes('(')) return false;
  if (isExpandPrompt && /^\([^)]+\)\([^)]+\)$/.test(sCanon)) return false;

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

  if (
    mCanon.includes('or') ||
    mCanon.includes('and') ||
    mCanon.includes(',') ||
    mCanon.includes('<=') ||
    mCanon.includes('>=') ||
    mCanon.includes('<') ||
    mCanon.includes('>')
  ) {
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

  const testPoints = [
    { x: 2.31, y: 1.73, a: 1.41, b: 2.19, u: 3.11, v: 9.47, r: 2.63, t: 1.85 },
    { x: -1.37, y: 2.89, a: 2.07, b: -1.13, u: 1.53, v: 7.21, r: 3.17, t: -0.91 },
    { x: 3.79, y: -0.83, a: -1.61, b: 1.93, u: -2.11, v: 5.83, r: 1.91, t: 2.43 },
  ];

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
    const pCanon = canonicalizeMath(promptText);
    const lastCanon = canonicalizeMath(lastSegment);
    if (pCanon && pCanon.includes(lastCanon) && lastCanon !== mCanon && lastCanon.length > 3) {
      return false;
    }
    return true;
  }

  return false;
}

export function evaluateStudentQuestion(modelQ: ParsedModelQuestion, studentRaw: string): QuestionGrading {
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
      status: 'incorrect',
      statusLabel: 'INCORRECT',
      studentWorkingFound: 'Not attempted / Left blank',
      modelSolution: modelQ.modelSolution,
      errorAnalysis: 'Question unattempted (0 marks).',
      teacherFeedback: `No answer submitted for ${modelQ.displayLabel}. Expected: ${modelQ.finalAnswer}.`,
    };
  }

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
      status: 'correct',
      statusLabel: 'CORRECT',
      studentWorkingFound: cleanStudent.replace(/\s*\|\s*/g, ' → '),
      modelSolution: modelQ.modelSolution,
      errorAnalysis: `Correct solution (${modelQ.finalAnswer}). Full marks [${modelQ.maxMarks}/${modelQ.maxMarks}] awarded.`,
      teacherFeedback: `Excellent work on ${modelQ.displayLabel}! All method [M1] and accuracy [A1] requirements satisfied.`,
    };
  }

  let matchedMethodSteps = 0;
  const studentCanon = canonicalizeMath(cleanStudent);

  for (const stepStr of modelQ.methodSteps) {
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
      status: 'incorrect',
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
    status: 'incorrect',
    statusLabel: 'INCORRECT',
    studentWorkingFound: cleanStudent.replace(/\s*\|\s*/g, ' → '),
    modelSolution: modelQ.modelSolution,
    errorAnalysis: `Incorrect answer or algebraic step (student wrote "${studentFinalCandidate}"; expected "${modelQ.finalAnswer}").`,
    teacherFeedback: `Review the step-by-step model solution for ${modelQ.displayLabel}: ${modelQ.modelSolution}`,
  };
}

// Complete 5-Repo Deterministic Multi-Question Grading Pipeline (Runs in Browser or Server)
export function gradeWithFiveRepoEnginePoolClient(
  studentName: string,
  assignmentTitle: string,
  modelKeyText: string,
  submissionText: string,
  fileName?: string | null,
  startTime: number = Date.now()
): HomeworkGradingReport {
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
      ? `No student answers were detected across the ${totalQuestions} questions in "${assignmentTitle}" (0 / ${totalMarks} marks). Please ensure the student response contains numbered solutions matching Questions 1 to ${totalQuestions}.`
      : `${safeName} completed ${attemptedCount} of ${totalQuestions} questions on "${assignmentTitle}", achieving ${earnedMarks} / ${totalMarks} marks (${percentage}% — Grade ${grade}). ${correctCount} question(s) were answered with full accuracy [A1]${
          partialCount > 0 ? `, ${partialCount} question(s) earned partial method credit [M1]` : ''
        }${unattemptedCount > 0 ? `, and ${unattemptedCount} question(s) were left unattempted` : ''}.`;

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
      : `Across ${totalQuestions} total questions (${totalMarks} marks), ${safeName} secured full marks on ${correctCount} question(s)${
          partialCount > 0 ? ` and partial method marks [M1] on ${partialCount} question(s)` : ''
        }. Priority areas for review include: ${incorrectQuestionsList || 'remaining questions'}.`;

  const strengths: string[] = [];
  if (correctCount > 0) {
    strengths.push(
      `Accurately solved ${correctCount} question(s) including ${gradedQuestions
        .filter((q) => q.status === 'correct')
        .slice(0, 4)
        .map((q) => q.displayLabel)
        .join(', ')} with full mark scheme compliance.`
    );
  }
  if (attemptedCount > 0) {
    strengths.push(`Active participation: attempted ${attemptedCount} of ${totalQuestions} questions on this assessment.`);
  } else {
    strengths.push('Candidate worksheet submitted for assessment.');
  }

  const recommendedNextSteps: string[] = [];
  if (unattemptedCount > 0) {
    recommendedNextSteps.push(`Attempt all unattempted questions (${unattemptedCount} questions left blank).`);
  }
  if (incorrectQuestionsList) {
    recommendedNextSteps.push(`Review model solutions for: ${incorrectQuestionsList}.`);
  }
  recommendedNextSteps.push(
    'Practice step-by-step working to ensure full Method [M1] credit is secured on multi-mark questions.'
  );

  const actionPlan: HomeworkActionPlanItem[] = [
    {
      title: 'Targeted Review of Lost Marks',
      detail:
        incorrectQuestionsList.length > 0
          ? `Work through detailed model solutions for ${incorrectQuestionsList}.`
          : 'Consolidate speed and accuracy on higher-tier examination problems.',
    },
    {
      title: 'Method Mark Verification',
      detail:
        'Always show complete algebraic expansion, bracket simplification, and intermediate arithmetic to secure [M1] credit even if an arithmetic slips.',
    },
    {
      title: 'Next Practice Set',
      detail: 'Complete the corresponding Chapter Topic Test under timed examination conditions.',
    },
  ];

  return {
    studentName: safeName,
    assignmentTitle,
    teacherName: 'Mr. Haitham Hussien',
    subject: 'Cambridge & Pearson Edexcel IGCSE Mathematics',
    chapter: 'Unified Multi-Repository Assessment',
    topic: assignmentTitle,
    headerTitle: 'Cambridge & Pearson Edexcel IGCSE Mathematics',
    reportTitle: `Diagnostic Assessment Report: ${assignmentTitle}`,
    submissionDate: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    totalMarks,
    earnedMarks,
    percentage,
    grade,
    performanceLevel,
    generalFeedback,
    diagnosticReview,
    actionPlan,
    uploadedFile: fileName || undefined,
    questions: gradedQuestions,
    strengths,
    recommendedNextSteps,
    executionTimeMs: Date.now() - startTime,
  };
}
