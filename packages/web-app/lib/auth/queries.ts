import { users } from "@holpro/db";
import { and, eq, isNull } from "drizzle-orm";
// One definition of a usable account for every query that joins `users`.
export const activeUser = (id: string) =>
  and(eq(users.id, id), eq(users.status, "active"), isNull(users.deletedAt));
