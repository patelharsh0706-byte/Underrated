import { ImageResponse } from "next/og";

import { getPublicProfileByUsername, getReceipts } from "@/lib/db/queries";
import { pickBestSpot } from "@/lib/receipts/best-spot";

export const runtime = "nodejs";
export const alt = "Underhyped receipts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette is inlined rather than read from tokens — Satori gets no stylesheet.
// Same values as the creator OG card so the two read as one system.
const GROUND = "#F7F7F2";
const SURFACE = "#FFFFFF";
const INK = "#111111";
const INK_SOFT = "#6B6B66";
const AURA = "#FF5A1F";
const LIME = "#D8FF3E";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function Image({ params }: Props) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  const receipts = profile ? await getReceipts(profile.id) : null;
  const best = receipts ? pickBestSpot(receipts.spots) : undefined;
  const who = profile?.displayName ?? `@${profile?.username ?? username}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: GROUND,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 1040,
            height: 510,
            backgroundColor: SURFACE,
            border: `4px solid ${INK}`,
            borderRadius: 32,
            padding: "44px 56px",
          }}
        >
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: -0.4 }}>
            underhyped<span style={{ color: AURA }}>.wtf</span>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              color: INK_SOFT,
              marginTop: 18,
            }}
          >
            🧾 RECEIPTS
          </div>

          {best ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", fontSize: 26, color: INK_SOFT, marginTop: 26 }}>
                {who} spotted
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 64,
                  fontWeight: 800,
                  letterSpacing: -1.5,
                  marginTop: 6,
                }}
              >
                {best.name.toUpperCase()}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  marginTop: 26,
                  fontSize: 46,
                  fontWeight: 800,
                }}
              >
                <span style={{ display: "flex", color: INK_SOFT }}>#{best.rankAtSpot}</span>
                <span style={{ display: "flex", color: INK_SOFT, fontSize: 34 }}>→</span>
                <span style={{ display: "flex", color: AURA }}>#{best.currentRank}</span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                fontSize: 52,
                fontWeight: 800,
                letterSpacing: -1.2,
                marginTop: 48,
                textAlign: "center",
              }}
            >
              {receipts ? `${who} is still collecting.` : "Proof you were early."}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 44,
              marginTop: "auto",
              fontSize: 22,
              color: INK_SOFT,
            }}
          >
            <span style={{ display: "flex" }}>
              {receipts?.battlesCount ?? 0} battles played
            </span>
            <span style={{ display: "flex" }}>{receipts?.spotsCount ?? 0} people backed</span>
          </div>

          <div
            style={{
              display: "flex",
              backgroundColor: LIME,
              color: INK,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "10px 26px",
              borderRadius: 999,
              marginTop: 22,
            }}
          >
            FOUND HERE FIRST
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
