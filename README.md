# HaithamMathIGCSE — Math Website & AI Homework Evaluation Portal

**Cambridge IGCSE Mathematics — Student Homework AI Checking & Feedback Portal**  
**Instructor:** Mr. Haitham Hussien  
**Repository:** [https://github.com/ahamdy200/HaithamMathIGCSE.git](https://github.com/ahamdy200/HaithamMathIGCSE.git)

## Overview

**HaithamMathIGCSE** is an interactive Cambridge IGCSE Mathematics platform and automated homework evaluation portal modeled after Google NotebookLM and Google Colab workflows. It allows students and teachers to upload handwritten or typed mathematics homework worksheets (such as *Chapter 1: Numbers — Lesson 1: Order of Operations (BIDMAS)*) and receive immediate, question-by-question diagnostic marking against the official Cambridge Mark Scheme.

## Key Features

- **Per-Question Isolated Grading Engine**: Evaluates student workings question-by-question (`Q1` through `Q7`, including sub-parts `5a`, `5b`, `6a`, `6b`) with method marks `[M1]` and accuracy marks `[A1]`.
- **PDF & Image Homework Upload**: Extracts text from uploaded PDFs via `pdf-parse` and supports multimodal inspection.
- **NotebookLM-Style Diagnostic Reports**: Generates structured evaluation tables, mistake analysis, and personalized action plans.
- **Official Model Answer Key Viewer**: Built-in side-by-side reference for Mr. Haitham Hussien's Cambridge IGCSE Model Answer Key.
- **Interactive Colab Notebook & Python Integration**: Exportable `.ipynb` notebooks and Python code cells for Gemini API grading pipelines.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (Express + Vite on port 3000)
npm run dev

# Build for production
npm run build
```
