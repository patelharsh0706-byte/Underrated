import { ShareButton } from "@/components/profile/share-button";

/**
 * Receipts are public, so sharing is sharing the *link* — the page carries its
 * own OG card, which is the picture. Reuses the profile share button rather
 * than shipping a second clipboard implementation; it already handles the
 * native sheet, the clipboard permission quirks, and the execCommand fallback.
 */
export function ReceiptsShareButton({ url }: { url: string }) {
  return (
    <div className="flex justify-center">
      <ShareButton url={url} label="Share your receipts" />
    </div>
  );
}
