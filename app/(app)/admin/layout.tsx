import Link from "next/link";
import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return (
      <main className="adm">
        <h1>Admins only</h1>
        <p className="adm-lede">This part of Make It Count is for course admins.</p>
        <Link href="/" className="cb-btn cb-btn-primary">Back to the course</Link>
      </main>
    );
  }
  return (
    <div className="adm">
      <header className="adm-top">
        <Link href="/" className="cb-brand-name" style={{ textDecoration: "none", color: "inherit" }}>
          Make It Count
        </Link>
        <span className="cb-brand-sub">Admin</span>
        <AdminNav />
        <span style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-3)" }}>{session.user.email}</span>
          <Link href="/" className="mic-user-link">Course</Link>
        </span>
      </header>
      <main>{children}</main>
    </div>
  );
}
