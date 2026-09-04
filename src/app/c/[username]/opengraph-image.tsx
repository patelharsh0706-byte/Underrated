import { ImageResponse } from "next/og";

import { getCreatorByUsername } from "@/lib/db/queries";

export const runtime = "nodejs";
export const alt = "Underhyped creator profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RANK_BADGES: Record<number, { label: string; color: string }> = {
  1: { label: "MAIN CHARACTER", color: "#FF5A1F" },
  2: { label: "SIDE CHARACTER", color: "#2F6FED" },
  3: { label: "PLOT TWIST", color: "#C026D3" },
};

const NEW_CHALLENGER_BADGE = { label: "🔥 NEW CHALLENGER", color: "#FF5A1F" };

function getRankBadge(rank: number | null): { label: string; color: string } | null {
  if (rank === null) return NEW_CHALLENGER_BADGE;
  return RANK_BADGES[rank] ?? null;
}

// Satori (next/og's renderer) can't rasterize SVG <img> sources — Dicebear
// seed avatars are served as SVG by default, so request the PNG variant.
function ogAvatarSrc(url: string): string {
  return url.replace(/\/svg\?/, "/png?");
}

interface OgImageProps {
  params: Promise<{ username: string }>;
}

export default async function Image({ params }: OgImageProps) {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);

  const name = creator?.name ?? "Unknown creator";
  const handle = creator?.username ?? username;
  const aura = creator?.aura ?? 1500;
  const rank = creator?.rank ?? null;
  const category = creator?.category ?? null;
  const badge = getRankBadge(rank);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F7F2",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 1040,
            height: 510,
            backgroundColor: "#FFFFFF",
            border: "4px solid #111111",
            borderRadius: 32,
            padding: "40px 56px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
              underhyped<span style={{ color: "#FF5A1F" }}>.wtf</span>
            </div>
            {badge ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: "#FFFFFF",
                  backgroundColor: badge.color,
                  padding: "8px 20px",
                  borderRadius: 999,
                }}
              >
                {badge.label}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 32 }}>
            <div
              style={{
                display: "flex",
                width: 200,
                height: 200,
                borderRadius: 24,
                border: "4px solid #111111",
                backgroundColor: "#EFEFEA",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {creator?.avatarUrl ? (
                <img
                  src={ogAvatarSrc(creator.avatarUrl)}
                  alt=""
                  width={200}
                  height={200}
                  style={{ objectFit: "cover" }}
                />
              ) : null}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#111111" }}>
                {name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", fontSize: 26, color: "#6B6B66" }}>
                  @{handle}
                </span>
                {category ? (
                  <span
                    style={{
                      display: "flex",
                      fontSize: 18,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#111111",
                      border: "2px solid #111111",
                      borderRadius: 999,
                      padding: "4px 14px",
                    }}
                  >
                    {category}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 56,
              marginTop: 28,
              paddingTop: 24,
              borderTop: "3px solid #111111",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 60, fontWeight: 700, color: "#FF5A1F" }}>
                {aura}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  color: "#6B6B66",
                }}
              >
                Aura
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{ display: "flex", fontSize: 60, fontWeight: 700, color: "#111111" }}
              >
                {rank !== null ? `#${rank}` : "NEW"}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  color: "#6B6B66",
                }}
              >
                {rank !== null ? "Rank" : "Challenger"}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
