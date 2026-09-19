import { ResetPage, type Search } from "@/components/auth/pages";
import { portals } from "@/lib/auth/portals";
export default function Page({ searchParams }: { searchParams: Search }) {
  return <ResetPage portal={portals.coachee} searchParams={searchParams} />;
}
