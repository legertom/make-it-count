"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useEveAgent, type EveMessagePart } from "eve/react";
import { Bug, Camera, Check, Lightbulb, MessageCircle, Send, X } from "lucide-react";
import { PAGE_TITLES } from "@/lib/course-pages";
import { captureViewport, type Capture } from "./capture";
import { ScreenshotEditor } from "./ScreenshotEditor";

type Kind = "bug" | "feature" | "other";
type Shot = { id: string; dataUrl: string };

const KINDS: { id: Kind; label: string; icon: React.ReactNode }[] = [
  { id: "bug", label: "Bug", icon: <Bug size={13} /> },
  { id: "feature", label: "Feature idea", icon: <Lightbulb size={13} /> },
  { id: "other", label: "Comment", icon: <MessageCircle size={13} /> },
];

const SHOT_MARKER = /\n*\[Screenshot attached: [^\]]+\]\s*/g;

function pageContext() {
  const coursePage = document.body.dataset.coursePage;
  return {
    path: location.pathname,
    coursePage: coursePage ?? null,
    coursePageTitle: coursePage ? (PAGE_TITLES[coursePage] ?? coursePage) : null,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
  };
}

async function uploadScreenshot(cap: Capture, dataUrl: string): Promise<string> {
  const res = await fetch("/api/screenshots", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl, width: cap.width, height: cap.height, page: location.pathname }),
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const json = (await res.json()) as { id: string };
  return json.id;
}

function ToolLine({ part }: { part: Extract<EveMessagePart, { type: "dynamic-tool" }> }) {
  if (part.toolName !== "submit_feedback") return null;
  if (part.state === "output-available") {
    const out = part.output as { id?: string } | undefined;
    return (
      <div className="fb-tool" data-state="done">
        <Check size={13} /> Filed{out?.id ? ` as ${out.id}` : ""}
      </div>
    );
  }
  if (part.state === "output-error") {
    return (
      <div className="fb-tool" data-state="error">
        Couldn't file it: {part.errorText ?? "unknown error"}
      </div>
    );
  }
  return (
    <div className="fb-tool">
      <span className="fb-spin" /> Filing feedback…
    </div>
  );
}

