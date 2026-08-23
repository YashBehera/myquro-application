import { sql } from './db/db';

async function check() {
  try {
    // Check profiles for the user
    const profile = await sql`SELECT * FROM "profiles" WHERE "user_id" = 'i4rgEb5fxt35YwrdaCnOEUidGZsF9N9H'`;
    console.log("Profiles:", profile);

    // Check auth_accounts
    const accounts = await sql`SELECT * FROM "auth_accounts" WHERE "user_id" = 'i4rgEb5fxt35YwrdaCnOEUidGZsF9N9H'`;
    console.log("Accounts:", accounts);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

check();
