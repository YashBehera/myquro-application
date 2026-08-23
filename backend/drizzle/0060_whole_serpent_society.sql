ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "admin_audit_action_check";--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "restaurant_status" SET DEFAULT 'inactive';--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_action_check" CHECK ("admin_audit_logs"."action" IN (
        'SUSPEND_RESTAURANT',
        'UNSUSPEND_RESTAURANT',
        'VIEW_RESTAURANTS',
        'SUSPEND_USER',
        'UNSUSPEND_USER',
        'VIEW_FLAGGED_SUBSCRIPTIONS',
        'UPDATE_RESTAURANT',
        'APPROVE_RESTAURANT',
        'REJECT_RESTAURANT'
      ));