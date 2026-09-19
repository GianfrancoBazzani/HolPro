import { SentPage, type Search } from "@/components/auth/pages";
import { portals } from "@/lib/auth/portals";
export default function Page({ searchParams }: { searchParams: Search }) {
  return <SentPage portal={portals.coach} searchParams={searchParams} />;
}
