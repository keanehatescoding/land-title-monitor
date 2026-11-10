#!/usr/bin/env tsx
import { db } from "../src/db/index";

async function main() {
  console.log("Seeding database...");
  // Add seed data here as needed
  console.log("Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
