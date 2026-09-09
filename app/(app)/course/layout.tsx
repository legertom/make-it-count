import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MakeItCount, type CourseAnswers } from "@/components/course/MakeItCount";
import { normalizeEmail } from "@/lib/access";
import { getProgress } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * The course lives in this layout rather than in the [page] route so that
 * moving between pages keeps the component (and the learner's answers) mounted.
 * The page key comes from the URL via useParams inside MakeItCount.
 */
export default async function CourseLayout({ children }: LayoutProps<"/course">) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email || !session?.user) redirect("/login");
  const progress = await getProgress(email);

  return (
    <>
      {children}
      <MakeItCount
        user={{
          email,
          name: session.user.name ?? null,
          image: session.user.image ?? null,
          isAdmin: Boolean(session.user.isAdmin),
        }}
        initial={{
          furthestIndex: progress?.furthestIndex ?? 0,
          answers: (progress?.answers ?? {}) as Partial<CourseAnswers>,
          completedAt: progress?.completedAt ? progress.completedAt.toISOString() : null,
          rating: progress?.rating ?? null,
          ratingComment: progress?.ratingComment ?? null,
        }}
      />
    </>
  );
}
