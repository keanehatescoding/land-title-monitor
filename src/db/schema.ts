import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const parcelKindEnum = pgEnum("parcel_kind", ["freehold", "leasehold", "sectional"]);
export const alertKindEnum = pgEnum("alert_kind", [
  "ownership_change",
  "charge_registered",
  "charge_discharged",
  "caveat_lodged",
  "caveat_removed",
  "cautionary_notice",
  "status_mismatch",
  "search_failed",
]);
export const alertSeverityEnum = pgEnum("alert_severity", ["info", "warning", "critical"]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "requested",
  "in_progress",
  "clean",
  "flagged",
  "failed",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "past_due", "cancelled"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    nationalId: text("national_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** A piece of land the user wants watched. Keyed by Ardhisasa title number. */
export const parcels = pgTable(
  "parcels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    titleNumber: text("title_number").notNull(),
    county: text("county").notNull(),
    registry: text("registry").notNull(),
    kind: parcelKindEnum("kind").notNull().default("freehold"),
    label: text("label").notNull(),
    // How often to re-pull the registry search. Nulls mean paused.
    monitorIntervalDays: integer("monitor_interval_days").default(7),
    monitoringPausedAt: timestamp("monitoring_paused_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("parcels_user_title_idx").on(t.ownerId, t.titleNumber)],
);

/** A snapshot of the official search for a parcel at one point in time. The diff between snapshots drives alerts. */
export const titleSnapshots = pgTable(
  "title_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcelId: uuid("parcel_id")
      .notNull()
      .references(() => parcels.id, { onDelete: "cascade" }),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull().default("ardhisasa"),
    // Raw JSON payload from the search. Content hashed for cheap change detection.
    payload: text("payload").notNull(),
    payloadSha256: text("payload_sha256").notNull(),
    ownersListed: text("owners_listed").array().notNull().default(sql`'{}'::text[]`),
    chargesListed: text("charges_listed").array().notNull().default(sql`'{}'::text[]`),
    caveatsListed: text("caveats_listed").array().notNull().default(sql`'{}'::text[]`),
    acreage: text("acreage"),
  },
  (t) => [index("title_snapshots_parcel_idx").on(t.parcelId, t.takenAt)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcelId: uuid("parcel_id")
      .notNull()
      .references(() => parcels.id, { onDelete: "cascade" }),
    kind: alertKindEnum("kind").notNull(),
    severity: alertSeverityEnum("severity").notNull(),
    // The snapshot that revealed the change (null for "search failed" alerts).
    snapshotId: uuid("snapshot_id").references(() => titleSnapshots.id, { onDelete: "set null" }),
    summary: text("summary").notNull(),
    details: text("details").notNull().default(""),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    acknowledgedBy: uuid("acknowledged_by").references(() => users.id, { onDelete: "set null" }),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    smsSentAt: timestamp("sms_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alerts_parcel_idx").on(t.parcelId, t.createdAt),
    index("alerts_unack_idx").on(t.acknowledgedAt),
  ],
);

/** One-off verification orders: buyer's lawyer pays to confirm a title before signing. */
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    titleNumber: text("title_number").notNull(),
    county: text("county").notNull(),
    purposeNote: text("purpose_note").notNull().default(""),
    status: verificationStatusEnum("status").notNull().default("requested"),
    feeKes: integer("fee_kes").notNull(),
    reportUrl: text("report_url"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("verifications_requester_idx").on(t.requesterId, t.createdAt)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    monthlyPriceKes: integer("monthly_price_kes").notNull(),
    parcelsIncluded: integer("parcels_included").notNull(),
    accessUntil: timestamp("access_until", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("subscriptions_user_idx").on(t.userId, t.status)],
);

export const parcelRelations = relations(parcels, ({ one, many }) => ({
  owner: one(users, { fields: [parcels.ownerId], references: [users.id] }),
  snapshots: many(titleSnapshots),
  alerts: many(alerts),
}));

export const alertRelations = relations(alerts, ({ one }) => ({
  parcel: one(parcels, { fields: [alerts.parcelId], references: [parcels.id] }),
  snapshot: one(titleSnapshots, { fields: [alerts.snapshotId], references: [titleSnapshots.id] }),
}));

export type Parcel = typeof parcels.$inferSelect;
export type TitleSnapshot = typeof titleSnapshots.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
