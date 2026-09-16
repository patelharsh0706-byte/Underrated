"use client";

import { useState } from "react";

export function ReceiptsShareButton() {
  const [isPending, setIsPending] = useState(false);

  const handleShare = async () => {
    setIsPending(true);
    try {
      const response = await fetch("/receipts/card");
      const blob = await response.blob();
      const file = new File([blob], "receipts-card.png", {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        // Fallback: open in new tab
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Share failed:", error);
      // Fallback: open card endpoint
      window.open("/receipts/card", "_blank");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isPending}
      className="w-full bg-lime-400 text-gray-900 font-semibold py-3 rounded-lg hover:bg-lime-500 disabled:opacity-50"
    >
      {isPending ? "Sharing..." : "🟢 FOUND HERE FIRST"}
    </button>
  );
}
