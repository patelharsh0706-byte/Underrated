import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { isMockMode } from "@/lib/db/mock-data";
import { MAX_DEMO_BYTES } from "@/lib/demos/check-clip";

// Issues one-time Vercel Blob tokens so the browser can upload a demo video
// straight to Blob (ARCHITECTURE.md § Demo videos). The file never passes
// through this function — Vercel caps a request body at ~4.5 MB.
export async function POST(request: Request): Promise<NextResponse> {
  if (isMockMode()) return NextResponse.json({ error: "Preview mode — uploads are off." }, { status: 403 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("demos/")) throw new Error("Uploads must go to demos/");
        return {
          allowedContentTypes: ["video/mp4", "video/webm"],
          maximumSizeInBytes: MAX_DEMO_BYTES,
          addRandomSuffix: true,
        };
      },
      // Nothing to do here: createDemo() stores the row once the browser has
      // the Blob URL. (Blob can't call back to localhost anyway.)
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload refused" }, { status: 400 });
  }
}
