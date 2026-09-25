// Shared by the inline <head> script (layout.tsx) and ThemeToggle. Kept out
// of the "use client" module so the server layout gets the real string, not
// a client reference.
export const THEME_KEY = "uh-theme";

// Runs in <head> before first paint — see
// node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
