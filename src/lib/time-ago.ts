/** "2m ago" — shared by the Arena's Live panel and Home's Live Feed. */
export function formatTimeAgo(date: Date, now: number = Date.now()): string {
  const seconds = Math.max(0, (now - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
