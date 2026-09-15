/* ============================================================
   Mock data — realistic Indian restaurants, names, amounts.
   All amounts are integer minor units (paise).
   ============================================================ */

import type {
  Bill,
  BillItem,
  Contact,
  PaymentEvent,
  PaymentRequest,
  User,
} from "./types";

export const CURRENT_USER_ID = "u_me";

export const DEFAULT_USER: User = {
  id: CURRENT_USER_ID,
  name: "Danish Akhtar",
  phone: "+91 98450 41277",
  upiId: "danish@okhdfc",
};

export const MOCK_CONTACTS: Contact[] = [
  { id: "c_aarav", name: "Aarav Mehta", phone: "+91 98201 33450", isRegistered: true, upiId: "aarav@okicici" },
  { id: "c_riya", name: "Riya Sharma", phone: "+91 99020 71164", isRegistered: false },
  { id: "c_kabir", name: "Kabir Singh", phone: "+91 97403 55228", isRegistered: true, upiId: "kabirsingh@ybl" },
  { id: "c_mira", name: "Mira Iyer", phone: "+91 96864 41092", isRegistered: true, upiId: "miraiyer@paytm" },
  { id: "c_dev", name: "Dev Malhotra", phone: "+91 99807 62341", isRegistered: false },
  { id: "c_sana", name: "Sana Qureshi", phone: "+91 90194 80276", isRegistered: true, upiId: "sanaq@upi" },
  { id: "c_rohan", name: "Rohan Verma", phone: "+91 98111 24680", isRegistered: true, upiId: "rohanv@okaxis" },
  { id: "c_tara", name: "Tara Nair", phone: "+91 99405 11877", isRegistered: false },
];

/** Which contact ids are in the "table group" (frequent splitters). */
export const TABLE_GROUP_IDS = ["c_aarav", "c_riya", "c_kabir", "c_mira"];

export const RESTAURANTS = [
  "The Table",
  "Social",
  "Cafe 24",
  "Biryani House",
  "Urban Tadka",
] as const;

function itemsOf(rows: Array<[string, number, number]>): BillItem[] {
  return rows.map(([name, quantity, amountMinor], i) => ({
    id: `bi_seed_${i}_${name.toLowerCase().replace(/\s+/g, "_")}`,
    name,
    quantity,
    amountMinor,
  }));
}

function eventOf(
  id: string,
  billId: string,
  contactId: string,
  contactName: string,
  type: PaymentEvent["type"],
  amountMinor: number,
  minutesAgo: number,
): PaymentEvent {
  return {
    id,
    billId,
    contactId,
    contactName,
    type,
    amountMinor,
    at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
  };
}

function requestOf(
  id: string,
  billId: string,
  contact: Contact,
  amountMinor: number,
  createdAt: string,
  status: PaymentRequest["status"],
): PaymentRequest {
  return {
    id,
    billId,
    payer: { name: DEFAULT_USER.name, upiId: DEFAULT_USER.upiId },
    contact: {
      id: contact.id,
      name: contact.name,
      isRegistered: contact.isRegistered,
      channel: contact.isRegistered ? "app" : "sms",
    },
    amountMinor,
    billContext: {
      restaurant: "The Table",
      totalMinor: 200600,
      date: createdAt,
      itemCount: 5,
    },
    createdAt,
    expiresAt: new Date(new Date(createdAt).getTime() + 7 * 86400000).toISOString(),
    status,
  };
}

/* -------- Seeded bills: settlement tracking demo -------- */

const now = Date.now();

const billTheTable: Bill = {
  id: "b_thetable_1",
  restaurant: "The Table",
  city: "Bangalore",
  createdAt: new Date(now - 20 * 3600000).toISOString(),
  items: itemsOf([
    ["Butter Chicken", 2, 48000],
    ["Paneer Tikka", 1, 36000],
    ["Butter Naan", 4, 16000],
    ["Hyderabadi Biryani", 1, 42000],
    ["Coke", 4, 28000],
  ]),
  subtotalMinor: 170000,
  taxMinor: 30600,
  serviceMinor: 0,
  totalMinor: 200600,
  paidByUserId: CURRENT_USER_ID,
  split: {
    method: "items",
    participants: [
      { contactId: CURRENT_USER_ID, displayName: "You", amountMinor: 50150, status: "pending", channel: "app" },
      { contactId: "c_aarav", displayName: "Aarav Mehta", amountMinor: 50150, status: "paid", channel: "app" },
      { contactId: "c_riya", displayName: "Riya Sharma", amountMinor: 50150, status: "pending", channel: "sms" },
      { contactId: "c_kabir", displayName: "Kabir Singh", amountMinor: 50150, status: "paid", channel: "app" },
    ],
  },
  events: [
    eventOf("e_t1", "b_thetable_1", CURRENT_USER_ID, "You", "request_sent", 50150, 1180),
    eventOf("e_t2", "b_thetable_1", "c_aarav", "Aarav Mehta", "paid", 50150, 1040),
    eventOf("e_t3", "b_thetable_1", "c_kabir", "Kabir Singh", "paid", 50150, 890),
  ],
  requests: [],
};

