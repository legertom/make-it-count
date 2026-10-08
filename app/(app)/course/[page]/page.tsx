import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isPageKey, pageTitle, pageUrl, resolvePageKey } from "@/lib/course-pages";

export async function generateMetadata({ params }: PageProps<"/course/[page]">): Promise<Metadata> {
  const { page } = await params;
  // The root layout's title template appends the site name.
  return { title: isPageKey(page) ? pageTitle(page) : "Make It Count" };
}

/**
 * The course itself renders from the parent layout; this route just owns the URL.
 * Links to pages that have since been folded into another land on that page.
 */
export default async function CoursePage({ params }: PageProps<"/course/[page]">) {
  const { page } = await params;
  if (!isPageKey(page)) {
    const moved = resolvePageKey(page);
    if (moved) redirect(pageUrl(moved));
    notFound();
  }
  return null;
}
