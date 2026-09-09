import { ImageResponse } from "next/og";

export const alt = "Make It Count: a ten-minute course for everyone at Clever on using AI where it pays off";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HABITS = [
  "One job, one chat",
  "Give AI what it needs, not everything",
  "Be specific before you iterate",
  "Match the horsepower to the job",
  "Give long conversations a clean handoff",
];

/** Social preview card (Slack, Google Chat, email). Kept to flexbox + inline styles for next/og. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0B3B96 0%, #1256E0 55%, #0E9FBC 100%)",
          color: "#fff",
          fontFamily: "Helvetica, Arial, sans-serif",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, opacity: 0.9, letterSpacing: 2 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", display: "flex" }} />
              CLEVER · INTERNAL COURSE
            </div>
            <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: -3, lineHeight: 1, marginTop: 28 }}>
              Make It Count
            </div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 500, marginTop: 18, opacity: 0.95 }}>
              Use AI where it pays off.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 26, lineHeight: 1.4, opacity: 0.92 }}>
            <div style={{ display: "flex" }}>Ten minutes. Claude and Gemini. Five habits</div>
            <div style={{ display: "flex" }}>that make the work better, not just cheaper.</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 14,
            marginLeft: "auto",
            width: 420,
          }}
        >
          {HABITS.map((h, i) => (
            <div
              key={h}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 16,
                padding: "16px 20px",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#fff",
                  color: "#0B3B96",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              {h}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
