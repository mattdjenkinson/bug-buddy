(function () {
  "use strict";

  // Configuration
  const config = {
    projectKey: null,
    appUrl: "http://localhost:3000",
    position: "bottom-right",
    buttonText: "Feedback",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    backgroundColor: "#ffffff",
    fontFamily: "system-ui",
    fontUrl: null,
    borderRadius: "8px",
  };

  // Font utility constants (shared with src/lib/widget-fonts.ts)
  const CUSTOM_WIDGET_FONT_FAMILY = "BugBuddyCustomWidgetFont";
  const CUSTOM_WIDGET_FONT_STYLE_ID = "bug-buddy-custom-widget-font-style";

  // Helper function to determine font format from URL
  // (Shared implementation with src/lib/widget-fonts.ts)
  function getFontFormat(url) {
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

  // Load custom font
  // (Shared implementation with src/lib/widget-fonts.ts)
  function loadCustomFont(fontUrl) {
    return new Promise((resolve) => {
      // Remove existing style element if any (always recreate to ensure it's there)
      const existingStyle = document.getElementById(
        CUSTOM_WIDGET_FONT_STYLE_ID,
      );
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
          font-family: '${CUSTOM_WIDGET_FONT_FAMILY}';
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
      const fontFace = new FontFace(
        CUSTOM_WIDGET_FONT_FAMILY,
        `url(${fontUrl})`,
      );
      fontFace
        .load()
        .then((loadedFont) => {
          document.fonts.add(loadedFont);

          // Wait for the font to be ready before resolving
          // Check multiple times to ensure it's actually loaded
          let attempts = 0;
          const maxAttempts = 10;
          const checkFont = () => {
            if (document.fonts.check(`16px "${CUSTOM_WIDGET_FONT_FAMILY}"`)) {
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

  // Initialize widget
  function initWidget(options) {
    Object.assign(config, options);

    // Fetch widget configuration from API
    if (config.projectKey) {
      fetch(`${config.appUrl}/api/widget/config/${config.projectKey}`)
        .then((res) => {
          // If domain is not allowed, don't load the widget
          if (!res.ok) {
            console.warn("Widget not allowed on this domain");
            return null;
          }
          return res.json();
        })
        .then((data) => {
          // Only create widget if we got valid data
          if (data) {
            if (data.customization) {
              Object.assign(config, data.customization);
              // Map buttonPosition to position for compatibility
              if (data.customization.buttonPosition) {
                config.position = data.customization.buttonPosition;
              }

              if (
                data.customization.fontUrl &&
                data.customization.fontUrl !== null
              ) {
                config.fontUrl = data.customization.fontUrl;
                // Ensure fontFamily is set to CustomWidgetFont if custom font exists
                if (config.fontFamily !== CUSTOM_WIDGET_FONT_FAMILY) {
                  config.fontFamily = CUSTOM_WIDGET_FONT_FAMILY;
                }
                loadCustomFont(data.customization.fontUrl)
                  .then(() => {
                    createWidget();
                  })
                  .catch((error) => {
                    console.error("Error loading custom font:", error);
                    createWidget(); // Create widget anyway
                  });
              } else {
                console.log(
                  "No custom font URL found, fontUrl:",
                  data.customization.fontUrl,
                );
                createWidget();
              }
            } else {
              createWidget();
            }
          }
        })
        .catch((error) => {
          console.error("Failed to load widget configuration:", error);
          // Don't create widget on error
        });
    } else {
      createWidget();
    }
  }

  // Create widget button
  function createWidget() {
    // Remove existing widget if any
    const existing = document.getElementById("bug-buddy-widget");
    if (existing) existing.remove();

    const button = document.createElement("div");
    button.id = "bug-buddy-widget";
    button.innerHTML = config.buttonText;

    // Determine positioning and styling based on position
    let positionStyles = "";
    let borderRadius = config.borderRadius;
    const isVertical =
      config.position === "left" || config.position === "right";

    if (config.position === "left") {
      positionStyles = "left: 0; top: 50%; transform: translateY(-50%);";
      // For left position, only apply border radius to right corners (top-right and bottom-right)
      borderRadius = `0 ${config.borderRadius} ${config.borderRadius} 0`;
    } else if (config.position === "right") {
      positionStyles = "right: 0; top: 50%; transform: translateY(-50%);";
      // For right position, only apply border radius to left corners (top-left and bottom-left)
      borderRadius = `${config.borderRadius} 0 0 ${config.borderRadius}`;
    } else {
      positionStyles = `
        ${config.position.includes("bottom") ? "bottom: 20px;" : "top: 20px;"}
        ${config.position.includes("right") ? "right: 20px;" : "left: 20px;"}
      `;
      // For corner positions, keep full border radius
      borderRadius = config.borderRadius;
    }

    // Determine font family - use custom font if available
    const fontFamily = config.fontUrl
      ? `${CUSTOM_WIDGET_FONT_FAMILY}, ${config.fontFamily}`
      : config.fontFamily;

    // Set base styles
    button.style.cssText = `
      position: fixed;
      ${positionStyles}
      background-color: ${config.primaryColor};
      color: ${config.secondaryColor};
      border-radius: ${borderRadius};
      font-family: ${fontFamily};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      white-space: nowrap;
    `;

    // Set padding and writing mode based on orientation
    if (isVertical) {
      // For vertical text: swap padding (24px vertical, 12px horizontal)
      button.style.padding = "24px 12px";
      button.style.writingMode = "vertical-rl";
      button.style.textOrientation = "mixed";
    } else {
      // For horizontal text: normal padding (12px vertical, 24px horizontal)
      button.style.padding = "12px 24px";
    }

    button.addEventListener("mouseenter", () => {
      if (config.position === "left" || config.position === "right") {
        button.style.transform = "translateY(-50%) scale(1.05)";
      } else {
        button.style.transform = "scale(1.05)";
      }
      button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    });

    button.addEventListener("mouseleave", () => {
      if (config.position === "left" || config.position === "right") {
        button.style.transform = "translateY(-50%)";
      } else {
        button.style.transform = "scale(1)";
      }
      button.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    });

    button.addEventListener("click", () => {
      openFeedbackModal();
    });

    document.body.appendChild(button);
  }

  // Load external libraries
  function loadLibrary(src, globalVar) {
    return new Promise((resolve, reject) => {
      if (typeof window[globalVar] !== "undefined") {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${globalVar}`));
      document.head.appendChild(script);
    });
  }

  // Open feedback modal
  function openFeedbackModal() {
    // Load required libraries
    Promise.all([
      loadLibrary(
        "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js",
        "htmlToImage",
      ),
      loadLibrary(
        "https://cdn.jsdelivr.net/npm/compressorjs@1.2.1/dist/compressor.min.js",
        "Compressor",
      ),
    ])
      .then(() => captureScreenshot())
      .catch((err) => {
        console.error("Failed to load required libraries:", err);
        // Still open the modal without screenshot
        openEmbedFrame(null);
      });
  }

  // Capture screenshot using html-to-image
  function captureScreenshot() {
    // Hide the feedback button during screenshot capture
    const button = document.getElementById("bug-buddy-widget");
    const originalDisplay = button ? button.style.display : null;
    if (button) {
      button.style.display = "none";
    }

    // Get current scroll position
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Create a viewport container that shows only the visible area
    const viewportContainer = document.createElement("div");
    viewportContainer.id = "bug-buddy-viewport-capture";
    viewportContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${viewportWidth}px;
      height: ${viewportHeight}px;
      overflow: hidden;
      background-color: transparent;
      z-index: -999999;
      pointer-events: none;
    `;

    // Clone the body to capture the scrolled content
    const bodyClone = document.body.cloneNode(true);

    // Remove the widget button from clone
    const clonedButton = bodyClone.querySelector("#bug-buddy-widget");
    if (clonedButton) {
      clonedButton.remove();
    }

    // Position the clone to show the scrolled area
    bodyClone.style.cssText = `
      position: absolute;
      top: ${-scrollY}px;
      left: ${-scrollX}px;
      width: ${document.body.scrollWidth}px;
      height: ${document.body.scrollHeight}px;
      margin: 0;
      padding: 0;
    `;

    viewportContainer.appendChild(bodyClone);
    document.body.appendChild(viewportContainer);

    // Function to compress image to under 500KB using compressorjs
    function compressImage(dataUrl, maxSizeKB = 500) {
      return new Promise((resolve) => {
        // Convert data URL to File object
        function dataURLtoFile(dataurl, filename) {
          const arr = dataurl.split(",");
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new File([u8arr], filename, { type: mime });
        }

        // Convert File/Blob to data URL
        function fileToDataURL(file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          });
        }

        const maxSizeBytes = maxSizeKB * 1024;
        const file = dataURLtoFile(dataUrl, "screenshot.png");

        // Recursive function to compress with decreasing quality until under size limit
        function compressWithQuality(inputFile, quality = 0.8) {
          return new Promise((resolve) => {
            new Compressor(inputFile, {
              quality: quality,
              maxWidth: 4096, // Max canvas width to avoid issues
              maxHeight: 4096, // Max canvas height to avoid issues
              convertSize: Infinity, // Always convert PNG to JPEG for better compression
              convertTypes: ["image/png"], // Convert PNG to JPEG
              mimeType: "image/jpeg", // Use JPEG for better compression
              success(result) {
                // Check if the compressed file is under the size limit
                if (result.size <= maxSizeBytes || quality <= 0.1) {
                  // We're under the limit or at minimum quality, convert to data URL
                  fileToDataURL(result)
                    .then(resolve)
                    .catch(() => resolve(dataUrl)); // Fallback to original on error
                } else {
                  // Still too large, reduce quality and try again
                  compressWithQuality(
                    result,
                    Math.max(0.1, quality - 0.1),
                  ).then(resolve);
                }
              },
              error(err) {
                console.error("Compression error:", err);
                // If compression fails, return original
                resolve(dataUrl);
              },
            });
          });
        }

        compressWithQuality(file).then(resolve);
      });
    }

    // html-to-image handles modern CSS colors (oklch, lab, lch) natively
    htmlToImage
      .toPng(viewportContainer, {
        quality: 1.0,
        pixelRatio: window.devicePixelRatio || 1,
        width: viewportWidth,
        height: viewportHeight,
        useCORS: true,
        backgroundColor: "#ffffff",
      })
      .then((dataUrl) => {
        // Compress image to under 500KB
        return compressImage(dataUrl, 500);
      })
      .then((compressedDataUrl) => {
        // Clean up the temporary container
        const container = document.getElementById("bug-buddy-viewport-capture");
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }

        // Show button again after screenshot is captured
        if (button) {
          button.style.display = originalDisplay || "";
        }
        openEmbedFrame(compressedDataUrl);
      })
      .catch((err) => {
        // Clean up the temporary container
        const container = document.getElementById("bug-buddy-viewport-capture");
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }

        // Show button again even if screenshot fails
        if (button) {
          button.style.display = originalDisplay || "";
        }
        console.error("Failed to capture screenshot:", err);
        // Still open the modal without screenshot - user can still submit feedback
        openEmbedFrame(null);
      });
  }

  // Open embed iframe
  function openEmbedFrame(screenshot) {
    console.log("Loading Bug Buddy embed frame");
    const iframe = document.createElement("iframe");
    iframe.id = "bug-buddy-iframe";
    // Don't include screenshot in URL to avoid 431 error (Request Header Fields Too Large)
    iframe.src = `${config.appUrl}/widget/embed?projectKey=${config.projectKey || ""}&url=${encodeURIComponent(window.location.href)}`;
    iframe.setAttribute("allowtransparency", "true");
    iframe.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
      z-index: 9999999;
      background: transparent;
      background-color: transparent;
    `;

    document.body.appendChild(iframe);

    // Function to send screenshot
    const sendScreenshot = () => {
      if (screenshot && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "bug-buddy-screenshot",
            screenshot: screenshot,
          },
          config.appUrl,
        );
      }
    };

    // Store message handler for cleanup
    const messageHandler = function (event) {
      if (
        event.data &&
        event.data.type === "bug-buddy-ready" &&
        event.origin === config.appUrl
      ) {
        // Iframe is ready, send screenshot
        sendScreenshot();
      } else if (
        event.data === "bug-buddy-close" &&
        event.origin === config.appUrl
      ) {
        iframe.remove();
        window.removeEventListener("message", messageHandler);
      }
    };

    // Listen for messages
    window.addEventListener("message", messageHandler);

    // Send screenshot data via postMessage once iframe loads
    iframe.onload = function () {
      // Wait a bit for React to initialize, then send screenshot
      setTimeout(sendScreenshot, 200);
      // Also try sending immediately
      sendScreenshot();
    };
  }

  // Auto-initialize if script tag has data attributes
  if (document.currentScript) {
    const script = document.currentScript;
    const projectKey = script.getAttribute("data-project-key");
    const appUrl = script.getAttribute("data-app-url") || config.appUrl;

    if (projectKey) {
      initWidget({
        projectKey,
        appUrl,
      });
    }
  }

  // Export for manual initialization
  window.BugBuddy = {
    init: initWidget,
  };
})();
