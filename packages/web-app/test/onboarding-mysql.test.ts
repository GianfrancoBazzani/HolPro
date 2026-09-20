import { beforeAll, afterAll, beforeEach, expect, it, describe } from "vitest";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createConnection } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
const url = process.env.ONBOARDING_TEST_DATABASE_URL;
describe.skipIf(!url)("onboarding against isolated MySQL", () => {
  let connection: Awaited<ReturnType<typeof createConnection>>;
  let repository: typeof import("../lib/onboarding/repository");
  let plans: typeof import("../lib/plans/repository");
  let coachId: string, coacheeId: string, otherCoachId: string;
  beforeAll(async () => {
    if (!url || new URL(url).pathname !== "/holpro_onboarding_test")
      throw Error("Use a dedicated holpro_onboarding_test database");
    process.env.DATABASE_URL = url;
    connection = await createConnection(url);
    await migrate(drizzle(connection), {
      migrationsFolder: resolve("../db/drizzle"),
    });
    repository = await import("../lib/onboarding/repository");
    plans = await import("../lib/plans/repository");
  }, 60000);
  beforeEach(async () => {
    for (const table of [
      "notifications",
      "onboarding_requests",
      "plan_document_drafts",
      "plan_document_versions",
      "plan_documents",
      "plan_items",
      "engagements",
      "coachee_goals",
      "coachees",
      "coaches",
      "users",
    ])
      await connection.query(`DELETE FROM ${table}`);
    coachId = randomUUID();
    coacheeId = randomUUID();
    otherCoachId = randomUUID();
    for (const [id, name] of [
      [coachId, "Coach"],
      [coacheeId, "Client"],
      [otherCoachId, "Other"],
    ])
      await connection.execute(
        "INSERT INTO users (id,full_name,email,status) VALUES (?,?,?,'active')",
        [id, name, `${id}@example.test`],
      );
    await connection.execute("INSERT INTO coaches (user_id) VALUES (?),(?)", [
      coachId,
      otherCoachId,
    ]);
    await connection.execute("INSERT INTO coachees (user_id) VALUES (?)", [
      coacheeId,
    ]);
    await connection.execute(
      "INSERT INTO coachee_goals (coachee_id,goals,summary) VALUES (?,?,?)",
      [
        coacheeId,
        "Eat better. One hour daily. No constraints reported.",
        "Eat better",
      ],
    );
  });
  afterAll(async () => {
    await connection?.end();
  });
  const draft = {
    title: "Review this plan",
    html: "<!doctype html><html><body><p>Draft</p></body></html>",
  };
  it("deduplicates concurrent confirmations and publishes only after the owner approves", async () => {
    const actor = { userId: coacheeId, role: "coachee" as const };
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        repository.requestOnboarding(actor, coachId),
      ),
    );
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    const job = await repository.claimOnboarding();
    expect(job).not.toBeNull();
    expect(await repository.completeOnboarding(job!, draft)).toBe(true);
    expect(await repository.completeOnboarding(job!, draft)).toBe(false);
    expect(await plans.listPlans(actor)).toEqual([]);
    const [plan] = await plans.listPlans({ userId: coachId, role: "coach" });
    const pending = await plans.readPlanDraft(
      { userId: coachId, role: "coach" },
      plan.planId,
    );
    await expect(
      plans.approvePlanDraft(otherCoachId, plan.planId, pending.draftId),
    ).rejects.toThrow();
    await plans.approvePlanDraft(coachId, plan.planId, pending.draftId);
    expect((await plans.listPlans(actor))[0].planId).toBe(plan.planId);
    expect((await repository.listOnboarding(actor))[0].status).toBe("approved");
    const [rows] = await connection.query(
      "SELECT user_id,kind FROM notifications ORDER BY kind",
    );
    expect(rows).toEqual([
      { user_id: coachId, kind: "draft_ready" },
      { user_id: coacheeId, kind: "plan_approved" },
    ]);
  });
  it("recovers expired work and rejects the previous worker's draft", async () => {
    await repository.requestOnboarding(
      { userId: coacheeId, role: "coachee" },
      coachId,
    );
    const first = await repository.claimOnboarding();
    await connection.execute(
      "UPDATE onboarding_requests SET lease_until=DATE_SUB(NOW(3),INTERVAL 1 MINUTE)",
    );
    const recovered = await repository.claimOnboarding();
    expect(recovered?.attempts).toBe(2);
    expect(await repository.completeOnboarding(first!, draft)).toBe(false);
    expect(await repository.completeOnboarding(recovered!, draft)).toBe(true);
  });
  it("exhausts retries visibly and permits only the request owner to retry", async () => {
    const actor = { userId: coacheeId, role: "coachee" as const };
    const request = await repository.requestOnboarding(actor, coachId);
    await connection.execute(
      "UPDATE onboarding_requests SET status='preparing',attempts=3,lease_until=DATE_SUB(NOW(3),INTERVAL 1 MINUTE)",
    );
    expect(await repository.claimOnboarding()).toBeNull();
    await repository.retryOnboarding(
      { userId: otherCoachId, role: "coach" },
      request.id,
    );
    expect((await repository.listOnboarding(actor))[0].status).toBe("failed");
    await repository.retryOnboarding(actor, request.id);
    expect((await repository.listOnboarding(actor))[0].status).toBe(
      "requested",
    );
  });
  it("stops push delivery when its login session expires or is deleted", async () => {
    const sessionId = randomUUID();
    await connection.execute(
      "INSERT INTO sessions (id,user_id,token,expires_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 1 DAY))",
      [sessionId, coachId, randomUUID()],
    );
    const notificationRepo = await import("../lib/notifications/repository");
    await notificationRepo.savePushSubscription(coachId, sessionId, {
      endpoint: "https://fcm.googleapis.com/push/test",
      keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) },
    });
    expect(
      (await notificationRepo.notificationRecipient(coachId)).subscriptions,
    ).toHaveLength(1);
    await connection.execute(
      "UPDATE sessions SET expires_at=DATE_SUB(NOW(),INTERVAL 1 DAY) WHERE id=?",
      [sessionId],
    );
    expect(
      (await notificationRepo.notificationRecipient(coachId)).subscriptions,
    ).toHaveLength(0);
    await connection.execute("DELETE FROM sessions WHERE id=?", [sessionId]);
    const [rows] = await connection.query("SELECT id FROM push_subscriptions");
    expect(rows).toEqual([]);
  });
});
