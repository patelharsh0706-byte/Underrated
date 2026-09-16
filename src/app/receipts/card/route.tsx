import { ImageResponse } from "next/og";
import { getUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // For Phase 1, render a generic "Receipts" card
  // Full implementation would fetch best spot and current rank
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#F7F7F2",
          color: "#111",
          fontSize: 48,
          fontWeight: 700,
          fontFamily: "system-ui",
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 20 }}>👁</div>
        <div>YOU SPOTTED</div>
        <div style={{ color: "#D8FF3E", marginTop: 20, fontSize: 64 }}>
          FOUND HERE FIRST
        </div>
        <div style={{ fontSize: 24, marginTop: 40, color: "#6B6B66" }}>
          Underhyped · 2026
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
