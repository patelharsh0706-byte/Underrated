import { ImageResponse } from "next/og";

import { getCreatorByUsername } from "@/lib/db/queries";

export const runtime = "nodejs";
export const alt = "Underrated creator profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OgImageProps {
  params: Promise<{ username: string }>;
}

export default async function Image({ params }: OgImageProps) {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);

  const name = creator?.name ?? "Unknown creator";
  const aura = creator?.aura ?? 1500;
  const rank = creator?.rank ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F7F2",
          color: "#111111",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            textTransform: "uppercase",
            letterSpacing: 4,
            color: "#6B6B66",
          }}
        >
          underrated.lol
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, marginTop: 24 }}>
          {name}
        </div>
        <div style={{ display: "flex", gap: 64, marginTop: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#FF5A1F" }}>
              {aura}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                textTransform: "uppercase",
                color: "#6B6B66",
              }}
            >
              Aura
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>{`#${rank}`}</div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                textTransform: "uppercase",
                color: "#6B6B66",
              }}
            >
              Rank
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
