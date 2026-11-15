import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface RenderedPageImage {
  pageNumber: number;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  rotation: number;
}

export interface PdfRenderResult {
  pageImages: RenderedPageImage[];
  totalPages: number;
  truncated: boolean;
}

/**
 * Draw an image source onto a canvas with optional contrast enhancement and JPEG encoding.
 */
function encodeCanvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number
): string {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Render each page of a PDF File into a high-resolution upright JPEG image using pdfjs-dist.
 * Gemini 4 / 3 image parts support HIGH (1120 tokens) and ULTRA_HIGH (2240 tokens), whereas
 * raw PDFs default to 560 tokens/page and cannot use ULTRA_HIGH.
 */
export async function renderPdfPagesToImages(
  file: File,
  options: {
    maxPages?: number;
    quality?: number;
    contrastBoost?: boolean;
  } = {}
): Promise<PdfRenderResult> {
  const { maxPages = 16, quality = 0.91, contrastBoost = false } = options;
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const pagesToRender = Math.min(totalPages, maxPages);
  // Keep total payload compact for large multi-page PDFs while keeping single/few-page sheets razor sharp
  const targetLongestSide =
    pagesToRender <= 4 ? 2200 : pagesToRender <= 8 ? 1900 : 1600;

  const pageImages: RenderedPageImage[] = [];

  for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const longestSide = Math.max(baseViewport.width, baseViewport.height, 1);
    const scale = Math.min(3.2, Math.max(1.8, targetLongestSide / longestSide));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(`Could not initialize 2D canvas for PDF page ${pageNum}`);
    }

    // White paper background so transparent PDF layers render cleanly in JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (contrastBoost) {
      ctx.filter = 'contrast(1.18) brightness(1.03)';
    }

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    ctx.filter = 'none';

    pageImages.push({
      pageNumber: pageNum,
      dataUrl: encodeCanvasToJpeg(canvas, quality),
      mimeType: 'image/jpeg',
      width: canvas.width,
      height: canvas.height,
      rotation: 0,
    });
  }

  return {
    pageImages,
    totalPages,
    truncated: totalPages > pagesToRender,
  };
}

/**
 * Load a raster image File at high resolution (2200px max side) with optional contrast boost.
 */
export function loadImageForGrading(
  file: File,
  options: {
    maxDimension?: number;
    quality?: number;
    contrastBoost?: boolean;
  } = {}
): Promise<RenderedPageImage> {
  const { maxDimension = 2200, quality = 0.92, contrastBoost = false } = options;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const longestSide = Math.max(img.width, img.height, 1);
      const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize 2D canvas context'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      if (contrastBoost) {
        ctx.filter = 'contrast(1.18) brightness(1.03)';
      }
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';

      resolve({
        pageNumber: 1,
        dataUrl: encodeCanvasToJpeg(canvas, quality),
        mimeType: 'image/jpeg',
        width: w,
        height: h,
        rotation: 0,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = (e.target?.result as string) || '';
        resolve({
          pageNumber: 1,
          dataUrl: result,
          mimeType: file.type || 'image/jpeg',
          width: 0,
          height: 0,
          rotation: 0,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

/**
 * Rotate a data URL image clockwise by 90, 180, or 270 degrees.
 */
export function rotateImageDataUrl(
  dataUrl: string,
  deltaDegrees: 90 | 180 | 270 = 90,
  quality = 0.92
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const swap = deltaDegrees === 90 || deltaDegrees === 270;
      const outW = swap ? img.height : img.width;
      const outH = swap ? img.width : img.height;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize canvas for rotation'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((deltaDegrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve({
        dataUrl: encodeCanvasToJpeg(canvas, quality),
        width: outW,
        height: outH,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for rotation'));
    img.src = dataUrl;
  });
}
