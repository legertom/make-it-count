"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Check, Copy, Minus } from "lucide-react";
import { CHAPTERS, PAGES, PAGE_COUNT } from "@/lib/course-pages";
import { fmtDate, initials } from "@/lib/format";
import { clearCompletionAction, markCompleteAction, signOutAction } from "@/app/(app)/actions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CourseAnswers = {
  s1: string | null;
  placed: string[];
  h1: string | null;
  fkey: string;
  details: string[];
  detailsChecked: boolean;
  tool: string;
  effort: string;
  h4a: string | null;
  h4b: string | null;
  burners: string[];
  burnersChecked: boolean;
  fIdx: number;
  fAns: Record<string, string>;
  compact: boolean;
};

const INITIAL: CourseAnswers = {
  s1: null,
  placed: [],
  h1: null,
  fkey: "Role",
  details: [],
  detailsChecked: false,
  tool: "sonnet",
  effort: "High",
  h4a: null,
  h4b: null,
  burners: [],
  burnersChecked: false,
  fIdx: 0,
  fAns: {},
  compact: false,
};

type User = { email: string; name: string | null; image: string | null; isAdmin: boolean };

type Props = {
  user: User;
  initial: {
    page: number;
    furthestIndex: number;
    answers: Partial<CourseAnswers>;
    completedAt: string | null;
  };
  notice: string | null;
};

type Option = { key: string; label: string; correct: boolean; feedback: string };

/* ------------------------------------------------------------------ */
/*  Small shared pieces                                                */
/* ------------------------------------------------------------------ */

function CopyButton({ text, label = "Copy", copiedLabel = "Copied" }: { text: string; label?: string; copiedLabel?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* selection still available */
      }
      document.body.removeChild(ta);
    }
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  };
  return (
    <button type="button" className="cb-btn cb-btn-soft" onClick={copy}>
      {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {done ? copiedLabel : label}
    </button>
  );
}

function Feedback({ tone, title, children }: { tone: "good" | "rethink" | "info"; title: string; children: React.ReactNode }) {
  return (
    <div className="cb-fb" data-tone={tone} role="status">
      <h4>
        {tone === "good" ? <Check size={15} aria-hidden="true" /> : <Minus size={15} aria-hidden="true" />}
        {title}
      </h4>
      <p>{children}</p>
    </div>
  );
}

