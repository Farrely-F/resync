import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { brand, siteTitle } from "@/lib/site";

export const alt = siteTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontPath = (weight: number) => join(process.cwd(), "assets/fonts", `inter-latin-${weight}.woff`);
const [interMedium, interBold] = await Promise.all([readFile(fontPath(500)), readFile(fontPath(700))]);

const requirements = [
  { text: "Postgres at scale", covered: true },
  { text: "Go or Rust", covered: true },
  { text: "Kubernetes", covered: false },
  { text: "On-call", covered: true },
];

const facts = ["Weighted rubric", "One suggestion at a time", "Stays in your browser"];

const ink = brand.ink;
const accent = brand.accent;
const muted = "#5d6070";
const hairline = "rgba(15, 17, 23, 0.08)";

function Mark({ px }: { px: number }) {
  return (
    <svg height={px} viewBox="0 0 64 64" width={px} xmlns="http://www.w3.org/2000/svg">
      <rect fill={accent} height="64" rx="15" width="64" />
      <rect fill="#fff" fillOpacity="0.45" height="35" rx="5" width="27" x="13" y="10" />
      <rect fill="#fff" height="36" rx="5" width="28" x="23" y="19" />
      <rect fill={accent} height="3.5" rx="1.75" width="16" x="29" y="29" />
      <rect fill={accent} fillOpacity="0.3" height="3.5" rx="1.75" width="16" x="29" y="37" />
      <rect fill={accent} fillOpacity="0.3" height="3.5" rx="1.75" width="10" x="29" y="45" />
    </svg>
  );
}

/** The hero's story in one frame: a page, the requirements checked against it, and the score. */
function Scene() {
  const line = (width: number, strong = false) => (
    <div
      style={{
        display: "flex",
        height: 10,
        width,
        borderRadius: 5,
        backgroundColor: strong ? accent : "rgba(15, 17, 23, 0.12)",
      }}
    />
  );

  return (
    <div style={{ display: "flex", position: "relative", width: 440, height: 440 }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 6,
          top: 70,
          width: 210,
          height: 270,
          borderRadius: 22,
          backgroundColor: "rgba(255,255,255,0.7)",
          border: `2px solid ${hairline}`,
          transform: "rotate(-6deg)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          left: 26,
          top: 62,
          width: 214,
          height: 276,
          padding: 24,
          borderRadius: 22,
          backgroundColor: "#ffffff",
          border: `2px solid ${hairline}`,
          boxShadow: "0 30px 60px -18px rgba(40, 55, 140, 0.35), 0 4px 10px rgba(15, 17, 23, 0.08)",
          transform: "rotate(1.5deg)",
        }}
      >
        <div style={{ display: "flex", height: 14, width: 96, borderRadius: 7, backgroundColor: ink }} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: 22, gap: 12 }}>
          {line(164)}
          {line(136)}
          {line(150)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 22, gap: 12 }}>
          {line(60)}
          <div
            style={{
              display: "flex",
              padding: 4,
              margin: -4,
              borderRadius: 9,
              backgroundColor: "rgba(74, 99, 231, 0.18)",
              border: `2px solid rgba(74, 99, 231, 0.45)`,
            }}
          >
            {line(156, true)}
          </div>
          {line(118)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          left: 244,
          top: 52,
          width: 198,
          gap: 12,
        }}
      >
        {requirements.map((row) => (
          <div
            key={row.text}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 14px",
              borderRadius: 16,
              backgroundColor: "#ffffff",
              border: `2px solid ${hairline}`,
              boxShadow: "0 8px 18px -8px rgba(15, 17, 23, 0.18)",
              fontSize: 17,
              fontWeight: 700,
              color: ink,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                marginRight: 12,
                borderRadius: 13,
                backgroundColor: row.covered ? accent : "rgba(220, 38, 38, 0.14)",
                color: row.covered ? "#ffffff" : "#dc2626",
              }}
            >
              <svg height="14" viewBox="0 0 14 14" width="14" xmlns="http://www.w3.org/2000/svg">
                {row.covered ? (
                  <path
                    d="M2.5 7.4l3 3 6-6.4"
                    fill="none"
                    stroke="#fff"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.4"
                  />
                ) : (
                  <path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="#dc2626" strokeLinecap="round" strokeWidth="2.4" />
                )}
              </svg>
            </div>
            {row.text}
          </div>
        ))}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            marginTop: 6,
            padding: "12px 20px 14px",
            borderRadius: 22,
            backgroundColor: ink,
            color: "#ffffff",
            boxShadow: "0 18px 34px -12px rgba(15, 17, 23, 0.55)",
          }}
        >
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>70%</div>
          <div
            style={{ display: "flex", marginTop: 4, fontSize: 14, fontWeight: 700, letterSpacing: 1.6, opacity: 0.6 }}
          >
            MATCH
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "58px 72px",
          backgroundColor: brand.paper,
          backgroundImage:
            "radial-gradient(circle at 12% 0%, rgba(120, 146, 255, 0.35), rgba(250, 249, 246, 0) 46%), radial-gradient(circle at 100% 100%, rgba(255, 176, 220, 0.32), rgba(250, 249, 246, 0) 44%)",
          color: ink,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Mark px={46} />
          <div style={{ display: "flex", marginLeft: 16, fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            resync
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 600 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontSize: 60,
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: -2.4,
              }}
            >
              <span style={{ marginRight: 15 }}>Know exactly where your resume</span>
              <span style={{ color: accent, marginRight: 15 }}>misses</span>
              <span>the job.</span>
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 25,
                lineHeight: 1.4,
                color: muted,
                width: 600,
                fontWeight: 500,
              }}
            >
              Every point is traceable to evidence. Fix the gaps one suggestion at a time.
            </div>
          </div>
          <Scene />
        </div>

        <div style={{ display: "flex" }}>
          {facts.map((fact) => (
            <div
              key={fact}
              style={{
                display: "flex",
                marginRight: 14,
                padding: "9px 22px",
                fontSize: 22,
                fontWeight: 700,
                color: "#3a3d4c",
                backgroundColor: "rgba(255,255,255,0.75)",
                border: `2px solid ${hairline}`,
                borderRadius: 999,
              }}
            >
              {fact}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: interMedium, style: "normal", weight: 500 },
        { name: "Inter", data: interBold, style: "normal", weight: 700 },
      ],
    }
  );
}
