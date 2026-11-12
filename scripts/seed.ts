#!/usr/bin/env tsx
import { db, schema } from "../src/db/index";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run seed");
  }

  console.log("Seeding database...");

  const demoEmail = "demo@land-title-monitor.local";

  await db.transaction(async (tx) => {
    const [user] =
      (await tx
        .insert(schema.users)
        .values({
          email: demoEmail,
          name: "Demo User",
          passwordHash: "seed-placeholder-hash",
        })
        .onConflictDoNothing()
        .returning({ id: schema.users.id })) ?? [];

    const userId =
      user?.id ??
      (
        await tx.query.users.findFirst({
          columns: { id: true },
          where: (users, { eq, sql }) => eq(sql`lower(${users.email})`, demoEmail),
        })
      )?.id;

    if (!userId) {
      throw new Error("Failed to resolve seeded demo user");
    }

    await tx
      .insert(schema.parcels)
      .values({
        ownerId: userId,
        titleNumber: "DEMO/TITLE/001",
        county: "Nairobi",
        registry: "Nairobi Registry",
        kind: "freehold",
        label: "Demo Parcel",
      })
      .onConflictDoNothing();
  });

  console.log("Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
