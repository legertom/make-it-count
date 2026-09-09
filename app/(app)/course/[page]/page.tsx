import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPageKey, pageTitle } from "@/lib/course-pages";

export async function generateMetadata({ params }: PageProps<"/course/[page]">): Promise<Metadata> {
  const { page } = await params;
  return { title: isPageKey(page) ? `${pageTitle(page)} · Make It Count` : "Make It Count" };
}

/** The course itself renders from the parent layout; this route just owns the URL. */
export default async function CoursePage({ params }: PageProps<"/course/[page]">) {
  const { page } = await params;
  if (!isPageKey(page)) notFound();
  return null;
}
