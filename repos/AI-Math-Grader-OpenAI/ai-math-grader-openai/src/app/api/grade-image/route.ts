/**
 * Image Grading API Route - Multi-Page Support
 * 
 * This endpoint handles:
 * - Multiple images (up to 10 pages)
 * - HEIC (iPhone), JPEG, PNG, WebP images
 * - Converts HEIC to JPEG for processing
 * - Uses GPT-4o Vision to read handwritten answers
 * 
 * Endpoint: POST /api/grade-image
 */

import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import PDFParser from 'pdf2json';

// Dynamic import for heic-convert (ESM issue workaround)
let heicConvert: ((options: { buffer: Buffer; format: 'JPEG' | 'PNG'; quality: number }) => Promise<Buffer>) | null = null;

async function getHeicConvert() {
    if (!heicConvert) {
        const module = await import('heic-convert');
        heicConvert = module.default;
    }
    return heicConvert;
}

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

const EXAMS_BASE_PATH = path.join(process.cwd(), '..', 'exams', 'intagningstest');

// Supported image formats
const SUPPORTED_IMAGE_TYPES = [
    'image/heic',
    'image/heif',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];

// Convert HEIC to JPEG
async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
    const convert = await getHeicConvert();
    if (!convert) {
        throw new Error('HEIC converter not available');
    }
    const jpegBuffer = await convert({
        buffer,
        format: 'JPEG',
        quality: 0.9,
    });
    return Buffer.from(jpegBuffer);
}

// Process image to ensure it's in a compatible format and optimized size
async function processImage(buffer: Buffer, mimeType: string): Promise<string> {
    let processedBuffer = buffer;

    // Convert HEIC to JPEG
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
        console.log('Converting HEIC to JPEG...');
        processedBuffer = await convertHeicToJpeg(buffer);
    }

    // Optimize image size for API (max 2048px on longest side)
    const optimized = await sharp(processedBuffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

    return optimized.toString('base64');
}

// Extract text from PDF using pdf2json
async function extractPdfText(pdfPath: string): Promise<string> {
    return new Promise((resolve) => {
        const pdfParser = new PDFParser(null, true);

        pdfParser.on('pdfParser_dataError', (errData: any) => {
            console.error('pdf2json error:', errData.parserError);
            resolve('[Failed to extract PDF text from official exam]');
        });

        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            const text = (pdfParser as any).getRawTextContent();
            resolve(text || '[Empty PDF content in official exam]');
        });

        pdfParser.loadPDF(pdfPath);
    });
}

