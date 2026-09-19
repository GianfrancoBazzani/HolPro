import { WelcomePage } from "@/components/auth/pages";
import { portals } from "@/lib/auth/portals";
export default function Page() {
  return <WelcomePage portal={portals.coach} />;
}
