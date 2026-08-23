import "dotenv/config";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db } from "../db/db.js";

import { authUsers } from "../db/schema/auth-users.js";
import { authAccounts } from "../db/schema/auth-accounts.js";
import { authSessions } from "../db/schema/auth-sessions.js";
import { authVerificationTokens } from "../db/schema/auth-verification-tokens.js";
import { profiles } from "../db/schema/profiles.js";

console.log('🔧 [AUTH CONFIG] Environment variables:');
console.log('  BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  CLIENT_URL:', process.env.CLIENT_URL);
console.log('  BACKEND_URL:', process.env.BACKEND_URL);

const baseURL = process.env.BETTER_AUTH_URL || "https://api.myquro.com";
console.log('🔧 [AUTH CONFIG] Final baseURL:', baseURL);

export const auth = betterAuth({
  baseURL: baseURL,
  trustHost: true,
  trustedOrigins: [
    "https://api.myquro.com",
    "https://myquro.com",
    "http://myquro.com",
    "https://www.myquro.com",
    "http://www.myquro.com",
    "https://myquro-paisa-speaks.onrender.com",
    "https://myquro-backend-myquro-paisa-speaks.onrender.com",
    "https://myquro-frontend-myquro-paisa-speaks.onrender.com",
    "http://localhost:3000",
    "http://localhost:4000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4000",
    // Additional origins for mobile testing
    "http://localhost:3001",
    "https://localhost:3001",
    "http://127.0.0.1:3001",
    "https://127.0.0.1:3001",
    "http://172.20.10.2:3000",
    "http://172.20.10.2:4000",
    "http://172.20.10.2:8000",
    "http://192.168.1.40:3000",
    "http://192.168.1.40:4000",
    "http://192.168.1.40:8000"
  ],

  advanced: {
    crossSubdomainCookies: {
      enabled: !!process.env.COOKIE_DOMAIN,
      domain: process.env.COOKIE_DOMAIN || undefined
    },
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      path: "/"
    }
  },

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUsers,
      account: authAccounts,
      session: authSessions,
      verification: authVerificationTokens,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false, // not settable by user input
      },
    },
  },

  // MOVE DATABASE HOOKS HERE (outside of drizzleAdapter)
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Profile is created automatically after user creation
          console.log("🔍 Database hook - User created:", user.email);

          try {
            const profileId = crypto.randomUUID();

            await db.insert(profiles).values({
              id: profileId,
              userId: user.id,
              username: user.email.split("@")[0] + "_" + Date.now(),
            });
          } catch (err) {
            console.error("❌ Profile creation failed:", err);
          }

          return;
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    disableSignUp: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});