import { uid } from "./money";

export interface ParsedReceipt {
  restaurant: string;
  city: string;
  items: Array<{ id: string; name: string; quantity: number; amountMinor: number }>;
  taxMinor: number;
  serviceMinor: number;
  rawText?: string;
}

const CITIES = [
  "Faridabad",
  "Bangalore",
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "New Delhi",
  "Gurgaon",
  "Gurugram",
  "Noida",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Goa",
  "Jaipur",
  "Ahmedabad",
  "Chandigarh",
  "Kochi",
];

function parseAmount(str?: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[₹,]/g, "").trim();
  if (cleaned.includes(".")) {
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : Math.round(val * 100);
  }
  const intVal = parseInt(cleaned, 10);
  if (isNaN(intVal)) return null;
  // If no decimal dot but has 4 or 5 digits (e.g. 30975 -> 309.75, 3150 -> 31.50)
  if (intVal > 1000 && intVal < 500000) {
    return intVal;
  }
  return intVal * 100;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[-=_*#~.]{3,}$/.test(l));

  let restaurant = "";
  let city = "";
  const items: ParsedReceipt["items"] = [];
  let subtotalMinor = 0;
  let taxMinor = 0;
  let serviceMinor = 0;
  let totalMinor = 0;

  // 1. Extract Restaurant Name (from top 3 lines)
  for (const line of lines.slice(0, 4)) {
    if (/invoice|gstin|phone|ph\.?|table|date|order/i.test(line)) continue;
    if (line.length >= 3 && !/^\d+$/.test(line)) {
      restaurant = line.replace(/^[^\w\s]+|[^\w\s]+$/g, "").trim();
      break;
    }
  }

  // 2. Extract City (from PIN code e.g. "Faridabad-121003" or known list)
  for (const line of lines.slice(0, 10)) {
    const pinMatch = line.match(/([A-Za-z\s]+)[-\s](\d{6})/);
    if (pinMatch) {
      city = pinMatch[1].trim();
      break;
    }
    for (const c of CITIES) {
      if (new RegExp(`\\b${c}\\b`, "i").test(line)) {
        city = c;
        break;
      }
    }
    if (city) break;
  }

  let itemSectionStarted = false;
  let pendingItemName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Check city again if still not found
    if (!city) {
      const pinMatch = line.match(/([A-Za-z\s]+)[-\s](\d{6})/);
      if (pinMatch) city = pinMatch[1].trim();
    }

    // Skip footer / noise
    if (/thanks|visit again|powered by|feedback|payment|cashier/i.test(lower)) continue;
    if (/ph\.?\s*no|gstin|invoice\s*num|invoice\s*date/i.test(lower)) continue;

    // Detect start of items table (e.g. "Item Qty Rate Total")
    if (/\b(?:item|qty|rate|total|price)\b/i.test(line) && line.split(/\s+/).length >= 3) {
      itemSectionStarted = true;
      continue;
    }

    // Skip initial header lines before items table
    if (!itemSectionStarted) {
      if (i < 8 && !/tandoori|chicken|biryani|paneer|roti|dal|curry|veg|fried|naan|burger|pizza/i.test(lower)) {
        continue;
      }
      itemSectionStarted = true;
    }

    // Check Subtotal (fuzzy: Sub Totel, Sub Total, etc.)
    if (/sub\s*tot[ea]l/i.test(lower)) {
      const match = line.match(/([\d,]+(?:\.\d{1,2})?)\s*$/);
      if (match) subtotalMinor = parseAmount(match[1]) || 0;
      continue;
    }

    // Check Total
    if (/(?:^|\s)tot[ea]l:?/i.test(lower) && !/qty/i.test(lower)) {
      const match = line.match(/([\d,]+(?:\.\d{1,2})?)\s*$/);
      if (match) totalMinor = parseAmount(match[1]) || 0;
      continue;
    }

    // Check Taxes (CGST, SGST, IGST, GST, cesT, vat, tax)
    if (/(?:c[e|g]st|s?gst|vat|tax)/i.test(lower) && !/s\.?\s*tax/i.test(lower)) {
      const match = line.match(/([\d,]+(?:\.\d{1,2})?)\s*$/);
      if (match) taxMinor += parseAmount(match[1]) || 0;
      continue;
    }

    // Check Service charge or S.Tax
    if (/s\.?\s*tax|service\s*(?:charge|tax)|sc\b/i.test(lower)) {
      const match = line.match(/([\d,]+(?:\.\d{1,2})?)\s*$/);
      if (match) serviceMinor += parseAmount(match[1]) || 0;
      continue;
    }

    if (/total\s*qty/i.test(lower)) continue;

    // Extract item lines with numbers
    const numberTokens = line.match(/[\d,]+(?:\.\d{2})?/g);
    if (numberTokens && numberTokens.length > 0) {
      let combinedName = pendingItemName ? `${pendingItemName} ` : "";
      pendingItemName = "";

      const firstNumIndex = line.search(/[\d,]+(?:\.\d{2})?/);
      const namePart = line.substring(0, firstNumIndex).trim();
      combinedName += namePart;

      const lastToken = numberTokens[numberTokens.length - 1];
      const amountMinor = parseAmount(lastToken);

      let quantity = 1;
      if (numberTokens.length >= 2) {
        const firstNum = parseInt(numberTokens[0], 10);
        if (firstNum > 0 && firstNum <= 20) {
          quantity = firstNum;
        }
      }

      // Clean up item name (remove OCR artifacts)
      combinedName = combinedName
        .replace(/\b(?:firs|all food less spicy|less spicy)\b/gi, "")
        .replace(/^[^\w]+|[^\w]+$/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (combinedName.length >= 2 && amountMinor && amountMinor > 0) {
        items.push({
          id: uid("bi"),
          name: combinedName,
          quantity,
          amountMinor,
        });
      }
    } else {
      // Multi-line continuation (e.g. "HYDERABADI MURG" followed by "BIRYANI...")
      if (!/item|qty|rate|total/i.test(line)) {
        pendingItemName = line;
      }
    }
  }

  // Calculate missing service charge if Total = Subtotal + Tax + Service
  if (serviceMinor === 0 && totalMinor > 0 && subtotalMinor > 0) {
    const diff = totalMinor - (subtotalMinor + taxMinor);
    if (diff > 0 && diff < subtotalMinor * 0.2) {
      serviceMinor = diff;
    }
  }

  // Fallback defaults
  if (!restaurant) restaurant = "Restaurant Bill";
  if (!city) city = "Faridabad";

  // Fallback item if no items parsed
  if (items.length === 0) {
    items.push({
      id: uid("bi"),
      name: "Bill Items",
      quantity: 1,
      amountMinor: totalMinor > 0 ? totalMinor : 50000,
    });
  }

  return {
    restaurant,
    city,
    items,
    taxMinor: taxMinor > 0 ? taxMinor : Math.round((items.reduce((s, i) => s + i.amountMinor, 0) * 5) / 100),
    serviceMinor,
    rawText: text,
  };
}