// System prompt for vision-based grading
const VISION_GRADING_PROMPT = `You are an expert mathematics exam grader for Swedish Hvitfeldska spetsutbildning entrance exams.

You will receive:
1. The OFFICIAL EXAM questions (as text, in Swedish)
2. PHOTOS of the student's handwritten answers (may be multiple pages, handwriting in Swedish)

## Your Task:
1. **Solve first internally**: Before looking at the student's work, solve each question in the official exam. This ensures you have the correct mathematical solution.
2. **Interpret handwritten work**: Carefully read the student's handwritten Swedish. Be mindful of Swedish mathematical notation.
3. **Compare and Grade**: Compare the student's method and final answer against your derived correct solution.
4. **Provide feedback**: Write detailed feedback in Swedish.

## Important Note on Accuracy:
- Math is accurate and objective. Do not award points for effort if the calculation is fundamentally wrong.
- Accurately identify if a calculation error occurred vs. a conceptual error.
- Recognized Swedish decimal comma (3,14) equals English decimal point (3.14).
- Look through ALL provided images to find answers before concluding they are missing.

## Grading Criteria:
- Full marks: Correct answer with valid method.
- Partial credit (50-80%): Right approach but small calculation errors.
- Minimal credit (10-50%): Shows understanding but significant errors.
- Zero marks: Incorrect approach, wrong answer, or no attempt.

## Output Format (JSON):
{
  "exam_info": {
    "year": "YYYY",
    "exam_type": "Intagningstest Hvitfeldska Spetsutbildning",
    "total_questions": number
  },
  "total_score": number,
  "max_possible_score": number,
  "percentage": number,
  "per_question": [
    {
      "question_number": "1",
      "question_text": "Brief summary (in Swedish)",
      "student_answer": "What the student wrote (transcribed from images, keep in Swedish)",
      "correct_answer": "The correct solution and final answer (show calculation)",
      "score": number,
      "max_score": number,
      "is_correct": boolean,
      "feedback": "Detailed feedback in Swedish - explain exactly what was right/wrong"
    }
  ],
  "overall_feedback": "Overall assessment in Swedish - be encouraging but mathematically rigorous",
  "strengths": ["Areas where student performed well (in Swedish)"],
  "areas_to_improve": ["Topics needing more practice (in Swedish)"],
  "study_recommendations": ["Specific study tips in Swedish"]
}`;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const yearOverride = formData.get('year') as string | null;

        // Collect all files
        const files: File[] = [];
        const fileCount = parseInt(formData.get('fileCount') as string) || 1;

        // Try to get files with numbered keys (file0, file1, etc.)
        for (let i = 0; i < fileCount; i++) {
            const file = formData.get(`file${i}`) as File;
            if (file) {
                files.push(file);
            }
        }

        // Also try single 'file' key for backward compatibility
        const singleFile = formData.get('file') as File;
        if (singleFile && files.length === 0) {
            files.push(singleFile);
        }

        if (files.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Please upload at least one image of your answer sheet' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (files.length > 10) {
            return new Response(
                JSON.stringify({ error: 'Maximum 10 files allowed per submission' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Processing ${files.length} file(s)...`);

        // Process each file
        const processedImages: string[] = [];
        let detectedYear = yearOverride;

        for (const file of files) {
            const mimeType = file.type.toLowerCase();
            const isImage = SUPPORTED_IMAGE_TYPES.includes(mimeType) ||
                file.name.toLowerCase().endsWith('.heic') ||
                file.name.toLowerCase().endsWith('.heif');

            if (!isImage) {
                return new Response(
                    JSON.stringify({
                        error: `Unsupported file type: ${file.name}. Please upload images (HEIC, JPEG, PNG, WebP)`
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const base64 = await processImage(buffer, mimeType);
            processedImages.push(base64);

            // Try to detect year from filename if not set
            if (!detectedYear) {
                const filename = file.name.toLowerCase();
                const yearMatch = filename.match(/\b(201[0-9]|202[0-5])\b/);
                if (yearMatch && EXAM_FILES[yearMatch[1]]) {
                    detectedYear = yearMatch[1];
                }
            }
        }

        // Default to latest exam if no year detected
        if (!detectedYear) {
            detectedYear = '2024';
        }

        // Load the official exam
        const examFilename = EXAM_FILES[detectedYear];
        if (!examFilename) {
            return new Response(
                JSON.stringify({ error: `No exam found for year ${detectedYear}` }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        let examText: string;
        try {
            const examPath = path.join(EXAMS_BASE_PATH, examFilename);
            // Check if file exists first
            await readFile(examPath);
            examText = await extractPdfText(examPath);
        } catch {
            return new Response(
                JSON.stringify({ error: `Failed to load exam for year ${detectedYear}` }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build message content with all images
        console.log(`Grading ${processedImages.length} image(s) for year ${detectedYear} exam...`);

        // Build content array with text and all images
        const contentParts: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
            {
                type: 'text',
                text: `## OFFICIAL EXAM (Year ${detectedYear}):\n${examText}\n\n---\n\nThe student has submitted ${processedImages.length} page(s) of answers. Please read ALL the handwritten answers in the images below and grade them against the exam questions. Answers may span multiple pages. Provide feedback in Swedish.`,
            },
        ];

        // Add all images
        for (let i = 0; i < processedImages.length; i++) {
            contentParts.push({
                type: 'text',
                text: `\n--- Page ${i + 1} of ${processedImages.length} ---`,
            });
            contentParts.push({
                type: 'image',
                image: processedImages[i],
            });
        }

        const messages = [
            {
                role: 'system' as const,
                content: VISION_GRADING_PROMPT,
            },
            {
                role: 'user' as const,
                content: contentParts,
            },
        ];

        // Use Claude 3.5 Sonnet Vision (best for handwriting)
        const provider = process.env.LLM_PROVIDER || 'anthropic';
        console.log(`Using provider: ${provider}`);

        const model = provider === 'google'
            ? google('models/gemini-2.0-flash-exp')
            : anthropic('claude-3-5-sonnet-20241022');

        const result = streamText({
            model,
            messages,
            temperature: 0.1,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Image grading error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
