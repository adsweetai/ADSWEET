export type ThemePreference = "auto" | "light" | "dark";
export type Theme = "light" | "dark";

export const THEME_COOKIE = "as-theme";

/**
 * Draait vóór de eerste paint in <head>. Zet data-theme op <html> volgens de keuze in de cookie,
 * en volgt het toestel zolang de keuze "auto" is.
 */
export const themeScript = `(function(){try{var d=document.documentElement;var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|auto)/);var p=m?m[1]:"auto";var q=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){d.dataset.theme=p==="auto"?(q.matches?"dark":"light"):p;d.dataset.themePref=p;};a();q.addEventListener&&q.addEventListener("change",function(){if(d.dataset.themePref==="auto")d.dataset.theme=q.matches?"dark":"light";});}catch(e){}})();`;

export function resolveTheme(pref: ThemePreference, systemDark: boolean): Theme {
  return pref === "auto" ? (systemDark ? "dark" : "light") : pref;
}

/** Bewaart de keuze (één jaar) en past ze meteen toe. Alleen in de browser. */
export function setThemePreference(pref: ThemePreference): Theme {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = resolveTheme(pref, systemDark);
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePref = pref;
  return theme;
}
