// utils/getClientIp.ts
import type { Request } from "express";

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }

  return req.ip;
}
