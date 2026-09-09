import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MakeItCount, type CourseAnswers } from "@/components/course/MakeItCount";
import { normalizeEmail } from "@/lib/access";
import { pageIndex } from "@/lib/course-pages";
import { getProgress } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CoursePage({ searchParams }: PageProps<"/">) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email || !session?.user) redirect("/login");

  const [progress, sp] = await Promise.all([getProgress(email), searchParams]);
  const denied = sp.denied === "admin";

  return (
    <MakeItCount
      user={{
        email,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        isAdmin: Boolean(session.user.isAdmin),
      }}
      initial={{
        page: progress ? pageIndex(progress.currentPage) : 0,
        furthestIndex: progress?.furthestIndex ?? 0,
        answers: (progress?.answers ?? {}) as Partial<CourseAnswers>,
        completedAt: progress?.completedAt ? progress.completedAt.toISOString() : null,
      }}
      notice={denied ? "That page is for course admins only." : null}
    />
  );
}
