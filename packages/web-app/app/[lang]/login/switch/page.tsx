import { SwitchPage, type PageProps } from "@/components/auth/pages";
import { portals } from "@/lib/auth/portals";
export default function Page(props: PageProps) {
  return <SwitchPage portal={portals.coachee} {...props} />;
}
