import { ImageResponse } from "next/og"

export const alt = "PersonaPost - Your LinkedIn command center"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Share card for links posted on LinkedIn, X, Slack, etc.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f3efe6",
          color: "#1a1712",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, fontFamily: "sans-serif" }}>PersonaPost</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, lineHeight: 1, letterSpacing: -2 }}>Rework your whole LinkedIn,</div>
          <div style={{ fontSize: 88, lineHeight: 1, letterSpacing: -2, fontStyle: "italic" }}>in your own voice.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#645d51" }}>
          <div style={{ width: 40, height: 3, background: "#be3a12" }} />
          Headline, About, posts and replies. Nothing goes out without you.
        </div>
      </div>
    ),
    size,
  )
}
