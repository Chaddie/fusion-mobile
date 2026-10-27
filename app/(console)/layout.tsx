import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { regionLabel } from "@/lib/format";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");
  return <Shell region={regionLabel(session.dataRegion)}>{children}</Shell>;
}
