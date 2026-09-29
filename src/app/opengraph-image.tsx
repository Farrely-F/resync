import { ImageResponse } from "next/og";

export const alt = "resync — match a resume to a job, then fix the gap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const facts = ["Weighted rubric", "Suggestions one at a time", "LaTeX output"];
const lines = [0.92, 0.74, 0.86, 0.6];

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
          backgroundColor: "#ffffff",
          padding: "72px 80px",
          color: "#0a0a0a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>resync</div>
          <div style={{ display: "flex", fontSize: 26, color: "#71717a" }}>Resume to job, measured</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 660 }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 600, lineHeight: 1.15, letterSpacing: -2 }}>
              Find out what a job asks for, and where your resume misses it.
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 28,
                lineHeight: 1.4,
                color: "#52525b",
              }}
            >
              Paste a posting, add your resume, and read the rubric behind the score. Nothing is uploaded.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 320,
              padding: 28,
              border: "2px solid #e4e4e7",
              borderRadius: 20,
            }}
          >
            <div style={{ display: "flex", fontSize: 72, fontWeight: 600, letterSpacing: -2 }}>70%</div>
            <div style={{ display: "flex", fontSize: 22, color: "#71717a" }}>Weighted rubric</div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
              {lines.map((fraction, index) => (
                <div
                  key={`${index}-${fraction}`}
                  style={{
                    display: "flex",
                    height: 12,
                    width: `${fraction * 100}%`,
                    marginTop: index === 0 ? 0 : 14,
                    borderRadius: 6,
                    backgroundColor: index === 3 ? "#18181b" : "#d4d4d8",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex" }}>
          {facts.map((fact) => (
            <div
              key={fact}
              style={{
                display: "flex",
                marginRight: 16,
                padding: "10px 22px",
                fontSize: 24,
                color: "#3f3f46",
                border: "2px solid #e4e4e7",
                borderRadius: 999,
              }}
            >
              {fact}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
