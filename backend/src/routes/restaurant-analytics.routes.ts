import { Router } from "express";
import { requireAuth } from "../auth/requireAuth.js";
import { db } from "../db/db.js";

import { orders } from "../db/schema/orders.js";
import { orderItems } from "../db/schema/order-items.js";
import { menuItems } from "../db/schema/menu-items.js";
import { reservations } from "../db/schema/reservations.js";
import { payments } from "../db/schema/payments.js";
import { menuCategories } from "../db/schema/menu-categories.js";
import { tables } from "../db/schema/tables.js";
import { tableSession } from "../db/schema/table-session.js";

import {
  sql,
  and,
  eq,
  gte,
  lte,
  desc,
  count,
  sum,
  countDistinct,
  isNotNull,
} from "drizzle-orm";

import { isRestaurantOwnerOrManager } from "../lib/checkRoles.js";
import { analyticsCache } from "../lib/analytics-cache.js";


const router = Router();

// GET /:restaurantId/analytics - Comprehensive analytics data
router.get(
  "/:restaurantId/analytics",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = "all" } = req.query;

      // Check Cache
      const cacheKey = `analytics:${restaurantId}:${period}`;
      const cached = analyticsCache.get(cacheKey);
      if (cached.hit) {
        return res.status(200).json(cached.data);
      }

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Determine date filter
      let dateFilter: any = undefined;
      const now = new Date();

      if (period === 'week') {
        dateFilter = gte(orders.createdAt, sql`NOW() - INTERVAL '7 days'`);
      } else if (period === 'month') {
        dateFilter = gte(orders.createdAt, sql`NOW() - INTERVAL '30 days'`);
      } else if (period === 'year') {
        dateFilter = gte(orders.createdAt, sql`NOW() - INTERVAL '365 days'`);
      }
      // 'all' uses no date filter

      // Execute all independent queries in parallel
      const [
        salesQuery,
        dailySalesQuery,
        topItemsQuery,
        paymentMethodsQuery,
        tableAnalyticsQuery,
        customerAnalyticsQuery,
        categoriesQuery,
        hourlyQuery
      ] = await Promise.all([
        // 1. Sales Metrics
        db
          .select({
            totalRevenue: sql<number>`COALESCE(SUM(
              CASE
                WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
                WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
                ELSE ${payments.amount}
              END
            ), 0)`,
            totalOrders: sql<number>`COUNT(DISTINCT ${payments.tableSessionId})`,
            avgOrderValue: sql<number>`COALESCE(AVG(
              CASE
                WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
                WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
                ELSE ${payments.amount}
              END
            ), 0)`,
          })
          .from(payments)
          .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
          .where(and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, 'success'),
            dateFilter ? gte(payments.createdAt, sql`NOW() - INTERVAL '${period === 'week' ? '7' : period === 'month' ? '30' : '365'} days'`) : undefined
          )),

        // 2. Daily Sales Trend (last 14 days)
        db
          .select({
            date: sql<string>`DATE(${payments.createdAt})`,
            totalAmount: sql<number>`COALESCE(SUM(
              CASE
                WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
                WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
                ELSE ${payments.amount}
              END
            ), 0)`,
          })
          .from(payments)
          .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
          .where(and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, 'success'),
            gte(payments.createdAt, sql`NOW() - INTERVAL '14 days'`)
          ))
          .groupBy(sql`DATE(${payments.createdAt})`)
          .orderBy(sql`DATE(${payments.createdAt})`),

        // 3. Top Items
        db
          .select({
            name: menuItems.name,
            quantity: sql<number>`SUM(${orderItems.quantity})`,
            revenue: sql<number>`SUM(${orderItems.totalPrice})`,
            orders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, 'served'),
            eq(orderItems.status, 'served'),
            dateFilter
          ))
          .groupBy(menuItems.name)
          .orderBy(desc(sql`SUM(${orderItems.totalPrice})`))
          .limit(10),

        // 4. Payment Methods
        db
          .select({
            method: payments.method,
            count: count(payments.id),
            revenue: sql<number>`SUM(${payments.finalAmount})`,
            customers: countDistinct(payments.paidByUserId),
          })
          .from(payments)
          .where(and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, 'success'),
            dateFilter ? gte(payments.createdAt, sql`NOW() - INTERVAL '${period === 'week' ? '7' : period === 'month' ? '30' : '365'} days'`) : undefined
          ))
          .groupBy(payments.method)
          .orderBy(desc(sql`SUM(${payments.finalAmount})`)),

        // 5. Table Analytics
        db
          .select({
            tableId: tables.id,
            tableNumber: tables.tableNumber,
            orders: sql<number>`COUNT(DISTINCT ${payments.tableSessionId})`,
            revenue: sql<number>`COALESCE(SUM(
              CASE
                WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
                WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
                ELSE ${payments.amount}
              END
            ), 0)`,
            customers: countDistinct(tableSession.createdByUserId),
          })
          .from(payments)
          .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
          .innerJoin(tables, eq(tableSession.tableId, tables.id))
          .where(and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, 'success'),
            dateFilter ? gte(payments.createdAt, sql`NOW() - INTERVAL '${period === 'week' ? '7' : period === 'month' ? '30' : '365'} days'`) : undefined
          ))
          .groupBy(tables.id, tables.tableNumber)
          .orderBy(desc(sql`COALESCE(SUM(
            CASE
              WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
              WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
              ELSE ${payments.amount}
            END
          ), 0)`)),

        // 6. Customer Analytics
        db
          .select({
            userId: tableSession.createdByUserId,
            totalSpent: sql<number>`COALESCE(SUM(
              CASE
                WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
                WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
                ELSE ${payments.amount}
              END
            ), 0)`,
            orderCount: sql<number>`COUNT(DISTINCT ${payments.tableSessionId})`,
            firstOrder: sql<string>`MIN(${payments.createdAt})`,
            lastOrder: sql<string>`MAX(${payments.createdAt})`,
          })
          .from(payments)
          .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
          .where(and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, 'success'),
            isNotNull(tableSession.createdByUserId),
            dateFilter ? gte(payments.createdAt, sql`NOW() - INTERVAL '${period === 'week' ? '7' : period === 'month' ? '30' : '365'} days'`) : undefined
          ))
          .groupBy(tableSession.createdByUserId)
          .orderBy(desc(sql`COALESCE(SUM(
            CASE
              WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
              WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
              ELSE ${payments.amount}
            END
          ), 0)`))
          .limit(10),

        // 7. Categories Performance
        db
          .select({
            category: menuCategories.category,
            orders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
            items: sql<number>`SUM(${orderItems.quantity})`,
            revenue: sql<number>`SUM(${orderItems.totalPrice})`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
          .where(and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, 'served'),
            eq(orderItems.status, 'served'),
            dateFilter
          ))
          .groupBy(menuCategories.category)
          .orderBy(desc(sql`SUM(${orderItems.totalPrice})`)),

        // 8. Hourly Performance
        db
          .select({
            hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})`,
            orderCount: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, 'served'),
            gte(orders.createdAt, sql`NOW() - INTERVAL '7 days'`)
          ))
          .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)
          .orderBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)
      ]);

      // Calculate totals for percentages
      const totalRevenue = Number(salesQuery[0]?.totalRevenue || 0);
      const totalOrders = Number(salesQuery[0]?.totalOrders || 0);

      // Format payment methods with percentages
      const paymentMethods = paymentMethodsQuery.map(method => ({
        method: method.method,
        count: Number(method.count || 0),
        revenue: Number(method.revenue || 0),
        customers: Number(method.customers || 0),
        avgOrder: Number(method.count || 0) > 0 ? Number(method.revenue || 0) / Number(method.count || 0) : 0,
        percentage: totalOrders > 0 ? (Number(method.count || 0) / totalOrders) * 100 : 0
      }));

      // Format daily sales
      const dailySales = dailySalesQuery.map(day => ({
        date: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        totalAmount: Number(day.totalAmount || 0)
      }));

      // Format categories with percentages
      // First calculate total original revenue from categories and distribute discounts proportionally
      const totalOriginalCategoryRevenue = categoriesQuery.reduce((sum, cat) => sum + Number(cat.revenue || 0), 0);
      const totalDiscountAmount = totalOriginalCategoryRevenue - totalRevenue;

      const categories = categoriesQuery.map(cat => {
        const originalRevenue = Number(cat.revenue || 0);
        const discountForCategory = totalOriginalCategoryRevenue > 0 ? (originalRevenue / totalOriginalCategoryRevenue) * totalDiscountAmount : 0;
        const adjustedRevenue = Math.max(0, originalRevenue - discountForCategory); // Ensure non-negative

        return {
          category: cat.category,
          orders: Number(cat.orders || 0),
          items: Number(cat.items || 0),
          revenue: adjustedRevenue,
          contribution: totalRevenue > 0 ? (adjustedRevenue / totalRevenue) * 100 : 0
        };
      });

      // Format hourly distribution
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const hourData = hourlyQuery.find(h => Number(h.hour) === hour);
        return {
          hour,
          orderCount: Number(hourData?.orderCount || 0)
        };
      });

      // Calculate additional metrics
      const totalCustomers = customerAnalyticsQuery.length;
      const newCustomers = customerAnalyticsQuery.filter(c =>
        new Date(c.firstOrder) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      const returningCustomers = totalCustomers - newCustomers;

      const avgLifetimeValue = totalCustomers > 0 ?
        customerAnalyticsQuery.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0) / totalCustomers : 0;

      const highValueCustomers = customerAnalyticsQuery.filter(c =>
        Number(c.totalSpent || 0) > avgLifetimeValue * 1.5
      ).length;

      // Customer retention rate (simplified - customers with multiple orders)
      const retentionRate = totalCustomers > 0 ?
        (customerAnalyticsQuery.filter(c => Number(c.orderCount || 0) > 1).length / totalCustomers) * 100 : 0;

      // Table efficiency (simplified)
      const tableEfficiency = tableAnalyticsQuery.length > 0 ?
        (tableAnalyticsQuery.reduce((sum, t) => sum + Number(t.orders || 0), 0) / tableAnalyticsQuery.length) * 10 : 0;

      // Best performing hour
      const bestPerformingHour = hourlyDistribution.reduce((best, current) =>
        current.orderCount > best.orderCount ? current : best,
        { hour: 0, orderCount: 0 }
      );

      const response = {
        sales: {
          totalRevenue,
          totalOrders,
          averageOrderValue: Number(salesQuery[0]?.avgOrderValue || 0),
          dailySales
        },
        payments: {
          paymentMethods
        },
        items: {
          topItems: topItemsQuery.map(item => ({
            name: item.name,
            quantity: Number(item.quantity || 0),
            revenue: Number(item.revenue || 0),
            orders: Number(item.orders || 0)
          }))
        },
        tables: {
          tableAnalytics: tableAnalyticsQuery.map(table => ({
            tableId: table.tableId,
            tableNumber: table.tableNumber,
            orders: Number(table.orders || 0),
            revenue: Number(table.revenue || 0),
            customers: Number(table.customers || 0),
            avgOrder: Number(table.orders || 0) > 0 ? Number(table.revenue || 0) / Number(table.orders || 0) : 0,
            utilization: totalOrders > 0 ? (Number(table.orders || 0) / totalOrders) * 100 : 0
          }))
        },
        customers: {
          totalCustomers,
          newCustomers,
          returningCustomers,
          avgLifetimeValue,
          highValueCustomers,
          customerAnalytics: customerAnalyticsQuery.slice(0, 10).map(customer => ({
            userId: customer.userId,
            totalSpent: Number(customer.totalSpent || 0),
            orderCount: Number(customer.orderCount || 0),
            firstOrder: customer.firstOrder,
            lastOrder: customer.lastOrder,
            avgOrderValue: Number(customer.orderCount || 0) > 0 ? Number(customer.totalSpent || 0) / Number(customer.orderCount || 0) : 0
          }))
        },
        categories,
        peak: {
          hourlyDistribution,
          bestPerformingHour
        },
        performance: {
          revenuePerCustomer: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
          customerRetentionRate: retentionRate,
          tableEfficiency: Math.min(tableEfficiency, 100), // Cap at 100%
          bestPerformingHour
        }
      };

      analyticsCache.set(cacheKey, response);

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching comprehensive analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/analytics/income/daily
router.get(
  "/:restaurantId/analytics/income/daily",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { date } = req.query; // Optional date parameter (YYYY-MM-DD)

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Parse date or use today
      let targetDate: Date;
      if (date && typeof date === "string") {
        targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      } else {
        targetDate = new Date();
      }

      // Set start and end of the day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get daily payments
      const result = await db
        .select({
          totalIncome: sql<number>`COALESCE(SUM(
            CASE
              WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
              WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
              ELSE ${payments.amount}
            END
          ), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
        .where(
          and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, "success"),
            eq(payments.isRefund, false),
            gte(payments.createdAt, startOfDay),
            lte(payments.createdAt, endOfDay)
          )
        );

      return res.status(200).json({
        date: targetDate.toISOString().split("T")[0],
        totalIncome: result[0]?.totalIncome || 0,
        totalTransactions: result[0]?.totalTransactions || 0,
        currency: "INR",
        unit: "paise",
      });
    } catch (error) {
      console.error("Error fetching daily income:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/analytics/income/hourly
router.get(
  "/:restaurantId/analytics/income/hourly",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { date } = req.query; // Optional date parameter (YYYY-MM-DD)

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Parse date or use today
      let targetDate: Date;
      if (date && typeof date === "string") {
        targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      } else {
        targetDate = new Date();
      }

      // Set start and end of the day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get hourly breakdown
      const result = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${payments.createdAt})`,
          totalIncome: sql<number>`COALESCE(SUM(
            CASE
              WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
              WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
              ELSE ${payments.amount}
            END
          ), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
        .where(
          and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, "success"),
            eq(payments.isRefund, false),
            gte(payments.createdAt, startOfDay),
            lte(payments.createdAt, endOfDay)
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${payments.createdAt})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${payments.createdAt})`);

      // Format hourly data
      const hourlyData = result.map((row) => ({
        hour: row.hour,
        hourRange: `${String(row.hour).padStart(2, "0")}:00 - ${String(
          row.hour
        ).padStart(2, "0")}:59`,
        totalIncome: row.totalIncome,
        totalTransactions: row.totalTransactions,
      }));

      // Calculate total for the day
      const totalDayIncome = hourlyData.reduce(
        (sum, item) => sum + item.totalIncome,
        0
      );
      const totalDayTransactions = hourlyData.reduce(
        (sum, item) => sum + item.totalTransactions,
        0
      );

      return res.status(200).json({
        date: targetDate.toISOString().split("T")[0],
        hourlyBreakdown: hourlyData,
        totalDayIncome,
        totalDayTransactions,
        currency: "INR",
        unit: "paise",
      });
    } catch (error) {
      console.error("Error fetching hourly income:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/analytics/income/date-range
router.get(
  "/:restaurantId/analytics/income/date-range",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { startDate, endDate } = req.query;

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Validate date parameters
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      // Set time boundaries
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Get daily breakdown for the range
      const result = await db
        .select({
          date: sql<string>`DATE(${payments.createdAt})`,
          totalIncome: sql<number>`COALESCE(SUM(
            CASE
              WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
              WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
              ELSE ${payments.amount}
            END
          ), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
        .where(
          and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, "success"),
            eq(payments.isRefund, false),
            gte(payments.createdAt, start),
            lte(payments.createdAt, end)
          )
        )
        .groupBy(sql`DATE(${payments.createdAt})`)
        .orderBy(sql`DATE(${payments.createdAt})`);

      // Calculate totals
      const totalIncome = result.reduce((sum, item) => sum + item.totalIncome, 0);
      const totalTransactions = result.reduce(
        (sum, item) => sum + item.totalTransactions,
        0
      );

      return res.status(200).json({
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        dailyBreakdown: result,
        totalIncome,
        totalTransactions,
        currency: "INR",
        unit: "paise",
      });
    } catch (error) {
      console.error("Error fetching date range income:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/analytics/orders/insights - Order insights analytics
router.get(
  "/:restaurantId/analytics/orders/insights",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = "30" } = req.query; // days

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period as string));

      // Total orders
      const totalOrders = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            gte(orders.createdAt, startDate)
          )
        );

      // Average order value
      const avgOrderValue = await db
        .select({ avg: sql<number>`AVG(CAST(${payments.finalAmount} AS DECIMAL))` })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            gte(orders.createdAt, startDate)
          )
        );

      // Order status distribution
      const orderStatusStats = await db
        .select({
          status: orders.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            gte(orders.createdAt, startDate)
          )
        )
        .groupBy(orders.status);

      return res.status(200).json({
        period: `${period} days`,
        totalOrders: totalOrders[0]?.count || 0,
        averageOrderValue: avgOrderValue[0]?.avg || 0,
        orderStatusDistribution: orderStatusStats,
      });
    } catch (error) {
      console.error("Error fetching order insights:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/analytics/peak-hours - Peak hours analytics
router.get(
  "/:restaurantId/analytics/peak-hours",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = "30" } = req.query; // days

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period as string));

      // Orders by hour
      const hourlyStats = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            gte(orders.createdAt, startDate)
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`);

      // Reservations by hour
      const reservationStats = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${reservations.reservationTime})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurantId),
            gte(reservations.reservationTime, startDate)
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${reservations.reservationTime})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${reservations.reservationTime})`);

      return res.status(200).json({
        period: `${period} days`,
        ordersByHour: hourlyStats,
        reservationsByHour: reservationStats,
      });
    } catch (error) {
      console.error("Error fetching peak hours:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/analytics/popular-items - Popular menu items analytics
router.get(
  "/:restaurantId/analytics/popular-items",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = "30", limit = "10" } = req.query; // days, top N items

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period as string));

      // Popular items by quantity ordered
      const popularItems = await db
        .select({
          menuItemId: orderItems.menuItemId,
          itemName: menuItems.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
          totalRevenue: sql<number>`SUM(CAST(${orderItems.totalPrice} AS DECIMAL))`,
          orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            gte(orders.createdAt, startDate)
          )
        )
        .groupBy(orderItems.menuItemId, menuItems.name)
        .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
        .limit(parseInt(limit as string));

      return res.status(200).json({
        period: `${period} days`,
        popularItems,
      });
    } catch (error) {
      console.error("Error fetching popular items:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/analytics/reservations - Reservation analytics
router.get(
  "/:restaurantId/analytics/reservations",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = "30" } = req.query; // days

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period as string));

      // Total reservations
      const totalReservations = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurantId),
            gte(reservations.reservationTime, startDate)
          )
        );

      // Reservation status distribution
      const reservationStatusStats = await db
        .select({
          status: reservations.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurantId),
            gte(reservations.reservationTime, startDate)
          )
        )
        .groupBy(reservations.status);

      // Average party size
      const avgPartySize = await db
        .select({ avg: sql<number>`AVG(${reservations.numberOfGuests})` })
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurantId),
            gte(reservations.reservationTime, startDate)
          )
        );

      return res.status(200).json({
        period: `${period} days`,
        totalReservations: totalReservations[0]?.count || 0,
        averagePartySize: avgPartySize[0]?.avg || 0,
        reservationStatusDistribution: reservationStatusStats,
      });
    } catch (error) {
      console.error("Error fetching reservation analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/sales
router.get(
  "/:restaurantId/sales",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = 'all' } = req.query; // week, month, year, custom, all

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Calculate date range based on period
      let dateFilterPayments = sql`TRUE`;
      let dateFilterOrders = sql`TRUE`;
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilterPayments = gte(payments.createdAt, weekAgo);
        dateFilterOrders = gte(orders.createdAt, weekAgo);
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilterPayments = gte(payments.createdAt, monthAgo);
        dateFilterOrders = gte(orders.createdAt, monthAgo);
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilterPayments = gte(payments.createdAt, yearAgo);
        dateFilterOrders = gte(orders.createdAt, yearAgo);
      } else if (period === 'custom' && req.query.startDate && req.query.endDate) {
        dateFilterPayments = and(
          gte(payments.createdAt, new Date(req.query.startDate as string)),
          lte(payments.createdAt, new Date(req.query.endDate as string))
        );
        dateFilterOrders = and(
          gte(orders.createdAt, new Date(req.query.startDate as string)),
          lte(orders.createdAt, new Date(req.query.endDate as string))
        );
      }

      // Get total revenue from PAID payments only
      const salesSummary = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(
            CASE
              WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
              WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
              ELSE ${payments.amount}
            END
          ), 0)`,
          totalPayments: count(payments.id),
        })
        .from(payments)
        .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
        .where(
          and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, "success"),
            eq(payments.isRefund, false),
            dateFilterPayments
          )
        );

      // Get total orders count
      const ordersCount = await db
        .select({
          totalOrders: count(orders.id),
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            dateFilterOrders
          )
        );

      // Get daily sales for chart
      const dailySales = await db
        .select({
          date: sql<string>`DATE(${payments.createdAt})`,
          totalAmount: sql<number>`COALESCE(SUM(
            CASE
              WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
              WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
              ELSE ${payments.amount}
            END
          ), 0)`,
          paymentCount: count(payments.id),
        })
        .from(payments)
        .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
        .where(
          and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, "success"),
            eq(payments.isRefund, false),
            dateFilterPayments
          )
        )
        .groupBy(sql`DATE(${payments.createdAt})`)
        .orderBy(sql`DATE(${payments.createdAt})`);

      const totalRevenue = Number(salesSummary[0]?.totalRevenue || 0);
      const totalPayments = Number(salesSummary[0]?.totalPayments || 0);
      const totalOrders = Number(ordersCount[0]?.totalOrders || 0);

      return res.status(200).json({
        totalRevenue,
        totalOrders,
        totalPayments,
        averageOrderValue: totalPayments > 0 ? Math.round(totalRevenue / totalPayments) : 0,
        period,
        dailySales: dailySales.map(d => ({
          date: d.date,
          totalAmount: Number(d.totalAmount || 0),
          paymentCount: Number(d.paymentCount || 0)
        })),
      });
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/items
router.get(
  "/:restaurantId/items",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = 'all', startDate, endDate } = req.query;

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Calculate date range based on period
      let dateFilter = sql`TRUE`;
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, weekAgo);
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, monthAgo);
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, yearAgo);
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = and(
          gte(orders.createdAt, new Date(startDate as string)),
          lte(orders.createdAt, new Date(endDate as string))
        );
      }

      // Get top selling items
      const topItems = await db
        .select({
          id: menuItems.id,
          name: menuItems.name,
          quantity: sum(orderItems.quantity),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, "served"),
            dateFilter
          )
        )
        .groupBy(menuItems.id, menuItems.name)
        .orderBy(desc(sum(orderItems.quantity)))
        .limit(10);

      return res.status(200).json({
        topItems: topItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity || 0
        })),
        period,
      });
    } catch (error) {
      console.error("Error fetching item analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/peak-hours
router.get(
  "/:restaurantId/peak-hours",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = 'all', startDate, endDate } = req.query;

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Calculate date range based on period
      let dateFilter = sql`TRUE`;
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, weekAgo);
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, monthAgo);
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, yearAgo);
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = and(
          gte(orders.createdAt, new Date(startDate as string)),
          lte(orders.createdAt, new Date(endDate as string))
        );
      }

      // Get hourly distribution
      const hourlyDistribution = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})`,
          orderCount: count(orders.id),
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, "served"),
            dateFilter
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`);

      // Get peak hour and day
      const peakHourResult = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})`,
          orderCount: count(orders.id),
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, "served"),
            dateFilter
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)
        .orderBy(desc(count(orders.id)))
        .limit(1);

      const peakDayResult = await db
        .select({
          day: sql<string>`TO_CHAR(${orders.createdAt}, 'Day')`,
          orderCount: count(orders.id),
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, "served"),
            dateFilter
          )
        )
        .groupBy(sql`TO_CHAR(${orders.createdAt}, 'Day')`)
        .orderBy(desc(count(orders.id)))
        .limit(1);

      return res.status(200).json({
        peakHour: peakHourResult[0]?.hour || null,
        peakDay: peakDayResult[0]?.day?.trim() || null,
        hourlyDistribution: hourlyDistribution.map(h => ({
          hour: h.hour,
          orderCount: h.orderCount
        })),
        period,
      });
    } catch (error) {
      console.error("Error fetching peak hours analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/payment-methods
router.get(
  "/:restaurantId/payment-methods",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = 'all', startDate, endDate } = req.query;

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Calculate date range based on period
      let dateFilter = sql`TRUE`;
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = gte(payments.createdAt, weekAgo);
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = gte(payments.createdAt, monthAgo);
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = gte(payments.createdAt, yearAgo);
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = and(
          gte(payments.createdAt, new Date(startDate as string)),
          lte(payments.createdAt, new Date(endDate as string))
        );
      }

      // Payment method distribution from ACTUAL PAID payments
      const paymentMethods = await db
        .select({
          method: payments.method,
          count: count(payments.id),
          total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.restaurantId, restaurantId),
            eq(payments.status, "success"),
            eq(payments.isRefund, false),
            dateFilter
          )
        )
        .groupBy(payments.method);

      return res.status(200).json({
        paymentMethods: paymentMethods.map(pm => ({
          method: pm.method,
          count: Number(pm.count || 0),
          total: Number(pm.total || 0)
        })),
        period,
      });
    } catch (error) {
      console.error("Error fetching payment method analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/categories
router.get(
  "/:restaurantId/categories",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = 'all', startDate, endDate } = req.query;

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Calculate date range based on period
      let dateFilter = sql`TRUE`;
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, weekAgo);
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, monthAgo);
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, yearAgo);
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = and(
          gte(orders.createdAt, new Date(startDate as string)),
          lte(orders.createdAt, new Date(endDate as string))
        );
      }

      // Category performance
      const categories = await db
        .select({
          categoryId: menuCategories.id,
          categoryName: menuCategories.category,
          itemsSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
          revenue: sql<number>`COALESCE(SUM(${orderItems.quantity} * ${orderItems.unitPrice}), 0)`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            dateFilter
          )
        )
        .groupBy(menuCategories.id, menuCategories.category)
        .orderBy(desc(sql`COALESCE(SUM(${orderItems.quantity}), 0)`));

      return res.status(200).json({
        categories: categories.map(cat => ({
          id: cat.categoryId,
          name: cat.categoryName,
          itemsSold: Number(cat.itemsSold || 0),
          revenue: Number(cat.revenue || 0)
        })),
        period,
      });
    } catch (error) {
      console.error("Error fetching category analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/customers
router.get(
  "/:restaurantId/customers",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = 'all', startDate, endDate } = req.query;

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Calculate date range based on period
      let dateFilter = sql`TRUE`;
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, weekAgo);
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, monthAgo);
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, yearAgo);
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = and(
          gte(orders.createdAt, new Date(startDate as string)),
          lte(orders.createdAt, new Date(endDate as string))
        );
      }

      // Customer analytics
      const totalCustomers = await db
        .select({ count: countDistinct(orders.placedByUserId) })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, "served"),
            isNotNull(orders.placedByUserId),
            dateFilter
          )
        );

      // Repeat customers (customers with more than 1 order)
      const repeatCustomersQuery = await db
        .select({
          userId: orders.placedByUserId,
          orderCount: count(orders.id)
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, "served"),
            isNotNull(orders.placedByUserId),
            dateFilter
          )
        )
        .groupBy(orders.placedByUserId)
        .having(sql`COUNT(${orders.id}) > 1`);

      // Average orders per customer
      const avgOrdersQuery = await db
        .select({
          userId: orders.placedByUserId,
          orderCount: count(orders.id)
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            eq(orders.status, "served"),
            isNotNull(orders.placedByUserId),
            dateFilter
          )
        )
        .groupBy(orders.placedByUserId);

      const avgOrdersPerCustomer = avgOrdersQuery.length > 0
        ? avgOrdersQuery.reduce((acc, curr) => acc + Number(curr.orderCount), 0) / avgOrdersQuery.length
        : 0;

      return res.status(200).json({
        totalCustomers: totalCustomers[0]?.count || 0,
        repeatCustomers: repeatCustomersQuery.length,
        averageOrdersPerCustomer: Math.round(avgOrdersPerCustomer * 100) / 100,
        period,
      });
    } catch (error) {
      console.error("Error fetching customer analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/tables
router.get(
  "/:restaurantId/tables",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = 'all', startDate, endDate } = req.query;

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Calculate date range based on period
      let dateFilter = sql`TRUE`;
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, weekAgo);
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, monthAgo);
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = gte(orders.createdAt, yearAgo);
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = and(
          gte(orders.createdAt, new Date(startDate as string)),
          lte(orders.createdAt, new Date(endDate as string))
        );
      }

      // Table utilization based on orders
      const tableStats = await db
        .select({
          tableId: orders.tableId,
          tableName: tables.tableNumber,
          orderCount: count(orders.id),
        })
        .from(orders)
        .leftJoin(tables, eq(orders.tableId, tables.id))
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            isNotNull(orders.tableId),
            dateFilter
          )
        )
        .groupBy(orders.tableId, tables.tableNumber)
        .orderBy(desc(count(orders.id)));

      // Total tables
      const totalTables = await db
        .select({ count: count(tables.id) })
        .from(tables)
        .where(eq(tables.restaurantId, restaurantId));

      return res.status(200).json({
        totalTables: Number(totalTables[0]?.count || 0),
        tableUtilization: tableStats.map(table => ({
          tableId: table.tableId,
          tableName: table.tableName,
          orderCount: Number(table.orderCount || 0)
        })),
        period,
      });
    } catch (error) {
      console.error("Error fetching table analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/analytics/payment-methods
router.get(
  "/:restaurantId/analytics/payment-methods",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { period = 'all', startDate, endDate } = req.query;

      // Check authentication
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check authorization
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view analytics" });
      }

      // Build date filter
      let dateFilter = sql`TRUE`;
      if (period === 'week') {
        dateFilter = gte(payments.createdAt, sql`NOW() - INTERVAL '7 days'`);
      } else if (period === 'month') {
        dateFilter = gte(payments.createdAt, sql`NOW() - INTERVAL '30 days'`);
      } else if (period === 'year') {
        dateFilter = gte(payments.createdAt, sql`NOW() - INTERVAL '365 days'`);
      } else if (period === 'custom' && startDate && endDate) {
        dateFilter = and(
          gte(payments.createdAt, sql`${startDate}`),
          lte(payments.createdAt, sql`${endDate}`)
        );
      }

      // Get payment method analytics
      const paymentStats = await db
        .select({
          method: payments.method,
          count: count(payments.id),
          revenue: sql<number>`SUM(
            CASE
              WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
              WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
              ELSE ${payments.amount}
            END
          )`,
          customers: countDistinct(payments.paidByUserId),
        })
        .from(payments)
        .innerJoin(tableSession, eq(payments.tableSessionId, tableSession.id))
        .where(and(
          eq(payments.restaurantId, restaurantId),
          eq(payments.status, 'success'),
          dateFilter
        ))
        .groupBy(payments.method)
        .orderBy(desc(sql`SUM(
          CASE
            WHEN ${tableSession.finalAmount} IS NOT NULL THEN ${tableSession.finalAmount}
            WHEN ${payments.finalAmount} IS NOT NULL THEN ${payments.finalAmount}
            ELSE ${payments.amount}
          END
        )`));

      // Calculate percentages and format response
      const totalRevenue = paymentStats.reduce((sum, stat) => sum + Number(stat.revenue || 0), 0);
      const totalPayments = paymentStats.reduce((sum, stat) => sum + Number(stat.count || 0), 0);

      const formattedStats = paymentStats.map(stat => ({
        method: stat.method,
        count: Number(stat.count || 0),
        revenue: Number(stat.revenue || 0),
        customers: Number(stat.customers || 0),
        avgOrder: Number(stat.count || 0) > 0 ? Number(stat.revenue || 0) / Number(stat.count || 0) : 0,
        percentage: totalPayments > 0 ? (Number(stat.count || 0) / totalPayments) * 100 : 0
      }));

      return res.status(200).json({
        payments: formattedStats,
        period,
        totalRevenue,
        totalPayments
      });
    } catch (error) {
      console.error("Error fetching payment method analytics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
