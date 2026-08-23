import { db } from "./src/db/db.js";
import { authAccounts } from "./src/db/schema/auth-accounts.js";
import { eq } from "drizzle-orm";

async function checkUserAccounts() {
  try {
    const userId = "WEWp4PLUYcGzDY1ByOYRyg9V2IcG104i";

    console.log(`🔍 Checking accounts for user ID: ${userId}\n`);

    const accounts = await db
      .select()
      .from(authAccounts)
      .where(eq(authAccounts.userId, userId));

    if (accounts.length > 0) {
      console.log("✅ Accounts found:");
      accounts.forEach((account, i) => {
        console.log(`${i + 1}. Provider: ${account.providerId}`);
        console.log(`   Account ID: ${account.accountId}`);
        console.log(`   Password: ${account.password ? '[SET]' : '[NOT SET]'}`);
        console.log(`   Created At: ${account.createdAt}`);
        console.log();
      });
    } else {
      console.log("❌ No accounts found for this user");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUserAccounts();