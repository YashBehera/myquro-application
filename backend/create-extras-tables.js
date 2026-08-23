import { sql } from "drizzle-orm";
import { db } from "./dist/db/db.js";

async function createExtrasTables() {
  try {
    console.log("Checking if extras tables exist...");

    // Check if tables exist
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('menu_extras', 'menu_extra_assignments', 'order_item_extras')
    `);

    console.log("Existing tables:", result.rows);

    if (result.rows.length === 0) {
      console.log("Creating extras tables...");

      // Create menu_extras table
      await db.execute(sql`
        CREATE TABLE "menu_extras" (
          "id" text PRIMARY KEY NOT NULL,
          "restaurant_id" text NOT NULL,
          "name" text NOT NULL,
          "description" text,
          "price" integer DEFAULT 0 NOT NULL,
          "is_available" boolean DEFAULT true NOT NULL,
          "is_active" boolean DEFAULT true NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);

      // Create menu_extra_assignments table
      await db.execute(sql`
        CREATE TABLE "menu_extra_assignments" (
          "id" text PRIMARY KEY NOT NULL,
          "restaurant_id" text NOT NULL,
          "extra_id" text NOT NULL,
          "category_id" text,
          "menu_item_id" text,
          "variant_id" text,
          "is_global" boolean DEFAULT false NOT NULL,
          "is_active" boolean DEFAULT true NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);

      // Create order_item_extras table
      await db.execute(sql`
        CREATE TABLE "order_item_extras" (
          "id" text PRIMARY KEY NOT NULL,
          "order_item_id" text NOT NULL,
          "extra_id" text NOT NULL,
          "quantity" integer DEFAULT 1 NOT NULL,
          "unit_price" integer NOT NULL,
          "total_price" integer NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);

      // Add foreign key constraints
      await db.execute(sql`
        ALTER TABLE "menu_extras"
        ADD CONSTRAINT "menu_extras_restaurant_id_restaurants_id_fk"
        FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id")
        ON DELETE cascade ON UPDATE no action
      `);

      await db.execute(sql`
        ALTER TABLE "menu_extra_assignments"
        ADD CONSTRAINT "menu_extra_assignments_restaurant_id_restaurants_id_fk"
        FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id")
        ON DELETE cascade ON UPDATE no action
      `);

      await db.execute(sql`
        ALTER TABLE "menu_extra_assignments"
        ADD CONSTRAINT "menu_extra_assignments_extra_id_menu_extras_id_fk"
        FOREIGN KEY ("extra_id") REFERENCES "public"."menu_extras"("id")
        ON DELETE cascade ON UPDATE no action
      `);

      await db.execute(sql`
        ALTER TABLE "menu_extra_assignments"
        ADD CONSTRAINT "menu_extra_assignments_category_id_menu_categories_id_fk"
        FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id")
        ON DELETE cascade ON UPDATE no action
      `);

      await db.execute(sql`
        ALTER TABLE "menu_extra_assignments"
        ADD CONSTRAINT "menu_extra_assignments_menu_item_id_menu_items_id_fk"
        FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id")
        ON DELETE cascade ON UPDATE no action
      `);

      await db.execute(sql`
        ALTER TABLE "menu_extra_assignments"
        ADD CONSTRAINT "menu_extra_assignments_variant_id_menu_item_variants_id_fk"
        FOREIGN KEY ("variant_id") REFERENCES "public"."menu_item_variants"("id")
        ON DELETE cascade ON UPDATE no action
      `);

      await db.execute(sql`
        ALTER TABLE "order_item_extras"
        ADD CONSTRAINT "order_item_extras_order_item_id_order_items_id_fk"
        FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id")
        ON DELETE cascade ON UPDATE no action
      `);

      await db.execute(sql`
        ALTER TABLE "order_item_extras"
        ADD CONSTRAINT "order_item_extras_extra_id_menu_extras_id_fk"
        FOREIGN KEY ("extra_id") REFERENCES "public"."menu_extras"("id")
        ON DELETE cascade ON UPDATE no action
      `);

      console.log("✅ Extras tables created successfully!");
    } else {
      console.log("ℹ️  Extras tables already exist");
    }
  } catch (error) {
    console.error("❌ Error creating extras tables:", error);
  }
}

createExtrasTables();