/**
 * Utility functions for widget font handling
 */

/**
 * Determines the font format from a URL or filename
 */
export function getFontFormat(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes(".woff2")) {
    return "woff2";
  }
  if (urlLower.includes(".woff")) {
    return "woff";
  }
  if (urlLower.includes(".otf")) {
    return "opentype";
  }
  if (urlLower.includes(".ttf")) {
    return "truetype";
  }
  // Default to truetype if format can't be determined
  return "truetype";
}

/**
 * Font family name used for custom widget fonts
 */
export const CUSTOM_WIDGET_FONT_FAMILY = "BugBuddyCustomWidgetFont";

/**
 * Style element ID for custom widget font
 */
export const CUSTOM_WIDGET_FONT_STYLE_ID = "bug-buddy-custom-widget-font-style";

/**
 * Loads a custom font in the browser using both CSS @font-face and FontFace API
 * @param fontUrl - URL of the font file
 * @param fontFamilyName - Optional custom font family name (defaults to CUSTOM_WIDGET_FONT_FAMILY)
 * @returns Promise that resolves when the font is loaded
 */
export function loadCustomFont(
  fontUrl: string,
  fontFamilyName: string = CUSTOM_WIDGET_FONT_FAMILY,
): Promise<void> {
  return new Promise((resolve) => {
    // Remove existing style element if any (always recreate to ensure it's there)
    const existingStyle = document.getElementById(CUSTOM_WIDGET_FONT_STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Determine font format from URL
    const fontFormat = getFontFormat(fontUrl);

    // Create @font-face rule in a style element for CSS-based loading
    const style = document.createElement("style");
    style.id = CUSTOM_WIDGET_FONT_STYLE_ID;
    style.textContent = `
      @font-face {
        font-family: '${fontFamilyName}';
        src: url('${fontUrl}') format('${fontFormat}');
        font-display: swap;
      }
    `;

    try {
      document.head.appendChild(style);
    } catch (error) {
      console.error("Error adding style element:", error);
    }

    // Use FontFace API for programmatic access and to ensure font is loaded
    const fontFace = new FontFace(fontFamilyName, `url(${fontUrl})`);
    fontFace
      .load()
      .then((loadedFont) => {
        document.fonts.add(loadedFont);

        // Wait for the font to be ready before resolving
        // Check multiple times to ensure it's actually loaded
        let attempts = 0;
        const maxAttempts = 10;
        const checkFont = () => {
          if (document.fonts.check(`16px "${fontFamilyName}"`)) {
            resolve();
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkFont, 100);
          } else {
            // Font might still work via CSS @font-face even if check fails
            resolve();
          }
        };
        // Give the browser a moment to process the font
        setTimeout(checkFont, 50);
      })
      .catch((error) => {
        console.error("Failed to load custom font:", error);
        // Font might still work via CSS @font-face
        // Wait a bit and resolve anyway
        setTimeout(() => resolve(), 200);
      });
  });
}
