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

/** Returns high-quality image URL from canvas for Tesseract */
export function preprocessReceiptImage(sourceCanvas: HTMLCanvasElement): string {
  return sourceCanvas.toDataURL("image/jpeg", 0.95);
}

export async function processImageForReceipt(
  imageSource: string | HTMLCanvasElement | File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<ParsedReceipt> {
  onProgress?.({ status: "Preparing image…", progress: 0.05 });

  let worker;
  try {
    worker = await getWorker(onProgress);
  } catch (err) {
    console.error("Failed to initialize Tesseract worker", err);
    throw new Error("OCR engine failed to initialize");
  }

  onProgress?.({ status: "Extracting receipt data…", progress: 0.2 });

  let recognitionResult;
  try {
    recognitionResult = await worker.recognize(imageSource);
  } catch (err) {
    console.error("Tesseract recognize error", err);
    throw new Error("Could not process image text");
  }

  const rawText = recognitionResult?.data?.text || "";
  onProgress?.({ status: "Structuring items & taxes…", progress: 0.95 });

  const parsed = parseReceiptText(rawText);
  return parsed;
}
