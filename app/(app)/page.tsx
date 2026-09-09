import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { normalizeEmail } from "@/lib/access";
import { isPageKey, pageUrl } from "@/lib/course-pages";
import { getProgress } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/** Home sends you to wherever you left off in the course. */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) redirect("/login");

  const [progress, sp] = await Promise.all([getProgress(email), searchParams]);
  const key = progress && isPageKey(progress.currentPage) ? progress.currentPage : "why-frame";
  const qs = sp.denied === "admin" ? "?denied=admin" : "";
  redirect(pageUrl(key) + qs);
}
