import crypto from "node:crypto";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

export function getRazorpayCredentials(): RazorpayCredentials | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return getRazorpayCredentials() !== null;
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: "INR";
}> {
  const creds = getRazorpayCredentials();
  if (!creds) {
    throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the server.");
  }

  const amountPaise = Math.round(Number(params.amountPaise) || 0);
  if (amountPaise < 100) {
    throw new Error("Razorpay order amount must be at least ₹1 (100 paise).");
  }

  const authHeader = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");
  const resp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: params.receipt.slice(0, 40),
      notes: params.notes || {},
    }),
  });

  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.id) {
    const desc = data?.error?.description || data?.error?.reason || `Razorpay API HTTP ${resp.status}`;
    throw new Error(desc);
  }

  return {
    keyId: creds.keyId,
    orderId: String(data.id),
    amountPaise: Number(data.amount || amountPaise),
    currency: "INR",
  };
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const creds = getRazorpayCredentials();
  if (!creds) return false;
  if (!params.orderId || !params.paymentId || !params.signature) return false;

  const expected = crypto
    .createHmac("sha256", creds.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(String(params.signature).trim(), "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
