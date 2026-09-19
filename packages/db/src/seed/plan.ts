import { config } from "dotenv";
import { and, asc, eq } from "drizzle-orm";
import {
  users,
  coaches,
  coachees,
  engagements,
  planItems,
  planCheckpoints,
  planPeriods,
} from "../schema";
import { samplePlan } from "./plan-data";

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Plan seeding is development only.");
  const email = process.argv.slice(2).filter((arg) => arg !== "--")[0];
  if (!email)
    throw new Error(
      "Usage: pnpm --filter @holpro/db db:seed:plan -- <coachee-email>",
    );
  config({ path: "../web-app/.env.local", quiet: true });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { db } = await import("../client");
  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .innerJoin(coachees, eq(coachees.userId, users.id))
        .where(eq(users.email, email))
        .for("update");
      if (!user) throw new Error("No coachee exists with that email.");
      let engagement = await tx.query.engagements.findFirst({
        where: and(
          eq(engagements.coacheeId, user.id),
          eq(engagements.status, "active"),
        ),
        orderBy: [asc(engagements.startedAt), asc(engagements.id)],
      });
      if (!engagement) {
        let coachUser = await tx.query.users.findFirst({
          where: eq(users.email, "sample.coach@holpro.local"),
        });
        if (!coachUser) {
          const coachId = crypto.randomUUID();
          await tx
            .insert(users)
            .values({
              id: coachId,
              email: "sample.coach@holpro.local",
              name: "Sample Coach",
              status: "active",
              emailVerified: true,
            });
          coachUser = await tx.query.users.findFirst({
            where: eq(users.id, coachId),
          });
        }
        await tx
          .insert(coaches)
          .values({ userId: coachUser!.id })
          .onDuplicateKeyUpdate({ set: { userId: coachUser!.id } });
        const id = crypto.randomUUID();
        await tx
          .insert(engagements)
          .values({ id, coachId: coachUser!.id, coacheeId: user.id });
        engagement = await tx.query.engagements.findFirst({
          where: eq(engagements.id, id),
        });
      }
      await tx
        .delete(planItems)
        .where(eq(planItems.engagementId, engagement!.id));
      for (const item of samplePlan(new Date().toISOString().slice(0, 10))) {
        const id = crypto.randomUUID();
        await tx
          .insert(planItems)
          .values({
            id,
            engagementId: engagement!.id,
            kind: item.kind,
            title: item.title,
          });
        if (item.checkpoints.length)
          await tx
            .insert(planCheckpoints)
            .values(item.checkpoints.map((cp) => ({ ...cp, itemId: id })));
        if (item.periods.length)
          await tx
            .insert(planPeriods)
            .values(item.periods.map((p) => ({ ...p, itemId: id })));
      }
    });
    console.log("Sample plan seeded.");
  } finally {
    await db.$client.end();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Plan seeding failed.",
  );
  process.exitCode = 1;
});
