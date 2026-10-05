// A script that must run while the HTML is parsed, before first paint (the
// day/night theme). Real JavaScript in the server's HTML; plain text when React
// renders it in the browser, so React doesn't warn about rendering a <script>
// it won't run. The script has already run by then. Pattern from Next's
// "Preventing flash before hydration" guide (node_modules/next/dist/docs).
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
