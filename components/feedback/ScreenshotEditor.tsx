"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Eraser, Pencil, Square, Type, Undo2, X } from "lucide-react";
import type { Capture } from "./capture";

type Pt = { x: number; y: number };
type Tool = "pen" | "arrow" | "rect" | "text";
type PenShape = { kind: "pen"; color: string; width: number; points: Pt[] };
type LineShape = { kind: "arrow" | "rect"; color: string; width: number; from: Pt; to: Pt };
type TextShape = { kind: "text"; color: string; at: Pt; text: string; size: number };
type Shape = PenShape | LineShape | TextShape;

const COLORS = ["#E5484D", "#1256E0", "#F5B400", "#12A150", "#101E33", "#FFFFFF"];
const STROKE = 4;
const TEXT_SIZE = 22;

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = s.color;
  if (s.kind === "pen") {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  } else if (s.kind === "text") {
    ctx.font = `600 ${s.size}px ui-sans-serif, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textBaseline = "top";
    ctx.lineWidth = 5;
    ctx.strokeStyle = s.color === "#FFFFFF" ? "#101E33" : "rgba(255,255,255,0.92)";
    s.text.split("\n").forEach((line, i) => {
      const y = s.at.y + i * s.size * 1.25;
      ctx.strokeText(line, s.at.x, y);
      ctx.fillText(line, s.at.x, y);
    });
  } else {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    const { from, to } = s;
    if (s.kind === "rect") {
      ctx.strokeRect(Math.min(from.x, to.x), Math.min(from.y, to.y), Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    } else {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const head = 14 + s.width * 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

export function ScreenshotEditor({
  image,
  onDone,
  onCancel,
}: {
  image: Capture;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [textEdit, setTextEdit] = useState<{ at: Pt; value: string; css: { left: number; top: number; fontSize: number } } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  // Mirror of textEdit so commitText is idempotent when Enter and blur both fire.
  const textEditRef = useRef<typeof textEdit>(null);
  useEffect(() => {
    textEditRef.current = textEdit;
  }, [textEdit]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.src = image.dataUrl;
  }, [image.dataUrl]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    shapes.forEach((s) => drawShape(ctx, s));
    if (draft) drawShape(ctx, draft);
  }, [shapes, draft]);

  useEffect(() => {
    if (ready) redraw();
  }, [ready, redraw]);

  useEffect(() => {
    if (textEdit) textInputRef.current?.focus();
  }, [textEdit]);

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };

  const commitText = () => {
    const te = textEditRef.current;
    textEditRef.current = null;
    if (!te) return;
    if (te.value.trim()) {
      setShapes((s) => [...s, { kind: "text", color, at: te.at, text: te.value.trim(), size: TEXT_SIZE }]);
    }
    setTextEdit(null);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textEdit) {
      commitText();
      return;
    }
    const p = toCanvas(e);
    if (tool === "text") {
      const r = e.currentTarget.getBoundingClientRect();
      const scale = r.width / e.currentTarget.width;
      setTextEdit({ at: p, value: "", css: { left: p.x * scale, top: p.y * scale, fontSize: TEXT_SIZE * scale } });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const next: Shape =
      tool === "pen"
        ? { kind: "pen", color, width: STROKE, points: [p] }
        : tool === "arrow"
          ? { kind: "arrow", color, width: STROKE, from: p, to: p }
          : { kind: "rect", color, width: STROKE, from: p, to: p };
    setDraft(next);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draft || draft.kind === "text") return;
    const p = toCanvas(e);
    setDraft(draft.kind === "pen" ? { ...draft, points: [...draft.points, p] } : { ...draft, to: p });
  };

  const onPointerUp = () => {
    if (!draft) return;
    const tooSmall =
      draft.kind === "pen"
        ? draft.points.length < 2
        : draft.kind === "text"
          ? false
          : Math.hypot(draft.to.x - draft.from.x, draft.to.y - draft.from.y) < 4;
    if (!tooSmall) setShapes((s) => [...s, draft]);
    setDraft(null);
  };

  const undo = () => setShapes((s) => s.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (textEdit) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [textEdit, onCancel]);

  const finish = () => {
    if (textEdit && textEdit.value.trim()) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        drawShape(ctx, { kind: "text", color, at: textEdit.at, text: textEdit.value.trim(), size: TEXT_SIZE });
        onDone(canvas.toDataURL("image/png"));
        return;
      }
    }
    const canvas = canvasRef.current;
    if (canvas) onDone(canvas.toDataURL("image/png"));
  };

  const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: "pen", label: "Draw", icon: <Pencil size={15} /> },
    { id: "arrow", label: "Arrow", icon: <ArrowUpRight size={15} /> },
    { id: "rect", label: "Box", icon: <Square size={15} /> },
    { id: "text", label: "Text", icon: <Type size={15} /> },
  ];

  return (
    <div className="se-overlay" role="dialog" aria-label="Annotate screenshot" data-screenshot-hide="">
      <div className="se-toolbar">
        {tools.map((t) => (
          <button key={t.id} type="button" className="se-tool" aria-pressed={tool === t.id} onClick={() => setTool(t.id)} title={t.label}>
            {t.icon}
            {t.label}
          </button>
        ))}
        <span className="se-sep" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="se-swatch"
            style={{ background: c, boxShadow: c === "#FFFFFF" ? "inset 0 0 0 1px #D9E2EE" : undefined }}
            aria-pressed={color === c}
            aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
          />
        ))}
        <span className="se-sep" />
        <button type="button" className="se-tool" onClick={undo} disabled={shapes.length === 0} title="Undo (⌘Z)">
          <Undo2 size={15} />
          Undo
        </button>
        <button type="button" className="se-tool" onClick={() => setShapes([])} disabled={shapes.length === 0} title="Clear all">
          <Eraser size={15} />
          Clear
        </button>
      </div>

      <div className="se-stage">
        <canvas
          ref={canvasRef}
          className="se-canvas"
          data-tool={tool}
          width={image.width}
          height={image.height}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {textEdit && (
          <input
            ref={textInputRef}
            className="se-textinput"
            style={{ ...textEdit.css, color }}
            value={textEdit.value}
            placeholder="Type, then Enter"
            onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitText();
              if (e.key === "Escape") {
                textEditRef.current = null;
                setTextEdit(null);
              }
            }}
            onBlur={commitText}
          />
        )}
      </div>

      <div className="se-actions">
        <button type="button" className="cb-btn cb-btn-ghost" onClick={onCancel} style={{ background: "#fff" }}>
          <X size={15} />
          Cancel
        </button>
        <button type="button" className="cb-btn cb-btn-primary" onClick={finish} disabled={!ready}>
          <Check size={15} />
          Use this screenshot
        </button>
      </div>
      <p className="se-hint">Draw, drop an arrow or a box, or click with the Text tool to add a label.</p>
    </div>
  );
}
