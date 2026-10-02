import { ImageResponse } from "next/og";

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
        background: "#213a8f",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          background: "#fbba00",
          transform: "rotate(45deg)",
        }}
      />
    </div>,
    { ...size }
  );
}
