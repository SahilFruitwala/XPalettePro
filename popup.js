document.addEventListener("DOMContentLoaded", () => {
  const themeList = document.getElementById("themeList");

  // Load current theme from storage
  chrome.storage.local.get(["xp_theme"], (result) => {
    const currentTheme = result.xp_theme || "default";
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

    // Save to storage
    chrome.storage.local.set({ xp_theme: themeId }, () => {
      // Send message to active tabs
      chrome.tabs.query(
        { url: ["*://*.twitter.com/*", "*://*.x.com/*"] },
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
});
