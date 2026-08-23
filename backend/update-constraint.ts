import { sql } from "drizzle-orm";
import { db } from "./src/db/db";

async function updateConstraint() {
  try {
    // Drop the old constraint
    await db.execute(sql`ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "admin_audit_action_check"`);

    // Add the new constraint
    await db.execute(sql`ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_action_check" CHECK ("admin_audit_logs"."action" IN (
      'SUSPEND_RESTAURANT',
      'UNSUSPEND_RESTAURANT',
      'VIEW_RESTAURANTS',
      'SUSPEND_USER',
      'UNSUSPEND_USER',
      'VIEW_FLAGGED_SUBSCRIPTIONS',
      'UPDATE_RESTAURANT',
      'APPROVE_RESTAURANT',
      'REJECT_RESTAURANT'
    ))`);

    console.log("Constraint updated successfully");
  } catch (error) {
    console.error("Error updating constraint:", error);
  }
}

updateConstraint();