#!/usr/bin/env node

import { createHash } from "crypto";
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { minify } from "terser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const widgetPath = join(rootDir, "public", "widget.js");
const manifestPath = join(rootDir, "public", "widget-manifest.json");

async function minifyWidget() {
  try {
    const code = readFileSync(widgetPath, "utf8");

    // Generate content hash for cache busting
    const hash = createHash("sha256")
      .update(code)
      .digest("hex")
      .substring(0, 8);
    const widgetMinPath = join(rootDir, "public", `widget.${hash}.min.js`);

    const result = await minify(code, {
      compress: {
        drop_console: true, // Remove console.log statements
        drop_debugger: true,
        pure_funcs: ["console.log", "console.debug", "console.info"],
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        reserved: ["BugBuddy", "init"], // Keep public API
      },
      format: {
        comments: false, // Remove comments
      },
    });

    if (result.error) {
      throw result.error;
    }

    if (!result.code) {
      throw new Error("Minification produced no output");
    }

    // Write minified file with hash
    writeFileSync(widgetMinPath, result.code, "utf8");

    // Create manifest file with current hash
    const manifest = {
      version: hash,
      filename: `widget.${hash}.min.js`,
      size: result.code.length,
      originalSize: code.length,
      createdAt: new Date().toISOString(),
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    // Clean up old widget versions (keep only the current one)
    const publicDir = join(rootDir, "public");
    const files = readdirSync(publicDir);
    const widgetPattern = /^widget\.[a-f0-9]+\.min\.js$/;
    files.forEach((file) => {
      if (widgetPattern.test(file) && file !== manifest.filename) {
        try {
          unlinkSync(join(publicDir, file));
          console.log(`  Removed old widget version: ${file}`);
        } catch {
          // Ignore errors when removing old files
        }
      }
    });

    console.log(
      `✓ Minified widget.js (${code.length} → ${result.code.length} bytes, ${Math.round((1 - result.code.length / code.length) * 100)}% reduction)`,
    );
    console.log(`✓ Created widget.${hash}.min.js with cache-busting hash`);
  } catch (error) {
    console.error("Error minifying widget:", error);
    process.exit(1);
  }
}

minifyWidget();
