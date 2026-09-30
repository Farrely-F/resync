import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon. iOS rounds the corners itself, so this is a full-bleed
 * square; the same two pages and highlighted line as `icon.svg`, scaled up.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "linear-gradient(#5f77f0, #4158df)" }}>
        <svg height="180" viewBox="0 0 64 64" width="180" xmlns="http://www.w3.org/2000/svg">
          <rect fill="#fff" fillOpacity="0.45" height="35" rx="5" width="27" x="13" y="10" />
          <rect fill="#fff" height="36" rx="5" width="28" x="23" y="19" />
          <rect fill="#4a63e7" height="3.5" rx="1.75" width="16" x="29" y="29" />
          <rect fill="#4a63e7" fillOpacity="0.3" height="3.5" rx="1.75" width="16" x="29" y="37" />
          <rect fill="#4a63e7" fillOpacity="0.3" height="3.5" rx="1.75" width="10" x="29" y="45" />
        </svg>
      </div>
    ),
    size,
  );
}
