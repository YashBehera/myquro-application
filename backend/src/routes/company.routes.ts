import { Router } from "express";
import { db } from "../db/db.js";
import { companies } from "../db/schema/companies.js";
import { companyInvitations, restaurantCompanyInvites } from "../db/schema/company-invites.js";
import { restaurants } from "../db/schema/restaurants.js";
import { authUsers } from "../db/schema/auth-users.js";
import { authAccounts } from "../db/schema/auth-accounts.js";
import { requireAuth } from "../auth/requireAuth.js";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";

const router = Router();

// --- SUPER ADMIN ROUTES ---

// Invite restaurants to form a company
router.post("/invite", requireAuth, async (req: any, res) => {
    try {
        const { companyName, ownerEmail, restaurantIds } = req.body;
        const user = req.user;

        if (user.role !== "admin") {
            return res.status(403).json({ message: "Only super admins can create company invitations" });
        }

        if (!companyName || !ownerEmail || !restaurantIds || !Array.isArray(restaurantIds) || restaurantIds.length === 0) {
            return res.status(400).json({ message: "Invalid payload. companyName, ownerEmail, and restaurantIds are required." });
        }

        // 1. Create the master invitation
        const invitationId = nanoid();
        await db.insert(companyInvitations).values({
            id: invitationId,
            companyName,
            ownerEmail,
            status: "pending",
        });

        // 2. Create individual invites for each restaurant
        const restaurantInvitesData: {
            id: string;
            invitationId: string;
            restaurantId: string;
            status: "pending" | "accepted" | "rejected";
        }[] = restaurantIds.map((rId: string) => ({
            id: nanoid(),
            invitationId,
            restaurantId: rId,
            status: "pending" as const,
        }));

        await db.insert(restaurantCompanyInvites).values(restaurantInvitesData);

        res.status(201).json({ message: "Invitations sent successfully", invitationId });
    } catch (error) {
        console.error("CREATE COMPANY INVITE ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// List all active companies (Super Admin)
router.get("/", requireAuth, async (req: any, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        // Fetch companies with owner email and generated password
        // We join with 'completed' invitations to get the correct password and avoid duplication with pending/expired ones
        const allCompaniesResult = await db.select({
            id: companies.id,
            name: companies.name,
            ownerId: companies.ownerId,
            ownerEmail: authUsers.email,
            createdAt: companies.createdAt,
            generatedPassword: companyInvitations.generatedPassword
        })
            .from(companies)
            .leftJoin(authUsers, eq(companies.ownerId, authUsers.id))
            .leftJoin(companyInvitations, and(
                eq(companies.name, companyInvitations.companyName),
                eq(companyInvitations.status, "completed")
            ));

        // Deduplicate companies in case multiple completed invites exist for the same name (e.g. legacy data)
        const allCompaniesMap = new Map();
        allCompaniesResult.forEach(c => {
            if (!allCompaniesMap.has(c.id)) {
                allCompaniesMap.set(c.id, c);
            }
        });
        const allCompanies = Array.from(allCompaniesMap.values());

        // Fetch linked restaurants for each company
        const enrichedCompanies = await Promise.all(allCompanies.map(async (company) => {
            const linkedRestaurants = await db.select({
                id: restaurants.id,
                name: restaurants.restaurantName,
                status: restaurants.restaurantStatus
            })
                .from(restaurants)
                .where(eq(restaurants.companyId, company.id));

            return {
                ...company,
                restaurants: linkedRestaurants
            };
        }));

        res.status(200).json({ companies: enrichedCompanies });
    } catch (error) {
        console.error("FETCH COMPANIES ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// List invitations (Super Admin)
router.get("/invitations", requireAuth, async (req: any, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const invites = await db.select().from(companyInvitations);
        res.status(200).json({ invitations: invites });
    } catch (error) {
        console.error("FETCH INVITES ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// --- RESTAURANT OWNER ROUTES ---

// Get pending invitations for my restaurant
router.get("/restaurant-invites/:restaurantId", requireAuth, async (req: any, res) => {
    try {
        const { restaurantId } = req.params;
        const user = req.user;

        // Check if owner
        const restaurant = await db.select().from(restaurants).where(and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, user.id))).limit(1);
        if (restaurant.length === 0) {
            return res.status(403).json({ message: "Access denied" });
        }

        const invites = await db
            .select({
                inviteId: restaurantCompanyInvites.id,
                status: restaurantCompanyInvites.status,
                companyName: companyInvitations.companyName,
                invitationId: companyInvitations.id,
            })
            .from(restaurantCompanyInvites)
            .innerJoin(companyInvitations, eq(restaurantCompanyInvites.invitationId, companyInvitations.id))
            .where(and(eq(restaurantCompanyInvites.restaurantId, restaurantId), eq(restaurantCompanyInvites.status, "pending")));

        res.status(200).json({ invites });
    } catch (error) {
        console.error("FETCH RESTAURANT INVITES ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Accept invitation
router.post("/accept-invite", requireAuth, async (req: any, res) => {
    try {
        const { inviteId } = req.body;
        const user = req.user;

        // 1. Verify invite exists and user owns the restaurant
        const invite = await db
            .select({
                invite: restaurantCompanyInvites,
                restaurant: restaurants,
                master: companyInvitations,
            })
            .from(restaurantCompanyInvites)
            .innerJoin(restaurants, eq(restaurantCompanyInvites.restaurantId, restaurants.id))
            .innerJoin(companyInvitations, eq(restaurantCompanyInvites.invitationId, companyInvitations.id))
            .where(eq(restaurantCompanyInvites.id, inviteId))
            .limit(1);

        if (invite.length === 0 || invite[0].restaurant.ownerId !== user.id) {
            return res.status(403).json({ message: "Invite not found or access denied" });
        }

        if (invite[0].invite.status !== "pending") {
            return res.status(400).json({ message: "Invite is already processed" });
        }

        // 2. Update status to accepted
        await db.update(restaurantCompanyInvites).set({ status: "accepted" }).where(eq(restaurantCompanyInvites.id, inviteId));

        // 3. Check if all restaurants in this master invitation have accepted
        const invitationId = invite[0].invite.invitationId;
        const allInvites = await db.select().from(restaurantCompanyInvites).where(eq(restaurantCompanyInvites.invitationId, invitationId));

        const allAccepted = allInvites.every((inv) => inv.status === "accepted");

        if (allAccepted) {
            // FINALIZATION LOGIC
            const master = invite[0].master;
            const generatedPassword = nanoid(12); // Secure random password

            // a. Find or create the Company Admin user
            let ownerUser = await db.select().from(authUsers).where(eq(authUsers.email, master.ownerEmail)).limit(1);

            let userId: string;
            if (ownerUser.length === 0) {
                userId = nanoid();
                await db.insert(authUsers).values({
                    id: userId,
                    email: master.ownerEmail,
                    role: "company_admin",
                    name: master.companyName + " Admin",
                });
            } else {
                userId = ownerUser[0].id;
                // Upgrade role if exists (unless already admin)
                if (ownerUser[0].role !== 'admin') {
                    await db.update(authUsers).set({ role: "company_admin" }).where(eq(authUsers.id, userId));
                }
            }

            // b. Check if company already exists to prevent duplication
            let company = await db.select().from(companies).where(eq(companies.ownerId, userId)).limit(1);
            let companyId: string;

            if (company.length === 0) {
                // b. Create the Company
                companyId = nanoid();
                await db.insert(companies).values({
                    id: companyId,
                    name: master.companyName,
                    ownerId: userId,
                });
            } else {
                companyId = company[0].id;
            }

            // c. Create/Update authAccount with properly hashed password (scrypt via better-auth)
            const hashedPassword = await hashPassword(generatedPassword);
            const existingAccount = await db.select().from(authAccounts).where(and(eq(authAccounts.userId, userId), eq(authAccounts.providerId, "credential"))).limit(1);

            if (existingAccount.length === 0) {
                await db.insert(authAccounts).values({
                    id: nanoid(),
                    userId,
                    accountId: master.ownerEmail,
                    providerId: "credential",
                    password: hashedPassword,
                });
            } else {
                await db.update(authAccounts).set({ password: hashedPassword }).where(eq(authAccounts.id, existingAccount[0].id));
            }

            // d. Link all restaurants to this company
            const restaurantIds = allInvites.map((inv) => inv.restaurantId);
            await db.update(restaurants).set({ companyId }).where(inArray(restaurants.id, restaurantIds));

            // e. Mark master invitation as completed and store the password
            await db.update(companyInvitations).set({
                status: "completed",
                generatedPassword: generatedPassword
            }).where(eq(companyInvitations.id, invitationId));

            return res.status(200).json({
                message: "All restaurants accepted. Company created!",
                finalized: true,
                credentials: {
                    email: master.ownerEmail,
                    password: generatedPassword
                }
            });
        }

        res.status(200).json({ message: "Invitation accepted. Waiting for other restaurants.", finalized: false });
    } catch (error) {
        console.error("ACCEPT INVITE ERROR:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
