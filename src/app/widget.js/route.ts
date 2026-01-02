import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { NextResponse } from "next/server";
import { join } from "path";

export async function GET(request: Request) {
  try {
    // Try multiple possible paths for Vercel compatibility
    const possiblePaths = [
      join(process.cwd(), "public", "widget-manifest.json"), // Standard path
      join(
        process.cwd(),
        ".next",
        "server",
        "app",
        "public",
        "widget-manifest.json",
      ), // Vercel build path
      join(process.cwd(), "widget-manifest.json"), // Root fallback
    ];

    let manifestPath: string | null = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        manifestPath = path;
        break;
      }
    }

    let widgetFilename = "widget.js"; // Default fallback
    let versionHash: string | null = null;

    if (manifestPath) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        if (manifest.filename) {
          widgetFilename = manifest.filename;
        }
        if (manifest.version) {
          versionHash = manifest.version;
        }
      } catch {
        // If manifest can't be read, fall back to widget.js
      }
    }

    // Read the widget file
    // Check public first (for minified production builds), then src/widget (for dev source)
    const widgetPaths = [
      join(process.cwd(), "public", widgetFilename), // Minified production file
      join(process.cwd(), "src", "widget", "widget.js"), // Source file for development
      join(process.cwd(), widgetFilename), // Fallback
    ];

    let widgetPath: string | null = null;
    for (const path of widgetPaths) {
      if (existsSync(path)) {
        widgetPath = path;
        break;
      }
    }

    if (!widgetPath) {
      return new NextResponse("Widget file not found", { status: 404 });
    }

    const widgetContent = readFileSync(widgetPath, "utf8");

    // Generate ETag from version hash or file content hash
    // Using version hash from manifest is preferred as it's stable per deployment
    let etag: string;
    if (versionHash) {
      etag = `"${versionHash}"`;
    } else {
      // Fallback to content hash if no version available
      etag = `"${createHash("md5").update(widgetContent).digest("hex").substring(0, 16)}"`;
    }

    // Check if client has cached version (If-None-Match header)
    // Safari can be case-sensitive with ETags, so compare case-insensitively
    const ifNoneMatch = request.headers.get("If-None-Match");
    if (ifNoneMatch && ifNoneMatch.toLowerCase() === etag.toLowerCase()) {
      return new NextResponse(null, {
        status: 304, // Not Modified
        headers: {
          ETag: etag,
          // Use no-cache to force Safari to always revalidate, but allow 304 responses
          "Cache-Control": "no-cache, must-revalidate",
        },
      });
    }

    // Return the widget with appropriate headers
    // Use no-cache to force Safari to always check for updates via ETag
    // This ensures Safari respects cache invalidation on new deployments
    const headers: Record<string, string> = {
      "Content-Type": "application/javascript",
      ETag: etag,
      // no-cache forces revalidation every time, but 304 responses are still efficient
      // This is necessary because Safari aggressively caches and ignores must-revalidate
      "Cache-Control": "no-cache, must-revalidate",
      // Add Vary header to help with cache differentiation
      Vary: "If-None-Match",
    };

    return new NextResponse(widgetContent, {
      headers,
    });
  } catch (error) {
    console.error("Error serving widget:", error);
    return new NextResponse("Error serving widget", { status: 500 });
  }
}
