import { Request, Response, NextFunction } from "express";

/**
 * New canonical logger
 */
export const logEvent = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};


/**
 * Express request/response logger middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  logEvent(`➡️  ${method} ${originalUrl} - IP: ${ip || "unknown"}`);

  if (["POST", "PUT", "PATCH"].includes(method)) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = "[REDACTED]";
    if (safeBody.token) safeBody.token = "[REDACTED]";
    logEvent(`   Body: ${JSON.stringify(safeBody)}`);
  }

  const originalSend = res.send.bind(res);

  res.send = (data: any): Response => {
    const duration = Date.now() - startTime;
    logEvent(
      `⬅️  ${method} ${originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`
    );
    return originalSend(data);
  };

  next();
};
