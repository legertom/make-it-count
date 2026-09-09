import Link from "next/link";
import { notFound } from "next/navigation";
import { NotesForm } from "@/components/admin/NotesForm";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { getFeedback } from "@/lib/db/queries";
import { fmtDate } from "@/lib/format";
import { pageTitle } from "@/lib/course-pages";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = { bug: "Bug", feature: "Feature request", other: "Comment", rating: "Course rating" };

export default async function FeedbackDetailPage({ params }: PageProps<"/admin/feedback/[id]">) {
  const { id } = await params;
  const row = await getFeedback(id);
  if (!row) notFound();

  return (
    <>
      <Link href="/admin" className="adm-back">&larr; All feedback</Link>
      <h1>{row.title}</h1>
      <p className="adm-lede">
        <span className="badge" data-type={row.type}>{TYPE_LABELS[row.type]}</span>{" "}
        <span className="badge" data-status={row.status}>{row.status.replace("_", " ")}</span>
      </p>

      <div className="adm-detail">
        <div>
          <div className="adm-card">
            <h3>Description</h3>
            <div className="adm-desc">{row.description}</div>
          </div>
          {row.screenshotId && (
            <div className="adm-card">
              <h3>Screenshot</h3>
              <a href={`/api/screenshots/${row.screenshotId}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="adm-shot" src={`/api/screenshots/${row.screenshotId}`} alt="Annotated screenshot attached to this feedback" />
              </a>
            </div>
          )}
          <div className="adm-card">
            <h3>Admin notes</h3>
            <NotesForm id={row.id} initial={row.adminNotes ?? ""} />
          </div>
        </div>
        <div>
          <div className="adm-card">
            <h3>Status</h3>
            <StatusSelect id={row.id} value={row.status} />
          </div>
          <div className="adm-card">
            <h3>Details</h3>
            <dl className="adm-meta">
              <dt>From</dt><dd>{row.submitterName ? `${row.submitterName} · ` : ""}{row.submittedBy}</dd>
              <dt>Sent</dt><dd>{fmtDate(row.createdAt, true)}</dd>
              <dt>Updated</dt><dd>{fmtDate(row.updatedAt, true)}</dd>
              <dt>Course page</dt><dd>{row.coursePage ? `${pageTitle(row.coursePage)} (${row.coursePage})` : "—"}</dd>
              <dt>Path</dt><dd>{row.page ?? "—"}</dd>
              <dt>Via</dt><dd>{row.source === "agent" ? "Feedback assistant" : row.source === "rating" ? "End-of-course rating" : "Direct form"}</dd>
              {row.agentSessionId && (<><dt>Agent session</dt><dd style={{ fontFamily: "var(--mono)", fontSize: "0.78rem" }}>{row.agentSessionId}</dd></>)}
              <dt>Browser</dt><dd style={{ fontSize: "0.78rem" }}>{row.userAgent ?? "—"}</dd>
              <dt>Id</dt><dd style={{ fontFamily: "var(--mono)", fontSize: "0.78rem" }}>{row.id}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
