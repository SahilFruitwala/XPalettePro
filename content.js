(() => {
    const STYLE_ID = 'xp-theme-style';

    // All themes defined inline to avoid window scope issues
    const THEMES = {
        "default": { name: "Default (X)", colors: null },
        "dracula": {
            name: "Dracula",
            colors: {
                "--xp-bg": "#282a36",
                "--xp-bg-hover": "#323545",
                "--xp-border": "rgba(255, 255, 255, 0.08)",
                "--xp-text": "#f8f8f2",
                "--xp-text-muted": "#6272a4",
                "--xp-accent": "#bd93f9"
            }
        },
        "nord": {
            name: "Nord",
            colors: {
                "--xp-bg": "#2e3440",
                "--xp-bg-hover": "#3b4252",
                "--xp-border": "rgba(255, 255, 255, 0.08)",
                "--xp-text": "#d8dee9",
                "--xp-text-muted": "#81a1c1",
                "--xp-accent": "#88c0d0"
            }
        },
        "solarized": {
            name: "Solarized Dark",
            colors: {
                "--xp-bg": "#002b36",
                "--xp-bg-hover": "#073642",
                "--xp-border": "rgba(255, 255, 255, 0.08)",
                "--xp-text": "#839496",
                "--xp-text-muted": "#586e75",
                "--xp-accent": "#2aa198"
            }
        },
        "matrix": {
            name: "Matrix",
            colors: {
                "--xp-bg": "#0a0a0a",
                "--xp-bg-hover": "#111811",
                "--xp-border": "rgba(0, 255, 65, 0.1)",
                "--xp-text": "#00ff41",
                "--xp-text-muted": "#008f11",
                "--xp-accent": "#00ff41"
            }
        },
        "mocha": {
            name: "Catppuccin Mocha",
            colors: {
                "--xp-bg": "#1e1e2e",
                "--xp-bg-hover": "#28283d",
                "--xp-border": "rgba(255, 255, 255, 0.08)",
                "--xp-text": "#cdd6f4",
                "--xp-text-muted": "#a6adc8",
                "--xp-accent": "#cba6f7"
            }
        }
    };

    // Make themes accessible globally for popup
    window.XPaletteThemes = THEMES;

    // Known X colors to override (computed rgb strings)
    const BG_TO_MAIN = new Set([
        'rgb(255, 255, 255)', 'rgb(247, 249, 249)',
        'rgb(0, 0, 0)', 'rgb(15, 20, 25)', 'rgb(16, 23, 30)',
        'rgb(21, 32, 43)', 'rgb(25, 39, 52)'
    ]);
    const BG_TO_HOVER = new Set([
        'rgb(239, 243, 244)', 'rgb(232, 236, 238)', 'rgb(230, 233, 234)',
        'rgb(22, 24, 28)', 'rgb(32, 35, 39)', 'rgb(39, 44, 48)', 'rgb(26, 29, 33)'
    ]);
    const TEXT_TO_PRIMARY = new Set([
        'rgb(15, 20, 25)', 'rgb(0, 0, 0)',
        'rgb(231, 233, 234)', 'rgb(247, 249, 249)', 'rgb(239, 243, 244)', 'rgb(215, 218, 220)'
    ]);
    const TEXT_TO_MUTED = new Set([
        'rgb(83, 100, 113)', 'rgb(87, 105, 118)', 'rgb(101, 119, 134)',
        'rgb(113, 118, 123)', 'rgb(139, 152, 165)', 'rgb(120, 124, 128)'
    ]);
    const BORDER_TO_THEME = new Set([
        'rgb(239, 243, 244)', 'rgb(207, 217, 222)', 'rgb(196, 207, 214)',
        'rgb(47, 51, 54)', 'rgb(56, 68, 77)'
    ]);

    // Helper: check if an rgba color is essentially white/light
    function isLightBg(color) {
        if (BG_TO_MAIN.has(color) || BG_TO_HOVER.has(color)) return true;
        // Match rgba(255, 255, 255, ...) or rgba(247, 249, 249, ...) etc.
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
            const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
            // If it's a white/near-white with any alpha
            if (r > 200 && g > 200 && b > 200) return 'main';
            // If it's a light gray surface
            if (r > 220 && g > 220 && b > 220) return 'hover';
            // Dark mode backgrounds
            if (r < 30 && g < 35 && b < 55) return 'main';
        }
        return false;
    }

    let currentColors = null;
    let scanTimer = null;
    let observer = null;

    function buildCSS(c) {
        const bg = c['--xp-bg'];
        const bgH = c['--xp-bg-hover'];
        const brd = c['--xp-border'];
        const txt = c['--xp-text'];
        const mut = c['--xp-text-muted'];
        const acc = c['--xp-accent'];

        return `
html, body, body[style] {
    background-color: ${bg} !important;
    color: ${txt} !important;
    color-scheme: dark !important;
}

/* Inline-style bg overrides */
[style*="background-color: rgb(255, 255, 255)"],
[style*="background-color: rgb(247, 249, 249)"],
[style*="background-color: rgba(255, 255, 255"],
[style*="background-color: rgba(247, 249, 249"],
[style*="background-color: rgb(0, 0, 0)"],
[style*="background-color: rgb(15, 20, 25)"],
[style*="background-color: rgb(21, 32, 43)"],
[style*="background-color: rgba(0, 0, 0"] {
    background-color: ${bg} !important;
}
[style*="background-color: rgb(239, 243, 244)"],
[style*="background-color: rgb(232, 236, 238)"],
[style*="background-color: rgb(32, 35, 39)"],
[style*="background-color: rgb(39, 44, 48)"] {
    background-color: ${bgH} !important;
}

/* SVG icon colors */
svg { color: ${txt} !important; fill: ${txt} !important; }
/* Keep colored interactive SVGs (like, retweet, etc) */
button[data-testid="like"] svg,
button[data-testid="unlike"] svg { color: inherit !important; fill: inherit !important; }
button[data-testid="retweet"] svg { color: inherit !important; fill: inherit !important; }

/* Inline-style text overrides */
[style*="color: rgb(15, 20, 25)"],
[style*="color: rgb(231, 233, 234)"],
[style*="color: rgb(247, 249, 249)"],
[style*="color: rgb(239, 243, 244)"] {
    color: ${txt} !important;
}
[style*="color: rgb(83, 100, 113)"],
[style*="color: rgb(113, 118, 123)"],
[style*="color: rgb(139, 152, 165)"] {
    color: ${mut} !important;
}

/* Force ALL borders site-wide to theme border color */
* {
    border-color: ${brd} !important;
}
/* Keep accent-colored borders (e.g. active tab) */
div[role="tablist"] div[style*="border-bottom: 4px solid rgb(29, 155, 240)"] {
    border-bottom-color: ${acc} !important;
}

/* Layout structure */
div[data-testid="primaryColumn"],
div[data-testid="primaryColumn"] > div,
div[data-testid="sidebarColumn"],
div[data-testid="sidebarColumn"] > div,
div[data-testid="sidebarColumn"] > div > div,
div[data-testid="sidebarColumn"] > div > div > div,
header[role="banner"],
header[role="banner"] > div,
header[role="banner"] > div > div,
header[role="banner"] > div > div > div {
    background-color: ${bg} !important;
}
div[data-testid="sidebarColumn"] section { background-color: ${bgH} !important; }
div[data-testid="trend"], div[data-testid="UserCell"] { background-color: transparent !important; }
div[data-testid="sidebarColumn"] input { color: ${txt} !important; }
div[data-testid="sidebarColumn"] form[role="search"] div[style*="background-color"] { background-color: ${bgH} !important; }

/* Tweets */
article[data-testid="tweet"], article[data-testid="tweet"] > div { background-color: ${bg} !important; }
div[data-testid="tweetText"], div[data-testid="tweetText"] span { color: ${txt} !important; }

/* Compose */
div[data-testid="tweetTextarea_0"], div[data-testid="tweetTextarea_0"] span { color: ${txt} !important; background-color: ${bg} !important; }
div[data-testid="toolBar"] { background-color: ${bg} !important; }

/* Action counts */
span[data-testid="app-text-transition-container"],
span[data-testid="app-text-transition-container"] span { color: ${mut} !important; }

/* Accent/links */
span[style*="color: rgb(29, 155, 240)"],
span[style*="color: rgb(29, 161, 242)"],
a[role="link"] span[style*="color: rgb(29, 155, 240)"],
a[role="link"] span[style*="color: rgb(29, 161, 242)"] { color: ${acc} !important; }
div[role="tablist"] div[style*="background-color: rgb(29, 155, 240)"],
div[role="tablist"] div[style*="background-color: rgb(29, 161, 242)"] { background-color: ${acc} !important; }

/* Dialogs */
div[role="dialog"] > div { background-color: ${bg} !important; }
div[data-testid="HoverCard"], div[data-testid="HoverCard"] > div { background-color: ${bg} !important; }
nav[role="navigation"] { background-color: ${bg} !important; }
div[data-testid="DMDrawer"] { background-color: ${bg} !important; }

/* Scrollbar */
body { scrollbar-color: ${brd} ${bg} !important; }
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: ${bg}; }
::-webkit-scrollbar-thumb { background: ${brd}; border-radius: 4px; }
`;
    }

    function scanAndOverride() {
        if (!currentColors) return;

        const bg = currentColors['--xp-bg'];
        const bgH = currentColors['--xp-bg-hover'];
        const brd = currentColors['--xp-border'];
        const txt = currentColors['--xp-text'];
        const mut = currentColors['--xp-text-muted'];

        // Override body inline style directly
        if (document.body) {
            document.body.style.setProperty('background-color', bg, 'important');
        }

        // Scan ALL elements in the main content areas
        const containers = document.querySelectorAll(
            'div[data-testid="primaryColumn"], div[data-testid="sidebarColumn"], header[role="banner"]'
        );

        containers.forEach(container => {
            const elements = [container, ...container.querySelectorAll('*')];
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                const cs = getComputedStyle(el);
                const tag = el.tagName;

                // ---- Background ----
                const bgColor = cs.backgroundColor;
                if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    const lightCheck = isLightBg(bgColor);
                    if (lightCheck === 'main' || lightCheck === true || BG_TO_MAIN.has(bgColor)) {
                        el.style.setProperty('background-color', bg, 'important');
                    } else if (lightCheck === 'hover' || BG_TO_HOVER.has(bgColor)) {
                        el.style.setProperty('background-color', bgH, 'important');
                    }
                }

                // ---- Text color ----
                const textColor = cs.color;
                if (TEXT_TO_PRIMARY.has(textColor)) {
                    el.style.setProperty('color', txt, 'important');
                } else if (TEXT_TO_MUTED.has(textColor)) {
                    el.style.setProperty('color', mut, 'important');
                }

                // ---- Borders: override ANY visible border that isn't already themed ----
                const isNotThemed = (c) => c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' && c !== brd;
                const bbw = cs.borderBottomWidth;
                const btw = cs.borderTopWidth;
                const blw = cs.borderLeftWidth;
                const brw = cs.borderRightWidth;

                if (bbw !== '0px' && isNotThemed(cs.borderBottomColor)) {
                    el.style.setProperty('border-bottom-color', brd, 'important');
                }
                if (btw !== '0px' && isNotThemed(cs.borderTopColor)) {
                    el.style.setProperty('border-top-color', brd, 'important');
                }
                if (blw !== '0px' && isNotThemed(cs.borderLeftColor)) {
                    el.style.setProperty('border-left-color', brd, 'important');
                }
                if (brw !== '0px' && isNotThemed(cs.borderRightColor)) {
                    el.style.setProperty('border-right-color', brd, 'important');
                }
            }
        });
    }

    function applyTheme(themeId) {
        const existingStyle = document.getElementById(STYLE_ID);
        if (existingStyle) existingStyle.remove();

        const theme = THEMES[themeId];
        if (!theme || !theme.colors) {
            currentColors = null;
            return;
        }

        currentColors = theme.colors;

        // Inject CSS
        const styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.textContent = buildCSS(theme.colors);
        document.head.appendChild(styleEl);

        // Run JS scan
        scanAndOverride();
    }

    function startObserver() {
        if (observer) return;

        observer = new MutationObserver(() => {
            if (!currentColors) return;
            clearTimeout(scanTimer);
            scanTimer = setTimeout(scanAndOverride, 150);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    function init() {
        chrome.storage.local.get(['xp_theme'], (result) => {
            const themeId = result.xp_theme || 'default';
            if (themeId === 'default') return;

            const tryApply = () => {
                if (document.body) {
                    applyTheme(themeId);
                    startObserver();
                    // Re-scan after X finishes rendering
                    setTimeout(scanAndOverride, 500);
                    setTimeout(scanAndOverride, 1500);
                    setTimeout(scanAndOverride, 4000);
                } else {
                    requestAnimationFrame(tryApply);
                }
            };
            tryApply();
        });
    }

    init();

    // Listen for theme changes from popup
    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'THEME_CHANGED') {
            applyTheme(request.theme);
            startObserver();
            setTimeout(scanAndOverride, 300);
            setTimeout(scanAndOverride, 1000);
        }
    });
})();
