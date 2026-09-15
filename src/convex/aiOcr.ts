import { action } from "./_generated/server";
import { v } from "convex/values";

export interface ParsedItem {
  name: string;
  amountMinor: number;
  quantity?: number;
  unitPriceMinor?: number;
}

export interface ParsedReceipt {
  restaurant: string;
  city?: string;
  date?: string;
  items: ParsedItem[];
  subtotalMinor: number;
  taxMinor: number;
  serviceMinor: number;
  totalMinor: number;
  rawText?: string;
}

/**
 * Convex action: Multimodal Vision Receipt OCR using Google Gemini.
 * Uses gemini-3.1-flash-lite for ultra-fast, low-latency receipt understanding.
 * Fallback to gemini-3.8-flash if needed.
 */
export const scanReceiptWithGemini = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "GEMINI_API_KEY_NOT_CONFIGURED",
        message: "No GEMINI_API_KEY set in Convex environment.",
      };
    }

    // Clean base64 header if present (e.g. "data:image/jpeg;base64,...")
    let rawBase64 = args.imageBase64;
    let detectedMime = args.mimeType || "image/jpeg";
    if (rawBase64.includes(";base64,")) {
      const parts = rawBase64.split(";base64,");
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch) {
        detectedMime = mimeMatch[1];
      }
      rawBase64 = parts[1];
    }

    const prompt = `You are an expert OCR receipt scanning engine for a bill splitting app called SplitSlip.
Analyze the provided receipt/bill image carefully.
Extract all purchased items with their exact item names, quantities, and prices.
Also extract the restaurant or merchant name, city/location if printed, date if printed, taxes (GST/VAT/sales tax), service charges, and total amount.

ALL monetary values must be converted to integers in minor currency units (paise/cents):
For example, if an item is ₹350.00, multiply by 100 to get 35000 in minor units. If ₹12.50, minor unit is 1250.

CRITICAL RULES:
1. Do NOT include subtotal, CGST, SGST, GST, Tax, Service Charge, Tip, or Grand Total inside the "items" list.
2. For each food/drink/retail line item:
   - "name": Clean the item name, expand obvious abbreviations (e.g., "Btr Chkn" -> "Butter Chicken", "Cold Cof" -> "Cold Coffee").
   - "quantity": Number of units (default 1).
   - "amountMinor": Total price for this line item in minor units.
   - "unitPriceMinor": Unit price if printed or calculated (amountMinor / quantity).
3. "restaurant": Name of the cafe/restaurant/store at the top. If unknown, use "Restaurant".
4. "city": City or area if mentioned, otherwise "".
5. "taxMinor": Total tax in minor units (or 0).
6. "serviceMinor": Total service charge / tip in minor units (or 0).
7. "subtotalMinor": Sum of all item prices in minor units.
8. "totalMinor": The grand total payable amount in minor units.

Output MUST be valid JSON adhering exactly to this schema:
{
  "restaurant": "string",
  "city": "string",
  "date": "string",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "amountMinor": 0,
      "unitPriceMinor": 0
    }
  ],
  "subtotalMinor": 0,
  "taxMinor": 0,
  "serviceMinor": 0,
  "totalMinor": 0
}`;

    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];
    let lastError = "";

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: detectedMime,
                      data: rawBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Gemini OCR] Model ${model} returned error status ${response.status}:`, errText);
          lastError = `Model ${model} error (${response.status}): ${errText}`;
          continue; // Try next model
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const textContent = candidate?.content?.parts?.[0]?.text;

        if (!textContent) {
          throw new Error("Empty response from Gemini API");
        }

        const parsed = JSON.parse(textContent);

        // Sanitize and ensure valid structure
        const items: ParsedItem[] = Array.isArray(parsed.items)
          ? parsed.items
              .filter((it: any) => it && typeof it.name === "string" && it.name.trim().length > 0)
              .map((it: any) => {
                const amountMinor = Math.round(Number(it.amountMinor) || 0);
                const quantity = Math.max(1, Math.round(Number(it.quantity) || 1));
                const unitPriceMinor = Math.round(Number(it.unitPriceMinor) || amountMinor / quantity);
                return {
                  name: String(it.name).trim(),
                  amountMinor,
                  quantity,
                  unitPriceMinor,
                };
              })
          : [];

        if (items.length === 0) {
          throw new Error("Gemini could not identify any line items on this receipt.");
        }

        const subtotalMinor =
          Math.round(Number(parsed.subtotalMinor) || 0) ||
          items.reduce((sum, it) => sum + it.amountMinor, 0);

        const taxMinor = Math.round(Number(parsed.taxMinor) || 0);
        const serviceMinor = Math.round(Number(parsed.serviceMinor) || 0);
        const totalMinor =
          Math.round(Number(parsed.totalMinor) || 0) ||
          subtotalMinor + taxMinor + serviceMinor;

        const receipt: ParsedReceipt = {
          restaurant: String(parsed.restaurant || "Restaurant").trim(),
          city: String(parsed.city || "").trim(),
          date: String(parsed.date || "").trim(),
          items,
          subtotalMinor,
          taxMinor,
          serviceMinor,
          totalMinor,
          rawText: `[AI Vision by ${model}]\n${items.map((i) => `${i.name}: ${i.amountMinor / 100}`).join("\n")}`,
        };

        return {
          success: true,
          receipt,
          modelUsed: model,
        };
      } catch (err: any) {
        console.warn(`[Gemini OCR] Model ${model} execution error:`, err);
        lastError = err?.message || String(err);
      }
    }

    return {
      success: false,
      error: "AI_EXTRACTION_FAILED",
      message: lastError || "Failed to process receipt with Gemini.",
    };
  },
});
