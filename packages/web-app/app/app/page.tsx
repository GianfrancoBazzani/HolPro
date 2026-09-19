import { HomePage } from "@/components/auth/pages";
import { portals } from "@/lib/auth/portals";
export default function Page() {
  return <HomePage portal={portals.coachee} />;
}
