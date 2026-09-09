import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { auth } from "@/auth";
import { signOutAction } from "@/app/(app)/actions";
import { normalizeEmail } from "@/lib/access";
import { CHAPTERS, PAGES, PAGE_COUNT, isPageKey, pageIndex, pageTitle, pageUrl } from "@/lib/course-pages";
import { getProgress } from "@/lib/db/queries";
import { fmtDate, initials } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Home: where you are in the course, and a map of every page. */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email || !session?.user) redirect("/login");

  const [progress, sp] = await Promise.all([getProgress(email), searchParams]);
  const user = session.user;
  const currentKey = progress && isPageKey(progress.currentPage) ? progress.currentPage : "why-frame";
  const currentIndex = pageIndex(currentKey);
  const furthest = Math.max(progress?.furthestIndex ?? 0, currentIndex);
  const started = Boolean(progress);
  const completedAt = progress?.completedAt ?? null;
  const pct = completedAt ? 100 : started ? Math.round(((furthest + 1) / PAGE_COUNT) * 100) : 0;

  return (
    <div className="cb">
      <header className="cb-top">
        <div className="cb-top-in">
          <Link href="/" className="cb-brand" aria-label="Make It Count home">
            <span className="cb-brand-name">Make It Count</span>
            <span className="cb-brand-sub">Using AI where it pays off.</span>
          </Link>
          <div className="mic-user">
            {user.isAdmin && (
              <Link className="mic-user-link" href="/admin/learners">
                Admin
              </Link>
            )}
            <span className="mic-user-chip">
              <span className="mic-avatar" aria-hidden="true">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" referrerPolicy="no-referrer" data-screenshot-hide="" />
                ) : (
                  initials(user.name, email)
                )}
              </span>
              <span className="mic-user-name">{user.name ?? email}</span>
            </span>
            <form action={signOutAction}>
              <button type="submit" className="mic-user-link">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="cb-shell">
        {sp.denied === "admin" && (
          <div className="cb-banner" role="status">That page is for course admins only.</div>
        )}
        <main className="cb-col">
          <p className="cb-eyebrow">A ten-minute course for everyone at Clever</p>
          <h1>Make It Count</h1>
          <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
            How to use Claude and Gemini on purpose: the right tool, a focused conversation, and the right amount of
            horsepower for the job in front of you.
          </p>

          <div className="home-status">
            <div className="home-status-text">
              {completedAt ? (
                <>
                  <b>
                    <Check size={16} aria-hidden="true" style={{ color: "var(--good)", verticalAlign: "-3px" }} /> You completed this course
                  </b>
                  <span>{fmtDate(completedAt, true)}. Come back any time for the job aid or to leave more feedback.</span>
                </>
              ) : started ? (
                <>
                  <b>Pick up where you left off</b>
                  <span>
                    Page {currentIndex + 1} of {PAGE_COUNT} · {pageTitle(currentKey)}
                  </span>
                </>
              ) : (
                <>
                  <b>You haven't started yet</b>
                  <span>Twenty-one short pages. Your place is saved as you go, on any device.</span>
                </>
              )}
              <span className="home-bar" aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
            </div>
            <Link href={completedAt ? pageUrl("done") : pageUrl(currentKey)} className="cb-btn cb-btn-primary">
              {completedAt ? "Open the job aid" : started ? "Continue" : "Start the course"}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <h2 style={{ marginTop: "2.2rem" }}>What's in it</h2>
          <ol className="home-toc">
            {CHAPTERS.map((c, ci) => (
              <li key={c.name} className="home-toc-section">
                <div className="home-toc-head">
                  <span className="cb-maprow-n" aria-hidden="true">{ci + 1}</span>
                  <b>{c.name}</b>
                </div>
                <ul>
                  {c.pages.map((key) => {
                    const idx = PAGES.findIndex((p) => p.key === key);
                    const seen = started && idx <= furthest;
                    const current = !completedAt && started && key === currentKey;
                    return (
                      <li key={key}>
                        <Link href={pageUrl(key)} className="home-toc-page" data-seen={seen} data-current={current}>
                          <span className="home-toc-dot" aria-hidden="true">
                            {seen ? <Check size={11} /> : null}
                          </span>
                          {pageTitle(key)}
                          {current && <span className="badge" data-status="new">you're here</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </main>
      </div>
    </div>
  );
}
