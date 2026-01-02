#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const widgetPath = join(rootDir, "src", "widget", "widget.js");
const manifestPath = join(rootDir, "public", "widget-manifest.json");

// Create a manifest file pointing to widget.js (for development)
// This allows the API to work without running minification
function createDevManifest() {
  try {
    // Only create if widget.js exists
    if (!existsSync(widgetPath)) {
      console.warn("widget.js not found, skipping manifest creation");
      return;
    }

    // If manifest already exists, don't overwrite it (minified version takes precedence)
    if (existsSync(manifestPath)) {
      return;
    }

    const code = readFileSync(widgetPath, "utf8");
    const manifest = {
      version: "dev",
      filename: "widget.js",
      size: code.length,
      originalSize: code.length,
      createdAt: new Date().toISOString(),
    };

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log("✓ Created widget-manifest.json for development");
  } catch (error) {
    console.error("Error creating widget manifest:", error);
    // Don't exit with error - this is optional for development
  }
}

createDevManifest();
