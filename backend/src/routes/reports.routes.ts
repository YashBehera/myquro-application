import { Router } from "express";
import { requireAuth } from "../auth/requireAuth.js";
import { db } from "../db/db.js";
import { isRestaurantOwnerOrManager } from "../lib/checkRoles.js";

import { and, eq, gte, lte, sql } from "drizzle-orm";

import { orders } from "../db/schema/orders.js";
import { payments } from "../db/schema/payments.js";
import { reservations } from "../db/schema/reservations.js";
import { orderItems } from "../db/schema/order-items.js";
import { menuItems } from "../db/schema/menu-items.js";

import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";


const router = Router();

// GET /:restaurantId/reports/sales/pdf - Export sales report as PDF
router.get(
  "/:restaurantId/reports/sales/pdf",
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
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate dates
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Get sales data
      const salesData = await db
        .select({
          date: sql<string>`DATE(${payments.createdAt})`,
          totalIncome: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
        })
        .from(payments)
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

      // Generate PDF
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.pdf`);
        res.send(pdfData);
      });

      // PDF Content
      doc.fontSize(20).text('Sales Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`);
      doc.text(`Restaurant ID: ${restaurantId}`);
      doc.moveDown();

      // Table header
      doc.fontSize(14).text('Date', 50, doc.y);
      doc.text('Transactions', 200, doc.y);
      doc.text('Income (INR)', 350, doc.y);
      doc.moveDown();

      // Table data
      salesData.forEach((row) => {
        doc.fontSize(10).text(row.date, 50, doc.y);
        doc.text(row.totalTransactions.toString(), 200, doc.y);
        doc.text((row.totalIncome / 100).toFixed(2), 350, doc.y); // Convert paise to rupees
        doc.moveDown();
      });

      // Totals
      const totalIncome = salesData.reduce((sum, row) => sum + row.totalIncome, 0);
      const totalTransactions = salesData.reduce((sum, row) => sum + row.totalTransactions, 0);

      doc.moveDown();
      doc.fontSize(12).text(`Total Transactions: ${totalTransactions}`, { align: 'right' });
      doc.text(`Total Income: ₹${(totalIncome / 100).toFixed(2)}`, { align: 'right' });

      doc.end();
    } catch (error) {
      console.error("Error generating sales PDF report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/reports/sales/excel - Export sales report as Excel
router.get(
  "/:restaurantId/reports/sales/excel",
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
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate dates
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Get sales data
      const salesData = await db
        .select({
          date: sql<string>`DATE(${payments.createdAt})`,
          totalIncome: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
        })
        .from(payments)
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

      // Generate Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');

      // Add headers
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Transactions', key: 'transactions', width: 15 },
        { header: 'Income (INR)', key: 'income', width: 15 },
      ];

      // Add data
      salesData.forEach((row) => {
        worksheet.addRow({
          date: row.date,
          transactions: row.totalTransactions,
          income: row.totalIncome / 100, // Convert paise to rupees
        });
      });

      // Add totals
      const totalIncome = salesData.reduce((sum, row) => sum + row.totalIncome, 0);
      const totalTransactions = salesData.reduce((sum, row) => sum + row.totalTransactions, 0);

      worksheet.addRow({});
      worksheet.addRow({ date: 'TOTAL', transactions: totalTransactions, income: totalIncome / 100 });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.xlsx`);

      // Send Excel file
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating sales Excel report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/reports/orders/pdf - Export orders report as PDF
router.get(
  "/:restaurantId/reports/orders/pdf",
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
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate dates
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Get orders data
      const ordersData = await db
        .select({
          id: orders.id,
          status: orders.status,
          totalAmount: orders.grandTotal,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            gte(orders.createdAt, start),
            lte(orders.createdAt, end)
          )
        )
        .orderBy(orders.createdAt);

      // Generate PDF
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=orders-report-${startDate}-to-${endDate}.pdf`);
        res.send(pdfData);
      });

      // PDF Content
      doc.fontSize(20).text('Orders Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`);
      doc.text(`Restaurant ID: ${restaurantId}`);
      doc.moveDown();

      // Table header
      doc.fontSize(14).text('Order ID', 50, doc.y);
      doc.text('Customer', 150, doc.y);
      doc.text('Status', 250, doc.y);
      doc.text('Amount', 320, doc.y);
      doc.text('Payment', 380, doc.y);
      doc.moveDown();

      // Table data
      ordersData.forEach((order) => {
        doc.fontSize(10).text(order.id.substring(0, 8) + '...', 50, doc.y);
        doc.text('N/A', 150, doc.y);
        doc.text(order.status, 250, doc.y);
        doc.text(`₹${(order.totalAmount / 100).toFixed(2)}`, 320, doc.y);
        doc.text('N/A', 380, doc.y);
        doc.moveDown();
      });

      // Summary
      const totalOrders = ordersData.length;
      const totalRevenue = ordersData.reduce((sum, order) => sum + order.totalAmount / 100, 0);

      doc.moveDown();
      doc.fontSize(12).text(`Total Orders: ${totalOrders}`, { align: 'right' });
      doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, { align: 'right' });

      doc.end();
    } catch (error) {
      console.error("Error generating orders PDF report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;