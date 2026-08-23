import { Router } from "express";
import { db } from "../db/db.js";
import { reviews } from "../db/schema/reviews.js";
import { authUsers } from "../db/schema/auth-users.js";
import { tableSession } from "../db/schema/table-session.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../auth/requireAuth.js";
import { isRestaurantOwnerManagerOrStaff } from "../lib/checkRoles.js";
import { updateRestaurantRating } from "../lib/rating-utils.js";

const router = Router();

// POST /reviews - Create a review for a session
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const { sessionId, rating, reviewText } = req.body;
    const user = req.user;

    if (!sessionId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Session ID and rating (1-5) are required"
      });
    }

    // Check if session exists and get restaurant info
    const sessionData = await db
      .select({
        id: tableSession.id,
        restaurantId: tableSession.restaurantId,
        status: tableSession.status
      })
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const session = sessionData[0];

    // Check if user already reviewed this session
    const existingReview = await db
      .select()
      .from(reviews)
      .where(and(
        eq(reviews.sessionId, sessionId),
        eq(reviews.userId, user.id)
      ))
      .limit(1);

    if (existingReview.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this session"
      });
    }

    // Create the review
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(reviews).values({
      id: reviewId,
      sessionId,
      userId: user.id,
      restaurantId: session.restaurantId,
      rating,
      reviewText: reviewText || null,
    });

    // Update restaurant rating after creating review
    await updateRestaurantRating(session.restaurantId);

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      reviewId
    });

  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit review"
    });
  }
});

// GET /reviews/:restaurantId - Get reviews for a restaurant
router.get("/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const reviewsData = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        reviewText: reviews.reviewText,
        createdAt: reviews.createdAt,
        userName: authUsers.name,
        userEmail: authUsers.email,
        sessionId: reviews.sessionId
      })
      .from(reviews)
      .innerJoin(authUsers, eq(reviews.userId, authUsers.id))
      .where(eq(reviews.restaurantId, restaurantId))
      .orderBy(desc(reviews.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: reviews.id })
      .from(reviews)
      .where(eq(reviews.restaurantId, restaurantId));

    const total = totalResult.length;

    res.json({
      success: true,
      reviews: reviewsData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews"
    });
  }
});

// GET /reviews/session/:sessionId - Get reviews for a specific session
router.get("/session/:sessionId", requireAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;

    // Check if user has permission to view reviews for this session
    const sessionData = await db
      .select({
        restaurantId: tableSession.restaurantId
      })
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const hasPermission = await isRestaurantOwnerManagerOrStaff(user.id, sessionData[0].restaurantId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view reviews for this session"
      });
    }

    const reviewsData = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        reviewText: reviews.reviewText,
        createdAt: reviews.createdAt,
        userId: reviews.userId
      })
      .from(reviews)
      .where(eq(reviews.sessionId, sessionId))
      .orderBy(desc(reviews.createdAt));

    res.json({
      success: true,
      reviews: reviewsData
    });

  } catch (error) {
    console.error("Error fetching session reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews"
    });
  }
});

// PUT /reviews/:reviewId - Update a review (only by the review author)
router.put("/:reviewId", requireAuth, async (req: any, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, reviewText } = req.body;
    const user = req.user;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating (1-5) is required"
      });
    }

    // Check if review exists and belongs to user
    const reviewData = await db
      .select()
      .from(reviews)
      .where(and(
        eq(reviews.id, reviewId),
        eq(reviews.userId, user.id)
      ))
      .limit(1);

    if (reviewData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you don't have permission to edit it"
      });
    }

    // Update the review
    await db
      .update(reviews)
      .set({
        rating,
        reviewText: reviewText || null,
        updatedAt: new Date()
      })
      .where(eq(reviews.id, reviewId));

    // Update restaurant rating after updating review
    await updateRestaurantRating(reviewData[0].restaurantId);

    res.json({
      success: true,
      message: "Review updated successfully"
    });

  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update review"
    });
  }
});

// DELETE /reviews/:reviewId - Delete a review (by author or restaurant staff)
router.delete("/:reviewId", requireAuth, async (req: any, res) => {
  try {
    const { reviewId } = req.params;
    const user = req.user;

    // Get review details
    const reviewData = await db
      .select({
        userId: reviews.userId,
        restaurantId: reviews.restaurantId
      })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (reviewData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    const review = reviewData[0];

    // Check if user is the author or has restaurant permissions
    const isAuthor = review.userId === user.id;
    const hasRestaurantPermission = await isRestaurantOwnerManagerOrStaff(user.id, review.restaurantId);

    if (!isAuthor && !hasRestaurantPermission) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this review"
      });
    }

    // Delete the review
    await db
      .delete(reviews)
      .where(eq(reviews.id, reviewId));

    // Update restaurant rating after deleting review
    await updateRestaurantRating(review.restaurantId);

    res.json({
      success: true,
      message: "Review deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete review"
    });
  }
});

export default router;