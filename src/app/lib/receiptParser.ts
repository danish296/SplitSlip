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
    let line = lines[i];
    const lower = line.toLowerCase();

    // Check city if still not found
    if (!city) {
      const pinMatch = line.match(/([A-Za-z\s]+)[-\s](\d{6})/);
      if (pinMatch) city = pinMatch[1].trim();
    }

    // Skip non-item header/footer metadata lines
    if (/thanks|visit again|powered by|feedback|payment|cashier|welcome|order no|order #|token|waiter|table|st\.?|server/i.test(lower)) continue;
    if (/ph\.?\s*no|gstin|fssai|cin|tin|invoice\s*num|invoice\s*date|date\s*:|time\s*:/i.test(lower)) continue;

    // Detect start of items table (e.g. "Item Qty Rate Total", "Particulars Amount")
    if (/\b(?:item|qty|rate|total|price|particulars|desc|description|amt|amount)\b/i.test(line) && line.split(/\s+/).length >= 2) {
      itemSectionStarted = true;
      continue;
    }

    // Check Subtotal (fuzzy: Sub Totel, Sub Total, Net Total)
    if (/sub\s*tot[ea]l|net\s*amt|net\s*amount/i.test(lower)) {
      const match = line.match(/([\d,]+(?:\.\d{1,2})?)\s*$/);
      if (match) subtotalMinor = parseAmount(match[1]) || 0;
      continue;
    }

    // Check Total / Grand Total
    if (/(?:^|\s)(?:grand\s*)?tot[ea]l|amount\s*payable|balance\s*due/i.test(lower) && !/qty/i.test(lower)) {
      const match = line.match(/([\d,]+(?:\.\d{1,2})?)\s*$/);
      if (match) totalMinor = parseAmount(match[1]) || 0;
      continue;
    }

    // Check Taxes (CGST, SGST, IGST, GST, VAT, TAX)
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

    if (/total\s*qty|round\s*off/i.test(lower)) continue;

    // --- Universal Item & Price Extraction ---
    // Look for price at the end of the line (e.g. "120.00", "1,450.50", "250", "309.75")
    const endPriceMatch = line.match(/(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i);
    if (!endPriceMatch) {
      // Multi-line continuation (e.g. "Paneer Makhani" on line 1, price on line 2)
      if (line.length >= 3 && !/^\d+$/.test(line) && !/item|qty|rate|total/i.test(line)) {
        pendingItemName = line.replace(/^[^\w]+|[^\w]+$/g, "").trim();
      }
      continue;
    }

    const priceToken = endPriceMatch[1];
    const amountMinor = parseAmount(priceToken);
    if (!amountMinor || amountMinor <= 0) continue;

    // Get the line content before the ending price
    let textBeforePrice = line.slice(0, endPriceMatch.index).trim();

    // If there is a pending item name from the previous line, prepend it
    let combinedName = pendingItemName ? `${pendingItemName} ` : "";
    pendingItemName = "";

    // Extract optional leading serial number or quantity (e.g. "1. ", "01 ", "2x ", "1 - ")
    let quantity = 1;
    const leadingIndexMatch = textBeforePrice.match(/^(\d{1,2})[\.\s\-x:]+\s*(.*)$/);
    if (leadingIndexMatch) {
      const leadNum = parseInt(leadingIndexMatch[1], 10);
      if (leadNum > 0 && leadNum <= 20) {
        quantity = leadNum;
      }
      textBeforePrice = leadingIndexMatch[2].trim();
    }

    // Check if there is another number right before the price (e.g. "Item Name [Qty] [Rate] [Price]" or "[Name] [Qty] [Price]")
    const trailingNumMatch = textBeforePrice.match(/\b(\d{1,2})\s*(?:x\s*[\d.]+\s*)?$/i);
    if (trailingNumMatch) {
      const midQty = parseInt(trailingNumMatch[1], 10);
      if (midQty > 0 && midQty <= 20) {
        quantity = midQty;
      }
      textBeforePrice = textBeforePrice.slice(0, trailingNumMatch.index).trim();
    }

    combinedName += textBeforePrice;

    // Clean OCR artifacts and punctuation from item name
    combinedName = combinedName
      .replace(/[|~_{}*#]+/g, "")
      .replace(/^[^\w]+|[^\w]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Valid item found!
    if (combinedName.length >= 2 && !/^(?:total|subtotal|tax|discount|cash|card|upi|change)$/i.test(combinedName)) {
      items.push({
        id: uid("bi"),
        name: combinedName,
        quantity,
        amountMinor,
      });
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
