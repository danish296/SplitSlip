import { createWorker } from "tesseract.js";
import { parseReceiptText, type ParsedReceipt } from "./receiptParser";

export interface OcrProgress {
  status: string;
  progress: number;
}

let cachedWorker: any = null;

async function getWorker(onProgress?: (p: OcrProgress) => void) {
  if (!cachedWorker) {
    onProgress?.({ status: "Loading OCR engine…", progress: 0.1 });
    cachedWorker = await createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          onProgress?.({
            status: `Reading receipt… ${Math.round(m.progress * 100)}%`,
            progress: 0.2 + m.progress * 0.75,
          });
        }
      },
    });
  }
  return cachedWorker;
}

/**
 * Loads any image source (dataUrl, File, Blob, Image) onto an HTMLCanvasElement
 * with optimal resolution for OCR (capped at 2000px max dimension).
 */
export async function loadImageToCanvas(
  source: string | HTMLCanvasElement | File | Blob,
): Promise<HTMLCanvasElement> {
  if (source instanceof HTMLCanvasElement) {
    return source;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    let objectUrl: string | null = null;

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width || 1280;
      let height = img.naturalHeight || img.height || 720;

      // Cap at 2200px max dimension for fast & accurate OCR
      const maxDim = 2200;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(canvas);

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };

    img.onerror = (e) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load receipt image onto canvas"));
    };

    if (typeof source === "string") {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }
  });
}

/**
 * Receipt Image Preprocessing Pipeline:
 * 1. Grayscale luminance conversion
 * 2. Auto-levels histogram stretching (boosts faint dot-matrix & thermal ink)
 * 3. High-contrast threshold curve (separates text from paper background)
 */
export function enhanceReceiptCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Calculate luminance and min/max levels
  let minLum = 255;
  let maxLum = 0;
  const gray = new Float32Array(width * height);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // Rec. 709 luminance
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    gray[j] = lum;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  // 2. Auto-levels stretching + gamma curve
  const range = maxLum - minLum || 1;

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // Normalize to 0..1
    let val = (gray[j] - minLum) / range;

    // Apply S-curve contrast enhancement: darken darks, brighten lights
    if (val < 0.5) {
      val = Math.pow(val * 2, 1.3) / 2;
    } else {
      val = 1 - Math.pow((1 - val) * 2, 1.3) / 2;
    }

    const byteVal = Math.min(255, Math.max(0, Math.round(val * 255)));
    data[i] = byteVal;
    data[i + 1] = byteVal;
    data[i + 2] = byteVal;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/** Returns high-quality enhanced image URL from canvas for Tesseract */
export function preprocessReceiptImage(sourceCanvas: HTMLCanvasElement): string {
  const enhanced = enhanceReceiptCanvas(sourceCanvas);
  return enhanced.toDataURL("image/jpeg", 0.92);
}

export async function processImageForReceipt(
  imageSource: string | HTMLCanvasElement | File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<ParsedReceipt> {
  onProgress?.({ status: "Preparing image…", progress: 0.05 });

  // 1. Load onto canvas and apply high-contrast enhancement
  let processedCanvas: HTMLCanvasElement;
  try {
    const rawCanvas = await loadImageToCanvas(imageSource);
    processedCanvas = enhanceReceiptCanvas(rawCanvas);
  } catch (err) {
    console.warn("Image canvas enhancement fallback:", err);
    // Fall back to raw source if canvas loading failed
    processedCanvas = imageSource as any;
  }

  // 2. Load Tesseract Worker
  let worker;
  try {
    worker = await getWorker(onProgress);
  } catch (err) {
    console.error("Failed to initialize Tesseract worker", err);
    throw new Error("OCR engine failed to initialize");
  }

  onProgress?.({ status: "Extracting receipt text…", progress: 0.2 });

  // 3. Recognize text on enhanced image
  let recognitionResult;
  try {
    recognitionResult = await worker.recognize(processedCanvas);
  } catch (err) {
    console.error("Tesseract recognize error", err);
    throw new Error("Could not process image text");
  }

  const rawText = recognitionResult?.data?.text || "";
  console.log("[OCR Extracted Raw Text]:\n", rawText);

  onProgress?.({ status: "Structuring items & taxes…", progress: 0.95 });

  // 4. Parse text using universal receipt parser
  const parsed = parseReceiptText(rawText);
  return parsed;
}
