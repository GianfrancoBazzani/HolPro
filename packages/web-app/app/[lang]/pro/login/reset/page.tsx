import { ResetPage, type PageProps } from "@/components/auth/pages";
import { portals } from "@/lib/auth/portals";
export default function Page(props: PageProps) {
  return <ResetPage portal={portals.coach} {...props} />;
}
