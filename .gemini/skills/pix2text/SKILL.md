---
name: pix2text
description: Mathematical formula detection (MFD), formula recognition (MFR), handwritten equation to LaTeX extraction, document layout analysis, and image-to-markdown conversion using Pix2Text (breezedeus/Pix2Text).
---

# Pix2Text (P2T) Mathematical Formula & Document OCR Skill

[Pix2Text](https://github.com/breezedeus/Pix2Text) is a free and open-source mathematical formula and text OCR library developed by Breezedeus. It converts images of mathematical equations, student handwriting, exam worksheets, and textbooks into LaTeX expressions, Markdown, or clean text.

## Capabilities & Architecture

1. **Mathematical Formula Detection (MFD)**:
   - Uses YOLO-based detection models (`mfd-1.5`) to isolate inline and display math formulas in student homework pages.
2. **Mathematical Formula Recognition (MFR)**:
   - Converts detected mathematical bounding boxes into standard LaTeX notation (e.g. `\frac{a}{b}`, `\sqrt{x}`, `x^2 + 2x - 12 = 0`, `\int_a^b f(x) dx`).
3. **Document Layout Analysis**:
   - Integrates `DocLayout-YOLO` for page-level segmentation (titles, paragraphs, formulas, tables, figures).
4. **End-to-End Image & PDF to Markdown**:
   - Translates scanned worksheets and PDF exam papers directly into formatted Markdown with rendered LaTeX equations.

## Integration in HaithamMathIGCSE Unified Pool

Pix2Text operates as **Stage 3** in the 5-Engine Assessment Pipeline:
* **Stage 1 (AutoMark)**: Corrects perspective and crops worksheet cells.
* **Stage 2 (Hand-Written-Equation-Solver)**: Extracts contour ROIs and symbol strokes.
* **Stage 3 (Pix2Text)**: Recognizes complex mathematical structures and outputs clean LaTeX equations (`8 + 12 \div 4 = 11`, `5 \times (4^2 + 2 - 12) = 30`).
* **Stage 4 (AI-Math-Grader-OpenAI)**: Multi-provider vision reasoning (Gemini, GPT-4o, Claude).
* **Stage 5 (HaithamMathIGCSE)**: Cambridge IGCSE BIDMAS rubric evaluation and NotebookLM diagnostic report.

## Python Usage Reference

```python
from pix2text import Pix2Text

# Initialize Pix2Text with formula recognition enabled
p2t = Pix2Text(enable_formula=True, enable_table=True)

# 1. Recognize math formula from cropped image
math_image = 'homework_q4_handwriting.png'
latex_out = p2t.recognize_formula(math_image)
print(f"Detected LaTeX: {latex_out}")

# 2. Recognize entire worksheet page to Markdown
worksheet_img = 'cambridge_igcse_ch1.png'
page_result = p2t.recognize_page(worksheet_img)
page_md = page_result.to_markdown()
print(page_md)
```

## Local Repository Location
* Path: `repos/Pix2Text`
* Git Remote: `pix2text https://github.com/breezedeus/Pix2Text.git`
* Notebooks: `repos/Pix2Text/pix2text_v1_0.ipynb`, `repos/Pix2Text/pix2text_v1_1.ipynb`
