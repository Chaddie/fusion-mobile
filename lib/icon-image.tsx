import { ImageResponse } from "next/og";

export function iconImage(size: number) {
  const mark = Math.round(size * 0.62);
  const radius = Math.round(size * 0.22);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A143A",
        }}
      >
        <div
          style={{
            width: mark,
            height: mark,
            borderRadius: radius,
            background: "#2006F7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: Math.round(size * 0.34),
            fontWeight: 700,
          }}
        >
          F
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
