import { db } from "./src/db/db.js";
import { authUsers } from "./src/db/schema/auth-users.js";
import { authAccounts } from "./src/db/schema/auth-accounts.js";
import { profiles } from "./src/db/schema/profiles.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function createTestUser() {
  try {
    const email = "test@myquro.com";
    const password = "testpassword123";

    console.log(`🔍 Checking if test user exists: ${email}\n`);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("✅ Test user already exists:");
      console.log(`   - ID: ${existingUser[0].id}`);
      console.log(`   - Email: ${existingUser[0].email}`);
      console.log(`   - Password is set for this user`);
      console.log(`\n🔑 Try signing in with:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      return;
    }

    console.log("📝 Creating test user...\n");

    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();

    // Create user
    await db.insert(authUsers).values({
      id: userId,
      email: email,
      name: "Test User",
      role: "customer",
      emailVerified: true,
    });

    // Create profile
    await db.insert(profiles).values({
      id: profileId,
      userId: userId,
      username: "test_user_" + Date.now(),
    });

    console.log("✅ Test user created successfully!");
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Profile ID: ${profileId}`);
    console.log(`\n🔑 Sign in credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createTestUser();