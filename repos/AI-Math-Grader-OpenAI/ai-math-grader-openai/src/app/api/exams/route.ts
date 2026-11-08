import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

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

// Extract text from PDF using system pdftotext
async function extractPdfText(pdfPath: string): Promise<string> {
    return new Promise((resolve) => {
        const pdftotext = spawn('pdftotext', [pdfPath, '-']);
        let text = '';

        pdftotext.stdout.on('data', (data) => {
            text += data.toString();
        });

        pdftotext.on('close', (code) => {
            if (code === 0 && text) {
                resolve(text);
            } else {
                resolve('[PDF text extraction not available]');
            }
        });

        pdftotext.on('error', () => {
            resolve('[Please install poppler-utils for PDF text extraction]');
        });
    });
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');

    if (!year) {
        // Return list of available years
        return NextResponse.json({
            available_years: Object.keys(EXAM_FILES).sort(),
        });
    }

    const filename = EXAM_FILES[year];
    if (!filename) {
        return NextResponse.json(
            { error: `No exam found for year ${year}. Available years: ${Object.keys(EXAM_FILES).join(', ')}` },
            { status: 404 }
        );
    }

    try {
        const filePath = path.join(EXAMS_BASE_PATH, filename);
        await readFile(filePath); // Check if file exists
        const pdfText = await extractPdfText(filePath);

        return NextResponse.json({
            year,
            filename,
            text: pdfText,
        });
    } catch (error) {
        console.error(`Error loading exam for ${year}:`, error);
        return NextResponse.json(
            { error: `Failed to load exam for year ${year}` },
            { status: 500 }
        );
    }
}
