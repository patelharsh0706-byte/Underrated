// Shared by the inline <head> script (layout.tsx) and ThemeToggle. Kept out
// of the "use client" module so the server layout gets the real string, not
// a client reference.
// "-v2" since the day-default change (DECISIONS.md § 2026-09-26): choices
// saved under the old key, made while the site followed the OS, are
// ignored once, so every visitor starts on day again.
export const THEME_KEY = "uh-theme-v2";

// Runs in <head> before first paint — see
// node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
