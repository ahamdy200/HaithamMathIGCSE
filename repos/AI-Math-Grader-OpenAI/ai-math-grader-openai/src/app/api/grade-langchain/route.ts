/**
 * LangChain Grading API Route
 * 
 * This endpoint demonstrates LangChain integration:
 * - Uses LCEL (LangChain Expression Language) chains
 * - Structured output with Zod schema validation
 * - ChatOpenAI model integration
 * 
 * Endpoint: POST /api/grade-langchain
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import PDFParser from 'pdf2json';
import { gradeExamWithLangChain } from '@/lib/langchain';

// Map of exam years to their PDF filenames
const EXAM_FILES: Record<string, string> = {
    '2010': 'intagningstest2010.pdf',
    '2011': 'intagningstest2011.pdf',
    '2012': 'intagningstest2012.pdf',
    '2013': 'intagningstest-2013.pdf',
    '2014': 'intagningstest-2014.pdf',
    '2015': 'intagningstest-2015.pdf',
    '2016': 'intagningstest-2016.pdf',
    '2017': 'intagningstest-2017.pdf',
    '2018': 'intagningstest-2018.pdf',
    '2019': 'intagningstest-2019.pdf',
    '2021': 'intagningstest-2021.pdf',
    '2022': 'intagningstest-2022-.pdf',
    '2023': 'intagningstest-2023-.pdf',
    '2024': 'intagningstest-2024.pdf',
    '2025': 'intagningstest-2025.pdf',
};

// Updated path: exams are now in ../exams/intagningstest/
const EXAMS_BASE_PATH = path.join(process.cwd(), '..', 'exams', 'intagningstest');

// Extract text from PDF buffer using pdf2json
async function extractPdfText(buffer: Buffer): Promise<string> {
    const pdfParser = new PDFParser(null, true);

    return new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => {
            resolve(pdfParser.getRawTextContent());
        });

        pdfParser.parseBuffer(buffer);
    });
}

// Extract year from the answer sheet text
function detectExamYear(text: string): string | null {
    const yearPattern = /\b(201[0-9]|202[0-5])\b/;
    const match = text.match(yearPattern);

    if (match) {
        const year = match[1];
        if (EXAM_FILES[year]) {
            return year;
        }
    }
    return null;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const answersFile = formData.get('pdf') as File;

        if (!answersFile) {
            return NextResponse.json(
                { error: 'Please upload your answer sheet (PDF with year written at top)' },
                { status: 400 }
            );
        }

        // Extract text from student's answers
        let answersText: string;
        try {
            const arrayBuffer = await answersFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            answersText = await extractPdfText(buffer);
        } catch (err) {
            console.error('PDF parse error:', err);
            return NextResponse.json(
                { error: 'Failed to parse PDF. Please ensure it is a valid PDF file.' },
                { status: 400 }
            );
        }

        if (!answersText || answersText.trim().length === 0) {
            return NextResponse.json(
                { error: 'No text could be extracted from the PDF.' },
                { status: 400 }
            );
        }

        // Detect the exam year from the answer sheet
        const detectedYear = detectExamYear(answersText);

        if (!detectedYear) {
            return NextResponse.json(
                { error: 'Could not detect exam year. Please write the year at the top.' },
                { status: 400 }
            );
        }

        // Load the official exam for the detected year
        const examFilename = EXAM_FILES[detectedYear];
        let examText: string;
        try {
            const examPath = path.join(EXAMS_BASE_PATH, examFilename);
            const examBuffer = await readFile(examPath);
            examText = await extractPdfText(examBuffer);
        } catch {
            return NextResponse.json(
                { error: `Failed to load exam for year ${detectedYear}` },
                { status: 500 }
            );
        }

        // ============================================
        // USING LANGCHAIN FOR GRADING
        // This demonstrates LangChain LCEL workflow:
        // 1. ChatPromptTemplate for structured prompts
        // 2. ChatOpenAI for model invocation
        // 3. StructuredOutputParser for Zod validation
        // ============================================
        const result = await gradeExamWithLangChain({
            examText,
            studentText: answersText,
            year: detectedYear,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('LangChain grading error:', error);
        return NextResponse.json(
            { error: 'Internal server error during grading' },
            { status: 500 }
        );
    }
}
