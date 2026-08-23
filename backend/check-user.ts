import { db } from "./src/db/db.js";
import { authUsers } from "./src/db/schema/auth-users.js";
import { eq } from "drizzle-orm";

async function checkUser() {
  try {
    const email = "ram@myquro.com";

    console.log(`🔍 Checking if user exists: ${email}\n`);

    const user = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);

    if (user.length > 0) {
      console.log("✅ User found:");
      console.log(`   - ID: ${user[0].id}`);
      console.log(`   - Email: ${user[0].email}`);
      console.log(`   - Name: ${user[0].name}`);
      console.log(`   - Role: ${user[0].role}`);
      console.log(`   - Email Verified: ${user[0].emailVerified}`);
      console.log(`   - Created At: ${user[0].createdAt}`);
    } else {
      console.log("❌ User not found");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUser();