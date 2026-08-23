import { db } from "./src/db/db.js";
import { authUsers } from "./src/db/schema/auth-users.js";
import { authAccounts } from "./src/db/schema/auth-accounts.js";
import { authSessions } from "./src/db/schema/auth-sessions.js";
import { authVerificationTokens } from "./src/db/schema/auth-verification-tokens.js";
import { profiles } from "./src/db/schema/profiles.js";
import { eq } from "drizzle-orm";

async function deleteUser() {
  try {
    const email = "ram@myquro.com";

    console.log(`🗑️ Deleting user: ${email}\n`);

    // Find the user
    const user = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);

    if (user.length === 0) {
      console.log("❌ User not found");
      return;
    }

    const userId = user[0].id;
    console.log(`Found user ID: ${userId}`);

    // Delete in correct order (due to foreign key constraints)
    console.log("Deleting sessions...");
    await db.delete(authSessions).where(eq(authSessions.userId, userId));

    console.log("Deleting verification tokens...");
    await db.delete(authVerificationTokens).where(eq(authVerificationTokens.identifier, email));

    console.log("Deleting accounts...");
    await db.delete(authAccounts).where(eq(authAccounts.userId, userId));

    console.log("Deleting profile...");
    await db.delete(profiles).where(eq(profiles.userId, userId));

    console.log("Deleting user...");
    await db.delete(authUsers).where(eq(authUsers.id, userId));

    console.log("✅ User deleted successfully!");
    console.log(`\n📝 Now you can sign up again with: ${email}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

deleteUser();