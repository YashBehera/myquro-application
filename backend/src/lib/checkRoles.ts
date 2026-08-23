import { db } from "../db/db.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { and, eq, sql } from "drizzle-orm";
import { authUsers } from "../db/schema/auth-users.js";
import { companies } from "../db/schema/companies.js";


export async function isRestaurantOwnerOrManager(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  try {
    // Check if the user is a Super Admin
    const user = await db
      .select()
      .from(authUsers)
      .where(and(eq(authUsers.id, userId), eq(authUsers.role, "admin")))
      .limit(1);

    if (user.length > 0) {
      return true;
    }

    // Check if the user is a Company Admin for the company that owns this restaurant
    const restaurant = await db
      .select({ companyId: restaurants.companyId })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (restaurant.length > 0 && restaurant[0].companyId) {
      const company = await db
        .select()
        .from(companies)
        .where(and(eq(companies.id, restaurant[0].companyId), eq(companies.ownerId, userId)))
        .limit(1);

      if (company.length > 0) {
        return true;
      }
    }

    // Check if the user is the owner of the restaurant
    const isOwner = await db
      .select()
      .from(restaurants)
      .where(
        and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, userId))
      )
      .limit(1);

    if (isOwner.length > 0) {
      return true;
    }

    // Check if the user is an active manager of the restaurant
    const isManager = await db
      .select()
      .from(restaurantManagers)
      .where(
        and(
          eq(restaurantManagers.userId, userId),
          eq(restaurantManagers.restaurantId, restaurantId),
          eq(restaurantManagers.status, "active"),
          eq(restaurantManagers.role, "manager")
        )
      )
      .limit(1);

    return isManager.length > 0;
  } catch (error) {
    console.error("Error in isRestaurantOwnerOrManager:", error);
    return false; // Return false if an error occurs
  }
}

/**
 * Check if user is owner, manager, or staff
 * Allows broader access for operations that all restaurant team members can perform
 */
export async function isRestaurantOwnerManagerOrStaff(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  try {
    // Check if the user is the owner
    const isOwner = await db
      .select()
      .from(restaurants)
      .where(
        and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, userId))
      )
      .limit(1);

    if (isOwner.length > 0) {
      return true;
    }

    // Check if the user is an active manager or staff
    const isTeamMember = await db
      .select()
      .from(restaurantManagers)
      .where(
        and(
          eq(restaurantManagers.userId, userId),
          eq(restaurantManagers.restaurantId, restaurantId),
          eq(restaurantManagers.status, "active")
        )
      )
      .limit(1);

    return isTeamMember.length > 0;
  } catch (error) {
    console.error("Error in isRestaurantOwnerManagerOrStaff:", error);
    return false;
  }
}

/**
 * Get the specific role of a user in a restaurant
 * Returns: 'owner' | 'manager' | 'staff' | null
 */
/**
 * Check if user can create manual orders (staff-assisted orders)
 * Allows owner, manager, and staff - broader access than standard operations
 */
export async function canCreateManualOrders(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  try {
    // Check if the user is the owner
    const isOwner = await db
      .select()
      .from(restaurants)
      .where(
        and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, userId))
      )
      .limit(1);

    if (isOwner.length > 0) {
      return true;
    }

    // Check if the user is an active team member (manager or staff)
    const isTeamMember = await db
      .select()
      .from(restaurantManagers)
      .where(
        and(
          eq(restaurantManagers.userId, userId),
          eq(restaurantManagers.restaurantId, restaurantId),
          eq(restaurantManagers.status, "active")
        )
      )
      .limit(1);

    return isTeamMember.length > 0;
  } catch (error) {
    console.error("Error in canCreateManualOrders:", error);
    return false;
  }
}

export async function getRestaurantRole(
  userId: string,
  restaurantId: string
): Promise<'owner' | 'manager' | 'staff' | null> {
  try {
    console.log("GET RESTAURANT ROLE - Checking for user:", userId, "restaurant:", restaurantId);

    // Check if owner
    console.log("GET RESTAURANT ROLE - Checking owner status");
    const restaurant = await db
      .select()
      .from(restaurants)
      .where(
        and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, userId))
      )
      .limit(1);

    console.log("GET RESTAURANT ROLE - Owner query result:", restaurant);
    if (restaurant.length > 0) {
      console.log("GET RESTAURANT ROLE - User is owner");
      return 'owner';
    }

    // Check restaurant_managers table
    console.log("GET RESTAURANT ROLE - Checking manager status");
    const manager = await db
      .select()
      .from(restaurantManagers)
      .where(
        and(
          eq(restaurantManagers.userId, userId),
          eq(restaurantManagers.restaurantId, restaurantId),
          eq(restaurantManagers.status, "active")
        )
      )
      .limit(1);

    console.log("GET RESTAURANT ROLE - Manager query result:", manager);
    if (manager.length > 0) {
      console.log("GET RESTAURANT ROLE - User is manager with role:", manager[0].role);
      return manager[0].role as 'owner' | 'manager' | 'staff';
    }

    console.log("GET RESTAURANT ROLE - No role found");
    return null;
  } catch (error) {
    console.error("Error in getRestaurantRole:", error);
    return null;
  }
}

export async function isRestaurantOwner(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  // This function can be expanded as needed
  try {
    const restaurant = await db
      .select()
      .from(restaurants)
      .where(
        and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, userId))
      )
      .limit(1);

    return restaurant.length > 0;
  } catch (error) {
    console.error("Error in checkRestaurantOwner:", error);
    return false;
  }
}

export async function isRestaurantStaff(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  // This function can be expanded as needed
  try {
    const staff = await db
      .select()
      .from(restaurantManagers)
      .where(
        and(
          eq(restaurantManagers.userId, userId),
          eq(restaurantManagers.restaurantId, restaurantId),
          eq(restaurantManagers.status, "active"),
          eq(restaurantManagers.role, "staff")
        )
      )
      .limit(1);

    return staff.length > 0;
  } catch (error) {
    console.error("Error in checkRestaurantStaff:", error);
    return false;
  }
}


export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select()
      .from(authUsers)
      .where(and(eq(authUsers.id, userId), eq(authUsers.role, "admin")))
      .limit(1);

    return user.length > 0;
  } catch (error) {
    console.error("Error in isAdmin:", error);
    return false;
  }
}

export async function isSuperAdminOrCompanyAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select()
      .from(authUsers)
      .where(and(
        eq(authUsers.id, userId),
        sql`${authUsers.role} IN ('admin', 'company_admin')`
      ))
      .limit(1);

    return user.length > 0;
  } catch (error) {
    console.error("Error in isSuperAdminOrCompanyAdmin:", error);
    return false;
  }
}

export async function getCompanyForAdmin(userId: string): Promise<string | null> {
  try {
    const company = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.ownerId, userId))
      .limit(1);

    return company[0]?.id || null;
  } catch (error) {
    console.error("Error in getCompanyForAdmin:", error);
    return null;
  }
}
