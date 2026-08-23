-- Drop the table if it already exists
DROP TABLE IF EXISTS "table_session";

-- Recreate the table with the updated schema
CREATE TABLE "table_session"
(
    "id" TEXT NOT NULL PRIMARY KEY,
    "table_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "created_by_user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP,
    "discount_percentage" INTEGER DEFAULT 0,
    "discount_reason" TEXT,
    "discount_approved_by_user_id" TEXT,
    "discount_approved_at" TIMESTAMP,
    "frozen_subtotal" INTEGER,
    "frozen_discount_amount" INTEGER,
    "frozen_taxable_amount" INTEGER,
    "frozen_gst_rate" INTEGER,
    "frozen_gst_amount" INTEGER,
    "final_bill_amount" INTEGER,
    "billed_at" TIMESTAMP,
    "invoice_number" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "table_session_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE,
    CONSTRAINT "table_session_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE,
    CONSTRAINT "table_session_qr_token_table_qr_qr_token_fk" FOREIGN KEY ("qr_token") REFERENCES "table_qr"("qr_token") ON DELETE CASCADE,
    CONSTRAINT "table_session_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth_users"("id") ON DELETE NO ACTION,
    CONSTRAINT "table_session_discount_approved_by_user_id_auth_users_id_fk" FOREIGN KEY ("discount_approved_by_user_id") REFERENCES "auth_users"("id") ON DELETE NO ACTION
);