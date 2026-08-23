import { Response, NextFunction } from "express";
import { db } from "../db/db.js";
import { tableSession } from "../db/schema/table-session.js";
import { eq } from "drizzle-orm";

/**
 * Middleware to validate that a table session exists and is active (not billed)
 * Usage: Apply this middleware to routes that require an active session
 */
export const requireActiveSession = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tableSessionId } = req.body;

    if (!tableSessionId) {
      return res.status(400).json({
        message: "Table session ID is required",
        code: "MISSING_SESSION_ID",
      });
    }

    // Fetch session
    const sessions = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, tableSessionId))
      .limit(1);

    if (sessions.length === 0) {
      return res.status(404).json({
        message: "Table session not found",
        code: "SESSION_NOT_FOUND",
      });
    }

    const session = sessions[0];

    // Check if session is closed
    if (session.status === "closed") {
      return res.status(400).json({
        message: "This session has been closed",
        code: "SESSION_CLOSED",
      });
    }

    // Check if session is cancelled
    if (session.status === "cancelled") {
      return res.status(400).json({
        message: "This session has been cancelled",
        code: "SESSION_CANCELLED",
      });
    }

    // Check if bill has been frozen (billedAt is set)
    if (session.billedAt !== null) {
      return res.status(400).json({
        message:
          "Cannot modify order - bill has been generated. Waiting for payment confirmation.",
        code: "SESSION_BILLED",
      });
    }

    // Session is active and not billed - allow the request
    req.session = session;
    next();
  } catch (error) {
    console.error("Session validation error:", error);
    return res.status(500).json({
      message: "Failed to validate session",
      code: "SESSION_VALIDATION_ERROR",
    });
  }
};

/**
 * Middleware to validate that a session exists and has been billed (ready for payment)
 * Usage: Apply this middleware to payment-related routes
 */
export const requireBilledSession = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tableSessionId } = req.body;

    if (!tableSessionId) {
      return res.status(400).json({
        message: "Table session ID is required",
        code: "MISSING_SESSION_ID",
      });
    }

    // Fetch session
    const sessions = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, tableSessionId))
      .limit(1);

    if (sessions.length === 0) {
      return res.status(404).json({
        message: "Table session not found",
        code: "SESSION_NOT_FOUND",
      });
    }

    const session = sessions[0];

    // Check if bill has been frozen
    if (session.billedAt === null) {
      return res.status(400).json({
        message: "Cannot process payment - bill has not been generated yet",
        code: "SESSION_NOT_BILLED",
      });
    }

    // Check if session is already closed
    if (session.status === "closed") {
      return res.status(400).json({
        message: "This session has already been closed",
        code: "SESSION_ALREADY_CLOSED",
      });
    }

    req.session = session;
    next();
  } catch (error) {
    console.error("Session validation error:", error);
    return res.status(500).json({
      message: "Failed to validate session",
      code: "SESSION_VALIDATION_ERROR",
    });
  }
};