const billCafe24: Bill = {
  id: "b_cafe24_1",
  restaurant: "Cafe 24",
  city: "Bangalore",
  createdAt: new Date(now - 3 * 86400000).toISOString(),
  items: itemsOf([
    ["Cold Coffee", 3, 42000],
    ["Avocado Toast", 2, 38000],
    ["Pasta Arrabbiata", 1, 34000],
  ]),
  subtotalMinor: 114000,
  taxMinor: 20520,
  serviceMinor: 0,
  totalMinor: 134520,
  paidByUserId: CURRENT_USER_ID,
  split: {
    method: "equal",
    participants: [
      { contactId: CURRENT_USER_ID, displayName: "You", amountMinor: 44840, status: "pending", channel: "app" },
      { contactId: "c_mira", displayName: "Mira Iyer", amountMinor: 44840, status: "paid", channel: "app" },
      { contactId: "c_dev", displayName: "Dev Malhotra", amountMinor: 44840, status: "pending", channel: "sms" },
    ],
  },
  events: [
    eventOf("e_c1", "b_cafe24_1", CURRENT_USER_ID, "You", "request_sent", 44840, 4320),
    eventOf("e_c2", "b_cafe24_1", "c_mira", "Mira Iyer", "paid", 44840, 3800),
  ],
  requests: [],
};

const billBiryaniHouse: Bill = {
  id: "b_biryani_1",
  restaurant: "Biryani House",
  city: "Bangalore",
  createdAt: new Date(now - 9 * 86400000).toISOString(),
  items: itemsOf([
    ["Mutton Biryani", 2, 96000],
    ["Chicken 65", 1, 32000],
    ["Double Ka Meetha", 2, 26000],
  ]),
  subtotalMinor: 154000,
  taxMinor: 27720,
  serviceMinor: 0,
  totalMinor: 181720,
  paidByUserId: CURRENT_USER_ID,
  split: {
    method: "custom",
    participants: [
      { contactId: CURRENT_USER_ID, displayName: "You", amountMinor: 60000, status: "paid", channel: "app" },
      { contactId: "c_sana", displayName: "Sana Qureshi", amountMinor: 60860, status: "paid", channel: "app" },
      { contactId: "c_rohan", displayName: "Rohan Verma", amountMinor: 60860, status: "paid", channel: "app" },
    ],
  },
  events: [
    eventOf("e_b1", "b_biryani_1", CURRENT_USER_ID, "You", "request_sent", 60860, 13000),
    eventOf("e_b2", "b_biryani_1", "c_sana", "Sana Qureshi", "paid", 60860, 12800),
    eventOf("e_b3", "b_biryani_1", "c_rohan", "Rohan Verma", "paid", 60860, 12100),
  ],
  requests: [],
};

const billSocial: Bill = {
  id: "b_social_1",
  restaurant: "Social",
  city: "Bangalore",
  createdAt: new Date(now - 14 * 86400000).toISOString(),
  items: itemsOf([
    ["Keema Pav", 2, 44000],
    ["Butter Garlic Prawns", 1, 62000],
    ["Mocktails", 3, 57000],
  ]),
  subtotalMinor: 163000,
  taxMinor: 29340,
  serviceMinor: 10000,
  totalMinor: 202340,
  paidByUserId: "c_aarav",
  split: {
    method: "items",
    participants: [
      { contactId: "c_aarav", displayName: "Aarav Mehta", amountMinor: 84240, status: "pending", channel: "app" },
      { contactId: CURRENT_USER_ID, displayName: "You", amountMinor: 59050, status: "paid", channel: "app" },
      { contactId: "c_tara", displayName: "Tara Nair", amountMinor: 59050, status: "pending", channel: "sms" },
    ],
  },
  events: [
    eventOf("e_s1", "b_social_1", "c_aarav", "Aarav Mehta", "request_sent", 84240, 20000),
    eventOf("e_s2", "b_social_1", CURRENT_USER_ID, "You", "paid", 59050, 19500),
  ],
  requests: [],
};

