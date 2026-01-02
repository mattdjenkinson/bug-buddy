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
        // Note: buttonState not available here, so button won't be restored
        // This is fine as this is a rare error case
        openEmbedFrame(null, null);
      });
  }

  // Helper function to wait for all images to load
  function waitForImages(element) {
    return new Promise((resolve) => {
      const images = element.querySelectorAll("img");
      if (images.length === 0) {
        resolve();
        return;
      }

      let loadedCount = 0;
      let errorCount = 0;
      const totalImages = images.length;

      // Handle each image
      images.forEach((img) => {
        // Remove lazy loading to force immediate load
        if (img.loading === "lazy") {
          img.loading = "eager";
        }
        if (img.hasAttribute("loading")) {
          img.setAttribute("loading", "eager");
        }

        // Wait for image to load or error
        const onLoad = () => {
          loadedCount++;
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
          checkComplete();
        };

        const onError = () => {
          errorCount++;
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
          checkComplete();
        };

        img.addEventListener("load", onLoad);
        img.addEventListener("error", onError);

        // Check if image is already loaded
        // For data URIs, they should be complete immediately
        if (img.complete && img.naturalHeight !== 0 && img.naturalWidth !== 0) {
          // Image appears loaded
          // If it's a data URI, it's definitely ready
          if (img.src && img.src.startsWith("data:")) {
            loadedCount++;
            img.removeEventListener("load", onLoad);
            img.removeEventListener("error", onError);
            checkComplete();
          } else {
            // For regular images, wait a moment to ensure rendering
            setTimeout(() => {
              if (img.naturalHeight !== 0 && img.naturalWidth !== 0) {
                loadedCount++;
                img.removeEventListener("load", onLoad);
                img.removeEventListener("error", onError);
                checkComplete();
              } else {
                // Force reload if natural dimensions are 0 (broken/cached image)
                const originalSrc = img.src;
                img.src = "";
                // Force a reflow
                void img.offsetWidth;
                img.src = originalSrc;
              }
            }, 100);
          }
        } else {
          // Force reload if src exists but not loaded
          if (img.src && !img.complete) {
            const originalSrc = img.src;
            img.src = "";
            // Force a reflow to ensure the src change is processed
            void img.offsetWidth;
            img.src = originalSrc;
          }
        }
      });

      function checkComplete() {
        if (loadedCount + errorCount >= totalImages) {
          // Give a delay to ensure images are fully rendered and painted
          // This is especially important for subsequent captures
          setTimeout(() => {
            // Force a reflow to ensure everything is painted
            void element.offsetWidth;
            resolve();
          }, 200);
        }
      }

      // Timeout after 5 seconds to avoid hanging
      setTimeout(() => {
        resolve();
      }, 5000);
    });
  }

  // Capture screenshot using html-to-image
  function captureScreenshot() {
    // Clean up any existing viewport container from previous captures
    const existingContainer = document.getElementById(
      "bug-buddy-viewport-capture",
    );
    if (existingContainer && existingContainer.parentNode) {
      existingContainer.parentNode.removeChild(existingContainer);
    }

    // Show loading state on the feedback button during screenshot capture
    const button = document.getElementById("bug-buddy-widget");
    const originalButtonState = {
      text: null,
      opacity: null,
      cursor: null,
      pointerEvents: null,
    };

    if (button) {
      // Store original state
      originalButtonState.text = button.innerHTML;
      originalButtonState.opacity = button.style.opacity || "";
      originalButtonState.cursor = button.style.cursor || "";
      originalButtonState.pointerEvents = button.style.pointerEvents || "";

      // Show loading state
      button.innerHTML = "Loading...";
      button.style.opacity = "0.6";
      button.style.cursor = "wait";
      button.style.pointerEvents = "none";
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

    // Convert ALL original images to data URIs BEFORE cloning
    // This ensures the clone starts with fresh, uncached image data
    const originalImages = Array.from(document.body.querySelectorAll("img"));
    const imageDataUriMap = new Map();

    // Function to convert an image to a data URI via canvas
    function imageToDataUri(img) {
      try {
        // Skip if image is not loaded or has no dimensions
        if (
          !img.complete ||
          img.naturalWidth === 0 ||
          img.naturalHeight === 0
        ) {
          return null;
        }

        // Create a canvas and draw the image
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");

        // Draw the image to canvas
        ctx.drawImage(img, 0, 0);

        // Convert to data URI - data URIs are self-contained and never cached
        return canvas.toDataURL("image/png");
      } catch {
        // Canvas conversion failed (likely CORS), will fall back to URL with cache busting
        return null;
      }
    }

    // Convert all original images to data URIs and store in a map
    originalImages.forEach((originalImg, index) => {
      const dataUri = imageToDataUri(originalImg);
      if (dataUri) {
        imageDataUriMap.set(index, dataUri);
      } else {
        // Store original src with aggressive cache busting for fallback
        const originalSrc = originalImg.currentSrc || originalImg.src;
        if (originalSrc) {
          // Generate a truly unique identifier using multiple sources of randomness
          // This ensures each capture gets completely unique URLs
          const timestamp = Date.now();
          const perfNow = performance.now();
          const random1 = Math.random().toString(36).substr(2, 9);
          const random2 = Math.random().toString(36).substr(2, 9);
          const uniqueId = `${timestamp}-${perfNow}-${index}-${random1}-${random2}`;

          try {
            const url = new URL(originalSrc, window.location.href);
            // Remove any existing cache busting parameters
            url.searchParams.delete("_bugbuddy");
            url.searchParams.delete("_t");
            url.searchParams.delete("_cb");
            // Add multiple cache busting parameters
            url.searchParams.set("_bugbuddy", uniqueId);
            url.searchParams.set("_t", timestamp.toString());
            url.searchParams.set("_cb", random1);
            imageDataUriMap.set(index, url.toString());
          } catch {
            // If URL parsing fails, manually append cache busters
            let newSrc = originalSrc.replace(
              /[?&](_bugbuddy|_t|_cb)=[^&]*/g,
              "",
            );
            const separator = newSrc.includes("?") ? "&" : "?";
            newSrc = `${newSrc}${separator}_bugbuddy=${encodeURIComponent(uniqueId)}&_t=${timestamp}&_cb=${random1}`;
            imageDataUriMap.set(index, newSrc);
          }
        }
      }
    });

    // Clone the body AFTER we've prepared all image data URIs
    const bodyClone = document.body.cloneNode(true);

    // Remove the widget button from clone
    const clonedButton = bodyClone.querySelector("#bug-buddy-widget");
    if (clonedButton) {
      clonedButton.remove();
    }

    // Now replace all images in the clone with the pre-prepared data URIs
    const clonedImages = Array.from(bodyClone.querySelectorAll("img"));

    // Replace each cloned image with a completely fresh image element using pre-prepared data
    clonedImages.forEach((clonedImg, index) => {
      if (imageDataUriMap.has(index)) {
        const newSrc = imageDataUriMap.get(index);
        const originalImg =
          index < originalImages.length ? originalImages[index] : null;

        // Create a completely new image element to avoid any cached state
        const newImg = document.createElement("img");

        // Copy all attributes from the cloned image (for styling, classes, etc.)
        Array.from(clonedImg.attributes).forEach((attr) => {
          if (
            attr.name !== "src" &&
            attr.name !== "srcset" &&
            attr.name !== "loading"
          ) {
            newImg.setAttribute(attr.name, attr.value);
          }
        });

        // Copy computed styles to preserve appearance
        if (clonedImg.style.cssText) {
          newImg.style.cssText = clonedImg.style.cssText;
        }

        // Set the fresh source (data URI or cache-busted URL) from our pre-prepared map
        newImg.src = newSrc;
        newImg.removeAttribute("srcset");

        // Set loading behavior
        newImg.loading = "eager";
        newImg.setAttribute("loading", "eager");

        // Copy CORS settings and sizes if we have the original image reference
        if (originalImg) {
          if (originalImg.crossOrigin) {
            newImg.crossOrigin = originalImg.crossOrigin;
          } else if (originalImg.hasAttribute("crossorigin")) {
            newImg.setAttribute(
              "crossorigin",
              originalImg.getAttribute("crossorigin") || "",
            );
          }

          // Copy sizes if present
          if (originalImg.sizes) {
            newImg.sizes = originalImg.sizes;
          }
        }

        // Replace the old image with the new one
        if (clonedImg.parentNode) {
          clonedImg.parentNode.replaceChild(newImg, clonedImg);
        }
      }
    });

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

    // Force a reflow to ensure the container is in the DOM and images start loading
    void viewportContainer.offsetWidth;

    // Small delay to let the DOM settle and images start loading
    setTimeout(() => {
      // Wait for all images to load before capturing
      waitForImages(viewportContainer).then(() => {
        // Now capture the screenshot after images are loaded
        captureScreenshotAfterImagesLoaded();
      });
    }, 50);

    function captureScreenshotAfterImagesLoaded() {
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
          cacheBust: true, // Force reload of images
          filter: (node) => {
            // Don't capture the widget button or viewport container itself
            if (
              node.id === "bug-buddy-widget" ||
              node.id === "bug-buddy-viewport-capture"
            ) {
              return false;
            }
            return true;
          },
        })
        .then((dataUrl) => {
          // Compress image to under 500KB
          return compressImage(dataUrl, 500);
        })
        .then((compressedDataUrl) => {
          // Clean up the temporary container
          const container = document.getElementById(
            "bug-buddy-viewport-capture",
          );
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }

          // Don't restore button here - wait until iframe is closed
          // Just restore cursor and pointer events so button looks normal
          if (button) {
            button.style.cursor = originalButtonState.cursor || "";
            button.style.pointerEvents =
              originalButtonState.pointerEvents || "";
          }
          openEmbedFrame(compressedDataUrl, originalButtonState);
        })
        .catch((err) => {
          // Clean up the temporary container
          const container = document.getElementById(
            "bug-buddy-viewport-capture",
          );
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }

          // Restore button to original state since we're not opening the iframe
          if (button && originalButtonState) {
            button.innerHTML = originalButtonState.text || config.buttonText;
            button.style.opacity = originalButtonState.opacity || "";
            button.style.cursor = originalButtonState.cursor || "";
            button.style.pointerEvents =
              originalButtonState.pointerEvents || "";
          }
          console.error("Failed to capture screenshot:", err);
          // Don't open the iframe if screenshot fails
        });
    }
  }

  // Open embed iframe
  function openEmbedFrame(screenshot, buttonState) {
    console.log("Loading Bug Buddy embed frame");
    const iframe = document.createElement("iframe");
    iframe.id = "bug-buddy-iframe";
    // Don't include screenshot in URL to avoid 431 error (Request Header Fields Too Large)
    iframe.src = `${config.appUrl}/widget/embed?projectKey=${config.projectKey || ""}&url=${encodeURIComponent(window.location.href)}`;
    iframe.setAttribute("allowtransparency", "true");
    // Hide iframe initially to prevent white flash, show when loaded
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
      visibility: hidden;
    `;

    document.body.appendChild(iframe);

    // Function to send screenshot
    const sendScreenshot = () => {
      if (screenshot) {
        try {
          // postMessage works cross-origin, but accessing contentWindow can throw
          // Wrap in try-catch to handle cross-origin security errors gracefully
          iframe.contentWindow.postMessage(
            {
              type: "bug-buddy-screenshot",
              screenshot: screenshot,
            },
            config.appUrl,
          );
        } catch {
          // Cross-origin access blocked when accessing contentWindow
          // This is expected and safe to ignore - postMessage will still work
          // The iframe will receive the message via the message event listener
        }
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
        // Restore button to original state when iframe is closed
        const button = document.getElementById("bug-buddy-widget");
        if (button && buttonState) {
          button.innerHTML = buttonState.text || config.buttonText;
          button.style.opacity = buttonState.opacity || "";
          button.style.cursor = buttonState.cursor || "";
          button.style.pointerEvents = buttonState.pointerEvents || "";
          button.style.minWidth = "";
          button.style.minHeight = "";
        }
        iframe.remove();
        window.removeEventListener("message", messageHandler);
      }
    };

    // Listen for messages
    window.addEventListener("message", messageHandler);

    // Send screenshot data via postMessage once iframe loads
    iframe.onload = function () {
      // Show iframe once loaded to prevent white flash
      iframe.style.visibility = "visible";
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
