(() => {
  const STYLE_VARS_ID = "xp-theme-vars";
  const STYLE_RULES_ID = "xp-theme-rules";
  const MAX_NODES_PER_FRAME = 150;
  const DEBUG_PERF = false;

  const THEMES = globalThis.XPaletteThemes;
  if (!THEMES || typeof THEMES !== "object") {
    console.warn("[XPalettePro] Theme registry not found. Ensure themes.js loads before content.js");
    return;
  }

  const BG_TO_MAIN = new Set([
    "rgb(255, 255, 255)",
    "rgb(247, 249, 249)",
    "rgb(0, 0, 0)",
    "rgb(15, 20, 25)",
    "rgb(16, 23, 30)",
    "rgb(21, 32, 43)",
    "rgb(25, 39, 52)",
  ]);

  const BG_TO_HOVER = new Set([
    "rgb(239, 243, 244)",
    "rgb(232, 236, 238)",
    "rgb(230, 233, 234)",
    "rgb(22, 24, 28)",
    "rgb(32, 35, 39)",
    "rgb(39, 44, 48)",
    "rgb(26, 29, 33)",
  ]);

  const TEXT_TO_PRIMARY = new Set([
    "rgb(15, 20, 25)",
    "rgb(15, 20, 26)",
    "rgb(0, 0, 0)",
    "rgb(255, 255, 255)",
    "rgb(231, 233, 234)",
    "rgb(247, 249, 249)",
    "rgb(239, 243, 244)",
    "rgb(215, 218, 220)",
  ]);

  const TEXT_TO_MUTED = new Set([
    "rgb(83, 100, 113)",
    "rgb(87, 105, 118)",
    "rgb(101, 119, 134)",
    "rgb(113, 118, 123)",
    "rgb(139, 152, 165)",
    "rgb(120, 124, 128)",
  ]);

  const BORDER_TO_THEME = new Set([
    "rgb(239, 243, 244)",
    "rgb(207, 217, 222)",
    "rgb(196, 207, 214)",
    "rgb(47, 51, 54)",
    "rgb(56, 68, 77)",
  ]);

  const ROLE_HINTS = new Set(["button", "menuitem", "option", "tab", "link", "dialog", "article", "listitem"]);
  const TESTID_HINTS = [
    "tweet",
    "cellInnerDiv",
    "UserCell",
    "trend",
    "primaryColumn",
    "sidebarColumn",
    "DMDrawer",
    "HoverCard",
    "Dropdown",
    "conversation",
    "message",
  ];

  let observer = null;
  let rafId = null;
  let currentThemeId = "default";
  let currentThemeVersion = "";
  let currentColors = null;
  let nodeQueue = new Set();

  function hexToRgb(hex) {
    if (typeof hex !== "string") return null;
    const value = hex.trim().replace("#", "");
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value)) return null;
    const full = value.length === 3 ? value.split("").map((ch) => ch + ch).join("") : value;
    const intVal = parseInt(full, 16);
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255,
    };
  }

  function blendHex(baseHex, accentHex, amount) {
    const base = hexToRgb(baseHex);
    const accent = hexToRgb(accentHex);
    if (!base || !accent) return null;
    const t = Math.max(0, Math.min(1, amount));
    const r = Math.round(base.r + (accent.r - base.r) * t);
    const g = Math.round(base.g + (accent.g - base.g) * t);
    const b = Math.round(base.b + (accent.b - base.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToRgbString(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  function isLightColor(rgbString) {
    const m = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const r = Number.parseInt(m[1], 10);
    const g = Number.parseInt(m[2], 10);
    const b = Number.parseInt(m[3], 10);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7;
  }

  function detectScheme(themeMeta, colors) {
    if (themeMeta && typeof themeMeta.name === "string" && themeMeta.name.toLowerCase().includes("light")) {
      return "light";
    }
    return isLightColor(colors["--xp-bg"]) ? "light" : "dark";
  }

  function buildThemeVarsCSS(themeMeta) {
    const c = themeMeta.colors;
    const scheme = detectScheme(themeMeta, c);
    const hover = blendHex(c["--xp-bg-hover"], c["--xp-accent"], scheme === "light" ? 0.12 : 0.18) || c["--xp-bg-hover"];
    const accentRgb = hexToRgbString(c["--xp-accent"]);
    const onAccent = accentRgb && isLightColor(accentRgb) ? "#111111" : "#ffffff";

    return `
:root {
  --xp-bg: ${c["--xp-bg"]};
  --xp-bg-hover: ${c["--xp-bg-hover"]};
  --xp-border: ${c["--xp-border"]};
  --xp-text: ${c["--xp-text"]};
  --xp-text-muted: ${c["--xp-text-muted"]};
  --xp-accent: ${c["--xp-accent"]};
  --xp-on-accent: ${onAccent};
  --xp-interactive-hover: ${hover};
  --xp-scheme: ${scheme};
}
`;
  }

  function buildThemeRulesCSS() {
    return `
html, body, #react-root, #layers {
  background-color: var(--xp-bg) !important;
  color: var(--xp-text) !important;
  color-scheme: var(--xp-scheme) !important;
}

/* Inline style surfaces from X runtime — main background */
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(255, 255, 255)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(247, 249, 249)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(0, 0, 0)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(15, 20, 25)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(21, 32, 43)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(29, 155, 240)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(29, 161, 242)"] {
  background-color: var(--xp-bg) !important;
}

*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(239, 243, 244)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(232, 236, 238)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(32, 35, 39)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="background-color: rgb(39, 44, 48)"] {
  background-color: var(--xp-bg-hover) !important;
}

*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(15, 20, 25)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(15, 20, 26)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(0, 0, 0)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(231, 233, 234)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(247, 249, 249)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(239, 243, 244)"] {
  color: var(--xp-text) !important;
}

*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(83, 100, 113)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(113, 118, 123)"],
*:not([data-testid$="-follow"]):not([data-testid$="-unfollow"])[style*="color: rgb(139, 152, 165)"] {
  color: var(--xp-text-muted) !important;
}

body {
  scrollbar-color: var(--xp-border) var(--xp-bg) !important;
}

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--xp-bg); }
::-webkit-scrollbar-thumb { background: var(--xp-border); border-radius: 4px; }

header[role="banner"],
main,
aside[role="complementary"],
div[data-testid="primaryColumn"],
div[data-testid="sidebarColumn"],
div[data-testid="DMDrawer"],
div[data-testid="HoverCard"],
div[role="dialog"] > div,
div[role="menu"],
div[data-testid="Dropdown"],
div[data-testid="Dropdown"] > div,
div[data-testid="sheetDialog"] > div,
div[data-testid="confirmationSheetDialog"] > div {
  background-color: var(--xp-bg) !important;
  color: var(--xp-text) !important;
  border-color: var(--xp-border) !important;
}

/* Confirmation dialog: clear recent searches */
div[data-testid="deleteRecentSearchesDialog"] {
  background-color: var(--xp-bg) !important;
  color: var(--xp-text) !important;
  border-color: var(--xp-border) !important;
  border-radius: 16px !important;
}

div[data-testid="deleteRecentSearchesDialog"] h1,
div[data-testid="deleteRecentSearchesDialog"] [dir="ltr"] {
  color: var(--xp-text) !important;
}

div[data-testid="deleteRecentSearchesDialog"] [data-testid="confirmationSheetCancel"] {
  background-color: transparent !important;
  border-color: var(--xp-border) !important;
}

div[data-testid="deleteRecentSearchesDialog"] [data-testid="confirmationSheetCancel"] * {
  color: var(--xp-text) !important;
}

/* Keep destructive action visually destructive but readable */
div[data-testid="deleteRecentSearchesDialog"] [data-testid="confirmationSheetConfirm"] {
  background-color: rgb(244, 33, 46) !important;
  border-color: rgb(244, 33, 46) !important;
}

div[data-testid="deleteRecentSearchesDialog"] [data-testid="confirmationSheetConfirm"] * {
  color: #ffffff !important;
}

nav[role="navigation"] a[role="link"],
[data-testid^="AppTabBar"] a[role="link"],
[data-testid^="AppTabBar"] a[role="link"] span,
[data-testid^="AppTabBar"] a[role="link"] svg {
  color: var(--xp-text) !important;
}

[data-testid^="AppTabBar_"][data-testid$="_Link"],
[data-testid^="AppTabBar_"][data-testid$="_Link"] *,
[data-testid^="AppTabBar_"][data-testid$="_Link"] [dir="ltr"],
[data-testid^="AppTabBar_"][data-testid$="_Link"] svg,
[data-testid^="AppTabBar_"][data-testid$="_Link"] path {
  color: var(--xp-text) !important;
  fill: currentColor !important;
}

/* Live module and similar right-rail placements */
div[data-testid="placementTracking"],
div[data-testid="placementTracking"] > button,
div[data-testid="placementTracking"] > button > div,
div[data-testid="placementTracking"] > button > div > div {
  background-color: var(--xp-bg) !important;
  border-color: var(--xp-border) !important;
}

/* Composer surface */
div[data-testid="primaryColumn"] div:has(> div > div[data-testid="tweetTextarea_0_label"]),
div[data-testid="primaryColumn"] div:has(> div[data-testid="tweetTextarea_0_label"]) {
  background-color: var(--xp-bg) !important;
  border-color: var(--xp-border) !important;
}

div[data-testid="tweetTextarea_0_label"],
div[data-testid="tweetTextarea_0_label"] * {
  color: var(--xp-text) !important;
}

.public-DraftEditorPlaceholder-inner {
  color: var(--xp-text-muted) !important;
}

/* Keep compose action icons on accent; don't override side nav icons */
div[data-testid="toolBar"] div[data-testid="ScrollSnap-List"] button,
div[data-testid="toolBar"] div[data-testid="ScrollSnap-List"] button svg,
div[data-testid="toolBar"] div[data-testid="ScrollSnap-List"] button [dir="ltr"] {
  color: var(--xp-accent) !important;
}

div[data-testid="toolBar"] button svg {
  color: var(--xp-accent) !important;
  fill: currentColor !important;
}

[data-testid^="AppTabBar"] svg {
  color: var(--xp-text) !important;
  fill: currentColor !important;
}

/* Normalize X icon glyph rendering in dark themes */
header[role="banner"] svg.r-yyyyoo,
nav[role="navigation"] svg.r-yyyyoo,
main svg.r-yyyyoo,
aside[role="complementary"] svg.r-yyyyoo,
div[role="menu"] svg.r-yyyyoo,
div[role="dialog"] svg.r-yyyyoo {
  color: inherit !important;
  fill: currentColor !important;
  stroke: currentColor !important;
}

header[role="banner"] svg.r-yyyyoo path,
nav[role="navigation"] svg.r-yyyyoo path,
main svg.r-yyyyoo path,
aside[role="complementary"] svg.r-yyyyoo path,
div[role="menu"] svg.r-yyyyoo path,
div[role="dialog"] svg.r-yyyyoo path {
  fill: currentColor !important;
  stroke: none !important;
}

section[aria-labelledby],
div[data-testid="cellInnerDiv"],
article[data-testid="tweet"],
article[data-testid="tweet"] > div,
div[data-testid="UserCell"],
div[data-testid="trend"],
div[role="listitem"] {
  background-color: var(--xp-bg) !important;
  border-color: var(--xp-border) !important;
}

/* Sidebar signup/login promo boxes */
div[data-testid="sidebarColumn"] aside,
div[data-testid="sidebarColumn"] aside > div,
div[data-testid="sidebarColumn"] section,
div[data-testid="sidebarColumn"] section > div {
  background-color: var(--xp-bg-hover) !important;
  border-color: var(--xp-border) !important;
  color: var(--xp-text) !important;
}

/* "Don't miss" / BottomBar promo banner */
div[data-testid="BottomBar"],
div[data-testid="BottomBar"] > div {
  background-color: var(--xp-bg) !important;
  color: var(--xp-text) !important;
  border-top: 1px solid var(--xp-border) !important;
}

/* "Don't miss" / promo banners with X blue inline background */
div[style*="background-color: rgb(29, 155, 240)"],
div[style*="background-color: rgb(29, 161, 242)"],
div[style*="background: rgb(29, 155, 240)"] {
  background-color: var(--xp-bg-hover) !important;
}

/* Sticky profile/search header (has backdrop-filter blur) */
div[data-testid="primaryColumn"] div[style*="backdrop-filter"],
div[data-testid="primaryColumn"] div[style*="-webkit-backdrop-filter"] {
  background-color: color-mix(in srgb, var(--xp-bg) 85%, transparent) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border-bottom-color: var(--xp-border) !important;
}

/* Fallback: any element computed as rgba(255,255,255,0.85) via class (sticky header) */
[class*="r-1h3ijdo"],
[class*="r-1e5uvyk"] {
  background-color: color-mix(in srgb, var(--xp-bg) 85%, transparent) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}

div[data-testid="cellInnerDiv"]:hover,
div[data-testid="cellInnerDiv"]:hover > div,
div[data-testid="UserCell"]:hover,
div[data-testid="trend"]:hover,
[role="menuitem"]:hover,
[role="menuitem"]:focus-visible,
[role="option"]:hover,
[role="option"]:focus-visible,
[role="button"]:hover:not([data-testid$="-follow"]):not([data-testid$="-unfollow"]):not([data-testid^="AppTabBar_"]),
[role="button"]:focus-visible:not([data-testid$="-follow"]):not([data-testid$="-unfollow"]):not([data-testid^="AppTabBar_"]) {
  background-color: var(--xp-interactive-hover) !important;
}

/* Sidebar nav: hover only compact icon/text group, not full row container */
[data-testid^="AppTabBar_"][data-testid$="_Link"]:hover,
[data-testid^="AppTabBar_"][data-testid$="_Link"]:focus-visible {
  background-color: transparent !important;
}

[data-testid^="AppTabBar_"][data-testid$="_Link"]:hover > div,
[data-testid^="AppTabBar_"][data-testid$="_Link"]:focus-visible > div,
[data-testid^="AppTabBar_"][data-testid$="_Link"]:hover > div > div:first-child,
[data-testid^="AppTabBar_"][data-testid$="_Link"]:focus-visible > div > div:first-child,
[data-testid="AppTabBar_More_Menu"]:hover > div,
[data-testid="AppTabBar_More_Menu"]:focus-visible > div,
[data-testid="AppTabBar_More_Menu"]:hover > div > div:first-child,
[data-testid="AppTabBar_More_Menu"]:focus-visible > div > div:first-child {
  background-color: var(--xp-interactive-hover) !important;
  border-radius: 9999px !important;
}

[data-testid^="AppTabBar_"][data-testid$="_Link"] > div,
[data-testid^="AppTabBar_"][data-testid$="_Link"] > div > div:first-child,
[data-testid="AppTabBar_More_Menu"] > div,
[data-testid="AppTabBar_More_Menu"] > div > div:first-child {
  border-radius: 9999px !important;
}

/* Fallback for sidebar links without AppTabBar data-testid (e.g. Grok/Premium variants) */
header[role="banner"] nav[role="navigation"] a[role="link"]:hover,
header[role="banner"] nav[role="navigation"] a[role="link"]:focus-visible {
  background-color: transparent !important;
}

header[role="banner"] nav[role="navigation"] a[role="link"]:hover > div,
header[role="banner"] nav[role="navigation"] a[role="link"]:focus-visible > div {
  background-color: var(--xp-interactive-hover) !important;
  border-radius: 9999px !important;
}

/* Avoid side-strip artifact from hovering the outer tweet wrapper */
article[data-testid="tweet"]:hover {
  background-color: transparent !important;
}

input,
textarea,
div[data-testid="tweetTextarea_0"],
div[data-testid="tweetTextarea_0"] span,
form[role="search"] div[style*="background-color"] {
  background-color: var(--xp-bg-hover) !important;
  color: var(--xp-text) !important;
  border-color: var(--xp-border) !important;
}

/* Search box + magnifier icon (default and focused states) */
form[role="search"] [data-testid="SearchBox_Search_Input_label"] {
  background-color: var(--xp-bg-hover) !important;
  border-color: var(--xp-border) !important;
  color: var(--xp-text) !important;
  border-radius: 9999px !important;
  overflow: hidden !important;
}

form[role="search"] [data-testid="SearchBox_Search_Input_label"] svg,
form[role="search"] [data-testid="SearchBox_Search_Input_label"] path {
  color: var(--xp-text-muted) !important;
  fill: currentColor !important;
}

form[role="search"] [data-testid="SearchBox_Search_Input"] {
  color: var(--xp-text) !important;
  caret-color: var(--xp-accent) !important;
}

form[role="search"] [data-testid="SearchBox_Search_Input"]::placeholder {
  color: var(--xp-text-muted) !important;
}

form[role="search"]:focus-within [data-testid="SearchBox_Search_Input_label"] {
  background-color: var(--xp-bg) !important;
  border-color: var(--xp-accent) !important;
  box-shadow: inset 0 0 0 1px var(--xp-accent) !important;
  border-radius: 9999px !important;
  overflow: hidden !important;
}

form[role="search"]:focus-within [data-testid="SearchBox_Search_Input_label"] svg,
form[role="search"]:focus-within [data-testid="SearchBox_Search_Input_label"] path {
  color: var(--xp-accent) !important;
  fill: currentColor !important;
}

/* Keep search dropdown corners intact when themed classes are applied */
form[role="search"] [id^="typeaheadDropdown-"],
form[role="search"] [id^="typeaheadDropdown-"] > div,
form[role="search"] [data-testid="typeaheadEmptySearch"] {
  border-radius: 16px !important;
  overflow: hidden !important;
}

span[data-testid="app-text-transition-container"],
span[data-testid="app-text-transition-container"] span {
  color: var(--xp-text-muted) !important;
}

span[style*="color: rgb(29, 155, 240)"],
span[style*="color: rgb(29, 161, 242)"],
a[role="link"] span[style*="color: rgb(29, 155, 240)"],
a[role="link"] span[style*="color: rgb(29, 161, 242)"] {
  color: var(--xp-accent) !important;
}

div[role="tablist"] div[style*="background-color: rgb(29, 155, 240)"],
div[role="tablist"] div[style*="background-color: rgb(29, 161, 242)"],
div[role="tablist"] div[style*="border-bottom: 4px solid rgb(29, 155, 240)"] {
  background-color: var(--xp-accent) !important;
  border-bottom-color: var(--xp-accent) !important;
}

[data-testid$="-follow"] {
  background-color: var(--xp-accent) !important;
  border-color: var(--xp-accent) !important;
}

[data-testid$="-follow"] span {
  color: var(--xp-bg) !important;
}

[data-testid$="-unfollow"] {
  border-color: var(--xp-border) !important;
}

.xp-bg-main { background-color: var(--xp-bg) !important; }
.xp-bg-hover { background-color: var(--xp-bg-hover) !important; }
.xp-txt-primary { color: var(--xp-text) !important; }
.xp-txt-muted { color: var(--xp-text-muted) !important; }
.xp-brd {
  border-bottom-color: var(--xp-border) !important;
  border-top-color: var(--xp-border) !important;
  border-left-color: var(--xp-border) !important;
  border-right-color: var(--xp-border) !important;
}

/* Preserve rounded corners on nested themed layers */
:where(.xp-bg-main, .xp-bg-hover):not([style*="border-radius"]) {
  border-radius: inherit;
  background-clip: padding-box;
}

/* Keep primary Post CTAs on accent even if scanner classifies them */
[data-testid="SideNav_NewTweet_Button"],
[data-testid="SideNav_NewTweet_Button"].xp-bg-main,
[data-testid="tweetButtonInline"],
[data-testid="tweetButtonInline"].xp-bg-main {
  background-color: var(--xp-accent) !important;
  border-color: var(--xp-accent) !important;
}

[data-testid="SideNav_NewTweet_Button"] *,
[data-testid="tweetButtonInline"] * {
  color: var(--xp-on-accent) !important;
}
`;
  }

  function ensureRulesStyle() {
    if (document.getElementById(STYLE_RULES_ID)) return;
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_RULES_ID;
    styleEl.textContent = buildThemeRulesCSS();
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function setVarsStyle(themeMeta) {
    const existing = document.getElementById(STYLE_VARS_ID);
    if (existing) existing.remove();

    const styleEl = document.createElement("style");
    styleEl.id = STYLE_VARS_ID;
    styleEl.textContent = buildThemeVarsCSS(themeMeta);
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function removeThemeStyles() {
    const varsStyle = document.getElementById(STYLE_VARS_ID);
    if (varsStyle) varsStyle.remove();

    const rulesStyle = document.getElementById(STYLE_RULES_ID);
    if (rulesStyle) rulesStyle.remove();
  }

  function shouldSkipElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    if (el.matches("iframe, canvas, video, img, svg, path")) return true;
    if (el.closest('[data-testid="google_sign_in_container"]')) return true;
    if (el.closest('[data-testid="videoComponent"], [data-testid="card.wrapper"]')) return true;
    if (el.closest('[data-testid^="UserAvatar-Container"], [data-testid*="UserAvatar"]')) return true;
    return false;
  }

  function hasStyleHints(el) {
    // Any inline style at all is worth inspecting
    if (el.hasAttribute("style")) return true;

    const role = el.getAttribute("role");
    if (role && ROLE_HINTS.has(role)) return true;

    const testid = el.getAttribute("data-testid");
    if (testid) {
      for (const hint of TESTID_HINTS) {
        if (testid.includes(hint)) return true;
      }
    }

    // X often paints via utility classes instead of inline style.
    const className = typeof el.className === "string" ? el.className : "";
    if (
      className.includes("css-175oi2r") &&
      el.closest(
        'div[data-testid="primaryColumn"], ' +
          'div[data-testid="sidebarColumn"], ' +
          'div[data-testid="placementTracking"], ' +
          'div[data-testid="toolBar"], ' +
          'div[role="dialog"], ' +
          'div[role="menu"]'
      )
    ) {
      return true;
    }

    // Structural tags that commonly carry background
    const tag = el.tagName;
    if (tag === "SECTION" || tag === "ASIDE" || tag === "HEADER" || tag === "NAV" || tag === "MAIN" || tag === "FOOTER") return true;

    return false;
  }

  function classifyBackground(el, cs) {
    const bg = cs.backgroundColor;
    el.classList.remove("xp-bg-main", "xp-bg-hover");
    if (bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return;
    if (cs.backgroundImage && cs.backgroundImage !== "none") return;

    if (currentColors) {
      const currentBg = hexToRgbString(currentColors["--xp-bg"]);
      const currentBgHover = hexToRgbString(currentColors["--xp-bg-hover"]);
      if (currentBg && bg === currentBg) {
        el.classList.add("xp-bg-main");
        return;
      }
      if (currentBgHover && bg === currentBgHover) {
        el.classList.add("xp-bg-hover");
        return;
      }
    }

    if (BG_TO_MAIN.has(bg)) {
      el.classList.add("xp-bg-main");
      return;
    }

    if (BG_TO_HOVER.has(bg)) {
      el.classList.add("xp-bg-hover");
      return;
    }

    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return;

    const r = Number.parseInt(m[1], 10);
    const g = Number.parseInt(m[2], 10);
    const b = Number.parseInt(m[3], 10);

    if ((r > 220 && g > 220 && b > 220) || (r < 30 && g < 35 && b < 55)) {
      el.classList.add("xp-bg-main");
      return;
    }

    if (r > 200 && g > 200 && b > 200) {
      el.classList.add("xp-bg-hover");
    }
  }

  function classifyText(el, cs) {
    const color = cs.color;
    el.classList.remove("xp-txt-primary", "xp-txt-muted");

    if (currentColors) {
      const currentText = hexToRgbString(currentColors["--xp-text"]);
      const currentMuted = hexToRgbString(currentColors["--xp-text-muted"]);
      if (currentText && color === currentText) {
        el.classList.add("xp-txt-primary");
        return;
      }
      if (currentMuted && color === currentMuted) {
        el.classList.add("xp-txt-muted");
        return;
      }
    }

    if (TEXT_TO_PRIMARY.has(color)) {
      el.classList.add("xp-txt-primary");
      return;
    }

    if (TEXT_TO_MUTED.has(color)) {
      el.classList.add("xp-txt-muted");
    }
  }

  function classifyBorder(el, cs) {
    const hasBorder =
      (cs.borderBottomWidth !== "0px" && cs.borderBottomColor !== "transparent" && cs.borderBottomColor !== "rgba(0, 0, 0, 0)") ||
      (cs.borderTopWidth !== "0px" && cs.borderTopColor !== "transparent" && cs.borderTopColor !== "rgba(0, 0, 0, 0)") ||
      (cs.borderLeftWidth !== "0px" && cs.borderLeftColor !== "transparent" && cs.borderLeftColor !== "rgba(0, 0, 0, 0)") ||
      (cs.borderRightWidth !== "0px" && cs.borderRightColor !== "transparent" && cs.borderRightColor !== "rgba(0, 0, 0, 0)");

    if (!hasBorder) {
      el.classList.remove("xp-brd");
      return;
    }

    const borderColor = cs.borderBottomColor;
    if (BORDER_TO_THEME.has(borderColor) || hasStyleHints(el)) {
      el.classList.add("xp-brd");
    }
  }

  function processElement(el) {
    if (!currentThemeVersion || shouldSkipElement(el)) return;

    if (el.dataset.xpVer === currentThemeVersion) {
      return;
    }

    if (!hasStyleHints(el)) {
      el.classList.remove("xp-bg-main", "xp-bg-hover", "xp-txt-primary", "xp-txt-muted", "xp-brd");
      el.dataset.xpVer = currentThemeVersion;
      return;
    }

    const cs = getComputedStyle(el);
    classifyBackground(el, cs);
    classifyText(el, cs);
    classifyBorder(el, cs);
    el.dataset.xpVer = currentThemeVersion;
  }

  function addNodeToQueue(node, includeDescendants) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

    nodeQueue.add(node);

    if (!includeDescendants) return;

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      nodeQueue.add(walker.currentNode);
    }
  }

  function scheduleFlush() {
    if (rafId || !currentThemeVersion) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      flushQueue();
    });
  }

  function flushQueue() {
    if (!currentThemeVersion || nodeQueue.size === 0) return;

    const start = performance.now();
    let processed = 0;

    for (const el of nodeQueue) {
      nodeQueue.delete(el);
      processElement(el);
      processed += 1;
      if (processed >= MAX_NODES_PER_FRAME) break;
    }

    if (DEBUG_PERF && processed > 0) {
      const duration = Math.round((performance.now() - start) * 100) / 100;
      console.debug("[XPalettePro] scanner", {
        processed,
        remaining: nodeQueue.size,
        durationMs: duration,
      });
    }

    if (nodeQueue.size > 0) {
      scheduleFlush();
    }
  }

  function clearThemedClasses() {
    const themed = document.querySelectorAll(".xp-bg-main, .xp-bg-hover, .xp-txt-primary, .xp-txt-muted, .xp-brd, [data-xp-ver]");
    themed.forEach((el) => {
      el.classList.remove("xp-bg-main", "xp-bg-hover", "xp-txt-primary", "xp-txt-muted", "xp-brd");
      delete el.dataset.xpVer;
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    nodeQueue.clear();
  }

  function startObserver() {
    if (observer) return;

    observer = new MutationObserver((records) => {
      if (!currentThemeVersion) return;

      for (const record of records) {
        if (record.type === "childList") {
          record.addedNodes.forEach((node) => addNodeToQueue(node, true));
          continue;
        }

        if (record.type === "attributes") {
          if (record.attributeName === "style" && record.target && record.target.nodeType === Node.ELEMENT_NODE) {
            delete record.target.dataset.xpVer;
          }
          addNodeToQueue(record.target, false);
        }
      }

      scheduleFlush();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  function queueInitialScan() {
    if (!document.body) return;

    addNodeToQueue(document.body, true);
    const main = document.querySelector("main");
    if (main) addNodeToQueue(main, true);

    const layers = document.getElementById("layers");
    if (layers) addNodeToQueue(layers, true);

    scheduleFlush();

    // One safety pass after hydration for late-mounted overlays.
    setTimeout(() => {
      if (!currentThemeVersion) return;
      const root = document.body;
      if (root) {
        addNodeToQueue(root, true);
        scheduleFlush();
      }
    }, 900);
  }

  function applyTheme(themeId) {
    const theme = THEMES[themeId];

    if (!theme || !theme.colors) {
      currentThemeId = "default";
      currentThemeVersion = "";
      currentColors = null;
      stopObserver();
      removeThemeStyles();
      clearThemedClasses();
      return;
    }

    currentThemeId = themeId;
    currentThemeVersion = `${themeId}:${Date.now()}`;
    currentColors = theme.colors;

    ensureRulesStyle();
    setVarsStyle(theme);
    startObserver();
    queueInitialScan();
  }

  function init() {
    chrome.storage.local.get(["xp_theme"], (result) => {
      const themeId = result.xp_theme || "default";

      const tryApply = () => {
        if (!document.body) {
          requestAnimationFrame(tryApply);
          return;
        }

        applyTheme(themeId);
      };

      tryApply();
    });
  }

  init();

  chrome.runtime.onMessage.addListener((request) => {
    if (request.type !== "THEME_CHANGED") return;
    applyTheme(request.theme);
  });
})();
