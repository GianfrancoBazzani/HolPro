import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import "@/components/auth/auth.css";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePortalUser(portals.coachee);
  return children;
}
