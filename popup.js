document.addEventListener("DOMContentLoaded", () => {
  const themeList = document.getElementById("themeList");
  const rootStyle = document.documentElement.style;

  const POPUP_DEFAULTS = {
    "--bg": "#1e1e1e",
    "--text": "#ffffff",
    "--primary": "#1da1f2",
    "--border": "#333333",
    "--hover": "#2c2c2c",
    "--muted": "#a0a0a0",
    "--active-bg": "rgba(29, 161, 242, 0.1)",
    "--dot-border": "rgba(255, 255, 255, 0.2)",
  };

  // Load current theme from storage
  chrome.storage.local.get(["xp_theme"], (result) => {
    const currentTheme = result.xp_theme || "default";
    applyPopupTheme(currentTheme);
    renderThemes(currentTheme);
  });

  function renderThemes(activeThemeId) {
    themeList.innerHTML = "";
    for (const [themeId, themeData] of Object.entries(window.XPaletteThemes)) {
      const btn = document.createElement("button");
      btn.className = `theme-btn ${themeId === activeThemeId ? "active" : ""}`;
      btn.dataset.theme = themeId;

      let previewHTML = "";
      if (themeData.colors) {
        previewHTML = `
                    <div class="theme-preview">
                        <div class="color-dot" style="background-color: ${themeData.colors["--xp-bg"]}"></div>
                        <div class="color-dot" style="background-color: ${themeData.colors["--xp-accent"]}"></div>
                    </div>
                `;
      }

      btn.innerHTML = `
                <span>${themeData.name}</span>
                ${previewHTML}
            `;

      btn.addEventListener("click", () => selectTheme(themeId, btn));
      themeList.appendChild(btn);
    }
  }

  function selectTheme(themeId, clickedBtn) {
    // Update UI
    document
      .querySelectorAll(".theme-btn")
      .forEach((btn) => btn.classList.remove("active"));
    clickedBtn.classList.add("active");
    applyPopupTheme(themeId);

    // Save to storage
    chrome.storage.local.set({ xp_theme: themeId }, () => {
      // Send message to active tabs
      chrome.tabs.query(
        {
          url: [
            "*://*.twitter.com/*",
            "*://twitter.com/*",
            "*://*.x.com/*",
            "*://x.com/*",
          ],
        },
        (tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
              type: "THEME_CHANGED",
              theme: themeId,
            }, () => {
              // Catch and ignore errors for tabs that haven't loaded the content script yet
              if (chrome.runtime.lastError) {
                // Error handled
              }
            });
          }
        },
      );
    });
  }

  function toRgbaFromHex(hex, alpha) {
    if (typeof hex !== "string") return null;
    const value = hex.trim().replace("#", "");
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value)) return null;
    const full = value.length === 3 ? value.split("").map((ch) => ch + ch).join("") : value;
    const intVal = parseInt(full, 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function isLightHex(hex) {
    const rgba = toRgbaFromHex(hex, 1);
    if (!rgba) return false;
    const m = rgba.match(/rgba\((\d+), (\d+), (\d+), 1\)/);
    if (!m) return false;
    const r = Number.parseInt(m[1], 10);
    const g = Number.parseInt(m[2], 10);
    const b = Number.parseInt(m[3], 10);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.68;
  }

  function applyPopupTheme(themeId) {
    const theme = window.XPaletteThemes[themeId];
    if (!theme || !theme.colors) {
      for (const [key, value] of Object.entries(POPUP_DEFAULTS)) {
        rootStyle.setProperty(key, value);
      }
      return;
    }

    const colors = theme.colors;
    const lightMode = isLightHex(colors["--xp-bg"]);
    const activeBg = toRgbaFromHex(colors["--xp-accent"], lightMode ? 0.15 : 0.22) || POPUP_DEFAULTS["--active-bg"];

    rootStyle.setProperty("--bg", colors["--xp-bg"]);
    rootStyle.setProperty("--text", colors["--xp-text"]);
    rootStyle.setProperty("--primary", colors["--xp-accent"]);
    rootStyle.setProperty("--border", colors["--xp-border"]);
    rootStyle.setProperty("--hover", colors["--xp-bg-hover"]);
    rootStyle.setProperty("--muted", colors["--xp-text-muted"]);
    rootStyle.setProperty("--active-bg", activeBg);
    rootStyle.setProperty("--dot-border", lightMode ? "rgba(0, 0, 0, 0.18)" : "rgba(255, 255, 255, 0.24)");
  }
});
