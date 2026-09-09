import Link from "next/link";
import { SortableTable, type SortableRow } from "@/components/admin/SortableTable";
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

  const STATUS_ORDER: Record<string, number> = { new: 0, triaged: 1, in_progress: 2, done: 3, wont_fix: 4 };
  const feedbackRows: SortableRow[] = rows.map((r) => ({
    id: r.id,
    sort: {
      when: r.createdAt.getTime(),
      type: r.type,
      title: r.title.toLowerCase(),
      from: (r.submitterName || r.submittedBy).toLowerCase(),
      where: r.coursePage ? pageTitle(r.coursePage) : r.page ?? "",
      shot: r.screenshotId ? 1 : 0,
      status: STATUS_ORDER[r.status] ?? 9,
    },
    cells: [
      <span key="w" className="nowrap muted">{fmtDate(r.createdAt, true)}</span>,
      <span key="t" className="badge" data-type={r.type}>{TYPE_LABELS[r.type]}</span>,
      <Link key="l" href={`/admin/feedback/${r.id}`}>{r.title}</Link>,
      <span key="f">{r.submitterName || r.submittedBy}<br /><small className="muted">{r.submitterName ? r.submittedBy : ""}</small></span>,
      <span key="p" className="muted">{r.coursePage ? pageTitle(r.coursePage) : r.page ?? ""}</span>,
      <span key="s" className="muted">{r.screenshotId ? "Yes" : ""}</span>,
      <StatusSelect key="st" id={r.id} value={r.status} />,
    ],
  }));

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

      <SortableTable
        columns={[
          { key: "when", label: "When", defaultDir: "desc" },
          { key: "type", label: "Type" },
          { key: "title", label: "Title" },
          { key: "from", label: "From" },
          { key: "where", label: "Where" },
          { key: "shot", label: "Shot", defaultDir: "desc" },
          { key: "status", label: "Status" },
        ]}
        rows={feedbackRows}
        initialSort={{ key: "when", dir: "desc" }}
      />
    </>
  );
}