/** Single-select scenario with explanatory feedback for every option. */
function Scenario({
  prompt,
  options,
  value,
  onChange,
  idPrefix,
}: {
  prompt: string;
  options: Option[];
  value: string | null;
  onChange: (key: string) => void;
  idPrefix: string;
}) {
  const chosen = options.find((o) => o.key === value);
  return (
    <div className="cb-q">
      <div className="cb-q-prompt" id={idPrefix + "-q"}>{prompt}</div>
      <div className="cb-opts" role="group" aria-labelledby={idPrefix + "-q"}>
        {options.map((o) => (
          <button key={o.key} type="button" className="cb-opt" aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
            <span className="cb-opt-key" aria-hidden="true">{o.key}</span>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      {chosen && (
        <Feedback tone={chosen.correct ? "good" : "rethink"} title={chosen.correct ? "Strong choice" : "Worth another look"}>
          {chosen.feedback}
        </Feedback>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 2 — the working desk                                       */
/* ------------------------------------------------------------------ */

const DESK_ITEMS = [
  { id: "notes", label: "Notes from yesterday's call", kind: "useful", tag: "Has the decisions in it" },
  { id: "plan", label: "The final implementation plan", kind: "useful", tag: "The one source that's current" },
  { id: "draft", label: "Your half-written email draft", kind: "useful", tag: "What you're improving" },
  { id: "folder", label: "The whole shared folder, just in case", kind: "clutter", tag: "Not for this job" },
  { id: "pto", label: "A quick question about your PTO balance", kind: "clutter", tag: "Different job entirely" },
  { id: "old", label: "Last quarter's superseded plan", kind: "clutter", tag: "Out of date" },
  { id: "loops", label: "Nine rounds of “make it shorter”", kind: "clutter", tag: "Already resolved" },
] as const;

function Desk({ placed, setPlaced }: { placed: string[]; setPlaced: (fn: (p: string[]) => string[]) => void }) {
  const toggle = (id: string) => setPlaced((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const items = DESK_ITEMS.filter((i) => placed.includes(i.id));
  const useful = items.filter((i) => i.kind === "useful").length;
  const clutter = items.length - useful;
  // Load rises with everything on the desk, useful or not. Three right pieces
  // sit at MODERATE; a fourth item of any kind tips it to HIGHER.
  const load = items.length === 0 ? 0 : items.length <= 2 ? 1 : items.length === 3 ? 2 : 3;
  const loadWord = ["EMPTY", "LOWER", "MODERATE", "HIGHER"][load];

  return (
    <div className="cb-desk-wrap">
      <div className="cb-desk">
        <div className="cb-desk-job">
          <strong>Today's job:</strong> draft a follow-up email to a district administrator.
        </div>
        <div className="cb-desk-surface">
          {items.length === 0 && <p className="cb-desk-empty">A clean desk. Add something below.</p>}
          {items.map((i) => (
            <div key={i.id} className="cb-item" data-kind={i.kind}>
              <span>
                {i.label}
                <span className="cb-item-tag">{i.kind === "useful" ? "Helps · " : "Clutter · "}{i.tag}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="cb-tray" role="group" aria-label="Things you could put on the desk">
        {DESK_ITEMS.map((i) => (
          <button key={i.id} type="button" className="cb-chip" aria-pressed={placed.includes(i.id)} onClick={() => toggle(i.id)}>
            {placed.includes(i.id) ? <Check size={13} aria-hidden="true" /> : null}
            {i.label}
          </button>
        ))}
      </div>

      <div className="cb-load">
        <div className="cb-load-bars" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className="cb-load-seg" data-on={load >= n} data-hot={load === 3 && clutter > 0} />
          ))}
        </div>
        <span className="cb-load-label">Desk load · {loadWord}</span>
        <span className="cb-load-read" role="status">
          {items.length === 0
            ? "Nothing to work with yet."
            : useful === 1
              ? `1 piece that helps this job, ${clutter} that ${clutter === 1 ? "doesn't" : "don't"}.`
              : `${useful} pieces that help this job, ${clutter} that ${clutter === 1 ? "doesn't" : "don't"}.`}
        </span>
        <button
          type="button"
          className="cb-btn cb-btn-ghost"
          style={{ marginLeft: "auto", padding: "0.45rem 0.85rem", fontSize: "0.87rem" }}
          onClick={() => setPlaced((p) => p.filter((id) => DESK_ITEMS.find((i) => i.id === id)?.kind === "useful"))}
          disabled={clutter === 0}
        >
          Clear what this job doesn't need
        </button>
      </div>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-3)", marginTop: "0.7rem" }}>
        Load goes up with everything you add, useful or not, so a full bar isn't the goal. The three pieces that
        help, and nothing else, is the sweet spot for this job. The bar is relative: what Claude actually uses depends
        on the task, the model, the effort level, and any features you have turned on.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 3 — habits                                                 */
/* ------------------------------------------------------------------ */

const RACE = [
  {
    k: "Role",
    d: "Who Claude is for this task, and who the reader is. “You're helping a customer success manager write to a district technology director” sets tone and assumptions in one line.",
  },
  {
    k: "Action",
    d: "What you want to exist when Claude is done. A 150-word follow-up email, not “help with the email.”",
  },
  {
    k: "Context",
    d: "The specific material that informs the work. Two right documents beat twenty hopeful ones.",
  },
  {
    k: "Expectation",
    d: "The shape and rules of the result: format, length, tone, and what Claude must not invent. This is what saves you the “no, shorter” round.",
  },
];

const DETAIL_OPTIONS = [
  { id: "d1", label: "The three decisions the group made on the call", keep: true, note: "Keep. This is the actual substance of the email (Context)." },
  { id: "d2", label: "Who's receiving it: the district's technology director, who was on the call", keep: true, note: "Keep. The reader changes tone, detail, and what you can assume (Role)." },
  { id: "d3", label: "The tone and length you want: warm, direct, about 150 words", keep: true, note: "Keep. This is what saves you the “no, shorter” round (Expectation)." },
  { id: "d4", label: "The district's full signed contract", keep: false, note: "Leave it out. It looks authoritative, but nothing in a follow-up email depends on it." },
  { id: "d5", label: "A rule: don't invent dates or commitments we didn't make", keep: true, note: "Keep. A constraint like this prevents the most expensive kind of rewrite (Expectation)." },
  { id: "d6", label: "Your team's Q3 goals", keep: false, note: "Leave it out. Real, important, and unrelated to this email." },
];

const TOOLS = [
  {
    id: "gemini",
    name: "Gemini",
    rel: "Effectively unmetered for us",
    desc: "A sensible home for high-volume, routine work when the quality is there: brainstorming, quick summaries, many variations, low-stakes first drafts, exploring an idea before it's shaped.",
  },
  {
    id: "sonnet",
    name: "Claude Sonnet",
    rel: "Moderate usage",
    desc: "The everyday Claude choice. Writing, document work, analysis, synthesis, customer-facing drafts. Most normal knowledge work lands here comfortably.",
  },
  {
    id: "opus",
    name: "Claude Opus",
    rel: "Higher usage",
    desc: "For work that genuinely benefits from deeper reasoning: ambiguous problems, conflicting evidence, consequential recommendations, difficult synthesis. Also where you go when Sonnet isn't getting you there.",
  },
];

const EFFORTS = [
  { id: "Low", speed: "Fastest", use: "LOWER", d: "Routine work. Quick edits, simple lookups, mechanical transformations." },
  { id: "Medium", speed: "Fast", use: "LOWER", d: "Everyday tasks that need a little care but not deep thinking." },
  { id: "High", speed: "Balanced", use: "MODERATE", d: "The balanced default. Real analysis, synthesis, work you'll send to someone." },
  { id: "Extra high", speed: "Slower", use: "HIGHER", d: "Deeper reasoning on long, demanding work. Above High, below Max." },
  { id: "Max", speed: "Slowest", use: "HIGHER", d: "The most thorough setting. Reserve it for work that truly justifies the extra reasoning and the extra wait." },
];

const HANDOFF_PROMPT =
  "Create a compact handoff for a fresh conversation. Preserve the goal, verified facts, decisions we've made, important constraints, open questions, and the next step. Leave out brainstorming, dead ends, repeated discussion, and anything we no longer need.";

/* ------------------------------------------------------------------ */
/*  Section 4 — budget burners                                         */
/* ------------------------------------------------------------------ */

const BURNERS = [
  { id: "b1", label: "Start a fresh chat for this task", keep: true, note: "Yes. Nineteen days and eighty-four messages of unrelated work is a lot for Claude to hold while it makes one paragraph friendlier." },
  { id: "b2", label: "Move down from Opus for this task", keep: true, note: "Yes. Rewriting one paragraph rarely needs the deepest-reasoning model." },
  { id: "b3", label: "Lower the effort level for this task", keep: true, note: "Yes. Effort is a second dial, and this task doesn't need the top of it." },
  { id: "b4", label: "Clear the seven obsolete drafts out of the Project", keep: true, note: "Yes. Old versions of a document are the clutter most likely to confuse the current answer, not just enlarge it." },
  { id: "b5", label: "Rewrite the prompt to be much longer and more detailed", keep: false, note: "Not this one. “Can you make this paragraph friendlier?” is a perfectly good request. The mismatch is everything around it." },
];

/* ------------------------------------------------------------------ */
/*  Section 6 — final scenarios                                        */
/* ------------------------------------------------------------------ */

const FINAL: { prompt: string; options: Option[] }[] = [
  {
    prompt: "Marketing needs 40 variations of event copy, all built from approved source material. Straightforward work, just a lot of it.",
    options: [
      { key: "A", label: "Gemini, if the quality holds up.", correct: true, feedback: "High-volume, routine work off approved source material is exactly what Gemini is good for here. That's a tool-fit decision, not a compromise." },
      { key: "B", label: "Claude Opus at Max effort, so every variation is excellent.", correct: false, feedback: "Forty routine variations don't get meaningfully better from the deepest reasoning setting. Save that for work where the thinking is the hard part." },
      { key: "C", label: "Claude Sonnet, one variation per chat.", correct: false, feedback: "Sonnet could handle this fine, but forty separate chats adds work for you without adding quality. This is a volume job, and Gemini is a good home for it." },
    ],
  },
  {
    prompt: "Three research documents disagree with each other, and you have to recommend a direction to leadership by Thursday.",
    options: [
      { key: "A", label: "Gemini, because it's unmetered and this is a lot of reading.", correct: false, feedback: "Volume isn't what makes this hard. The disagreement is. This is the kind of work where deeper reasoning earns its usage." },
      { key: "B", label: "Claude Opus with the three documents attached, effort raised for the analysis.", correct: true, feedback: "Conflicting evidence and a consequential recommendation is the case for more horsepower. Attaching the three relevant documents, and nothing else, keeps the context sharp." },
      { key: "C", label: "Claude at the lowest effort, to keep usage down.", correct: false, feedback: "This is where being frugal costs more than it saves. If the recommendation matters, the reasoning behind it is worth the usage." },
    ],
  },
  {
    prompt: "You've spent two hours researching in one Claude conversation. Now you need to write the actual deliverable.",
    options: [
      { key: "A", label: "Keep going in the same chat so nothing gets lost.", correct: false, feedback: "Nothing is lost either way. That chat stays in your history. But two hours of exploration, including the paths you abandoned, comes along for the ride." },
      { key: "B", label: "Ask for a compact handoff, then start a new chat for the writing.", correct: true, feedback: "You carry forward the goal, the facts, the decisions, and the open questions, and leave the dead ends behind. This is the phase change the handoff was built for." },
      { key: "C", label: "Start a new chat and re-explain everything from memory.", correct: false, feedback: "Right instinct, more work than you need. Let Claude write the summary while it still has all the detail in front of it." },
    ],
  },
  {
    prompt: "You need Claude to work from one current policy document. Your Project contains that document plus eleven older versions of it.",
    options: [
      { key: "A", label: "Leave them all in. More context, better answer.", correct: false, feedback: "Eleven superseded versions of the same policy is the clutter most likely to produce a confidently outdated answer. More isn't better when it contradicts itself." },
      { key: "B", label: "Clean up the Project, or point Claude at the current document for this chat.", correct: true, feedback: "Either move works. Relevance is what makes context valuable, and old versions of the same document are the clearest case of context that costs without helping." },
      { key: "C", label: "Ask Claude to figure out which version is current.", correct: false, feedback: "It might well get it right, but you'd be paying for a puzzle you could have solved in ten seconds, and you'd still have to check." },
    ],
  },
  {
    prompt: "You've been working deliberately all month on a genuinely valuable analysis, and you're approaching your $50.",
    options: [
      { key: "A", label: "Stop using Claude and finish it some other way.", correct: false, feedback: "The budget isn't a stopping signal for valuable work. Switching tools mid-analysis usually costs you more time than the usage was worth." },
      { key: "B", label: "Request more usage, and say what the work is.", correct: true, feedback: "This is exactly what the escalation path is for. Well-managed Claude work that's creating real value is the strongest possible reason to ask for more." },
      { key: "C", label: "Quietly finish in short chats to squeeze under the line.", correct: false, feedback: "Rationing mid-project tends to produce worse work and more retries. If the work is worth it, ask. That's not cheating the budget, it's using it." },
    ],
  },
];

const JOB_AID_TEXT = `THE FIVE-SECOND CHECK — Make It Count

1. RIGHT TOOL?          Gemini, Claude Sonnet, or Claude Opus?
2. RIGHT CHAT?          New job = New Chat.
3. ONLY THE CONTEXT I NEED?   Relevant beats plentiful.
4. RIGHT AMOUNT OF HORSEPOWER?  Match model + effort to the task.
5. CLEAR ASK?           RACE: Role, Action, Context, Expectation.

If yes: send it.

Handoff prompt for a long conversation:
"Create a compact handoff for a fresh conversation. Preserve the goal, verified facts, decisions we've made, important constraints, open questions, and the next step. Leave out brainstorming, dead ends, repeated discussion, and anything we no longer need."

Low usage isn't the goal. Valuable usage is.
Don't spend your workday thinking about tokens.`;

const HABIT_MAP = [
  ["One job, one chat", "When the job changes, start a New Chat."],
  ["Give AI what it needs, not everything you have", "Relevant beats plentiful, every time."],
  ["Be specific before you iterate", "A clearer first ask (RACE) saves three rounds of “no, not like that.”"],
  ["Match the horsepower to the job", "Two dials: which tool, and how hard it thinks."],
  ["Give long conversations a clean handoff", "Carry the useful state forward. Leave the journey behind."],
];

/* ------------------------------------------------------------------ */
/*  Completion record                                                  */
/* ------------------------------------------------------------------ */

function CompletionRecord({ user, initialCompletedAt }: { user: User; initialCompletedAt: string | null }) {
  const [completedAt, setCompletedAt] = useState<string | null>(initialCompletedAt);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const complete = () =>
    start(async () => {
      try {
        const r = await markCompleteAction();
        setCompletedAt(r.completedAt);
        setError(false);
      } catch {
        setError(true);
      }
    });

  const clear = () =>
    start(async () => {
      try {
        await clearCompletionAction();
        setCompletedAt(null);
      } catch {
        setError(true);
      }
    });

  if (completedAt) {
    return (
      <div className="cb-done-card" data-state="done">
        <div className="cb-done-msg">
          <Check size={20} aria-hidden="true" style={{ color: "var(--good)", flex: "none", marginTop: 2 }} />
          <div>
            <h3>You're marked complete</h3>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.95rem" }} role="status">
              <strong>{user.name ?? user.email}</strong> &middot; {fmtDate(completedAt, true)}
            </p>
            <button type="button" className="cb-linkbtn" style={{ marginTop: "0.5rem" }} onClick={clear} disabled={pending}>
              Clear this
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cb-done-card">
      <h3>Mark yourself complete</h3>
      <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem" }}>
        You're signed in as <strong>{user.email}</strong>, so there's nothing to type. One click lets us know
        you've been through it.
      </p>
      <button type="button" className="cb-btn cb-btn-primary cb-btn-big" onClick={complete} disabled={pending}>
        {pending ? "Saving…" : "I'm done, record it"}
      </button>
      {error && (
        <Feedback tone="rethink" title="That didn't save">
          Something went wrong recording your completion. Try again in a moment, or use the Feedback button to let us know.
        </Feedback>
      )}
      <p className="cb-fineprint">Your name and the date and time are visible to the course admins.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page furniture                                                     */
/* ------------------------------------------------------------------ */

function PageHead({ ci, pi, of }: { ci: number; pi: number; of: number }) {
  const label =
    ci === CHAPTERS.length - 1
      ? "Done · Take this with you"
      : `Section ${ci + 1} of ${CHAPTERS.length - 1} · ${CHAPTERS[ci].name}`;
  return (
    <div className="cb-pagehead">
      <span>{label}</span>
      {of > 1 && (
        <span className="cb-dots" aria-hidden="true">
          {Array.from({ length: of }).map((_, i) => (
            <span key={i} className="cb-dot" data-on={i <= pi} data-cur={i === pi} />
          ))}
        </span>
      )}
      {of > 1 && <span className="sr-only">{`Page ${pi + 1} of ${of}`}</span>}
    </div>
  );
}

function Nav({
  page,
  go,
  label = "Continue",
  disabled = false,
  note,
  onNext,
}: {
  page: number;
  go: (n: number) => void;
  label?: string;
  disabled?: boolean;
  note?: string;
  onNext?: () => void;
}) {
  return (
    <div className="cb-nav">
      {page > 0 && (
        <button type="button" className="cb-btn cb-btn-ghost" onClick={() => go(page - 1)}>
          Back
        </button>
      )}
      <button type="button" className="cb-btn cb-btn-primary" disabled={disabled} onClick={onNext || (() => go(page + 1))}>
        {label}
        <ArrowRight size={15} aria-hidden="true" />
      </button>
      {note && <span className="cb-nav-note">{note}</span>}
    </div>
  );
}

const firstPageOf = (ci: number) => PAGES.findIndex((pg) => pg.ci === ci);
const clampPage = (n: number) => Math.max(0, Math.min(PAGE_COUNT - 1, n));

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export function MakeItCount({ user, initial, notice }: Props) {
  const [page, setPage] = useState(clampPage(initial.page));
  const [a, setA] = useState<CourseAnswers>({ ...INITIAL, ...initial.answers });
  const patch = (p: Partial<CourseAnswers>) => setA((x) => ({ ...x, ...p }));

  /* ---- learner telemetry: page timing + progress sync ---- */
  const answersRef = useRef(a);
  useEffect(() => {
    answersRef.current = a;
  }, [a]);
  const pageRef = useRef(page);
  const furthestRef = useRef(Math.max(initial.furthestIndex, clampPage(initial.page)));
  const enteredRef = useRef(0);
  const activeRef = useRef(0);
  const visibleRef = useRef(true);

  const post = useCallback((payload: Record<string, unknown>) => {
    try {
      void fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* telemetry is best-effort */
    }
  }, []);

  const activeSoFar = () =>
    activeRef.current + (visibleRef.current ? performance.now() - enteredRef.current : 0);
  const resetTimer = () => {
    activeRef.current = 0;
    enteredRef.current = performance.now();
  };

  useEffect(() => {
    visibleRef.current = document.visibilityState === "visible";
    enteredRef.current = performance.now();
    post({
      currentPage: PAGES[pageRef.current].key,
      furthestIndex: furthestRef.current,
      answers: answersRef.current,
    });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (visibleRef.current) {
          activeRef.current += performance.now() - enteredRef.current;
          visibleRef.current = false;
        }
      } else if (!visibleRef.current) {
        enteredRef.current = performance.now();
        visibleRef.current = true;
      }
    };
    const onHide = () => {
      post({
        leftPage: PAGES[pageRef.current].key,
        activeMs: activeSoFar(),
        currentPage: PAGES[pageRef.current].key,
        furthestIndex: furthestRef.current,
        answers: answersRef.current,
      });
      resetTimer();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [post]);

  const cur = PAGES[page];

  useEffect(() => {
    document.body.dataset.coursePage = cur.key;
    return () => {
      delete document.body.dataset.coursePage;
    };
  }, [cur.key]);

  const topRef = useRef<HTMLSpanElement>(null);
  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* older engines */
    }
    topRef.current?.scrollIntoView?.({ block: "start" });
  };

  const go = (n: number) => {
    const next = clampPage(n);
    if (next !== pageRef.current) {
      const furthest = Math.max(furthestRef.current, next);
      post({
        leftPage: PAGES[pageRef.current].key,
        activeMs: activeSoFar(),
        currentPage: PAGES[next].key,
        furthestIndex: furthest,
        answers: answersRef.current,
      });
      resetTimer();
      furthestRef.current = furthest;
      pageRef.current = next;
    }
    setPage(next);
    scrollTop();
  };

  const restart = () => {
    setA(INITIAL);
    answersRef.current = INITIAL;
    go(0);
  };

  const toggleIn = (key: "details" | "burners", id: string) =>
    setA((x) => {
      const list = x[key];
      const next = list.includes(id) ? list.filter((y) => y !== id) : [...list, id];
      return { ...x, [key]: next, [key === "details" ? "detailsChecked" : "burnersChecked"]: false };
    });

  const K = cur.key;

  return (
    <div className="cb">
      <header className="cb-top">
        <div className="cb-top-in">
          <div className="cb-brand">
            <span className="cb-brand-name">Make It Count</span>
            <span className="cb-brand-sub">Using AI where it pays off.</span>
          </div>
          <div className="mic-user">
            {user.isAdmin && (
              <Link className="mic-user-link" href="/admin">
                Admin
              </Link>
            )}
            <span className="mic-user-chip">
              <span className="mic-avatar" aria-hidden="true">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" referrerPolicy="no-referrer" data-screenshot-hide="" />
                ) : (
                  initials(user.name, user.email)
                )}
              </span>
              <span className="mic-user-name">{user.name ?? user.email}</span>
            </span>
            <form action={signOutAction}>
              <button type="submit" className="mic-user-link">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="cb-prog" aria-label="Course progress">
          <ol className="cb-steps">
            {CHAPTERS.map((c, i) => {
              const state = i === cur.ci ? "current" : i < cur.ci ? "done" : "todo";
              const inner = cur.key === "final" ? (a.fIdx + 1) / FINAL.length : (cur.pi + 1) / cur.of;
              const pct = i < cur.ci ? 100 : i === cur.ci ? inner * 100 : 0;
              const target = firstPageOf(i);
              return (
                <li key={c.name}>
                  <button type="button" className="cb-step" data-state={state} onClick={() => go(target)} aria-current={i === cur.ci ? "step" : undefined}>
                    <span className="cb-step-bar">
                      <span className="cb-step-fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="cb-step-label">{c.name}</span>
                    <span className="sr-only">{`Section ${i + 1} of ${CHAPTERS.length}: ${c.name}`}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <div className="cb-shell">
        <span ref={topRef} aria-hidden="true" style={{ display: "block", height: 1, scrollMarginTop: "130px" }} />
        {notice && <div className="cb-banner" role="status">{notice}</div>}
        <main className="cb-col">
          <PageHead ci={cur.ci} pi={cur.pi} of={cur.of} />

          {/* ================= SECTION 1 ================= */}
          {K === "why-frame" && (
            <>
              <h1>What this course is for</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                This isn't a &ldquo;use less AI&rdquo; course. We want everyone at Clever using AI wherever it
                makes the work better, and we want to use it on purpose: the right tool, a focused conversation,
                and the right amount of horsepower for the job in front of you.
              </p>
              <div className="cb-facts">
                <div className="cb-fact">
                  <span className="cb-fact-k">$50</span>
                  <span className="cb-fact-v">Your starting monthly Claude budget</span>
                </div>
                <div className="cb-fact">
                  <span className="cb-fact-k">Ask</span>
                  <span className="cb-fact-v">You can request more Claude usage when you need it</span>
                </div>
                <div className="cb-fact">
                  <span className="cb-fact-k">Gemini</span>
                  <span className="cb-fact-v">Also available, and effectively unmetered</span>
                </div>
              </div>
              <p>
                The $50 is a guardrail, not a scoreboard. It keeps usage visible and predictable; it isn't
                something to compete on. If you're doing real work with Claude, you'll use a good chunk of it most
                months. Some months you'll need more, and asking for more is a normal part of the job.
              </p>
              <Nav page={page} go={go} note="About 9 minutes, start to finish" />
            </>
          )}

          {K === "why-scenario" && (
            <>
              <h1>Check: what counts as good usage?</h1>
              <Scenario
                idPrefix="s1"
                prompt="You spend most of your Claude budget producing an analysis that saves your team a week of work. What went wrong?"
                value={a.s1}
                onChange={(k) => patch({ s1: k })}
                options={[
                  { key: "A", label: "You should have stopped using Claude sooner.", correct: false, feedback: "Stopping would have cost the team a week to save a fraction of a budget. Usage that produces real work isn't the problem this course is trying to solve." },
                  { key: "B", label: "Nothing. The work created value, and you can request more if you need it.", correct: true, feedback: "Exactly. The work produced value, which is what the budget is there to fund. Everything else in this course is about removing the usage that isn't buying you anything." },
                  { key: "C", label: "Claude should only be used for short questions.", correct: false, feedback: "Short questions are often the ones Claude is least needed for. Substantial work is where it tends to earn its keep." },
                ]}
              />
              {a.s1 && (
                <>
                  <p className="cb-pull">Low usage isn't the goal. Valuable usage is.</p>
                  <h2>So here's what we're asking of you</h2>
                  <ul style={{ marginTop: "0.7rem" }}>
                    <li>Choose the right tool for the work in front of you.</li>
                    <li>Avoid usage that isn't actually helping you.</li>
                    <li>Use the right amount of AI horsepower, not the most available.</li>
                    <li>Request more Claude when Claude is generating enough value to warrant it.</li>
                  </ul>
                </>
              )}
              <Nav page={page} go={go} label="Start the course" />
            </>
          )}

          {/* ================= SECTION 2 ================= */}
          {K === "model-what" && (
            <>
              <h1>How context works: the desk</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                You'll hear the word <strong>token</strong>. It just means a small piece of text an AI processes,
                and you never need to count them. The idea worth carrying around is <strong>context</strong>:
                everything Claude has in front of it while it does the current piece of work.
              </p>
              <h2 style={{ marginTop: "1.8rem" }}>Context is all of this</h2>
              <ul style={{ marginTop: "0.7rem" }}>
                <li>the conversation so far</li>
                <li>documents you've uploaded</li>
                <li>Project knowledge</li>
                <li>your instructions</li>
                <li>anything gathered by features you've turned on</li>
              </ul>
              <p>Think of it as what's on the desk when Claude sits down.</p>
              <Nav page={page} go={go} />
            </>
          )}

          {K === "model-desk" && (
            <>
              <h1>What belongs on the desk?</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>Put things down and watch what changes.</p>
              <Desk placed={a.placed} setPlaced={(fn) => setA((x) => ({ ...x, placed: fn(x.placed) }))} />
              <Nav page={page} go={go} />
            </>
          )}

          {K === "model-three" && (
            <>
              <h1>Three things to keep in mind</h1>
              <div className="cb-panel" style={{ marginTop: "1.4rem" }}>
                <h3>Longer, more complex conversations generally use more.</h3>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.95rem" }}>
                  As a chat grows, there's more material for Claude to work with. That tends to increase usage.
                </p>
              </div>
              <div className="cb-panel">
                <h3>More context is not automatically better.</h3>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.95rem" }}>
                  One useful document can noticeably improve Claude's work. Five irrelevant ones added &ldquo;just
                  in case&rdquo; make the job heavier without making it better, and sometimes make the answer worse.
                </p>
              </div>
              <div className="cb-panel">
                <h3>More powerful settings and features can use more.</h3>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.95rem" }}>
                  A stronger model, a higher effort level, deep research, and connected tools all draw more. Each of
                  them is worth it when the task actually benefits.
                </p>
              </div>
              <p className="cb-pull">The easiest usage to cut is the context Claude never needed.</p>
              <Nav page={page} go={go} label="On to the habits" />
            </>
          )}

          {/* ================= SECTION 3 ================= */}
          {K === "habits-map" && (
            <>
              <h1>The five habits</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                None of these are about holding back. They're about keeping the desk useful so the work comes
                out better. Here's the whole set, then one page on each.
              </p>
              <div className="cb-maplist">
                {HABIT_MAP.map(([t, d], i) => (
                  <div className="cb-maprow" key={t}>
                    <span className="cb-maprow-n" aria-hidden="true">{i + 1}</span>
                    <span className="cb-maprow-text">
                      <b>{t}</b>
                      <span>{d}</span>
                    </span>
                  </div>
                ))}
              </div>
              <Nav page={page} go={go} label="Habit 1" />
            </>
          )}

          {K === "h1" && (
            <>
              <p className="cb-kicker">Habit 1 of 5</p>
              <h1>One job, one chat</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                A New Chat is a clean desk. Nothing from the last job is sitting there, so Claude isn't weighing an
                HR question against your customer email.
              </p>
              <p>Here's a real Monday, all in one conversation:</p>
              <div className="cb-quiet" style={{ marginBottom: "1rem" }}>
                <ul style={{ margin: 0 }}>
                  <li>9:10 &mdash; analyzing the district onboarding survey</li>
                  <li>10:25 &mdash; a quick question about parental leave</li>
                  <li>11:40 &mdash; drafting a customer email</li>
                  <li>1:15 &mdash; brainstorming names for a webinar series</li>
                  <li>2:30 &mdash; tightening the slides for Thursday</li>
                  <li>3:45 &mdash; and now, a fresh analysis for a different customer</li>
                </ul>
              </div>
              <Scenario
                idPrefix="h1"
                prompt="You're about to start the new customer analysis. What's the strongest move?"
                value={a.h1}
                onChange={(k) => patch({ h1: k })}
                options={[
                  { key: "A", label: "Keep going here so Claude remembers how you like things.", correct: false, feedback: "You don't need one giant conversation for that. Tell Claude what you want in the new chat. That costs one sentence and gets you a clean desk." },
                  { key: "B", label: "Start a New Chat for the analysis.", correct: true, feedback: "The job changed, so the desk should too. Everything from this morning stays in your history if you need it; it just stops riding along." },
                  { key: "C", label: "Ask Claude to ignore everything above.", correct: false, feedback: "Reasonable instinct, but it doesn't clear the desk. It adds one more instruction to it. A New Chat is the cleaner and faster move." },
                ]}
              />
              {a.h1 && (
                <div className="cb-panel" style={{ marginTop: "1.4rem" }}>
                  <h4>If you work in Projects</h4>
                  <p style={{ margin: "0.3rem 0 0", fontSize: "0.94rem" }}>
                    Separate chats still make sense for separate deliverables. Project knowledge and instructions
                    are available to every chat in the Project; the chat histories themselves stay separate unless
                    you put something into Project knowledge.
                  </p>
                </div>
              )}
              <Nav page={page} go={go} />
            </>
          )}

          {K === "h2" && (
            <>
              <p className="cb-kicker">Habit 2 of 5</p>
              <h1>Give AI what it needs, not everything you have</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>Same task, two ways of asking.</p>
              <div className="cb-compare">
                <div className="cb-compare-card" data-v="before">
                  <div className="cb-compare-h">Overloaded</div>
                  <p>
                    &ldquo;Here are eight decks, six meeting transcripts, two spreadsheets, and our entire project
                    folder. Help me write this customer email.&rdquo;
                  </p>
                </div>
                <div className="cb-compare-card" data-v="after">
                  <div className="cb-compare-h">Focused</div>
                  <p>
                    &ldquo;Use the attached meeting notes and final implementation plan to draft the customer
                    follow-up.&rdquo;
                  </p>
                </div>
              </div>
              <p>
                The second one isn't just lighter. It's more likely to produce the email you actually wanted, because
                nothing is competing for Claude's attention.
              </p>
              <h2 style={{ marginTop: "1.8rem" }}>A Project is a filing cabinet, not a junk drawer</h2>
              <ul style={{ marginTop: "0.7rem" }}>
                <li>Use one for reference material that genuinely repeats across related work.</li>
                <li>Keep Project knowledge relevant. Pull out obsolete and duplicate material when it stops earning its place.</li>
                <li>Keep Project instructions short. They apply to everything you do in there.</li>
                <li>Still give task-specific direction in each chat. The Project sets the background; the chat sets the job.</li>
              </ul>
              <Nav page={page} go={go} />
            </>
          )}

          {K === "h3a" && (
            <>
              <p className="cb-kicker">Habit 3 of 5</p>
              <h1>Be specific before you iterate</h1>
              <div className="cb-compare" style={{ marginTop: "1.3rem" }}>
                <div className="cb-compare-card" data-v="before">
                  <div className="cb-compare-h">Vague</div>
                  <p>&ldquo;Write a follow-up.&rdquo;</p>
                </div>
                <div className="cb-compare-card" data-v="after">
                  <div className="cb-compare-h">Specific</div>
                  <p>
                    &ldquo;Using the attached call notes, draft a 150-word follow-up to a district administrator.
                    Use a warm, direct tone. Include the three decisions we made, two next steps, and the unresolved
                    question. Don't invent dates or commitments.&rdquo;
                  </p>
                </div>
              </div>
              <p>
                The vague version isn't cheaper. It's the start of a negotiation. Five rounds of &ldquo;no, not
                like that&rdquo; cost more of everything, your budget and your afternoon, than getting it close on
                the first try.
              </p>
              <h2 style={{ marginTop: "1.8rem" }}>The RACE framework</h2>
              <p style={{ marginTop: "0.5rem" }}>
                You've seen RACE in earlier Clever trainings, and it works just as well with Claude. Tap each
                part to see what it means here.
              </p>
              <div className="cb-formula" role="group" aria-label="Parts of a clear request">
                {RACE.map((f) => (
                  <button key={f.k} type="button" className="cb-fkey" aria-pressed={a.fkey === f.k} onClick={() => patch({ fkey: f.k })}>
                    <span className="cb-fkey-letter" aria-hidden="true">{f.k[0]}</span>
                    {f.k}
                  </button>
                ))}
              </div>
              <div className="cb-panel" role="status">
                <h4>{a.fkey}</h4>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.95rem" }}>{RACE.find((f) => f.k === a.fkey)?.d}</p>
              </div>
              <p className="cb-pull" style={{ marginTop: "1.5rem" }}>Specific does not mean long.</p>
              <Nav page={page} go={go} label="Try it" />
            </>
          )}

          {K === "h3b" && (
            <>
              <p className="cb-kicker">Habit 3 &middot; practice</p>
              <h1>Practice: which details actually help?</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                The task: draft that 150-word follow-up email. Pick the ones that would change what Claude writes.
              </p>
              <div className="cb-ms" role="group" aria-label="Choose the details that help">
                {DETAIL_OPTIONS.map((d) => {
                  const picked = a.details.includes(d.id);
                  const verdict = a.detailsChecked ? (d.keep ? "keep" : "drop") : undefined;
                  return (
                    <button key={d.id} type="button" className="cb-ms-item" aria-pressed={picked} data-verdict={verdict} onClick={() => toggleIn("details", d.id)}>
                      <span className="cb-ms-box" aria-hidden="true">{picked ? <Check size={13} /> : null}</span>
                      <span>
                        {d.label}
                        {a.detailsChecked && <span className="cb-ms-note">{d.note}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button type="button" className="cb-btn cb-btn-primary" onClick={() => patch({ detailsChecked: true })} disabled={a.details.length === 0}>
                  Check my picks
                </button>
                {a.detailsChecked && (
                  <button type="button" className="cb-btn cb-btn-ghost" onClick={() => patch({ details: [], detailsChecked: false })}>
                    Try again
                  </button>
                )}
              </div>
              {a.detailsChecked && (
                <Feedback tone="info" title="The point isn't length">
                  Four of these change what the email says. Two are real, important documents that have nothing to do
                  with this email. A longer prompt isn't a better prompt. A more relevant one is.
                </Feedback>
              )}
              <Nav page={page} go={go} />
            </>
          )}

          {K === "h4a" && (
            <>
              <p className="cb-kicker">Habit 4 of 5</p>
              <h1>Match the horsepower to the job</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                Don't ask &ldquo;which model is best?&rdquo; Ask &ldquo;how much intelligence does this step
                need?&rdquo; Pick one to see where it fits.
              </p>
              <div className="cb-dial" role="group" aria-label="Choose a tool">
                {TOOLS.map((t) => (
                  <button key={t.id} type="button" className="cb-tool" aria-pressed={a.tool === t.id} onClick={() => patch({ tool: t.id })}>
                    <span className="cb-tool-n">{t.name}</span>
                    <span className="cb-tool-r">{t.rel}</span>
                    <span className="cb-tool-d">{t.desc}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: "0.92rem", color: "var(--ink-3)" }}>
                This is a portfolio, not a ranking. If Gemini handles the task well, that's a good tool choice. If
                Claude materially improves the work, that's also a good tool choice.
              </p>
              <Nav page={page} go={go} label="The second dial" />
            </>
          )}

          {K === "h4b" && (
            <>
              <p className="cb-kicker">Habit 4 &middot; the second dial</p>
              <h1>The effort setting</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                In Claude, the model menu next to the send button also holds an effort setting. Higher effort means
                Claude thinks harder before answering: more thorough, slower, and it draws more usage.
              </p>
              <div className="cb-effort" role="group" aria-label="Choose an effort level">
                {EFFORTS.map((e) => (
                  <button key={e.id} type="button" className="cb-eff" aria-pressed={a.effort === e.id} onClick={() => patch({ effort: e.id })}>
                    {e.id}
                  </button>
                ))}
              </div>
              <div className="cb-axis" aria-hidden="true">
                <div className="cb-axis-track">
                  {EFFORTS.map((e, i) => (
                    <span key={e.id} className="cb-axis-tick" style={{ left: `${((i + 0.5) / EFFORTS.length) * 100}%` }} />
                  ))}
                  <div className="cb-axis-dot" style={{ left: `${((EFFORTS.findIndex((e) => e.id === a.effort) + 0.5) / EFFORTS.length) * 100}%` }} />
                </div>
                <div className="cb-axis-ends">
                  <div>
                    <b>Faster</b>
                    <span>LOWER usage</span>
                  </div>
                  <div>
                    <b>Slower, more thorough</b>
                    <span>HIGHER usage</span>
                  </div>
                </div>
              </div>
              <div className="cb-panel" role="status">
                <h4>{a.effort}</h4>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", color: "var(--ink-3)" }}>
                  {EFFORTS.find((e) => e.id === a.effort)?.speed} to respond &middot; {EFFORTS.find((e) => e.id === a.effort)?.use} usage
                </p>
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.95rem" }}>{EFFORTS.find((e) => e.id === a.effort)?.d}</p>
              </div>
              <p style={{ marginTop: "1.1rem" }}>
                Each model has a recommended level marked as the default, and effort levels vary by model. Your
                selection sticks between conversations, so a quick glance at the model name before a routine task is
                a genuinely useful habit.
              </p>
              <Nav page={page} go={go} label="Check for knowledge" />
            </>
          )}

          {K === "h4c" && (
            <>
              <p className="cb-kicker">Habit 4 &middot; check for knowledge</p>
              <h1>Check for knowledge</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                Select which model and effort level match the activity.
              </p>
              <Scenario
                idPrefix="h4a"
                prompt="You're softening the tone of a three-sentence internal announcement."
                value={a.h4a}
                onChange={(k) => patch({ h4a: k })}
                options={[
                  { key: "A", label: "Opus at Max effort, so it definitely lands right.", correct: false, feedback: "For a small task, that's more horsepower than you need. Save the deeper reasoning for work that benefits from it." },
                  { key: "B", label: "Sonnet at a lower effort, or Gemini, if it does the job.", correct: true, feedback: "Right size for the job. Three sentences of tone work doesn't get better with more reasoning behind it, and either tool handles it comfortably." },
                  { key: "C", label: "Whatever's already selected. It's a tiny task.", correct: false, feedback: "Understandable, but the selector remembers what you last used. If yesterday's work needed Opus at high effort, that's what this is running on. A two-second glance is the whole habit." },
                ]}
              />
              <Scenario
                idPrefix="h4b"
                prompt="You need to reconcile conflicting findings across several customer studies before recommending a direction to leadership."
                value={a.h4b}
                onChange={(k) => patch({ h4b: k })}
                options={[
                  { key: "A", label: "The lightest setting available, to protect the budget.", correct: false, feedback: "This is the case where holding back costs more than it saves. A weak recommendation to leadership is expensive in ways the budget never shows." },
                  { key: "B", label: "A stronger Claude configuration, with the relevant studies attached.", correct: true, feedback: "Conflicting evidence and a consequential decision is what deeper reasoning is for. Higher usage here is well spent. Just keep the context to the studies that matter." },
                  { key: "C", label: "Split it into forty small questions across several chats.", correct: false, feedback: "You'd lose the thing that makes this hard: seeing all the evidence at once. The conflict only resolves when everything is on the desk together." },
                ]}
              />
              <Nav page={page} go={go} />
            </>
          )}

          {K === "h5" && (
            <>
              <p className="cb-kicker">Habit 5 of 5</p>
              <h1>Give long conversations a clean handoff</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                When a long chat finishes one phase and starts another, you don't have to choose between dragging
                everything along and starting from nothing. Ask for a handoff.
              </p>
              <div className="cb-prompt-box">{HANDOFF_PROMPT}</div>
              <div style={{ marginTop: "0.7rem" }}>
                <CopyButton text={HANDOFF_PROMPT} label="Copy this prompt" />
              </div>
              <div className="cb-flow" aria-label="How a handoff works">
                <div className="cb-flow-step"><b>Long chat</b>Two hours of research, including the parts that went nowhere.</div>
                <ArrowRight size={16} className="cb-flow-arrow" aria-hidden="true" />
                <div className="cb-flow-step" data-hot="true"><b>Handoff</b>Goal, verified facts, decisions, constraints, open questions, next step.</div>
                <ArrowRight size={16} className="cb-flow-arrow" aria-hidden="true" />
                <div className="cb-flow-step"><b>New Chat</b>Paste the handoff in. Clean desk, useful material.</div>
                <ArrowRight size={16} className="cb-flow-arrow" aria-hidden="true" />
                <div className="cb-flow-step"><b>Continue</b>Start the next phase with what matters and nothing else.</div>
              </div>
              <p>
                This works especially well at a phase change: research to writing, brainstorming to execution,
                analysis to presentation, reviewing to finalizing.
              </p>
              <p>
                You're not erasing the work. The old chat is still in your history. You're just carrying forward the
                useful state instead of the whole trip.
              </p>
              <Nav page={page} go={go} />
            </>
          )}

          {/* ================= SECTION 4 ================= */}
          {K === "burn-challenge" && (
            <>
              <h1>Spotting a mismatch</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                You don't need to monitor anything. You just need to recognize a few obvious mismatches when
                they're in front of you. Here's one.
              </p>
              <div className="cb-ws">
                <div className="cb-ws-h">Q3 Planning</div>
                <dl className="cb-ws-rows">
                  <div className="cb-ws-row"><dt>Started</dt><dd>19 days ago</dd></div>
                  <div className="cb-ws-row"><dt>Messages</dt><dd>84</dd></div>
                  <div className="cb-ws-row"><dt>Model</dt><dd>Opus</dd></div>
                  <div className="cb-ws-row"><dt>Effort</dt><dd>Max</dd></div>
                  <div className="cb-ws-row"><dt>Project knowledge</dt><dd>24 files, including seven old drafts of the same doc</dd></div>
                  <div className="cb-ws-row"><dt>Current task</dt><dd>&ldquo;Can you make this paragraph friendlier?&rdquo;</dd></div>
                </dl>
              </div>
              <div className="cb-q-prompt">What would you change? Pick everything that applies.</div>
              <div className="cb-ms" role="group" aria-label="What would you change">
                {BURNERS.map((b) => {
                  const picked = a.burners.includes(b.id);
                  const verdict = a.burnersChecked ? (b.keep ? "keep" : "drop") : undefined;
                  return (
                    <button key={b.id} type="button" className="cb-ms-item" aria-pressed={picked} data-verdict={verdict} onClick={() => toggleIn("burners", b.id)}>
                      <span className="cb-ms-box" aria-hidden="true">{picked ? <Check size={13} /> : null}</span>
                      <span>
                        {b.label}
                        {a.burnersChecked && <span className="cb-ms-note">{b.note}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button type="button" className="cb-btn cb-btn-primary" onClick={() => patch({ burnersChecked: true })} disabled={a.burners.length === 0}>
                  Check my picks
                </button>
                {a.burnersChecked && (
                  <button type="button" className="cb-btn cb-btn-ghost" onClick={() => patch({ burners: [], burnersChecked: false })}>
                    Try again
                  </button>
                )}
              </div>
              {a.burnersChecked && (
                <Feedback tone="info" title="The mismatch, not the prompt">
                  Nobody needs to watch tokens. What helps is noticing when a small job is running inside a big
                  setup. That's where nearly all the waste is.
                </Feedback>
              )}
              <Nav page={page} go={go} />
            </>
          )}

          {K === "burn-checks" && (
            <>
              <h1>Four things to check</h1>
              <div className="cb-checks" style={{ marginTop: "1.4rem" }}>
                <div className="cb-check">
                  <b>Look at the conversation.</b>
                  <span>Has one chat quietly become six unrelated jobs?</span>
                </div>
                <div className="cb-check">
                  <b>Look at the model and effort.</b>
                  <span>Is a routine task running on far more reasoning than it needs?</span>
                </div>
                <div className="cb-check">
                  <b>Look at what's turned on.</b>
                  <span>Are search, research, or connected tools running when this task doesn't need them?</span>
                </div>
                <div className="cb-check">
                  <b>Look at the Project.</b>
                  <span>Is old or duplicate material still sitting in there?</span>
                </div>
              </div>
              <h2 style={{ marginTop: "2rem" }}>If you're curious about your own usage</h2>
              <p style={{ marginTop: "0.6rem" }}>
                In the Claude app, go to <strong>Settings &rarr; Usage</strong>. It shows your own usage and how
                you're tracking against any spend limit set for you. That's the one place to look whether you use
                Claude in the browser, the desktop app, or Cowork.
              </p>
              <div className="cb-tip">
                <b>Using Claude Code? Type <code>/usage</code></b>
                <p>
                  Claude Code has its own shortcut. Type <code>/usage</code> at the prompt for a snapshot of your plan
                  limits and current session, without leaving the terminal. It's a Claude Code command only; the
                  chat app doesn't have slash commands.
                </p>
              </div>
              <p>
                Don't keep it open all day. Check it when you're curious, when you're doing unusually heavy Claude
                work, or when Claude tells you you're getting close to a limit.
              </p>
              <Nav page={page} go={go} />
            </>
          )}

          {/* ================= SECTION 5 ================= */}
          {K === "more-why" && (
            <>
              <h1>When more usage is the right call</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                Everything so far has been about not wasting Claude. This part is about not underusing it.
                Sometimes Claude is simply the right tool for a big piece of work, and big work draws more than
                routine work does. That's fine. It's what the budget is for.
              </p>
              <h2 style={{ marginTop: "1.8rem" }}>What that looks like around Clever</h2>
              <div className="cb-uses">
                <div className="cb-use"><b>Customer Success</b><span>Synthesizing a large body of customer feedback into real recommendations.</span></div>
                <div className="cb-use"><b>Customer Education</b><span>Turning a complex product change into a coordinated set of customer-facing materials.</span></div>
                <div className="cb-use"><b>People</b><span>Analyzing hundreds of open-ended responses from an employee survey.</span></div>
                <div className="cb-use"><b>Product</b><span>Synthesizing research and conflicting stakeholder input ahead of an important decision.</span></div>
                <div className="cb-use"><b>Operations</b><span>Working through a complicated process redesign end to end.</span></div>
                <div className="cb-use"><b>Marketing</b><span>Developing a strategic narrative out of a large pile of research.</span></div>
              </div>
              <Nav page={page} go={go} label="How to ask" />
            </>
          )}

          {K === "more-ask" && (
            <>
              <h1>How to ask for more</h1>
              <p className="cb-pull" style={{ marginTop: "1.3rem" }}>
                If you're using Claude intentionally and the work still needs more Claude, request more Claude.
              </p>
              <p>
                That isn't a failure, and it isn't gaming the budget. It's exactly what the request path is for.
                When Claude offers the <strong>Request more usage</strong> option, use it to send an increase
                request.
              </p>
              <div className="cb-quiet" style={{ marginTop: "1.4rem" }}>
                <h4>The work</h4>
                <p style={{ margin: "0.2rem 0 1rem", fontSize: "0.95rem" }}>
                  &ldquo;I'm synthesizing customer onboarding feedback into recommendations for Q4 planning.&rdquo;
                </p>
                <h4>What more Claude unlocks</h4>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.95rem" }}>
                  &ldquo;It will let me finish the analysis and the recommendation draft this week.&rdquo;
                </p>
              </div>
              <ul style={{ marginTop: "1.1rem" }}>
                <li>No apology.</li>
                <li>No essay.</li>
                <li>Tie the request to work, not to a feeling about the number.</li>
                <li>And where Gemini fits a part of the workflow, use it there. Good tool choice is part of a good request.</li>
              </ul>
              <Nav page={page} go={go} label="Check for knowledge" />
            </>
          )}

          {/* ================= SECTION 6 ================= */}
          {K === "final" && (
            <>
              <h1>Apply your learnings</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>
                Five situations you'll recognize from real work at Clever. There's no score. Pick an answer, read
                why, and move on.
              </p>
              <div className="cb-dots" aria-hidden="true" style={{ marginTop: "1.6rem" }}>
                {FINAL.map((_, i) => (
                  <span key={i} className="cb-dot" data-on={i <= a.fIdx} data-cur={i === a.fIdx} />
                ))}
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--ink-3)", margin: "0.5rem 0 0" }}>
                Situation {a.fIdx + 1} of {FINAL.length}
              </p>
              <Scenario
                idPrefix={`f${a.fIdx}`}
                prompt={FINAL[a.fIdx].prompt}
                options={FINAL[a.fIdx].options}
                value={a.fAns[a.fIdx] ?? null}
                onChange={(k) => setA((x) => ({ ...x, fAns: { ...x.fAns, [x.fIdx]: k } }))}
              />
              <div className="cb-nav">
                <button type="button" className="cb-btn cb-btn-ghost" onClick={() => (a.fIdx === 0 ? go(page - 1) : patch({ fIdx: a.fIdx - 1 }))}>
                  Back
                </button>
                <button
                  type="button"
                  className="cb-btn cb-btn-primary"
                  disabled={!a.fAns[a.fIdx]}
                  onClick={() => (a.fIdx < FINAL.length - 1 ? patch({ fIdx: a.fIdx + 1 }) : go(page + 1))}
                >
                  {a.fIdx < FINAL.length - 1 ? "Next situation" : "Finish"}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                <span className="cb-nav-note">
                  {Object.keys(a.fAns).length} of {FINAL.length} answered
                </span>
              </div>
            </>
          )}

          {/* ================= COMPLETION ================= */}
          {K === "done" && (
            <>
              <h1>Job aid: the five-second check</h1>
              <p className="cb-lede" style={{ marginTop: "0.9rem" }}>Run through this before any piece of AI work that matters. Five questions, five seconds.</p>
              {!a.compact ? (
                <div className="cb-aid">
                  {["RIGHT TOOL?", "RIGHT CHAT?", "ONLY THE CONTEXT I NEED?", "RIGHT AMOUNT OF HORSEPOWER?", "CLEAR ASK?"].map((q, i) => (
                    <div className="cb-aid-row" key={q}>
                      <span className="cb-aid-n">{i + 1}</span>
                      <span className="cb-aid-q">{q}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="cb-pre">{JOB_AID_TEXT}</pre>
              )}
              <p style={{ fontSize: "1.15rem", fontWeight: 620, color: "var(--ink)", letterSpacing: "-0.01em" }}>If yes: send it.</p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", margin: "1.4rem 0 0" }}>
                <CopyButton text={JOB_AID_TEXT} label="Copy the job aid" />
                <button type="button" className="cb-btn cb-btn-ghost" onClick={() => patch({ compact: !a.compact })}>
                  {a.compact ? "Show the checklist" : "Show printable version"}
                </button>
                <button type="button" className="cb-btn cb-btn-ghost" onClick={restart}>
                  Start over
                </button>
              </div>

              <CompletionRecord user={user} initialCompletedAt={initial.completedAt} />

              <div className="cb-panel" style={{ marginTop: "2.2rem" }}>
                <h3>The two things underneath all of it</h3>
                <p style={{ margin: "0.4rem 0 0" }}>
                  Low usage isn't the goal. Valuable usage is. If well-managed Claude work needs more Claude, ask for
                  more Claude.
                </p>
              </div>

              <p className="cb-pull" style={{ marginTop: "2rem" }}>Don't spend your workday thinking about tokens. Spend it on the work.</p>

              <div className="cb-nav">
                <button type="button" className="cb-btn cb-btn-ghost" onClick={() => go(page - 1)}>Back</button>
                <span className="cb-nav-note">Make It Count &middot; Clever</span>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
