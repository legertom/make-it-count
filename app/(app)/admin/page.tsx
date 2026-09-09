import Link from "next/link";
import { StatusSelect, STATUS_LABELS } from "@/components/admin/StatusSelect";
import { FEEDBACK_STATUSES, FEEDBACK_TYPES, type FeedbackStatus, type FeedbackType } from "@/lib/db/schema";
import { feedbackCounts, listFeedback } from "@/lib/db/queries";
import { fmtDate } from "@/lib/format";
import { pageTitle } from "@/lib/course-pages";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = { bug: "Bug", feature: "Feature", other: "Comment" };

function pick<T extends string>(raw: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export default async function AdminFeedbackPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const type = pick<FeedbackType>(sp.type, FEEDBACK_TYPES);
  const status = pick<FeedbackStatus>(sp.status, FEEDBACK_STATUSES);
  const [rows, counts] = await Promise.all([listFeedback({ type, status }), feedbackCounts()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const link = (patch: { type?: FeedbackType; status?: FeedbackStatus }) => {
    const q: Record<string, string> = {};
    const t = "type" in patch ? patch.type : type;
    const s = "status" in patch ? patch.status : status;
    if (t) q.type = t;
    if (s) q.status = s;
    return { pathname: "/admin" as const, query: q };
  };

  return (
    <>
      <h1>Feedback</h1>
      <p className="adm-lede">Everything people have sent through the Feedback button, via the assistant or the direct form.</p>

      <div className="adm-stats">
        <div className="adm-stat"><b>{total}</b><span>Total</span></div>
        <div className="adm-stat"><b>{counts.new ?? 0}</b><span>New</span></div>
        <div className="adm-stat"><b>{(counts.triaged ?? 0) + (counts.in_progress ?? 0)}</b><span>Triaged or in progress</span></div>
        <div className="adm-stat"><b>{counts.done ?? 0}</b><span>Done</span></div>
      </div>

      <div className="adm-filters">
        <span className="lbl">Type</span>
        <Link href={link({ type: undefined })} aria-current={!type ? "true" : undefined}>All</Link>
        {FEEDBACK_TYPES.map((t) => (
          <Link key={t} href={link({ type: t })} aria-current={type === t ? "true" : undefined}>{TYPE_LABELS[t]}</Link>
        ))}
        <span className="gap" />
        <span className="lbl">Status</span>
        <Link href={link({ status: undefined })} aria-current={!status ? "true" : undefined}>All</Link>
        {FEEDBACK_STATUSES.map((s) => (
          <Link key={s} href={link({ status: s })} aria-current={status === s ? "true" : undefined}>{STATUS_LABELS[s]}</Link>
        ))}
      </div>

      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Title</th>
              <th>From</th>
              <th>Where</th>
              <th>Shot</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="adm-empty">Nothing here yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="nowrap muted">{fmtDate(r.createdAt, true)}</td>
                <td><span className="badge" data-type={r.type}>{TYPE_LABELS[r.type]}</span></td>
                <td><Link href={`/admin/feedback/${r.id}`}>{r.title}</Link></td>
                <td>{r.submitterName || r.submittedBy}<br /><small className="muted">{r.submitterName ? r.submittedBy : ""}</small></td>
                <td className="muted">{r.coursePage ? pageTitle(r.coursePage) : r.page ?? ""}</td>
                <td className="muted">{r.screenshotId ? "Yes" : ""}</td>
                <td><StatusSelect id={r.id} value={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