export function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [draft, setDraft] = useState("");
  const [shot, setShot] = useState<Shot | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [editorImage, setEditorImage] = useState<Capture | null>(null);
  const [mode, setMode] = useState<"chat" | "direct">("chat");
  const [note, setNote] = useState<string | null>(null);
  const [directTitle, setDirectTitle] = useState("");
  const [directDesc, setDirectDesc] = useState("");
  const [directState, setDirectState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const bodyRef = useRef<HTMLDivElement>(null);

  const agent = useEveAgent({
    prepareSend: (input) => ({ ...input, clientContext: pageContext() }),
    onError: (err) => setNote(err.message || "The feedback assistant hit an error."),
  });

  const messages = agent.data.messages;
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isResuming = agent.status === "resuming";
  const agentDown = agent.status === "error";

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, agent.status]);

  const startCapture = async () => {
    setNote(null);
    setCapturing(true);
    try {
      // Give the browser one frame so the panel can settle before rendering.
      await new Promise((r) => setTimeout(r, 60));
      setEditorImage(await captureViewport());
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't capture the page.");
    } finally {
      setCapturing(false);
    }
  };

  const onEditorDone = async (dataUrl: string) => {
    const cap = editorImage;
    setEditorImage(null);
    if (!cap) return;
    try {
      const id = await uploadScreenshot(cap, dataUrl);
      setShot({ id, dataUrl });
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't save the screenshot.");
    }
  };

  const sendChat = async () => {
    const text = draft.trim();
    if ((!text && !shot) || isResuming) return;
    let body = text || "Here's a screenshot of what I'm looking at.";
    if (kind && messages.length === 0) body = `[${kind}] ${body}`;
    if (shot) body += `\n\n[Screenshot attached: ${shot.id}]`;
    const content = shot
      ? [
          { type: "text" as const, text: body },
          { type: "file" as const, data: shot.dataUrl, mediaType: "image/png", filename: "screenshot.png" },
        ]
      : body;
    setDraft("");
    setShot(null);
    setNote(null);
    try {
      await agent.send(content, isBusy ? { turnPolicy: "steer" } : undefined);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn't send that.");
    }
  };

  const sendDirect = async () => {
    if (!directTitle.trim() || !directDesc.trim()) return;
    setDirectState("sending");
    setNote(null);
    try {
      const ctx = pageContext();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: kind ?? "other",
          title: directTitle.trim(),
          description: directDesc.trim(),
          page: ctx.path,
          coursePage: ctx.coursePage,
          screenshotId: shot?.id ?? null,
        }),
      });
      if (!res.ok) throw new Error(`Couldn't send (${res.status}).`);
      setDirectState("sent");
      setDirectTitle("");
      setDirectDesc("");
      setShot(null);
    } catch (err) {
      setDirectState("error");
      setNote(err instanceof Error ? err.message : "Couldn't send that.");
    }
  };

  const shotChip = shot && (
    <div className="fb-shot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shot.dataUrl} alt="Annotated screenshot" />
      <span>Screenshot attached</span>
      <button type="button" onClick={() => setShot(null)} aria-label="Remove screenshot">
        <X size={14} />
      </button>
    </div>
  );

  const captureButton = (
    <button type="button" className="fb-icon-btn" onClick={startCapture} disabled={capturing} title="Add an annotated screenshot" aria-label="Add screenshot">
      {capturing ? <span className="fb-spin" /> : <Camera size={17} />}
    </button>
  );

  const kindChips = (
    <div className="fb-kinds" role="group" aria-label="What kind of feedback">
      {KINDS.map((k) => (
        <button key={k.id} type="button" className="fb-kind" aria-pressed={kind === k.id} onClick={() => setKind(kind === k.id ? null : k.id)}>
          {k.icon} {k.label}
        </button>
      ))}
    </div>
  );

  const rendered = useMemo(
    () =>
      messages.map((m) => (
        <Fragment key={m.id}>
          {m.parts.map((part, i) => {
            if (part.type === "text") {
              const text = m.role === "user" ? part.text.replace(SHOT_MARKER, "\n").trim() : part.text;
              return text ? (
                <div className="fb-msg" data-role={m.role} key={i}>
                  {text}
                </div>
              ) : null;
            }
            if (part.type === "file" && part.url) {
              return (
                <div className="fb-msg" data-role={m.role} key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={part.url} alt={part.filename ?? "Attachment"} />
                </div>
              );
            }
            if (part.type === "dynamic-tool") return <ToolLine part={part} key={i} />;
            return null;
          })}
        </Fragment>
      )),
    [messages],
  );

  return (
    <>
      <section className="fb-panel" role="dialog" aria-label="Feedback" data-screenshot-hide="">
        <div className="fb-head">
          <div>
            <h2>Feedback</h2>
            <div className="fb-head-sub">{mode === "chat" ? "Tell the assistant, it writes it up" : "Send it straight to the admins"}</div>
          </div>
          <button type="button" className="fb-close" onClick={onClose} aria-label="Close feedback">
            <X size={18} />
          </button>
        </div>

        {kindChips}

        {mode === "chat" ? (
          <>
            <div className="fb-body" ref={bodyRef}>
              {messages.length === 0 && (
                <p className="fb-empty">
                  <b>What's broken, confusing, or missing?</b>
                  Say it in your own words. Add a screenshot and draw on it if that helps. I'll write it up as a{" "}
                  {kind === "feature" ? "feature request" : kind === "other" ? "note" : "bug report"} and file it for
                  the admins.
                </p>
              )}
              {rendered}
              {isBusy && messages[messages.length - 1]?.role === "user" && (
                <div className="fb-tool">
                  <span className="fb-spin" /> Thinking…
                </div>
              )}
              {(note || agentDown) && (
                <div className="fb-note" role="alert">
                  {note ?? "The feedback assistant isn't available right now."}{" "}
                  <button type="button" onClick={() => setMode("direct")}>
                    Send directly instead
                  </button>
                </div>
              )}
            </div>
            <div className="fb-compose">
              {shotChip}
              <div className="fb-row">
                {captureButton}
                <textarea
                  className="mic-input"
                  rows={2}
                  placeholder={kind === "feature" ? "What would you like to see?" : "What happened, and where?"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                  disabled={isResuming}
                />
                <button type="button" className="fb-icon-btn" data-primary="true" onClick={sendChat} disabled={isResuming || (!draft.trim() && !shot)} aria-label="Send">
                  <Send size={16} />
                </button>
              </div>
              <div className="fb-foot">
                <span>Enter to send · Shift+Enter for a new line</span>
                <button type="button" onClick={() => setMode("direct")}>
                  Skip the chat, send directly
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="fb-body">
              {directState === "sent" ? (
                <div className="fb-ok">
                  Sent. Thanks, the admins will see it in the feedback list.
                  <div style={{ marginTop: "0.5rem" }}>
                    <button type="button" className="cb-btn cb-btn-soft" onClick={() => setDirectState("idle")}>
                      Send another
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fb-form">
                  <div>
                    <label htmlFor="fb-title">Title</label>
                    <input id="fb-title" className="mic-input" value={directTitle} onChange={(e) => setDirectTitle(e.target.value)} placeholder="One line an admin can scan" maxLength={140} />
                  </div>
                  <div>
                    <label htmlFor="fb-desc">Details</label>
                    <textarea id="fb-desc" className="mic-input" rows={6} value={directDesc} onChange={(e) => setDirectDesc(e.target.value)} placeholder="What happened, where, and what you expected." />
                  </div>
                  {shotChip}
                  {note && (
                    <div className="fb-note" role="alert">
                      {note}
                    </div>
                  )}
                </div>
              )}
            </div>
            {directState !== "sent" && (
              <div className="fb-compose">
                <div className="fb-row" style={{ alignItems: "center" }}>
                  {captureButton}
                  <span style={{ flex: 1, fontSize: "0.8rem", color: "var(--ink-3)" }}>Add a screenshot (optional)</span>
                  <button type="button" className="cb-btn cb-btn-primary" onClick={sendDirect} disabled={directState === "sending" || !directTitle.trim() || !directDesc.trim()}>
                    {directState === "sending" ? "Sending…" : "Send"}
                  </button>
                </div>
                <div className="fb-foot">
                  <span />
                  <button type="button" onClick={() => setMode("chat")}>
                    Back to the assistant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {editorImage && <ScreenshotEditor image={editorImage} onDone={onEditorDone} onCancel={() => setEditorImage(null)} />}
    </>
  );
}
