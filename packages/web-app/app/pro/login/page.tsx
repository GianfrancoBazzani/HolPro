import { LoginPage, type Search } from "@/components/auth/pages";
import { portals } from "@/lib/auth/portals";
export default function Page({ searchParams }: { searchParams: Search }) {
  return <LoginPage portal={portals.coach} searchParams={searchParams} />;
}
