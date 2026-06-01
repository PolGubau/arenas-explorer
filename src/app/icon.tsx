import { ImageResponse } from "next/og";

// Next.js generates `/icon` from this file at build time. The dark navy fill
// matches `--color-bg-elevated` so the favicon blends with the app's chrome
// on rounded macOS/iOS app icons; the blue glyph echoes `dim-imagen`.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#131316",
        color: "#4A90D9",
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: -1,
        borderRadius: 6,
      }}
    >
      A
    </div>,
    { ...size },
  );
}
