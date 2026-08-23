import { auth } from "./auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { db } from "../db/db.js";
import { authSessions } from "../db/schema/auth-sessions.js";
import { authUsers } from "../db/schema/auth-users.js";
import { eq } from "drizzle-orm";

interface User {
  [key: string]: any;
}

interface Session {
  user?: User | null;
}

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
  user?: User;
}

interface ResponseLike {
  status: (code: number) => {
    json: (body: any) => ResponseLike;
  };
  json?: (body: any) => ResponseLike;
}

type NextFunction = (err?: any) => void;

export const requireAuth = async (
  req: RequestWithHeaders,
  res: ResponseLike,
  next: NextFunction
): Promise<void | ResponseLike> => {
  try {
    console.log("🔐 [requireAuth] Starting authentication check");
    console.log("🔐 [requireAuth] Request URL:", (req as any).url);
    console.log("🔐 [requireAuth] Request headers:", JSON.stringify(req.headers, null, 2));
    
    // ✅ 1. Verify session via better-auth api
    let session = (await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })) as Session | null;

    console.log("🔐 [requireAuth] Session result from Better-Auth:", session ? "Session found" : "NO SESSION");

    // ✅ 2. Fallback: Query session manually using Authorization header if better-auth returns null
    if (!session || !session.user) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log("🔐 [requireAuth] Fallback check for session token:", token);

        const dbSession = await db
          .select({
            id: authSessions.id,
            userId: authSessions.userId,
            expiresAt: authSessions.expiresAt,
            user: {
              id: authUsers.id,
              name: authUsers.name,
              email: authUsers.email,
              emailVerified: authUsers.emailVerified,
              image: authUsers.image,
              role: authUsers.role,
              createdAt: authUsers.createdAt,
              updatedAt: authUsers.updatedAt,
            }
          })
          .from(authSessions)
          .innerJoin(authUsers, eq(authSessions.userId, authUsers.id))
          .where(eq(authSessions.token, token))
          .limit(1)
          .then(res => res[0]);

        if (dbSession && dbSession.expiresAt > new Date()) {
          console.log("🔐 [requireAuth] Manual DB session validation successful for user:", dbSession.user.id);
          session = {
            user: dbSession.user
          };
        } else {
          console.log("❌ [requireAuth] Manual DB session lookup failed or session expired");
        }
      }
    }

    console.log("🔐 [requireAuth] Final Session user:", session?.user ? `User ID: ${session.user.id}` : "NO USER");

    if (!session || !session.user) {
      console.log("❌ [requireAuth] Authentication FAILED - No session or user");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = session.user;
    req.user = user;

    console.log("✅ [requireAuth] Authentication SUCCESS - User:", user.id, "Email:", user.email, "Role:", user.role);
    next();
  } catch (err) {
    console.error("❌ [requireAuth] Auth middleware error:", err);
    return res.status(401).json({ error: "Invalid session" });
  }
};
