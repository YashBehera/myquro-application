import { sql } from './db/db';

async function update() {
  try {
    // 1. Update the profile phone number
    const resultProfile = await sql`
      UPDATE "profiles" 
      SET "phone_number" = '9777653495' 
      WHERE "user_id" = 'i4rgEb5fxt35YwrdaCnOEUidGZsF9N9H'
      RETURNING *;
    `;
    console.log("Updated Profile:", resultProfile);

    // 2. Check and update the restaurant record linked to this user
    const resultRestaurant = await sql`
      UPDATE "restaurants"
      SET "phone_number" = '9777653495', "email" = 'test1@gmail.com'
      WHERE "owner_id" = 'i4rgEb5fxt35YwrdaCnOEUidGZsF9N9H'
      RETURNING *;
    `;
    console.log("Updated Restaurant:", resultRestaurant);

    // 3. Ensure the request is APPROVED
    const resultRequest = await sql`
      UPDATE "restaurant_requests"
      SET "request_status" = 'APPROVED'
      WHERE "user_id" = 'i4rgEb5fxt35YwrdaCnOEUidGZsF9N9H'
      RETURNING *;
    `;
    console.log("Updated Request:", resultRequest);

  } catch (err: any) {
    console.error("Error updating:", err.message);
  }
}

update();
