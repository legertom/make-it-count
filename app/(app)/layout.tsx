import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FeedbackLauncher } from "@/components/feedback/FeedbackLauncher";

/** Everything under here requires a signed-in Clever account. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  return (
    <>
      {children}
      <FeedbackLauncher />
    </>
  );
}