const billUrbanTadka: Bill = {
  id: "b_urbantadka_1",
  restaurant: "Urban Tadka",
  city: "Bangalore",
  createdAt: new Date(now - 21 * 86400000).toISOString(),
  items: itemsOf([
    ["Dal Tadka", 1, 28000],
    ["Paneer Lababdar", 1, 44000],
    ["Tandoori Roti", 6, 24000],
    ["Jeera Rice", 1, 22000],
  ]),
  subtotalMinor: 118000,
  taxMinor: 21240,
  serviceMinor: 0,
  totalMinor: 139240,
  paidByUserId: CURRENT_USER_ID,
  split: {
    method: "equal",
    participants: [
      { contactId: CURRENT_USER_ID, displayName: "You", amountMinor: 46413, status: "pending", channel: "app" },
      { contactId: "c_kabir", displayName: "Kabir Singh", amountMinor: 46413, status: "paid", channel: "app" },
      { contactId: "c_riya", displayName: "Riya Sharma", amountMinor: 46414, status: "paid", channel: "sms" },
    ],
  },
  events: [
    eventOf("e_u1", "b_urbantadka_1", CURRENT_USER_ID, "You", "request_sent", 46413, 30000),
    eventOf("e_u2", "b_urbantadka_1", "c_kabir", "Kabir Singh", "paid", 46413, 29500),
    eventOf("e_u3", "b_urbantadka_1", "c_riya", "Riya Sharma", "paid", 46414, 29000),
  ],
  requests: [],
};

export const SEED_BILLS: Bill[] = [
  billTheTable,
  billCafe24,
  billBiryaniHouse,
  billSocial,
  billUrbanTadka,
];

export const SEED_REQUESTS: PaymentRequest[] = [
  requestOf(
    "pr_seed_aarav",
    "b_thetable_1",
    MOCK_CONTACTS[0],
    50150,
    billTheTable.createdAt,
    "paid",
  ),
  requestOf(
    "pr_seed_kabir",
    "b_thetable_1",
    MOCK_CONTACTS[2],
    50150,
    billTheTable.createdAt,
    "paid",
  ),
  requestOf(
    "pr_seed_riya",
    "b_thetable_1",
    MOCK_CONTACTS[1],
    50150,
    billTheTable.createdAt,
    "sent",
  ),
];

/** Extra receipts for the scanner mock (returned by scanReceipt()). */
export const SCAN_RESULTS: Array<{
  restaurant: string;
  city: string;
  items: BillItem[];
  taxMinor: number;
  serviceMinor: number;
}> = [
  {
    restaurant: "The Table",
    city: "Bangalore",
    items: itemsOf([
      ["Butter Chicken", 2, 48000],
      ["Paneer Tikka", 1, 36000],
      ["Butter Naan", 4, 16000],
      ["Hyderabadi Biryani", 1, 42000],
      ["Coke", 4, 28000],
    ]),
    taxMinor: 30600,
    serviceMinor: 0,
  },
  {
    restaurant: "Social",
    city: "Bangalore",
    items: itemsOf([
      ["Keema Pav", 2, 44000],
      ["Chilli Cheese Toast", 2, 32000],
      ["Butter Garlic Prawns", 1, 62000],
      ["Mocktails", 3, 57000],
    ]),
    taxMinor: 35020,
    serviceMinor: 10000,
  },
  {
    restaurant: "Biryani House",
    city: "Bangalore",
    items: itemsOf([
      ["Hyderabadi Mutton Biryani", 2, 96000],
      ["Chicken 65", 1, 32000],
      ["Mirchi Ka Salan", 1, 14000],
      ["Double Ka Meetha", 2, 26000],
    ]),
    taxMinor: 32120,
    serviceMinor: 0,
  },
  {
    restaurant: "Urban Tadka",
    city: "Bangalore",
    items: itemsOf([
      ["Paneer Lababdar", 1, 44000],
      ["Dal Tadka", 1, 28000],
      ["Tandoori Roti", 6, 24000],
      ["Jeera Rice", 1, 22000],
      ["Mascha Papad", 2, 12000],
    ]),
    taxMinor: 23400,
    serviceMinor: 0,
  },
  {
    restaurant: "Cafe 24",
    city: "Bangalore",
    items: itemsOf([
      ["Cold Coffee", 3, 42000],
      ["Avocado Toast", 2, 38000],
      ["Pasta Arrabbiata", 1, 34000],
      ["Tiramisu", 1, 28000],
    ]),
    taxMinor: 25440,
    serviceMinor: 0,
  },
];
