import { Router } from "express";
import { db } from "../db/db.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantRequests } from "../db/schema/restaurant-requests.js";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireAuth } from "../auth/requireAuth.js";
import { logEvent } from "../middleware/logger.middleware.js";


const router = Router();

/**
 * POST /api/restaurants/apply
 */

// 1. ONLY AUTHENTICATED USERS CAN APPLY
router.post("/apply", requireAuth, async (req: any, res) => {
  try {
    logEvent("\n========== APPLY API STARTED ==========");
    const user = req.user;
    logEvent(`APPLY API - Step 1: User authenticated - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);

    // 2. ROLE CHECK
    logEvent(`APPLY API - Step 2: Checking user role...`);
    if (user.role === "restaurant") {
      logEvent(`APPLY API - BLOCKED: User ${user.id} has 'restaurant' role, cannot apply`);
      return res
        .status(403)
        .json({ message: "accounts related to restaurants cannot apply" });
    } else if (user.role === "admin") {
      logEvent(`APPLY API - BLOCKED: User ${user.id} has 'admin' role, cannot apply`);
      return res
        .status(401)
        .json({ message: "Pay Attention you are being watched" });
    }
    logEvent(`APPLY API - Step 2 PASSED: User role '${user.role}' is allowed to apply`);
    

    // 3. CHECK FOR ANY EXISTING REQUEST (PENDING, APPROVED, OR REJECTED)
    logEvent(`APPLY API - Step 3: Checking for existing requests for user ${user.id}...`);
    const existingRows = await db
      .select()
      .from(restaurantRequests)
      .where(eq(restaurantRequests.userId, user.id))
      .orderBy(desc(restaurantRequests.requestedAt))
      .limit(1);
    const existingRequest = existingRows[0];
    logEvent(`APPLY API - Step 3 RESULT: Found ${existingRows.length} request(s)`);
    
    if (existingRequest) {
      logEvent(`APPLY API - Existing request details: ID=${existingRequest.id}, Status=${existingRequest.requestStatus}, RestaurantID=${existingRequest.restaurantId}`);
    } else {
      logEvent(`APPLY API - Step 3: No existing requests found for user ${user.id}`);
    }

    if (existingRequest) {
      // If they have an approved request, they cannot apply again
      if (existingRequest.requestStatus === "APPROVED") {
        logEvent(`APPLY API - BLOCKED: User ${user.id} has APPROVED request (ID: ${existingRequest.id})`);
        return res.status(400).json({
          message: "You already have an approved restaurant application",
          status: "approved",
          requestId: existingRequest.id
        });
      }
      
      // If they have a pending request, they cannot apply again
      if (existingRequest.requestStatus === "PENDING") {
        logEvent(`APPLY API - BLOCKED: User ${user.id} has PENDING request (ID: ${existingRequest.id})`);
        return res.status(400).json({
          message: "You already have a restaurant application under review",
          status: "pending",
          requestId: existingRequest.id
        });
      }

      // If rejected, they also cannot reapply (contact admin first)
      // You can change this logic if you want to allow reapplication after rejection
      if (existingRequest.requestStatus === "REJECTED") {
        logEvent(`APPLY API - BLOCKED: User ${user.id} has REJECTED request (ID: ${existingRequest.id}, Remark: ${existingRequest.adminRemark || 'none'})`);
        return res.status(400).json({
          message: "Your previous application was rejected. Please contact support before reapplying.",
          status: "rejected",
          requestId: existingRequest.id,
          adminRemark: existingRequest.adminRemark
        });
      }
    }
    logEvent(`APPLY API - Step 3 PASSED: User ${user.id} can proceed with application`);
    

    // 4. VALIDATE INPUT (BARE MINIMUM)
    logEvent(`APPLY API - Step 4: Validating input data...`);
    const {
      restaurantName,
      restaurantType,
      restaurantAddress,
      city,
      state,
      postalCode,
      phoneNumber,
      email,
      description,
      gstNumber,
      fssaiLicenseNumber,
      defaultGstPercentage,
      latitude,
      longitude,
    } = req.body;

    logEvent(`APPLY API - Input data: Name='${restaurantName}', Type='${restaurantType}', City='${city}', State='${state}'`);

    if (
      !restaurantName ||
      !restaurantType ||
      !restaurantAddress ||
      !city ||
      !state ||
      !postalCode ||
      !phoneNumber ||
      !email ||
      !fssaiLicenseNumber
    ) {
      logEvent(`APPLY API - VALIDATION FAILED: Missing required fields`);
      return res.status(400).json({
        message: "Missing required restaurant details",
      });
    }
    logEvent(`APPLY API - Step 4 PASSED: All required fields present`);
    

    // 5. CREATE OPERATION
    logEvent(`APPLY API - Step 5: Generating IDs...`);
    const restaurantId = nanoid();
    const requestId = nanoid();
    logEvent(`APPLY API - Generated IDs - RestaurantID: ${restaurantId}, RequestID: ${requestId}`);

    // A. CREATE RESTAURANT
    logEvent(`APPLY API - Step 5A: Creating restaurant record for user ${user.id}...`);
    const slug = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") + `-${nanoid(6)}`;
    
    logEvent(`APPLY API - Restaurant slug: ${slug}`);
    logEvent(`APPLY API - Inserting into restaurants table...`);
    
    await db.insert(restaurants).values({
      id: restaurantId,
      ownerId: user.id,
      restaurantName,
      restaurantType,
      restaurantAddress,
      city,
      state,
      postalCode,
      phoneNumber,
      email,
      description,
      gstNumber,
      defaultGstPercentage,
      fssaiLicenseNumber,
      isOpen: false,
      restaurantStatus: "inactive",
      slug,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
    });
    logEvent(`APPLY API - Step 5A DONE: Restaurant record created with ID: ${restaurantId}`);

    // B. CREATE REQUEST
    logEvent(`APPLY API - Step 5B: Creating restaurant request...`);
    logEvent(`APPLY API - Request data: RequestID=${requestId}, UserID=${user.id}, RestaurantID=${restaurantId}, Status=PENDING`);
    
    await db.insert(restaurantRequests).values({
      id: requestId,
      userId: user.id,
      restaurantId,
      requestStatus: "PENDING",
    });
    logEvent(`APPLY API - Step 5B DONE: Request record created with ID: ${requestId}`);

    // 6. SUCCESS RESPONSE
    logEvent(`APPLY API - ✅ SUCCESS: User ${user.id} application submitted successfully`);
    logEvent("========== APPLY API COMPLETED ==========\n");
    return res.status(201).json({
      message: "Restaurant application submitted successfully",
    });
  } catch (error) {
    logEvent(`APPLY API - ❌ ERROR: ${error}`);
    logEvent(`APPLY API - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    logEvent("========== APPLY API FAILED ==========\n");
    return res.status(500).json({
      message: "Something went wrong while applying",
    });
  }
});

// GET /api/restaurants/view-request

router.get("/view-request", requireAuth, async (req: any, res) => {
  try {
    logEvent("\n========== VIEW REQUEST API STARTED ==========");
    const user = req.user;
    logEvent(`VIEW REQUEST API - Step 1: User authenticated - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);

    // Get the latest request for this user
    logEvent(`VIEW REQUEST API - Step 2: Querying restaurantRequests table for user ${user.id}...`);
    const requests = await db
      .select()
      .from(restaurantRequests)
      .where(eq(restaurantRequests.userId, user.id))
      .orderBy(desc(restaurantRequests.requestedAt)) // Order by newest first
      .limit(1);

    logEvent(`VIEW REQUEST API - Step 2 RESULT: Found ${requests.length} request(s)`);
    const request = requests[0];
    
    if (request) {
      logEvent(`VIEW REQUEST API - Request details: ID=${request.id}, Status=${request.requestStatus}, RestaurantID=${request.restaurantId}, RequestedAt=${request.requestedAt}`);
    } else {
      logEvent(`VIEW REQUEST API - No request found for user ${user.id}`);
    }

    if (!request) {
      logEvent(`VIEW REQUEST API - ❌ RETURNING 404: No request found for user ${user.id}`);
      logEvent("========== VIEW REQUEST API COMPLETED (NOT FOUND) ==========\n");
      return res.status(404).json({ message: "No restaurant request found" });
    }

    // Fetch the restaurant details
    logEvent(`VIEW REQUEST API - Step 3: Querying restaurants table for restaurantID: ${request.restaurantId}...`);
    const restaurantRows = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, request.restaurantId))
      .limit(1);

    logEvent(`VIEW REQUEST API - Step 3 RESULT: Found ${restaurantRows.length} restaurant(s)`);
    const restaurant = restaurantRows[0];
    
    if (restaurant) {
      logEvent(`VIEW REQUEST API - Restaurant details: ID=${restaurant.id}, Name='${restaurant.restaurantName}', OwnerID=${restaurant.ownerId}, Status=${restaurant.restaurantStatus}`);
    } else {
      logEvent(`VIEW REQUEST API - ⚠️ WARNING: Restaurant not found for ID: ${request.restaurantId} - Data inconsistency!`);
    }

    logEvent(`VIEW REQUEST API - Step 4: Preparing response...`);
    logEvent(`VIEW REQUEST API - Response includes: request=${!!request}, restaurant=${!!restaurant}`);
    logEvent(`VIEW REQUEST API - ✅ SUCCESS: Returning data for user ${user.id}`);
    logEvent("========== VIEW REQUEST API COMPLETED ==========\n");
    
    return res.json({
      request,
      restaurant,
    });
  } catch (error) {
    logEvent(`VIEW REQUEST API - ❌ ERROR: ${error}`);
    logEvent(`VIEW REQUEST API - Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    logEvent("========== VIEW REQUEST API FAILED ==========\n");
    return res.status(500).json({
      message: "Something went wrong while fetching your request",
    });
  }
});

export default router;
